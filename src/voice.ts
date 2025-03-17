import * as vscode from "vscode";

// async function getCopilotSuggestion(prompt: string): Promise<string> {
//   try {
//     const result = await vscode.commands.executeCommand(
//       "github.copilot.generate",
//       prompt
//     );
//     return result as string;
//   } catch (error) {
//     console.error("Error getting Copilot suggestion:", error);
//     return "";
//   }
// }

// export function activateCopilotVoice(context: vscode.ExtensionContext) {
//   let disposable = vscode.commands.registerCommand(
//     "cheerleader.askCopilot",
//     async () => {
//       try {
//         const response = await getCopilotSuggestion(
//           "Write a function that sorts an array"
//         );
//         vscode.window.showInformationMessage(response);
//       } catch (error) {
//         vscode.window.showErrorMessage("Failed to get Copilot response");
//       }
//     }
//   );

//   context.subscriptions.push(disposable);
// }

// Create an output channel for debugging
const outputChannel = vscode.window.createOutputChannel("Cheerleader Voice");

async function getCopilotSuggestion(prompt: string): Promise<string> {
  try {
    outputChannel.appendLine(
      `Attempting to get Copilot suggestion for: ${prompt}`
    );
    const result = await vscode.commands.executeCommand(
      "github.copilot.generate",
      prompt
    );
    outputChannel.appendLine(`Raw result from Copilot: ${result}`);
    return result as string;
  } catch (error) {
    outputChannel.appendLine(`Error in getCopilotSuggestion: ${error}`);
    return "";
  }
}

export function activateCopilotVoice(context: vscode.ExtensionContext) {
  outputChannel.show(true); // Show output channel when extension activates
  outputChannel.appendLine("Cheerleader Voice extension activated");

  let disposable = vscode.commands.registerCommand(
    "cheerleader.askCopilot",
    async () => {
      outputChannel.appendLine("Command cheerleader.askCopilot triggered");

      // First, show immediate feedback
      vscode.window.showInformationMessage("Processing Copilot request...");

      try {
        const response = await getCopilotSuggestion(
          "Write a function that sorts an array"
        );

        if (response) {
          vscode.window.showInformationMessage(`Copilot Response: ${response}`);
          outputChannel.appendLine(`Success - Response: ${response}`);
        } else {
          vscode.window.showWarningMessage(
            "Received empty response from Copilot"
          );
          outputChannel.appendLine("Warning - Empty response received");
        }
      } catch (error) {
        outputChannel.appendLine(`Error in command execution: ${error}`);
        vscode.window.showErrorMessage(
          `Failed to get Copilot response: ${error}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}
