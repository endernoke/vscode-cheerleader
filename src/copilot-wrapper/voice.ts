/*
This is the primitive, naive approach to attempt to use the existing github copilot commands directly.
It does NOT seem to work for now, neither is it necessary because we can just use the VSCode Language Model API.
I will probably remove this shortly, but right now it brings up the prompt interface in the editor maybe we can exploit and customize it.
*/

import * as vscode from "vscode";

async function getCopilotSuggestion(prompt: string): Promise<string> {
  try {
    const result = await vscode.commands.executeCommand(
      "github.copilot.chat.generate",
      prompt
    );
    return result as string;
  } catch (error) {
    console.error("Error getting Copilot suggestion:", error);
    return "";
  }
}

export function activateCopilotVoice(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "cheerleader.askCopilot",
    async () => {
      try {
        const response = await getCopilotSuggestion(
          "Write a function that sorts an array"
        );
        vscode.window.showInformationMessage(response);
      } catch (error) {
        vscode.window.showErrorMessage("Failed to get Copilot response");
      }
    }
  );

  context.subscriptions.push(disposable);
}
