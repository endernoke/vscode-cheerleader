import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from '../services/play_voice';
import { MarkdownRenderer } from "../utils/render_markdown";

const constructPrompt = (userQuestion: string, fileContent: string) => `Guide users to understand code rather than solving problems directly. YOUR RESPONSE MUST BE A VALID JSON ARRAY using this format:

    \`\`\`json
    [
        {
            "action": "conversation",
            "content": "Your short conversational guidance here"
        },
        {
            "action": "comment",
            "line": <line_number>,
            "comment": "Your comment with proper syntax such as # for python"
        },
        {
            "action": "edit",
            "selection": {
                "start": {"line": <number>, "character": <number>},
                "end": {"line": <number>, "character": <number>}
            },
            "text": "New code here"
        },
        {
            "action": "explain",
            "explanation": "Detailed explanation in proper Markdown code, you can (only if necessary) include Mermaid diagram"
        }
    ]
    \`\`\`

    Always start with a conversational response, then add necessary actions. Focus on teaching patterns and concepts.
    
    User question: ${userQuestion}
    
    File content: ${fileContent}`;

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

/**
 * Alas the wanders of the wild reached the promised land, where the great Kingdom of
 * George was to be established. The land was bountiful and prosperous, GPU grew like
 * apples on trees, and even the proletariat had a MacBook. But above all, the people
 * could chat with the Cheerleader anytime they wanted, just a click away.
 * -- The Georgeiste Manifesto, Chapter 2, Verse 4
 */
class InlineChat {
    private isProcessing = false;
    private recordingsDir: string;
    
    /**
     * Initialize the inline chat
     * @param context The extension context
     */
    constructor(context: vscode.ExtensionContext) {
        // Create recordings directory
        this.recordingsDir = path.join(context.globalStorageUri.fsPath, 'recordings');
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }
    
