import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AudioRecorder } from '../services/record_speech';
import { convertSpeechToText } from '../services/speech_to_text';
import { getAIResponse, getAIResponseWithHistory } from '../services/language_model';
import { ChatHistoryManager } from '../utils/chat_history_manager';
import { BasicCheerleaderAction } from './action_handlers/action_handler';
import { ActionHandlerRegistry } from './action_handlers/action_handler';
import { ConversationHandler } from './action_handlers/conversation_handler';
import { EditHandler } from './action_handlers/edit_handler';
import { CommentHandler } from './action_handlers/comment_handler';
import { ExplainHandler } from './action_handlers/explain_handler';
import { HighlightHandler } from './action_handlers/highlight_handler';

/**
 * An abstract base class representing a Cheerleader Agent that provides interactive code assistance.
 * This class handles both voice and text-based interactions, manages action handlers, and processes AI responses.
 * 
 * @abstract
 * @class CheerleaderAgent
 * 
 * @property {vscode.ExtensionContext} context - The VS Code extension context
 * @property {boolean} isProcessing - Flag indicating if the agent is currently processing an interaction
 * @property {string} recordingsDir - Directory path for storing voice recordings
 * @property {ChatHistoryManager} historyManager - Manager for chat history
 * @property {ActionHandlerRegistry} actionRegistry - Registry for action handlers
 * 
 * @remarks
 * The CheerleaderAgent class serves as a foundation for creating specialized agents that can:
 * - Handle both voice and text interactions
 * - Process and execute various code actions
 * - Manage recordings and chat history
 * - Register and coordinate different action handlers
 * 
 * To create a new agent, extend this class and implement the required abstract methods:
 * - getPrompt()
 * - mode
 * - startVoiceInteraction()
 * 
 * @example
 * ```typescript
 * class MyCustomAgent extends CheerleaderAgent {
 *   getPrompt(): string {
 *     return "Custom prompt for my agent";
 *   }
 *   
 *   get mode(): string {
 *     return "custom_mode";
 *   }
 *   
 *   async startVoiceInteraction(editor: vscode.TextEditor): Promise<void> {
 *     await this.processInteraction(editor, () => this.getUserInputFromAudio());
 *   }
 * }
 * ```
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

    this.historyManager = ChatHistoryManager.getInstance();
    this.actionRegistry = ActionHandlerRegistry.getInstance();
    this.registerActionHandlers();
  }

  /**
   * Registers the basic action handlers for the agent.
   * This method is called in the constructor to ensure that all
   * action handlers are available when the agent is created.
   * @note When your agent has addition actions, you must write a separate function in its consturctor
   */
  private registerActionHandlers(): void {
    const registry = this.actionRegistry;
    registry.registerHandler(new ConversationHandler());
    registry.registerHandler(new EditHandler());
    registry.registerHandler(new CommentHandler());
    registry.registerHandler(new ExplainHandler());
    registry.registerHandler(new HighlightHandler());
  }

  /**
   * The following are abstract virtual methods that must be implemented by each agent.
   * - getPrompt(): string, specialized prompt for the agent.
   * - mode: string, the mode of the agent.
   * - startVoiceInteraction(editor: vscode.TextEditor): Promise<void>, method to start voice interaction.
   */
  abstract getPrompt(): string;
  abstract get mode(): string;
  abstract startVoiceInteraction(editor: vscode.TextEditor): Promise<void>

  /**
   * The following are abstract methods that are not enforced to implement in the base class.
   * This is to allow for different types of text interactions.
   * - startTextInteraction(editor: vscode.TextEditor): Promise<void>, method to start text interaction.
   */
  async startTextInteraction(editor: vscode.TextEditor): Promise<void> {
    throw new Error("Text Interaction not implemented for this agent");
  }

  // The following utilities methods are marked protected so you can override them in
  // the subclass or just use them as is.

  /**
   * Get user input for the interaction.
   * This can be overridden or used as is in subclasses.
   * @returns User input string or undefined if cancelled.
   */
  protected async getUserInputFromText(): Promise<string | undefined> {
    const userInput = await vscode.window.showInputBox({
      prompt: "Ask a question about your code",
      placeHolder: "E.g., How can I improve this function?"
    });
    return userInput;
  }

  /**
   * Get user input for the interaction using voice.
   * This can be overridden or used as is in subclasses.
   * @returns User input string or undefined if cancelled.
   */
  protected async getUserInputFromAudio(): Promise<string | undefined> {
    try {
      // Use the AudioRecorder's record method which handles file saving
      const audioFilePath = await AudioRecorder.record();
      if (!audioFilePath) {
        vscode.window.showWarningMessage("No audio was recorded");
        return;
      }
      // Convert speech to text
      const transcription = await convertSpeechToText(audioFilePath);
      if (!transcription || transcription.trim().length === 0) {
        throw new Error("Failed to transcribe speech or no speech detected");
      }

      // cleanup the temporary audio file
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
      return transcription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Voice interaction failed: ${errorMessage}`);
      console.error("Voice interaction error:", error);
      return undefined;
    }
  }

  /**
   * Process the interaction with the AI.
   * This method handles the interaction logic and error handling.
   * @param editor Active text editor.
   * @param getUserInput Function to get user input (text or voice).
   * @note This encapsulate the logic for processing the interaction,
   *       including getting the user input, sending it to the AI,
   *       and processing the AI's response. Most often you will
   *       simply call this method in your agent's interaction methods.
   */
  protected async processInteraction(
    editor: vscode.TextEditor,
    getUserInput: () => Promise<string | undefined>
  ): Promise<void> {
    if (this.isProcessing) {
      vscode.window.showInformationMessage("Already processing an interaction");
      return;
    }

    try {
      this.isProcessing = true;

      // Get file content
      const fileContent = editor.document.getText();

      // Get user question
      const userQuestion = await getUserInput();
      if (!userQuestion) return;

      // Get AI response using the specialized prompt
      const aiResponse = await getAIResponseWithHistory(
        userQuestion,
        this.mode,
        {
          customPrompt: this.getPrompt(),
          fileContext: fileContent
        }
      );

      console.log("AI response:", aiResponse);
      console.log("mode:", this.mode);

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

  // The following private methods are not meant to be overridden
  // and are used internally by the class to handle specific tasks.
  // This is to ensure nothing breaks in the base class.

  /**
   * Parse the AI response into structured actions.
   * @param response AI response string.
   */
  private parseResponse(response: string): BasicCheerleaderAction[] {
    try {
      // Sanitize input
      const sanitizedResponse = response.trim();
      
      // Find JSON block boundaries
      const jsonBlockMatch = sanitizedResponse.match(/```json\s*([\s\S]*?)\s*```/);
      
      // If the response fails or parsing fails, do not return the block as response
      // but throw an error instead. This is because it will be wasting TTS token
      // and the user will not be able to see the error message.
      if (!jsonBlockMatch) {
        throw new Error("No JSON block found in response"); 
      }

      // Extract JSON content from the matched block
      const jsonContent = jsonBlockMatch[1].trim();
      
      if (!jsonContent) {
        throw new Error("Empty JSON block found");
      }

      // Parse JSON with validation
      const actions = JSON.parse(jsonContent);
      
      // Validate that actions is an array
      if (!Array.isArray(actions)) {
        throw new Error("Parsed JSON is not an array");
      }

      console.debug("Successfully parsed JSON array:", actions);
      return actions;
      
    } catch (e) {
      console.error("JSON parse error:", e);
      // Return the original response as conversation if parsing fails
      return [{
        action: "conversation",
        content: "Oops! There was an error handling the AI response."
      }];
    }
  }

  /**
   * Process all actions returned by the AI.
   * @param editor Active text editor.
   * @param actions Array of actions.
   */
  private async processActions(editor: vscode.TextEditor, actions: BasicCheerleaderAction[]): Promise<void> {
    if (!actions || actions.length === 0) return;
    
    for (const action of actions) {
      await this.actionRegistry.handleAction(action, editor);
    }
  }
}
