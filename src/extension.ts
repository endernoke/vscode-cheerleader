import * as vscode from "vscode";
import { activateOverlay } from "./overlay";
import { activateCopilotVoice } from "./voice";

export function activate(context: vscode.ExtensionContext) {
  // Activate both features
  activateOverlay(context);
  activateCopilotVoice(context);
}

export function deactivate() {
  // We don't need to do anything here since the websocket server will be automatically closed when the extension is deactivated
  // The overlay app will quit when the websocket is closed
}
