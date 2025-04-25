import * as vscode from 'vscode';

import { ConversationAction } from "./conversation_handler";
import { EditAction } from "./edit_handler";
import { CommentAction } from "./comment_handler";
import { ExplainAction } from "./explain_handler";
import { HighlightAction } from "./highlight_handler";

/**
 * Union type of all possible actions
 */
export type CheerleaderAction =
  | ConversationAction
  | CommentAction
  | EditAction
  | ExplainAction
  | HighlightAction;

/**
 * Base interface for all action handlers
 */
export interface ActionHandler<T> {
  canHandle(action: any): action is T;
  handle(action: T, editor: vscode.TextEditor): Promise<void>;
}

/**
 * Registry for action handlers
 */
export class ActionHandlerRegistry {
  private static instance: ActionHandlerRegistry;
  private handlers: ActionHandler<any>[] = [];

  private constructor() {}

  static getInstance(): ActionHandlerRegistry {
    if (!ActionHandlerRegistry.instance) {
      ActionHandlerRegistry.instance = new ActionHandlerRegistry();
    }
    return ActionHandlerRegistry.instance;
  }

  registerHandler(handler: ActionHandler<any>): void {
    this.handlers.push(handler);
  }

  async handleAction(action: any, editor: vscode.TextEditor): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.canHandle(action)) {
        await handler.handle(action, editor);
        return;
      }
    }
    console.warn(`No handler found for action type: ${action.action}`);
  }
}
