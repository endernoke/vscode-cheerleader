import * as vscode from "vscode";
import { activateOverlay } from "./overlay";
import { activateTTS } from "./services/play_voice";
import { registerAudioCommands } from "./services/record_speech";
import { registerVoiceInteractionCommands } from "./copilot-wrapper/voice_pipeline";
import { registerInlineChatCommand } from "./copilot-wrapper/inline_chat";
import { registerRubberDuckCommand } from "./copilot-wrapper/rubber_duck";
import { registerCodeSupportCommands } from "./copilot-wrapper/code_support";
import { WebSocketService } from "./services/websocket_service";
import { activateEncouragement } from "./services/encouragement_service";
import { registerMonitoringCommand } from "./copilot-wrapper/rotting"
import { registerPasteMeCommand } from "./copilot-wrapper/paste_me";
import { activateSidebar } from "./sidebar";
import { APIManager } from "./utils/api_manager";
import { createCheerleaderChatParticipant } from "./copilot-wrapper/chat_participant";

export function activate(context: vscode.ExtensionContext) {
  // Initialize API Manager first
  const apiManager = APIManager.getInstance(context);
  apiManager.initialize();

  // Activate core features
  activateOverlay(context);
  activateSidebar(context);

  // Then activate features that may use WebSocket
  activateTTS(context);
  registerAudioCommands(context);
  registerVoiceInteractionCommands(context);
  registerInlineChatCommand(context);
  registerRubberDuckCommand(context);
  registerCodeSupportCommands(context);
  registerMonitoringCommand(context);
  activateEncouragement(context);
  registerPasteMeCommand(context);

  // Register Chat Participant
  createCheerleaderChatParticipant(context);

  // Add disposal of WebSocket service
  context.subscriptions.push(
    vscode.Disposable.from({
      dispose: () => {
        const webSocketService = WebSocketService.getInstance();
        webSocketService.close();
      }
    })
  );
}

export function deactivate() {
  // We don't need to do anything here since the websocket server will be automatically closed when the extension is deactivated
  // The overlay app will quit when the websocket is closed
}
