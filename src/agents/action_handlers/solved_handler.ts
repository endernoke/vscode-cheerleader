import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';
import { playTextToSpeech } from '../../services/play_voice';

export interface SolvedAction {
  action: 'solved';
  message: string;
}

export class SolvedHandler implements ActionHandler<SolvedAction> {
  onSolved?: (action: SolvedAction) => void;

  constructor(onSolved?: (action: SolvedAction) => void) {
    this.onSolved = onSolved;
  }

  canHandle(action: any): action is SolvedAction {
    return action?.action === 'solved';
  }

  async handle(action: SolvedAction, _editor: vscode.TextEditor): Promise<void> {
    await playTextToSpeech(action.message);
    if (this.onSolved) {
      this.onSolved(action);
    }
  }
}
