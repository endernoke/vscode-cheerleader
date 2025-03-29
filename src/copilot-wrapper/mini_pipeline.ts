import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from './play_voice';
import { v4 as uuid } from 'uuid';

export class VoiceInteractionPipeline {
    private static isProcessing: boolean = false;
    private static recordingsDir: string;
    private static statusBarItem: vscode.StatusBarItem;
    
    static initialize(context: vscode.ExtensionContext) {
        // Create recordings directory
        this.recordingsDir = path.join(context.globalStorageUri.fsPath, 'recordings');
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
        );
        this.statusBarItem.command = 'cheerleader.startVoiceInteraction';
        this.statusBarItem.text = '$(mic) Ask Cheerleader';
        this.statusBarItem.tooltip = 'Speak to your coding companion';
        this.statusBarItem.show();
        
        return this.statusBarItem;
    }
    
    static async startPipeline(): Promise<void> {
        if (this.isProcessing) {
            vscode.window.showInformationMessage("Already processing a voice interaction");
            return;
        }
        
        try {
            this.isProcessing = true;
            this.updateStatus("$(mic-filled) Recording...");
            
            // Step 1: Record audio
            await AudioRecorder.startRecording();
            
            // Show recording notification with cancel button
            const recordingPrompt = await vscode.window.showInformationMessage(
                "Recording... Click 'Stop' when you're done speaking",
                { modal: false },
                'Stop'
            );
            
            if (!recordingPrompt) {
                // User dismissed the notification without clicking Stop
                return;
            }
            
            // Step 2: Stop recording and get audio data
            this.updateStatus("$(sync~spin) Processing audio...");
            const recordingResult = AudioRecorder.stopRecording(false);
            
            if (recordingResult.buffer.length === 0) {
                vscode.window.showWarningMessage("No audio was recorded");
                this.resetStatus();
                return;
            }
            
            // Save the buffer to a temporary file
            const tempFilePath = path.join(this.recordingsDir, `recording-${uuid()}.wav`);
            fs.writeFileSync(tempFilePath, recordingResult.buffer);
            
            try {
                // Step 3: Convert speech to text
                const transcription = await convertSpeechToText(tempFilePath);
                if (!transcription || transcription.trim().length === 0) {
                    throw new Error("Failed to transcribe speech or no speech detected");
                }
                
                // Show transcription
                vscode.window.showInformationMessage(`You said: ${transcription}`);
                this.updateStatus("$(hubot) Thinking...");
                
                // Step 4: Get AI response
                const aiResponse = await getAIResponse(transcription);
                
                // Step 5: Convert response to speech and play it
                this.updateStatus("$(megaphone) Speaking...");
                await playTextToSpeech(aiResponse);
                
                // Show the AI response in a temporary notification
                vscode.window.showInformationMessage(`Cheerleader: ${aiResponse}`);
            } finally {
                // Clean up the temporary file
                try {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                } catch (cleanupError) {
                    console.error("Error cleaning up temporary file:", cleanupError);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Voice interaction failed: ${errorMessage}`);
            console.error("Voice interaction pipeline error:", error);
        } finally {
            this.isProcessing = false;
            this.resetStatus();
        }
    }
    
    private static updateStatus(text: string): void {
        this.statusBarItem.text = text;
    }
    
    private static resetStatus(): void {
        this.statusBarItem.text = '$(mic) Ask Cheerleader';
    }
}

export function registerVoiceInteractionCommands(context: vscode.ExtensionContext) {
    // Initialize pipeline
    const statusBar = VoiceInteractionPipeline.initialize(context);
    context.subscriptions.push(statusBar);
    
    // Register command
    const command = vscode.commands.registerCommand(
        'cheerleader.startVoiceInteraction',
        async () => {
            try {
                await VoiceInteractionPipeline.startPipeline();
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
    
    context.subscriptions.push(command);
}
