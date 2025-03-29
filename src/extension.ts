import * as vscode from "vscode";
import { activateOverlay } from "./overlay";
import { activateChatCommand } from "./copilot-wrapper/chat";
import { activateVoice } from "./copilot-wrapper/play_voice";
import { registerAudioCommands } from "./services/record_speech";
import { registerVoiceInteractionCommands } from "./copilot-wrapper/mini_pipeline";

export function activate(context: vscode.ExtensionContext) {
  // Activate features
  activateOverlay(context);
  activateVoice(context);
  activateChatCommand(context);
  registerAudioCommands(context);
  registerVoiceInteractionCommands(context); // Add the new voice interaction pipeline
}

export function deactivate() {
  // We don't need to do anything here since the websocket server will be automatically closed when the extension is deactivated
  // The overlay app will quit when the websocket is closed
}
