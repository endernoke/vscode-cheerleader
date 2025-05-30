import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';

export interface CommentAction {
  action: 'comment';
  line: number;
  comment: string;
}

/**
 * Handler for the "comment" action.
 * This handler is responsible for inserting a comment at a specific line in the editor.
 */
export class CommentHandler implements ActionHandler<CommentAction> {
  canHandle(action: any): action is CommentAction {
    return action?.action === 'comment' && 
           typeof action?.line === 'number' &&
           typeof action?.comment === 'string';
  }

  async handle(action: CommentAction, editor: vscode.TextEditor): Promise<void> {
    const position = new vscode.Position(action.line, 0);
    await editor.edit(editBuilder => {
      editBuilder.insert(position, action.comment + '\n');
    });
  }
}