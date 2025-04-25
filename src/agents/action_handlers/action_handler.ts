/**
 * This module defines the ActionHandler interface and the ActionHandlerRegistry class.
 * 
 * To implement a new action handler (e.g., for a new action type),
 * 1. Create a new interface for the action type.
 * 2. Implement the ActionHandler interface for that action type.
 * 3. Register the handler with the ActionHandlerRegistry (in the agent that uses it).
 * 
 * After doing so, the agent can directly handle the new action type once specified in prompt.
 */

import * as vscode from 'vscode';

import { ConversationAction } from "./conversation_handler";
import { EditAction } from "./edit_handler";
import { CommentAction } from "./comment_handler";
import { ExplainAction } from "./explain_handler";
import { HighlightAction } from "./highlight_handler";

/**
 * Union type for all basic action types
 * These types are supported natively by the `CheerleaderAgent` base class.
 * Specialized action should be imported and registered in the agent that uses it.
 */
export type BasicCheerleaderAction =
  | ConversationAction
  | CommentAction
  | EditAction
  | ExplainAction
  | HighlightAction;

/**
 * @interface ActionHandler<T>
 * @description This interface defines the structure for action handlers.
 * @type T - The type of action that the handler can handle
 * @function canHandle - Determines if the handler can handle a specific action
 * @function handle - Handles the action and performs the necessary operations in the editor
 * @note For non-editor functionalities, override the handle method in the specialized action handler.
 */
export interface ActionHandler<T> {
  /**
   * Determines if the handler can handle a specific action
   * @param {any} action - The action to check
   * @returns {boolean} - True if the handler can handle the action, false otherwise
   */
  canHandle(action: any): action is T;

  /**
   * Handles the action and performs the necessary operations in the editor
   * @param {T} action - The action to handle
   * @param {vscode.TextEditor} editor - The active text editor
   * @returns {Promise<void>} - A promise that resolves when the action is handled
   */
  handle(action: T, editor: vscode.TextEditor): Promise<void>;
}

/**
 * @class ActionHandlerRegistry
 * @description This class is a singleton that manages the registration and handling of action handlers.
 * @function registerHandler - Registers a new action handler
 * @function handleAction - Handles an action by delegating it to the appropriate handler
 */
export class ActionHandlerRegistry {
  private static instance: ActionHandlerRegistry;
  private handlers: ActionHandler<any>[] = [];

  private constructor() {}

  /**
   * Singleton instance of ActionHandlerRegistry
   * @returns {ActionHandlerRegistry} The singleton instance
   */
  static getInstance(): ActionHandlerRegistry {
    if (!ActionHandlerRegistry.instance) {
      ActionHandlerRegistry.instance = new ActionHandlerRegistry();
    }
    return ActionHandlerRegistry.instance;
  }

  /**
   * Registers a new action handler
   * @param {ActionHandler<any>} handler - The action handler to register
   */
  registerHandler(handler: ActionHandler<any>): void {
    this.handlers.push(handler);
  }

  /**
   * Handles an action by delegating it to the appropriate handler
   * @param {any} action - The action to handle
   * @param {vscode.TextEditor} editor - The active text editor
   */
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
