import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from '../services/play_voice';
import { v4 as uuid } from 'uuid';

export interface VoicePipelineOptions {
    customPrompt?: string;
    fileContext?: string;
    showTranscription?: boolean;
    playResponse?: boolean;
}

export interface ActionResponse {
    type: 'edit' | 'comment' | 'explain' | 'conversation';
    content: string;
    location?: {
        line?: number;
        column?: number;
        selection?: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    };
}

interface StructuredResponse {
    actions: ActionResponse[];
}

/**
 * Followers of George exhailed, "Oh Lord, free us from the boilerplate code of interacting
 * with the Cheerleader! We are but mere mortals, and the task is too great for us!" George
 * pitied the CS majors, and thus delegated the great duty of creating the pipeline to Copilot,
 * the Earl of Vibe. "Fear not, my faithful followers," George said, "for I shall deliver
 * you from evil and grant you the ease to interact with the Cheerleader."
 * -- The Georgeiste Manifesto, Chapter 1, Verse 5
 */
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
    static async startPipeline(options: VoicePipelineOptions = {}): Promise<StructuredResponse | undefined> {
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
                
                // Show transcription if enabled
                if (options.showTranscription !== false) {
                    vscode.window.showInformationMessage(`You said: ${transcription}`);
                }
                
                this.updateStatus("$(hubot) Thinking...");
                
                // Step 4: Get AI response with context
                const aiResponse = await getAIResponse(transcription, {
                    customPrompt: options.customPrompt,
                    fileContext: options.fileContext,
                });
                
                // Parse the response to separate actions
                const structuredResponse = this.parseResponse(aiResponse);
                
                // Handle text-to-speech for conversation actions only
                if (options.playResponse !== false) {
                    const conversationActions = structuredResponse.actions.filter(a => a.type === 'conversation');
                    if (conversationActions.length > 0) {
                        this.updateStatus("$(megaphone) Speaking...");
                        await playTextToSpeech(conversationActions[0].content);
                        vscode.window.showInformationMessage(`Cheerleader: ${conversationActions[0].content}`);
                    }
                }

                return structuredResponse;
                
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
            return undefined;
        } finally {
            this.isProcessing = false;
            this.resetStatus();
        }
    }
    
    private static parseResponse(response: string): StructuredResponse {
        const actions: ActionResponse[] = [];
        
        // Look for JSON array in code blocks directly
        const match = response.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        if (!match) {
            // If no JSON array found, treat entire response as conversation
            return {
                actions: [{
                    type: 'conversation',
                    content: response.trim()
                }]
            };
        }

        try {
            const actionArray = JSON.parse(match[1]);
            for (const actionData of actionArray) {
                if (!actionData.action) continue;

                const action: ActionResponse = {
                    type: actionData.action as ActionResponse['type'],
                    content: actionData.content || actionData.comment || actionData.text || actionData.explanation || '',
                    location: this.parseLocation(actionData)
                };
                actions.push(action);
            }
        } catch (e) {
            console.debug('Error parsing JSON array:', e);
            return {
                actions: [{
                    type: 'conversation',
                    content: response.trim()
                }]
            };
        }

        return { actions };
    }

    private static parseLocation(actionData: any): ActionResponse['location'] | undefined {
        if (!actionData) return undefined;

        if (actionData.selection) {
            return {
                selection: {
                    start: {
                        line: actionData.selection.start?.line ?? 0,
                        character: actionData.selection.start?.character ?? 0
                    },
                    end: {
                        line: actionData.selection.end?.line ?? 0,
                        character: actionData.selection.end?.character ?? 0
                    }
                }
            };
        }

        if (typeof actionData.line === 'number') {
            return {
                line: actionData.line,
                column: typeof actionData.column === 'number' ? actionData.column : 0
            };
        }

        return undefined;
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
