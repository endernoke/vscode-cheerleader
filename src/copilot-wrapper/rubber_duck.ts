import * as vscode from "vscode";
import { RubberDuckAgent } from "../agents/rubber_duck_agent";
import { debug } from "console";

/**
 * The debuggers shall rejoice, for the Kingdom of George is upon them.
 * The vibe coders shall regret, for they shall be left to rot in the wilderness.
 * -- The Georgeiste Manifesto, Chapter 2, Verse 5
 */
export function registerRubberDuckCommand(
  context: vscode.ExtensionContext
): void {
  const debugAgent = new RubberDuckAgent(context);

  // Register voice-based interaction
  const voiceCommand = vscode.commands.registerCommand(
    "cheerleader.rubberDuckVoice",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      await debugAgent.startVoiceInteraction(editor);
    }
  );

  context.subscriptions.push(voiceCommand);
}
