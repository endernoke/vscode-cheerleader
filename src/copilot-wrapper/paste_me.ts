import * as vscode from "vscode";
import * as path from "path";
import { getAIResponse } from "../services/language_model";
import { playTextToSpeech, playAudioFromFile } from "../services/play_voice";
import { MarkdownRenderer } from "../utils/render_markdown";

const PASTE_ME_PROMPT = `Analyze the pasted code and provide/explain:

    1. Key technical elements (3 max, only if worth mentioning):
        - Core algorithms or patterns
        - Important workflow logic
        - Notable design decisions

    2. Quick practical insights for learning:
        - Main purpose and value
        - Common use cases
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

    Keep the speech part concise and friendly. Make the explanation thorough but approachable.`;

/**
 * His wisdom then commanded, "The unexamined code is not worth pasting."
 * -- The Georgeiste Manifesto, Chapter 3, Verse 2
 */
class CodeExplainer {
  private readonly MIN_LINES_THRESHOLD = 100;
  private readonly context: vscode.ExtensionContext;
  private pasteListener: vscode.Disposable | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getAudioFilePath(fileName: string): string {
    return this.context.asAbsolutePath(path.join("assets", "audio", fileName));
  }

  async onPasteEvent(editor: vscode.TextEditor, pastedText?: string) {
    // If pastedText is provided directly, use it; otherwise get from editor
    const textToAnalyze =
      pastedText || editor.document.getText(editor.selection);
    const lineCount = textToAnalyze.split("\n").length;

    if (lineCount < this.MIN_LINES_THRESHOLD) {
      return;
    }

    await playAudioFromFile(
      this.getAudioFilePath("paste_me.mp3"),
      "Would you like me to explain key concepts from this code?"
    );

    const response = await vscode.window.showInformationMessage(
      `This paste contains ${lineCount} lines. Would you like me to explain this code?`,
      "Yes",
      "No"
    );

    if (response === "Yes") {
      await this.explainCode(textToAnalyze);
    }
  }

  async explainCode(pastedCode: string) {
    try {
      const result = await getAIResponse(null, {
        customPrompt: PASTE_ME_PROMPT,
        fileContext: pastedCode,
      });

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
    MarkdownRenderer.renderInSidebar(explanation, "Code Explanation");
  }

  startPasteMonitoring() {
    if (this.pasteListener) return;

    this.pasteListener = vscode.workspace.onDidChangeTextDocument(
      async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
          return;
        }

        // Only process paste operations
        if (event.contentChanges.length === 1) {
          const change = event.contentChanges[0];
          // Check if it's likely a paste operation (has newlines or is substantial)
          if (change.text.includes("\n") || change.text.length > 100) {
            await this.onPasteEvent(editor, change.text);
          }
        }
      }
    );
  }

  stopPasteMonitoring() {
    if (this.pasteListener) {
      this.pasteListener.dispose();
      this.pasteListener = null;
    }
  }
}

export function registerPasteMeCommand(context: vscode.ExtensionContext) {
  const codeExplainer = new CodeExplainer(context);

  // Check initial configuration
  const config = vscode.workspace.getConfiguration("cheerleader.paste");
  if (config.get("monitoringEnabled", true)) {
    codeExplainer.startPasteMonitoring();
  }

  // Register toggle command
  const toggleCommand = vscode.commands.registerCommand(
    "cheerleader.togglePasteMonitoring",
    () => {
      const config = vscode.workspace.getConfiguration("cheerleader.paste");
      const currentlyEnabled = config.get("monitoringEnabled", true);

      if (currentlyEnabled) {
        codeExplainer.stopPasteMonitoring();
        vscode.window.showInformationMessage("Paste monitoring stopped.");
      } else {
        codeExplainer.startPasteMonitoring();
        vscode.window.showInformationMessage("Paste monitoring started.");
      }

      config.update(
        "monitoringEnabled",
        !currentlyEnabled,
        vscode.ConfigurationTarget.Global
      );
    }
  );

  context.subscriptions.push(
    toggleCommand,
    vscode.commands.registerCommand(
      "cheerleader.explainPastedCode",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await codeExplainer.onPasteEvent(editor);
        }
      }
    )
  );
}
