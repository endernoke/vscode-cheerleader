import * as vscode from "vscode";
import { getAIResponse } from "../services/language_model";
import { playTextToSpeech } from "./play_voice";

class ChatPanel {
  private static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent();
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static createOrShow() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "cheerleaderChat",
      "Chat with Miko-chan",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel);
  }

  private _getWebviewContent() {
    return `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        body { font-family: Arial; margin: 0; padding: 10px; display: flex; flex-direction: column; height: 100vh; }
                        #response-area { flex-grow: 1; overflow-y: auto; margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
                        #input-container { display: flex; margin-bottom: 10px; }
                        #message-input { flex-grow: 1; margin-right: 10px; padding: 8px; border-radius: 3px; border: 1px solid #ccc; }
                        button { background: #4a86e8; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; }
                        button:hover { background: #3a76d8; }
                        .status { font-style: italic; color: #666; }
                    </style>
                </head>
                <body>
                    <div id="response-area">
                        <p class="status">Ask cheerleader something...</p>
                    </div>
                    <div id="input-container">
                        <input type="text" id="message-input" placeholder="Type your message...">
                        <button onclick="sendMessage()">Send</button>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        const responseArea = document.getElementById('response-area');
                        const input = document.getElementById('message-input');

                        function sendMessage() {
                            const text = input.value;
                            if (!text) return;
                            
                            // Clear previous response and show waiting message
                            responseArea.innerHTML = '<p class="status">Miko-chan is thinking...</p>';
                            
                            vscode.postMessage({ type: 'sendMessage', text });
                            input.value = '';
                        }

                        input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') sendMessage();
                        });

                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.type === 'aiResponse') {
                                responseArea.innerHTML = '<p>' + message.text + '</p>';
                            } else if (message.type === 'speaking') {
                                responseArea.innerHTML += '<p class="status">Speaking...</p>';
                            }
                        });
                    </script>
                </body>
            </html>
        `;
  }

  private async _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "sendMessage":
            try {
              const response = await getAIResponse(message.text);
              webview.postMessage({ type: "aiResponse", text: response });
              
              // Play the audio response
              webview.postMessage({ type: "speaking" });
              await playTextToSpeech(response);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              webview.postMessage({
                type: "aiResponse",
                text: `Oopsie! Something went wrong (；′⌒\`) - ${errorMessage}`,
              });
            }
            break;
        }
      },
      undefined,
      this._disposables
    );
  }
}

// Register the command
export function activateChatCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "cheerleader.askCopilot",
    () => {
      ChatPanel.createOrShow();
    }
  );

  context.subscriptions.push(disposable);
}
