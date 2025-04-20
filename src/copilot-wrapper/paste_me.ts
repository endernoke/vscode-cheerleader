import * as vscode from "vscode";
import * as path from "path";
import { getAIResponse } from "../services/language_model";
import { playTextToSpeech, playAudioFromFile } from "../services/play_voice";
import { MarkdownRenderer } from "../utils/render_markdown";

class CodeExplainer {
    private readonly MIN_LINES_THRESHOLD = 100;
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private getAudioFilePath(fileName: string): string {
        return this.context.asAbsolutePath(
            path.join('assets', 'audio', fileName)
        );
    }

    async onPasteEvent(editor: vscode.TextEditor, pastedText?: string) {
        // If pastedText is provided directly, use it; otherwise get from editor
        const textToAnalyze = pastedText || editor.document.getText(editor.selection);
        const lineCount = textToAnalyze.split('\n').length;

        if (lineCount < this.MIN_LINES_THRESHOLD) {
            return;
        }

        await playAudioFromFile(
            this.getAudioFilePath('paste_me.mp3'),
            "Would you like me to explain key concepts from this code?"
        );

        const response = await vscode.window.showInformationMessage(
            `This paste contains ${lineCount} lines. Would you like me to explain this code?`,
            'Yes', 'No'
        );

        if (response === 'Yes') {
            await this.explainCode(textToAnalyze);
        }
    }
    
    async explainCode(pastedCode: string) {
        try {
            const prompt = `You are a friendly, enthusiastic coding assistant and cheerleader. The user has pasted code and needs clear, engaging explanations.
                Analyze the code and provide:

                1. Key technical elements (3 max, only if worth mentioning):
                    - Core algorithms or patterns
                    - Important workflow logic
                    - Notable design decisions
                    - Critical language features used

                2. Quick practical insights:
                    - Main purpose and value
                    - Common use cases
                    - Potential gotchas
                    - Best practices demonstrated

                Response format (JSON):
                {
                    "speech": "short, friendly, and perhaps funny or inspirational message that summarizes key concepts",
                    "explanation": "Detailed markdown with:
                        - Brief code overview
                        - Key concepts breakdown
                        - Practical examples
                        - Mermaid diagrams (if helpful)
                        - Best practices tips"
                }

                Keep the speech part concise and friendly. Make the explanation thorough but approachable.
                
                Pasted Code: ${pastedCode}`;

            const result = await getAIResponse(prompt);

            const cleanedResult = result
              .replace(/```json/g, "") // Remove ```json
              .replace(/```/g, "") // Remove ```
              .replace(/`/g, "") // Remove stray backticks
              .trim();

            const parsedResponse = JSON.parse(cleanedResult);
            await playTextToSpeech(parsedResponse.speech);
            await this.renderInSidebar(parsedResponse.explanation);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to explain code: ${error}`);
        }
    }

    private renderInSidebar(explanation: string) {
        MarkdownRenderer.renderInSidebar(explanation, 'Code Explanation');
    }
}

export function registerPasteMeCommand(context: vscode.ExtensionContext) {
    const codeExplainer = new CodeExplainer(context);

    const pasteListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
            return;
        }

        // Only process paste operations
        if (event.contentChanges.length === 1) {
            const change = event.contentChanges[0];
            // Check if it's likely a paste operation (has newlines or is substantial)
            if (change.text.includes('\n') || change.text.length > 100) {
                await codeExplainer.onPasteEvent(editor, change.text);
            }
        }
    });

    context.subscriptions.push( 
        pasteListener,
        vscode.commands.registerCommand("cheerleader.explainPastedCode", async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await codeExplainer.onPasteEvent(editor);
            }
        })
    );
}
