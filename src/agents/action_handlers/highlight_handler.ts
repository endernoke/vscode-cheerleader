import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';

export interface HighlightAction {
  action: 'highlight';
  selection: {
    start: number;
    end?: number;
  };
}

/**
 * Handler for the "highlight" action.
 * This handler is responsible for highlighting a range of lines in the editor.
 */
export class HighlightHandler implements ActionHandler<HighlightAction> {
  canHandle(action: any): action is HighlightAction {
    return action?.action === 'highlight' && 
           typeof action?.selection?.start === 'number';
  }

  async handle(action: HighlightAction, editor: vscode.TextEditor): Promise<void> {
    const startLine = action.selection.start;
    const endLine = action.selection.end ?? startLine;
    
    const range = new vscode.Range(
      startLine, 0,
      endLine, Number.MAX_SAFE_INTEGER
    );

    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range);
  }
}