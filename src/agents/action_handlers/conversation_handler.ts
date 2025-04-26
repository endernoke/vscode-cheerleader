import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';
import { playTextToSpeech } from '../../services/play_voice';

export interface ConversationAction {
  action: 'conversation';
  content: string;
}

/**
 * Handler for the "conversation" action.
 * This handler is responsible for playing the text-to-speech for the conversation content.
 */
export class ConversationHandler implements ActionHandler<ConversationAction> {
  canHandle(action: any): action is ConversationAction {
    return action?.action === 'conversation';
  }

  async handle(action: ConversationAction, _editor: vscode.TextEditor): Promise<void> {
    await playTextToSpeech(action.content);
  }
}