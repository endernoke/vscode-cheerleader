import * as vscode from "vscode";
import player from "play-sound";
import { existsSync } from "fs";
import fs from "fs";
import { v4 as uuid } from "uuid";
import path from "path";
import { createAudioFileFromText } from "./text_to_speech";
import { WebSocketService } from "./websocket_service";
import getAudioDurationInSeconds from "get-audio-duration";

/**
 * "On the second day, George said 'Let there be sound!' and there was sound."
 * -- The Georgeiste Manifesto, Chapter 2, Verse 1
 */
export class SoundPlayer {
  private static audioPlayer = player({});
  private static isPlaying = false;
  static context: vscode.ExtensionContext;

  static initialize(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static async playFile(filePath: string): Promise<void> {
    if (this.isPlaying) {
      console.log("Already playing audio, skipping");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.isPlaying = true;

        if (!existsSync(filePath)) {
          this.isPlaying = false;
          reject(new Error(`Audio file not found: ${filePath}`));
          return;
        }

        const audio = this.audioPlayer.play(filePath, (err) => {
          this.isPlaying = false;
          if (err) {
            console.error("Error playing audio:", err);
            reject(err);
          } else {
            resolve();
          }
        });

        // Handle potential player-specific errors
        if (audio && typeof audio.on === "function") {
          audio.on("error", (err: any) => {
            this.isPlaying = false;
            console.error("Player error:", err);
            reject(err);
          });
        }
      } catch (error) {
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  static isAudioPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Converts text to speech and plays it using the SoundPlayer.
 * @param text The text to convert to speech.
 * @returns A promise that resolves when the audio is played.
 */
export const playTextToSpeech = async (text: string): Promise<void> => {
  if (!SoundPlayer.context) {
    throw new Error("SoundPlayer not initialized with extension context");
  }

  const webSocketService = WebSocketService.getInstance();

  try {
    // Use the extension's storage path for temporary files
    const tempDir = path.join(
      SoundPlayer.context.globalStorageUri.fsPath,
      "audio"
    );

    // Create the directory if it doesn't exist
    if (!existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = path.join(
      tempDir,
      `${uuid()}.mp3`
    );

    await createAudioFileFromText(text, filename);
    if (!filename) {
      throw new Error("Failed to create audio file");
    }

    const audioDuration = await getAudioDurationInSeconds(filename);
    const durationMs = Math.ceil(audioDuration * 1000);

    // Start Live2D character's speech animation
    webSocketService.startSpeak(text, durationMs);

    try {
      // Play the audio file
      await SoundPlayer.playFile(filename);
    } finally {
      // Stop Live2D character's speech animation
      webSocketService.stopSpeak();
    }

    // Clean up the file after playback
    fs.unlink(filename, (err) => {
      if (err) {
        console.error("Error deleting audio file:", err);
      } else {
        console.log("Audio file deleted successfully");
      }
    });
  } catch (error) {
    webSocketService.stopSpeak(); // Ensure animation stops even if there's an error
    console.error("Text-to-speech error:", error);
    vscode.window.showErrorMessage(
      `Failed to play audio: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export function activateTTS(context: vscode.ExtensionContext) {
  // Initialize SoundPlayer with context
  SoundPlayer.initialize(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("cheerleader.testTTS", async () => {
      try {
        const text = await vscode.window.showInputBox({
          prompt: "Enter text to convert to speech",
          placeHolder: "Type something to hear it spoken",
        });

        if (text) {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Converting text to speech...",
              cancellable: false,
            },
            async () => {
              // Use a duration based on text length, with a minimum of 3 seconds
              const duration = Math.max(3000, text.length * 100);
              await playTextToSpeech(text);
            }
          );
        }
      } catch (error) {
        console.error("Voice test command error:", error);
        vscode.window.showErrorMessage(
          `Voice test failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );
}
