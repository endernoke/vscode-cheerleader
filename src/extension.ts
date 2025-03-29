import * as vscode from "vscode";
import { activateOverlay } from "./overlay";
import { activateCodeTutor } from "./copilot-wrapper/tutor";
import { createCheerleaderParticipant } from "./copilot-wrapper/participant";
import { activateVoice } from "./copilot-wrapper/voice";

export function activate(context: vscode.ExtensionContext) {
  // Activate both features
  activateOverlay(context);
  activateCodeTutor(context);
  createCheerleaderParticipant(context);
  activateVoice(context);
}

export function deactivate() {
  // We don't need to do anything here since the websocket server will be automatically closed when the extension is deactivated
  // The overlay app will quit when the websocket is closed
}
