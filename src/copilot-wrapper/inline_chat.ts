import * as vscode from "vscode";
import { VoiceInteractionPipeline, ActionResponse } from "./voice_pipeline";

const COPILOT_INLINE_PROMPT = `
Here is a file the user is working on. Act as a supportive coding mentor who guides rather than solves
the problem directly. Your goal is to help the user understand the code and improve their coding skills.
Your response should follow these guidelines:

1. Be concise and focused on helping users understand concepts
2. Use hints and socratic questioning to guide learning
3. Provide specific feedback related to the code context

You can perform the following actions by returning JSON objects in your response:

1. Add explanatory comments:
{
    "action": "comment",
    "line": <line_number>,
    "comment": "Your comment in proper syntax"
}

2. Make code edits:
{
    "action": "edit",
    "selection": {
        "start": {"line": <number>, "character": <number>},
        "end": {"line": <number>, "character": <number>}
    },
    "text": "New code here"
}

3. Show detailed explanations:
{
    "action": "explain",
    "explanation": "Detailed explanation that will appear in side panel"
}

Respond conversationally first, then include any necessary actions. Multiple actions can be included.
Keep explanations focused on teaching patterns and concepts rather than giving direct solutions.
`

export function registerInlineChatCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('cheerleader.inlineChat', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        const fileContent = document.getText();

        const response = await VoiceInteractionPipeline.startPipeline({
            fileContext: fileContent,
            customPrompt: COPILOT_INLINE_PROMPT,
            showTranscription: true,
            playResponse: true
        });

        if (response?.actions) {
            for (const action of response.actions) {
                switch (action.type) {
                    case 'edit':
                        if (action.location) {
                            await applyEdit(editor, action);
                        }
                        break;
                    case 'comment':
                        if (action.location) {
                            await insertComment(editor, action);
                        }
                        break;
                    case 'explain':
                        await showExplanation(action.content);
                        break;
                }
            }
        }
        
        return response?.message;
    });

    context.subscriptions.push(disposable);
}

async function applyEdit(editor: vscode.TextEditor, action: ActionResponse) {
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

async function insertComment(editor: vscode.TextEditor, action: ActionResponse) {
    if (!action.location?.line) return;
    
    await editor.edit(editBuilder => {
        const position = new vscode.Position(action.location!.line!, 0);
        editBuilder.insert(position, action.content + '\n');
    });
}

async function showExplanation(content: string) {
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