    /**
     * Start a text-based inline chat interaction with the current file
     * @param editor The active text editor
     * @returns Promise that resolves when interaction is complete
     */
    async startInteraction(editor: vscode.TextEditor): Promise<void> {
        if (this.isProcessing) {
            vscode.window.showInformationMessage("Already processing an interaction");
            return;
        }
        
        try {
            this.isProcessing = true;
            
            // Get file content
            const fileContent = editor.document.getText();
            
            // Show input box to get user question
            const userQuestion = await vscode.window.showInputBox({
                prompt: "Ask a question about your code",
                placeHolder: "E.g., How can I improve this function?"
            });
            
            if (!userQuestion) return;
            
            // Get AI response
            const aiResponse = await getAIResponse(constructPrompt(userQuestion, fileContent));
            
            // Parse and process the response
            const actions = this.parseResponse(aiResponse);
            await this.processActions(editor, actions);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Inline chat failed: ${errorMessage}`);
            console.error("Inline chat error:", error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Start a voice-based inline chat interaction with the current file
     * @param editor The active text editor
     * @returns Promise that resolves when interaction is complete
     */
    async startVoiceInteraction(editor: vscode.TextEditor): Promise<void> {
        if (this.isProcessing) {
            vscode.window.showInformationMessage("Already processing an interaction");
            return;
        }
        
        try {
            this.isProcessing = true;
            
            // Record audio
            await AudioRecorder.startRecording();
            
            // Show recording notification with cancel button
            const recordingPrompt = await vscode.window.showInformationMessage(
                "Recording... Click 'Stop' when you're done speaking",
                { modal: false },
                'Stop'
            );
            
            if (!recordingPrompt) {
                vscode.window.showInformationMessage("Recording cancelled");
                return;
            }
            
            // Stop recording and get audio data
            const recordingResult = AudioRecorder.stopRecording(false);
            
            if (recordingResult.buffer.length === 0) {
                vscode.window.showWarningMessage("No audio was recorded");
                return;
            }
            
            // Save the buffer to a temporary file
            const tempFilePath = path.join(this.recordingsDir, `recording-${uuid()}.wav`);
            fs.writeFileSync(tempFilePath, recordingResult.buffer);
            
            try {
                // Convert speech to text
                const transcription = await convertSpeechToText(tempFilePath);
                if (!transcription || transcription.trim().length === 0) {
                    throw new Error("Failed to transcribe speech or no speech detected");
                }
                
                // Show transcription
                // vscode.window.showInformationMessage(`You said: ${transcription}`);
                
                // Get file content
                const fileContent = editor.document.getText();
                
                // Get AI response with context
                const aiResponse = await getAIResponse(constructPrompt(transcription, fileContent));
                
                // Parse and process the response
                const actions = this.parseResponse(aiResponse);
                
                await this.processActions(editor, actions);
                
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
            console.error("Voice interaction error:", error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Parse the AI response into structured actions
     */
    private parseResponse(response: string): ActionResponse[] {
        const actions: ActionResponse[] = [];
        
        // Look for JSON array in code blocks directly
        const match = response.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        if (!match) {
            // If no JSON array found, treat entire response as conversation
            return [{
                type: 'conversation',
                content: response.trim()
            }];
        }

        try {
            const jsonContent = match[1];
            // console.debug('Attempting to parse JSON:', jsonContent);
            const actionArray = JSON.parse(jsonContent);
            // console.debug('Successfully parsed JSON array:', actionArray);
            
            for (const actionData of actionArray) {
                console.debug('Processing action:', actionData);
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
            return [{
                type: 'conversation',
                content: response.trim()
            }];
        }

        return actions;
    }

    /**
     * Parse location information from action data
     */
    private parseLocation(actionData: any): ActionResponse['location'] | undefined {
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
    
    /**
     * Process all actions returned by the AI
     */
    private async processActions(editor: vscode.TextEditor, actions: ActionResponse[]): Promise<void> {
        if (!actions || actions.length === 0) return;
        
        for (const action of actions) {
            switch (action.type) {
                case 'conversation':
                    await playTextToSpeech(action.content);
                    // vscode.window.showInformationMessage(`Cheerleader: ${action.content}`);
                    break;
                    
                case 'edit':
                    if (action.location) {
                        await this.applyEdit(editor, action);
                    }
                    break;
                    
                case 'comment':
                    if (action.location) {
                        await this.insertComment(editor, action);
                    }
                    break;
                    
                case 'explain':
                    await this.showExplanation(action.content);
                    break;
            }
        }
    }
    
    /**
     * Apply an edit action to the document
     */
    private async applyEdit(editor: vscode.TextEditor, action: ActionResponse): Promise<void> {
        if (!action.location) return;
        
        await editor.edit(editBuilder => {
            if (action.location?.selection) {
                const range = new vscode.Range(
                    action.location.selection.start.line,
                    action.location.selection.start.character,
                    action.location.selection.end.line,
                    action.location.selection.end.character
                );
                editBuilder.replace(range, action.content);
            } else if (action.location?.line !== undefined) {
                const line = action.location.line;
                const position = new vscode.Position(line, 0);
                editBuilder.insert(position, action.content + '\n');
            }
        });
    }
    
    /**
     * Insert a comment at the specified line
     */
    private async insertComment(editor: vscode.TextEditor, action: ActionResponse): Promise<void> {
        if (!action.location?.line) return;
        
        await editor.edit(editBuilder => {
            const position = new vscode.Position(action.location!.line!, 0);
            editBuilder.insert(position, action.content + '\n');
        });
    }
    
    /**
     * Show an explanation in a side panel
     */
    private async showExplanation(content: string): Promise<void> {
        MarkdownRenderer.renderInSidebar(content, 'Cheerleader Explanation');
    }
}

/**
 * Register the inline chat commands
 */
export function registerInlineChatCommand(context: vscode.ExtensionContext): void {
    const inlineChat = new InlineChat(context);
    
    // Register text-based interaction
    const textCommand = vscode.commands.registerCommand('cheerleader.inlineChat', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        await inlineChat.startInteraction(editor);
    });
    
    // Register voice-based interaction
    const voiceCommand = vscode.commands.registerCommand('cheerleader.inlineChatVoice', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        await inlineChat.startVoiceInteraction(editor);
    });
    
    context.subscriptions.push(textCommand, voiceCommand);
    
}
