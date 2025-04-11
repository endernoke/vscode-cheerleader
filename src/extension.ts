import * as vscode from "vscode";
import { activateOverlay } from "./overlay";
import { activateVoice } from "./services/play_voice";
import { registerAudioCommands } from "./services/record_speech";
import { registerVoiceInteractionCommands } from "./copilot-wrapper/voice_pipeline";
import { registerInlineChatCommand } from "./copilot-wrapper/inline_chat";

export function activate(context: vscode.ExtensionContext) {
  // Activate features
  activateOverlay(context);
  activateVoice(context);
  registerAudioCommands(context);
  registerVoiceInteractionCommands(context); // Add the new voice interaction pipeline
  registerInlineChatCommand(context); // Register inline chat command
}

export function deactivate() {
  // We don't need to do anything here since the websocket server will be automatically closed when the extension is deactivated
  // The overlay app will quit when the websocket is closed
}
