import * as vscode from "vscode";
import mic from "node-microphone";
import { Writable } from "stream";
import { join } from "path";
import fs from "fs";
import { SoundPlayer } from "./play_voice";

/**
 * "Pray, let us mark the thy voice of grace and wisdom, for it is
 * the voice of George, the great and powerful." And lo, George did
 * grant them the gift of the AudioRecorder, and the people did rejoice.
 * -- The Georgeiste Manifesto, Chapter 1, Verse 6
 */
export class AudioRecorder {
  private static microphone: mic;
  private static isRecording: boolean = false;
  private static statusBar: vscode.StatusBarItem;
  private static audioChunks: Buffer[] = [];
  private static micStream: any;

  static initialize(context: vscode.ExtensionContext) {
    this.microphone = new mic();
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBar.command = "cheerleader.stopRecording";
    
    // Set up microphone event listeners
    // this.microphone.on('info', (info) => {
    //   console.log('Microphone info:', info);
    // });
    
    // this.microphone.on('error', (error) => {
    //   console.error('Microphone error:', error);
    //   vscode.window.showErrorMessage(`Microphone error: ${error}`);
    //   this.stopRecording();
    // });
    
    return this.statusBar;
  }

  static startRecording(): Promise<void> {
    if (this.isRecording) {
      return Promise.reject(new Error("Already recording"));
    }

    return new Promise((resolve, reject) => {
      try {
        this.isRecording = true;
        this.audioChunks = [];
        this.updateStatus("$(mic-filled) Recording...");

        // Start the microphone recording
        this.micStream = this.microphone.startRecording();
        
        console.log("Recording started");
        
        // Create a writable stream to collect audio chunks
        const writableStream = new Writable({
          write: (chunk, encoding, next) => {
            console.log(`Received chunk of size: ${chunk.length}`);
            this.audioChunks.push(chunk);
            next();
          }
        });
        
        // Pipe the microphone stream to our writable stream
        this.micStream.pipe(writableStream);
        
        this.micStream.on("error", (error: Error) => {
          console.error("Stream error:", error);
          reject(error);
        });
        
        resolve();
      } catch (error) {
        this.stopRecording();
        console.error("Failed to start recording:", error);
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
    
    // Stop the microphone recording
    if (this.micStream) {
      this.micStream.unpipe();
      this.micStream = null;
    }
    this.microphone.stopRecording();
    
    console.log(`Recording stopped. Collected ${this.audioChunks.length} chunks.`);

    // Combine all chunks into one buffer
    const audioBuffer = Buffer.concat(this.audioChunks);
    console.log(`Total buffer size: ${audioBuffer.length} bytes`);
    
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
      console.log(`Saved recording to: ${filePath}`);
      
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
        vscode.window.showInformationMessage("Recording started");
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
        vscode.window.showInformationMessage(`Recording stopped - ${result.buffer.length} bytes recorded`);
        
        if (result.filePath && result.buffer.length > 0) {
          // Play the recorded audio
          try {
            await SoundPlayer.playFile(result.filePath);
          } catch (playError) {
            vscode.window.showErrorMessage(`Failed to play recording: ${playError}`);
          }
        } else if (result.buffer.length === 0) {
          vscode.window.showWarningMessage("No audio data was recorded");
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Processing failed: ${error}`);
      }
    }
  );

  context.subscriptions.push(startCommand, stopCommand);
}
