import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from '../services/play_voice';

const COPILOT_INLINE_PROMPT = `
Here is a file the user is working on. Act as a supportive coding mentor who guides rather than solves
the problem directly. Your goal is to help the user understand the code and improve their coding skills.
It is VERY IMPORTANT that your response is a valid JSON array.

1. Be concise and focused on helping users understand concepts
2. Use hints and socratic questioning to guide learning
3. Provide specific feedback related to the code context

You should return a JSON array with entires that can be one of the following types:

1. Converstaional response:
{
    "action": "conversation",
    "content": "Your conversational response here"
}

2. Add explanatory comments:
{
    "action": "comment",
    "line": <line_number>,
    "comment": "Your comment in proper syntax"
}

3. Make code edits:
{
    "action": "edit",
    "selection": {
        "start": {"line": <number>, "character": <number>},
        "end": {"line": <number>, "character": <number>}
    },
    "text": "New code here"
}

4. Show detailed explanations:
{
    "action": "explain",
    "explanation": "Detailed explanation that will appear in side panel"
}

Respond conversationally first, then include any necessary actions. Multiple actions can be included.
Keep explanations focused on teaching patterns and concepts rather than giving direct solutions.

Here is an example of a valid JSON response:

'''json
[
    {
        "action": "conversation",
        "content": "Have you considered using a different approach?"
    },
    {
        "action": "comment",
        "line": 10,
        "comment": "// Consider using a more descriptive variable name"
    },
    {
        "action": "edit",
        "selection": {
            "start": {"line": 20, "character": 0},
            "end": {"line": 25, "character": 0}
        },
        "text": "function newFunction() {\n  // Your code here\n}"
    },
    {
        "action": "explain",
        "explanation": "This code is inefficient because..."
    }
]
'''
`

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
 * Handles the inline chat functionality with the AI, combining
 * both the interaction pipeline and action processing
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
            const aiResponse = await getAIResponse(userQuestion, {
                customPrompt: COPILOT_INLINE_PROMPT,
                fileContext: fileContent,
            });
            
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
            const statusBarItem = this.createStatusBarItem();
            this.updateStatus(statusBarItem, "$(mic-filled) Recording...");
            
            // Record audio
            await AudioRecorder.startRecording();
            
            // Show recording notification with cancel button
            const recordingPrompt = await vscode.window.showInformationMessage(
                "Recording... Click 'Stop' when you're done speaking",
                { modal: false },
                'Stop'
            );
            
            if (!recordingPrompt) {
                this.updateStatus(statusBarItem, "$(mic) Ask Cheerleader");
                return;
            }
            
            // Stop recording and get audio data
            this.updateStatus(statusBarItem, "$(sync~spin) Processing audio...");
            const recordingResult = AudioRecorder.stopRecording(false);
            
            if (recordingResult.buffer.length === 0) {
                vscode.window.showWarningMessage("No audio was recorded");
                this.updateStatus(statusBarItem, "$(mic) Ask Cheerleader");
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
                vscode.window.showInformationMessage(`You said: ${transcription}`);
                
                this.updateStatus(statusBarItem, "$(hubot) Thinking...");
                
                // Get file content
                const fileContent = editor.document.getText();
                
                // Get AI response with context
                const aiResponse = await getAIResponse(transcription, {
                    customPrompt: COPILOT_INLINE_PROMPT,
                    fileContext: fileContent,
                });
                
                // Parse and process the response
                const actions = this.parseResponse(aiResponse);
                
                // Handle text-to-speech for conversation actions
                const conversationActions = actions.filter(a => a.type === 'conversation');
                if (conversationActions.length > 0) {
                    this.updateStatus(statusBarItem, "$(megaphone) Speaking...");
                    await playTextToSpeech(conversationActions[0].content);
                    vscode.window.showInformationMessage(`Cheerleader: ${conversationActions[0].content}`);
                }
                
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
                this.updateStatus(statusBarItem, "$(mic) Ask Cheerleader");
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Voice interaction failed: ${errorMessage}`);
            console.error("Voice interaction error:", error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    private createStatusBarItem(): vscode.StatusBarItem {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
        );
        statusBarItem.text = '$(mic) Ask Cheerleader';
        statusBarItem.show();
        return statusBarItem;
    }
    
    private updateStatus(statusBarItem: vscode.StatusBarItem, text: string): void {
        statusBarItem.text = text;
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
                    vscode.window.showInformationMessage(`Cheerleader: ${action.content}`);
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
        const panel = vscode.window.createWebviewPanel(
            'cheerleaderExplanation',
            'Cheerleader Explanation',
            vscode.ViewColumn.Beside,
            {}
        );
        
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
                <body>
                    <pre>${content}</pre>
                </body>
            </html>
        `;
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
    
    // Create status bar item for voice interaction
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        1000
    );
    statusBar.command = 'cheerleader.inlineChatVoice';
    statusBar.text = '$(mic) Ask Cheerleader';
    statusBar.tooltip = 'Speak to your coding companion';
    statusBar.show();
    
    context.subscriptions.push(statusBar);
}
