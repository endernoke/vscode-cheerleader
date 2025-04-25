import * as vscode from "vscode";
import { InlineChatAgent } from '../agents/inline_chat_agent';

/**
 * Alas the wanders of the wild reached the promised land, where the great Kingdom of
 * George was to be established. The land was bountiful and prosperous, GPU grew like
 * apples on trees, and even the proletariat had a MacBook. But above all, the people
 * could chat with the Cheerleader anytime they wanted, just a click away.
 * -- The Georgeiste Manifesto, Chapter 2, Verse 4
 */
export function registerInlineChatCommand(context: vscode.ExtensionContext): void {
    const inlineChatAgent = new InlineChatAgent(context);
    
    // Register text-based interaction
    const textCommand = vscode.commands.registerCommand('cheerleader.inlineChat', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        await inlineChatAgent.startInteraction(editor);
    });
    
    // Register voice-based interaction
    const voiceCommand = vscode.commands.registerCommand('cheerleader.inlineChatVoice', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        await inlineChatAgent.startVoiceInteraction(editor);
    });
    
    context.subscriptions.push(textCommand, voiceCommand);
}
