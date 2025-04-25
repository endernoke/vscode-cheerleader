import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse, getAIResponseWithHistory } from '../services/language_model';
import { ChatHistoryManager } from '../utils/chat_history_manager';
import { CheerleaderAction } from './action_handlers/action_handler';
import { ActionHandlerRegistry } from './action_handlers/action_handler';
import { ConversationHandler } from './action_handlers/conversation_handler';
import { EditHandler } from './action_handlers/edit_handler';
import { CommentHandler } from './action_handlers/comment_handler';
import { ExplainHandler } from './action_handlers/explain_handler';
import { HighlightHandler } from './action_handlers/highlight_handler';

/**
 * Abstract base class for all Cheerleader agents.
 * It encapsulates common functionality for text and voice interactions.
 */
export abstract class CheerleaderAgent {
  protected context: vscode.ExtensionContext;
  protected isProcessing: boolean = false;
  protected recordingsDir: string;
  protected historyManager: ChatHistoryManager;
  protected actionRegistry: ActionHandlerRegistry;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Initialize recordings directory
    this.recordingsDir = path.join(this.context.globalStorageUri.fsPath, "recordings");
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
    // Initialize chat history manager
    this.historyManager = ChatHistoryManager.getInstance();
    // Initialize action registry
    this.actionRegistry = ActionHandlerRegistry.getInstance();
    this.registerActionHandlers();
  }

  private registerActionHandlers(): void {
    const registry = this.actionRegistry;
    registry.registerHandler(new ConversationHandler());
    registry.registerHandler(new EditHandler());
    registry.registerHandler(new CommentHandler());
    registry.registerHandler(new ExplainHandler());
    registry.registerHandler(new HighlightHandler());
  }

  // Each agent must implement its specialized prompt.
  abstract getPrompt(): string;

  /**
   * Start a text-based interaction.
   * @param editor Active text editor.
   */
  async startInteraction(editor: vscode.TextEditor): Promise<void> {
    if (this.isProcessing) {
      vscode.window.showInformationMessage("Already processing an interaction");
      return;
    }
    try {
      this.isProcessing = true;
      // Get file content
      const fileContent = editor.document.getText();
      // Get user question
      const userQuestion = await vscode.window.showInputBox({
        prompt: "Ask a question about your code",
        placeHolder: "E.g., How can I improve this function?"
      });
      if (!userQuestion) return;

      // Get AI response using the specialized prompt
      const aiResponse = await getAIResponseWithHistory(
        userQuestion,
        "inline_chat",
        {
          customPrompt: this.getPrompt(),
          fileContext: fileContent
        }
      );

      // Parse and process actions from the AI response
      const actions = this.parseResponse(aiResponse);
      await this.processActions(editor, actions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Interaction failed: ${errorMessage}`);
      console.error("Interaction error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start a voice-based interaction.
   * @param editor Active text editor.
   */
  async startVoiceInteraction(editor: vscode.TextEditor): Promise<void> {
    if (this.isProcessing) {
      vscode.window.showInformationMessage("Already processing an interaction");
      return;
    }
    try {
      this.isProcessing = true;
      vscode.window.showInformationMessage("Recording...");
      // Record audio
      const audioFilePath = await AudioRecorder.record();
      // Convert speech to text
      const transcription = await convertSpeechToText(audioFilePath);
      if (!transcription || transcription.trim().length === 0) {
        throw new Error("Failed to transcribe speech or no speech detected");
      }
      // Get file content and AI response
      const fileContent = editor.document.getText();
      const aiResponse = await getAIResponseWithHistory(
        transcription,
        "inline_chat",
        {
          customPrompt: this.getPrompt(),
          fileContext: fileContent
        }
      );
      // Parse and process actions
      const actions = this.parseResponse(aiResponse);
      await this.processActions(editor, actions);
      // Clean up temporary audio file
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Voice interaction failed: ${errorMessage}`);
      console.error("Voice interaction error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Parse the AI response into structured actions.
   * @param response AI response string.
   */
  protected parseResponse(response: string): CheerleaderAction[] {
    // Find start of JSON block
    const startIndex = response.indexOf("```json");
    if (startIndex === -1) {
      return [{
        action: "conversation",
        content: response.trim()
      }];
    }

    // Remove markdown formatting
    const jsonStart = response.indexOf("[", startIndex);
    let jsonContent = response.substring(jsonStart);
    const blockEnd = jsonContent.indexOf("```");
    if (blockEnd !== -1) {
      jsonContent = jsonContent.substring(0, blockEnd);
    }

    // Parse JSON
    try {
      const actions = JSON.parse(jsonContent);
      console.debug("Successfully parsed JSON array:", actions);
      return actions;
    } catch (e) {
      console.debug("JSON parse error:", e);
      return [{
        action: "conversation",
        content: response.trim()
      }];
    }
  }

  /**
   * Process all actions returned by the AI.
   * @param editor Active text editor.
   * @param actions Array of actions.
   */
  protected async processActions(editor: vscode.TextEditor, actions: CheerleaderAction[]): Promise<void> {
    if (!actions || actions.length === 0) return;
    
    for (const action of actions) {
      await this.actionRegistry.handleAction(action, editor);
    }
  }
}
