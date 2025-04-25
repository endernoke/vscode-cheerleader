import * as vscode from 'vscode';
import { ActionHandler } from './action_handler';
import { MarkdownRenderer } from '../../utils/render_markdown';

export interface ExplainAction {
  action: 'explain';
  explanation: string;
}

/**
 * Handler for the "explain" action.
 * This handler is responsible for rendering the explanation in the sidebar.
 * It uses the MarkdownRenderer in `src/utils/render_markdown.ts`.
 * @note Recommend specifying in prompt to use markdown and properly wrap the mermaid code block
 */
export class ExplainHandler implements ActionHandler<ExplainAction> {
  private static firstExplanation: boolean = true;

  canHandle(action: any): action is ExplainAction {
    return action?.action === 'explain' && 
           typeof action?.explanation === 'string';
  }

  async handle(action: ExplainAction, _editor: vscode.TextEditor): Promise<void> {
    if (ExplainHandler.firstExplanation) {
      MarkdownRenderer.renderInSidebar(action.explanation);
      ExplainHandler.firstExplanation = false;
    } else {
      MarkdownRenderer.appendToSidebar(action.explanation);
    }
  }
}