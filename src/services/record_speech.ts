import * as vscode from "vscode";
import mic from "node-microphone";
import { Writable } from "stream";
import { join } from "path";
import fs from "fs";
import { SoundPlayer } from "./play_voice";
import { v4 as uuid } from "uuid";

export class AudioRecorder {
  private static microphone: mic;
  private static isRecording: boolean = false;
  private static statusBar: vscode.StatusBarItem;
  private static audioChunks: Buffer[] = [];
  private static micStream: any;
  private static recordingsDir: string;
  private static silenceStart: number | null = null;
  private static lastSoundTime: number | null = null;
  private static SILENCE_THRESHOLD = -40; // Adjust based on testing
  private static MAX_SILENCE_DURATION = 3000; // 2 seconds of silence before stopping

  static initialize(context: vscode.ExtensionContext) {
    this.microphone = new mic();
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBar.command = "cheerleader.record";

    this.recordingsDir = join(context.globalStorageUri.fsPath, "recordings");
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }

    return this.statusBar;
  }

  static async record(): Promise<string> {
    if (this.isRecording) {
      return this.manualStop();
    }

    return new Promise((resolve, reject) => {
      this.startRecording()
        .then(() => {
          // Recording will be stopped by silence detection or manual stop
        })
        .catch(reject);

      const checkResult = setInterval(() => {
        if (!this.isRecording) {
          clearInterval(checkResult);
          const result = this.getLastRecording();
          if (result.filePath) {
            resolve(result.filePath);
          } else {
            reject(new Error("No audio data was recorded"));
          }
        }
      }, 100);
    });
  }

  private static async manualStop(): Promise<string> {
    this.stopRecording();
    const result = this.getLastRecording();
    if (result.filePath) {
      return result.filePath;
    }
    throw new Error("No audio data was recorded");
  }

  private static async startRecording(): Promise<void> {
    if (this.isRecording) {
      return Promise.reject(new Error("Already recording"));
    }

    return new Promise((resolve, reject) => {
      try {
        console.log("[AudioRecorder] Starting recording session");
        this.isRecording = true;
        this.audioChunks = [];
        this.silenceStart = null;
        this.lastSoundTime = Date.now();
        this.updateStatus("$(mic-filled) Recording...");

        this.micStream = this.microphone.startRecording();
        console.log("[AudioRecorder] Microphone stream created");

        const writableStream = new Writable({
          write: (chunk, encoding, next) => {
            if (!this.isRecording) {
              next();
              return;
            }

            this.audioChunks.push(chunk);

            // Calculate audio level from chunk
            const audioLevel = this.calculateAudioLevel(chunk);
            console.log(`[AudioRecorder] Audio level: ${audioLevel}`);

            // Detect silence
            if (audioLevel < this.SILENCE_THRESHOLD) {
              if (!this.silenceStart) {
                this.silenceStart = Date.now();
                console.log("[AudioRecorder] Silence started");
              }

              const silenceDuration = Date.now() - this.silenceStart;
              if (silenceDuration > this.MAX_SILENCE_DURATION) {
                console.log(`[AudioRecorder] Silence threshold reached (${silenceDuration}ms)`);
                this.stopRecording();
              }
            } else {
              this.silenceStart = null;
              this.lastSoundTime = Date.now();
              this.updateStatus("$(mic-filled) Recording (Sound Detected)");
            }

            next();
          },
        });

        this.micStream.pipe(writableStream);
        console.log("[AudioRecorder] Pipe connected to writable stream");

        this.micStream.on("error", (error: Error) => {
          console.error("[AudioRecorder] Stream error:", error);
          reject(error);
        });

        resolve();
      } catch (error) {
        console.error("[AudioRecorder] Recording setup failed:", error);
        this.stopRecording();
        reject(error);
      }
    });
  }

  private static calculateAudioLevel(chunk: Buffer): number {
    // Convert buffer to 16-bit samples
    const samples = new Int16Array(chunk.buffer);

    // Calculate RMS (Root Mean Square)
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    // Convert to dB
    const db = 20 * Math.log10(rms / 32767); // 32767 is max value for 16-bit audio

    return db; // Higher dB means louder sound
  }

  private static getLastRecording(): { buffer: Buffer; filePath?: string } {
    const audioBuffer = Buffer.concat(this.audioChunks);
    if (audioBuffer.length > 0) {
      const filePath = join(this.recordingsDir, `recording-${uuid()}.wav`);
      fs.writeFileSync(filePath, audioBuffer);
      return { buffer: audioBuffer, filePath };
    }
    return { buffer: audioBuffer };
  }

  private static stopRecording(): void {
    if (!this.isRecording) {
      console.log("[AudioRecorder] Stop called but not recording");
      return;
    }

    console.log("[AudioRecorder] Stopping recording");
    this.isRecording = false;
    this.updateStatus("");

    if (this.micStream) {
      this.micStream.unpipe();
      this.micStream = null;
      console.log("[AudioRecorder] Microphone stream cleaned up");
    }
    this.microphone.stopRecording();
    console.log("[AudioRecorder] Microphone stopped");

    console.log(`[AudioRecorder] Recording complete. Collected ${this.audioChunks.length} chunks`);
  }

  private static updateStatus(text: string) {
    this.statusBar.text = text;
    this.statusBar.show();
  }
}

export function registerAudioCommands(context: vscode.ExtensionContext) {
  const statusBar = AudioRecorder.initialize(context);
  context.subscriptions.push(statusBar);

  let recordCommand = vscode.commands.registerCommand(
    "cheerleader.record",
    async () => {
      try {
        console.log("Starting recording...");
        const filePath = await AudioRecorder.record();
        vscode.window.showInformationMessage(`Recording saved to: ${filePath}`);
        
        try {
          await SoundPlayer.playFile(filePath);
          // cleanup
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file: ${err}`);
            } else {
              console.log(`File deleted: ${filePath}`);
            }
          });
        } catch (playError) {
          vscode.window.showErrorMessage(`Failed to play recording: ${playError}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Recording failed: ${error}`);
      }
    }
  );

  context.subscriptions.push(recordCommand);
}
