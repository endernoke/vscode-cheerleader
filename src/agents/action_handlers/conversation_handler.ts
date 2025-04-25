import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';
import { playTextToSpeech } from '../../services/play_voice';

export interface ConversationAction {
  action: 'conversation';
  content: string;
}

export class ConversationHandler implements ActionHandler<ConversationAction> {
  canHandle(action: any): action is ConversationAction {
    return action?.action === 'conversation';
  }

  async handle(action: ConversationAction, _editor: vscode.TextEditor): Promise<void> {
    await playTextToSpeech(action.content);
  }
}