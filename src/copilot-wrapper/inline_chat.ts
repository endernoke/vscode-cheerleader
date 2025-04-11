import * as vscode from "vscode";
import { VoiceInteractionPipeline } from "./voice_pipeline";

const COPILOT_INLINE_PROMPT = `
Here is a file the user is working on. You should try to help the user with their questions
or provide comments in a concise way. Do not give them the answer directly, but attempt to
help them understand the thinking process by hinting or suggesting the next steps.
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
        
        return response;
    });

    context.subscriptions.push(disposable);
}
