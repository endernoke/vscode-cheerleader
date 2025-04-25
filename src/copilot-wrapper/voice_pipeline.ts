import * as vscode from "vscode";
import * as fs from 'fs';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from '../services/play_voice';

export interface VoicePipelineOptions {
    customPrompt?: string;
    fileContext?: string;
    showTranscription?: boolean;
    playResponse?: boolean;
}

/**
 * Followers of George exhailed, "Oh Lord, free us from the boilerplate code of interacting
 * with the Cheerleader! We are but mere mortals, and the task is too great for us!" George
 * pitied the CS majors, and thus delegated the great duty of creating the pipeline to Copilot,
 * the Earl of Vibe. "Fear not, my faithful followers," George said, "for I shall deliver
 * you from evil and grant you the ease to interact with the Cheerleader."
 * -- The Georgeiste Manifesto, Chapter 1, Verse 4
 */
export class VoiceInteractionPipeline {
    private static isProcessing: boolean = false;
    
    /**
     * Activate the voice to voice pipeline. Allows for customization of prompt and context.
     * You should handle the actions in the UI or the editor using AI response in the command, not here.
     * @param options Options for the pipeline.
     * @returns The AI's response or undefined if an error occurred.
     * @throws Error if the pipeline fails at any step.
     * @example
     * const response = await VoiceInteractionPipeline.startPipeline({
     *  customPrompt: "You are a coding assistant. Use the provided file content as context to answer the question.", 
     *  fileContext: "const x = 5;",
     *  showTranscription: true,
     *  playResponse: true
     * });
     * console.log(response); // AI's response
     */
    static async startPipeline(options: VoicePipelineOptions = {}): Promise<string | undefined> {
        if (this.isProcessing) {
            vscode.window.showInformationMessage("Already processing a voice interaction");
            return;
        }
        
        try {
            this.isProcessing = true;
            
            // Use the AudioRecorder's record method which handles file saving
            const audioFilePath = await AudioRecorder.record();
            
            if (!audioFilePath) {
                vscode.window.showWarningMessage("No audio was recorded");
                return;
            }
            
            try {
                // Step 3: Convert speech to text
                const transcription = await convertSpeechToText(audioFilePath);
                if (!transcription || transcription.trim().length === 0) {
                    throw new Error("Failed to transcribe speech or no speech detected");
                }
                
                // Show transcription if enabled
                if (options.showTranscription !== false) {
                    vscode.window.showInformationMessage(`You said: ${transcription}`);
                }
                
                // Step 4: Get AI response with context
                const aiResponse = await getAIResponse(transcription, {
                    customPrompt: options.customPrompt,
                    fileContext: options.fileContext,
                });
                
                // Step 5: Play AI response if enabled
                if (options.playResponse !== false) {
                    await playTextToSpeech(aiResponse);
                }

                return aiResponse;
                
            } finally {
                // Clean up the temporary file
                try {
                    if (fs.existsSync(audioFilePath)) {
                        fs.unlinkSync(audioFilePath);
                    }
                } catch (cleanupError) {
                    console.error("Error cleaning up temporary file:", cleanupError);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Voice interaction failed: ${errorMessage}`);
            console.error("Voice interaction pipeline error:", error);
            return undefined;
        } finally {
            this.isProcessing = false;
        }
    }
}

export function registerVoiceInteractionCommands(context: vscode.ExtensionContext) {
    // Register command
    const command = vscode.commands.registerCommand(
        'cheerleader.startVoiceInteraction',
        async () => {
            try {
                await VoiceInteractionPipeline.startPipeline({
                    showTranscription: true,
                    playResponse: true
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
    
    context.subscriptions.push(command);
}
