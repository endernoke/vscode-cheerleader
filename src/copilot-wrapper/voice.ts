/*
MARCH 29, 2025

THE TWENTY-FIVE THOUSAND miles of long march has been endured, but the
end is not yet in sight. Countless hours and hundreds of lines of code
were sacrificed yet VSCode's webview API has proven to be a treacherous
abyss. The batallion has made the hard decision to abandon the initiative
and default back to the play_voice.ts method. Saving temporary file we must,
no more man shall be lost to the webview API. Defeat shall not be accepted,
the battle will be fought again, but not this present day.

May Great George above stand with us in this time of need.

With great sorrow,
Grand Georgeiste,
Comrade of Operation Copilot Wrapper
*/

import * as vscode from "vscode";
import { createAudioStreamFromText } from "../services/text_to_speech";

export class AudioPlayer {
  private static panel: vscode.WebviewPanel | undefined;

  private static getWebviewContent(
    base64Audio: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;">
          <audio id="player" style="display:none">
            <source src="data:audio/mp3;base64,${base64Audio}" type="audio/mp3">
          </audio>
          <script>
            const vscode = acquireVsCodeApi();
            const audio = document.getElementById('player');
            
            // Play audio when loaded
            audio.addEventListener('loadeddata', () => {
              audio.play().catch(error => {
                vscode.postMessage({ type: 'error', message: error.message });
              });
            });

            audio.addEventListener('ended', () => {
              vscode.postMessage({ type: 'complete' });
            });

            audio.addEventListener('error', () => {
              vscode.postMessage({ 
                type: 'error', 
                message: audio.error?.message || 'Unknown audio error'
              });
            });
          </script>
        </body>
      </html>
    `;
  }

  private static createPanel() {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "audioPlayer",
        "Audio Player",
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }
  }

  static async play(buffer: Buffer): Promise<void> {
    try {
      this.createPanel();
      if (!this.panel) throw new Error("Failed to create audio panel");

      const base64Audio = buffer.toString("base64");
      this.panel.webview.html = this.getWebviewContent(base64Audio);

      return new Promise((resolve, reject) => {
        const messageHandler = this.panel?.webview.onDidReceiveMessage(
          (message) => {
            switch (message.type) {
              case "complete":
                messageHandler?.dispose();
                resolve();
                break;
              case "error":
                messageHandler?.dispose();
                reject(new Error(message.message));
                break;
            }
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }
}

export async function playTextToSpeech(
  text: string,
  visible: boolean = false
): Promise<void> {
  try {
    const buffer = await createAudioStreamFromText(text);
    if (!buffer?.length) throw new Error("Received empty audio buffer");
    await AudioPlayer.play(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Audio playback failed: ${message}`);
    throw error;
  }
}

export function activateVoice(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "cheerleader.testVoice",
    async () => {
      const text = await vscode.window.showInputBox({
        prompt: "Enter text to convert to speech",
        placeHolder: "Hello, I am your coding companion!",
      });

      if (text) {
        await playTextToSpeech(text);
      }
    }
  );

  context.subscriptions.push(disposable);
}
