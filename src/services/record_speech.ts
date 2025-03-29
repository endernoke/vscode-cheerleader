import * as vscode from "vscode";
import mic from "node-microphone";
import { Writable } from "stream";
import { join } from "path";
import fs from "fs";
import { SoundPlayer } from "../copilot-wrapper/play_voice";

export class AudioRecorder {
  private static microphone: mic;
  private static isRecording: boolean = false;
  private static statusBar: vscode.StatusBarItem;
  private static audioChunks: Buffer[] = [];

  static initialize(context: vscode.ExtensionContext) {
    this.microphone = new mic();
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBar.command = "cheerleader.stopRecording";
    return this.statusBar;
  }

  static startRecording(): Promise<Buffer> {
    if (this.isRecording) {
      return Promise.reject(new Error("Already recording"));
    }

    return new Promise((resolve, reject) => {
      try {
        this.isRecording = true;
        this.audioChunks = [];
        this.updateStatus("$(mic-filled) Recording...");

        const micStream = this.microphone.startRecording();

        // Collect audio chunks
        micStream.on("data", (chunk: Buffer) => {
          this.audioChunks.push(chunk);
        });

        micStream.on("error", (error: Error) => {
          this.stopRecording();
          reject(error);
        });
      } catch (error) {
        this.stopRecording();
        reject(error);
      }
    });
  }

  static stopRecording(saveFile: boolean = false): { buffer: Buffer, filePath?: string } {
    if (!this.isRecording) {
      return { buffer: Buffer.concat([]) };
    }

    this.isRecording = false;
    this.updateStatus("");
    this.microphone.stopRecording();

    // Combine all chunks into one buffer
    const audioBuffer = Buffer.concat(this.audioChunks);
    
    if (saveFile && audioBuffer.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const recordingsDir = join(__dirname, '..', '..', 'recordings');
      
      // Create recordings directory if it doesn't exist
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
      
      const filePath = join(recordingsDir, `recording-${timestamp}.wav`);
      
      // Save the audio buffer to a file
      fs.writeFileSync(filePath, audioBuffer);
      
      return { buffer: audioBuffer, filePath };
    }
    
    return { buffer: audioBuffer };
  }

  private static updateStatus(text: string) {
    this.statusBar.text = text;
    text ? this.statusBar.show() : this.statusBar.hide();
  }
}

export function registerAudioCommands(context: vscode.ExtensionContext) {
  // Initialize recorder
  const statusBar = AudioRecorder.initialize(context);
  context.subscriptions.push(statusBar);

  // Start recording command
  let startCommand = vscode.commands.registerCommand(
    "cheerleader.startRecording",
    async () => {
      try {
        await AudioRecorder.startRecording();
      } catch (error) {
        vscode.window.showErrorMessage(`Recording failed: ${error}`);
      }
    }
  );

  // Stop recording and process audio
  let stopCommand = vscode.commands.registerCommand(
    "cheerleader.stopRecording",
    async () => {
      try {
        const result = AudioRecorder.stopRecording(true);
        vscode.window.showInformationMessage("Recording stopped");
        
        if (result.filePath) {
          // Play the recorded audio
          await SoundPlayer.playFile(result.filePath);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Processing failed: ${error}`);
      }
    }
  );

  context.subscriptions.push(startCommand, stopCommand);
}
