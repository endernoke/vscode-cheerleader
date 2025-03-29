import * as vscode from "vscode";

export function activateSpeechCapture(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "extension.captureSpeech",
    async () => {
      const panel = vscode.window.createWebviewPanel(
        "speechCapture",
        "Speech Capture",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = `
        <html>
        <body>
          <button onclick="startRecognition()">Start Recording</button>
          <script>
            const vscode = acquireVsCodeApi();
            function startRecognition() {
              const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
              recognition.lang = "en-US";
              recognition.start();
              recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                vscode.postMessage({ command: "transcribedText", text });
              };
            }
          </script>
        </body>
        </html>
      `;

      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "transcribedText") {
          vscode.window.showInformationMessage("Transcribed: " + message.text);
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}
