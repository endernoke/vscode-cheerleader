import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';

export interface Position {
  line: number;
  character: number;
}

export interface Selection {
  start: Position;
  end: Position;
}

export interface EditAction {
  action: 'edit';
  selection: Selection;
  text: string;
}

/**
 * Handler for the "edit" action.
 * This handler is responsible for editing a range of text in the editor.
 */
export class EditHandler implements ActionHandler<EditAction> {
  canHandle(action: any): action is EditAction {
    return action?.action === 'edit' && 
           action?.selection?.start != null && 
           action?.selection?.end != null &&
           action?.text != null;
  }

  async handle(action: EditAction, editor: vscode.TextEditor): Promise<void> {
    const range = new vscode.Range(
      action.selection.start.line,
      action.selection.start.character,
      action.selection.end.line,
      action.selection.end.character
    );

    await editor.edit(editBuilder => {
      editBuilder.replace(range, action.text);
    });
  }
}