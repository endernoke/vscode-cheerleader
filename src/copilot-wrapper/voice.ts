import * as vscode from "vscode";
import { createAudioStreamFromText } from "../services/tts";

export class AudioPlayer {
  private static panel: vscode.WebviewPanel | undefined;

  private static createOrShowPanel() {
    console.log("Creating/showing audio player panel");
    if (AudioPlayer.panel) {
      AudioPlayer.panel.reveal();
      vscode.window.showInformationMessage("Reusing existing audio player panel");
      return;
    }

    AudioPlayer.panel = vscode.window.createWebviewPanel(
      "audioPlayer",
      "Audio Player",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    vscode.window.showInformationMessage("Created new audio player panel");

    AudioPlayer.panel.onDidDispose(() => {
      console.log("Audio player panel disposed");
      AudioPlayer.panel = undefined;
    });
  }

  static async playFromBuffer(buffer: Buffer) {
    console.log(`Attempting to play audio buffer of size: ${buffer.length} bytes`);
    this.createOrShowPanel();
    if (!this.panel) {
      console.error("Failed to create audio panel");
      return;
    }

    const base64Audio = buffer.toString("base64");
    console.log(`Converted buffer to base64 string of length: ${base64Audio.length}`);

    this.panel.webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .status { margin: 10px 0; }
          </style>
        </head>
        <body>
          <h3>VSCode Cheerleader Audio Player</h3>
          <div class="status" id="status">Loading audio...</div>
          <audio id="player" autoplay controls>
            <source src="data:audio/mp3;base64,${base64Audio}" type="audio/mp3">
            Your browser does not support the audio element.
          </audio>
          <script>
            const vscode = acquireVsCodeApi();
            const audio = document.getElementById('player');
            const status = document.getElementById('status');
            
            // Create audio context for unlocking audio on some browsers
            let audioContext;
            try {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
              console.error("Failed to create AudioContext:", e);
            }
            
            // Function to ensure playback starts
            function ensurePlayback() {
              if (audio.paused) {
                console.log("Attempting to start playback...");
                
                // Resume audio context if needed
                if (audioContext && audioContext.state === 'suspended') {
                  audioContext.resume().then(() => {
                    console.log("AudioContext resumed");
                  });
                }
                
                // Try playing with promise handling
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    console.log("Playback started successfully");
                    status.textContent = "Playing audio...";
                  }).catch(error => {
                    console.error("Playback failed:", error);
                    status.textContent = "Error starting playback: " + error;
                    vscode.postMessage({ type: 'playbackError', error: error.message });
                  });
                }
              }
            }
            
            // Multiple events that could be used to start playback
            window.addEventListener('DOMContentLoaded', ensurePlayback);
            window.addEventListener('load', ensurePlayback);
            document.addEventListener('click', ensurePlayback);
            
            // Add event listeners to track audio state
            audio.oncanplaythrough = () => {
              console.log("Audio can play through without buffering");
              ensurePlayback();
            };
            
            audio.onloadeddata = () => {
              console.log("Audio loaded successfully");
              status.textContent = "Audio loaded, playing...";
              ensurePlayback();
            };
            
            audio.onplay = () => {
              console.log("Audio started playing");
              status.textContent = "Playing audio...";
              vscode.postMessage({ type: 'audioStarted' });
            };
            
            audio.onended = () => {
              console.log("Audio playback finished");
              status.textContent = "Playback complete";
              vscode.postMessage({ type: 'audioComplete' });
            };
            
            audio.onerror = (e) => {
              console.error("Audio error:", e);
              status.textContent = "Error playing audio";
              vscode.postMessage({ type: 'audioError', error: audio.error ? audio.error.message : "Unknown error" });
            };
            
            // Try playing immediately and report status
            ensurePlayback();
            
            // Auto-play may be blocked by browser policies
            // Add a button to manually trigger playback if needed
            if (audio.paused) {
              const playButton = document.createElement('button');
              playButton.innerText = "Start Audio Playback";
              playButton.style.marginTop = "15px";
              playButton.onclick = ensurePlayback;
              document.body.appendChild(playButton);
            }
          </script>
        </body>
      </html>
    `;

    // Listen for messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'audioStarted':
            vscode.window.showInformationMessage("Audio playback started");
            break;
          case 'audioComplete':
            vscode.window.showInformationMessage("Audio playback completed");
            break;
          case 'audioError':
          case 'playbackError':
            vscode.window.showErrorMessage(`Audio playback error: ${message.error}`);
            break;
        }
      },
      undefined,
      []
    );
    
    // Focus the panel to increase chances of autoplay working
    this.panel.reveal(vscode.ViewColumn.Two, true); // true = preserve focus
  }
}

// Modified createAudioStreamFromText to use the AudioPlayer
export const playTextToSpeech = async (text: string): Promise<void> => {
  try {
    vscode.window.showInformationMessage(`Converting text to speech: "${text.substring(0, 30)}..."`);
    console.log(`Converting to speech: ${text.substring(0, 100)}...`);
    
    const buffer = await createAudioStreamFromText(text);
    console.log(`Received audio buffer of size: ${buffer.length}`);
    
    if (buffer.length === 0) {
      throw new Error("Received empty audio buffer");
    }
    
    await AudioPlayer.playFromBuffer(buffer);
    vscode.window.showInformationMessage("Audio should be playing now");
  } catch (error) {
    console.error("Text-to-speech error:", error);
    vscode.window.showErrorMessage(`Failed to play audio: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Test usage - but make it a proper exported function to avoid auto-execution
export const testAudioPlayback = async () => {
  vscode.window.showInformationMessage("Running audio test...");
  await playTextToSpeech("Testing audio playback in VS Code extension.");
};

export function activateVoice(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("cheerleader.testVoice", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "Enter text to convert to speech",
      });
      if (text) {
        await playTextToSpeech(text);
      }
    })
  );
}
