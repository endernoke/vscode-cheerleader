import * as vscode from 'vscode';
import { CheerleaderAgent } from './cheerleader_agent';
import { ActionHandlerRegistry } from './action_handlers/action_handler';
import { SolvedHandler } from './action_handlers/solved_handler';

const DEBUGGER_PROMPT = `You are a rubber duck debugging companion. Like a real rubber duck, your role is to listen and help developers talk through their problems. 
Instead of providing direct solutions, you'll encourage them to explain their code and thought process, helping them discover solutions on their own.

YOUR RESPONSE MUST BE A VALID JSON ARRAY using this format, with these actions:

\`\`\`json
  [
      {
          "action": "conversation",
          "content": "Your question or observation to encourage deeper thinking"
      },
      {
          "action": "comment",
          "line": <line_number>,
          "comment": "Question or observation about specific code line with proper syntax such as # for python"
      },
      {
          "action": "highlight",
          "selection": {
              "start": <line_number>,
              "end": <line_number>
          }
      }
  ]
\`\`\`

When the problem is solved, respond with:

\`\`\`json
  [
      {
      "action": "solved",
      "message": "short message"
      }
  ]
\`\`\`
`;

/**
 * RubberDuckAgent specializes in debugging through conversation.
 * It maintains a continuous dialogue until the problem is solved.
 */
export class RubberDuckAgent extends CheerleaderAgent {
  private isSolved: boolean = false;
  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.registerDebugHandlers();
  }

  // Register extra action handlers specific to debugging
  private registerDebugHandlers(): void {
    const registry = ActionHandlerRegistry.getInstance();
    registry.registerHandler(new SolvedHandler(() => {
      this.isSolved = true;
    }));
  }

  getPrompt(): string {
    return DEBUGGER_PROMPT;
  }

  get mode(): string {
    return "rubber_duck";
  }

  async startVoiceInteraction(editor: vscode.TextEditor): Promise<void> {
    await this.startDebuggingSession(editor, () => this.getUserInputFromAudio());
  }

  /**
   * Starts a debugging session by prompting the user for input.
   * By default, uses the getUserInputFromAudio method to get user input.
   */
  private async startDebuggingSession(
    editor: vscode.TextEditor,
    getUserInput: () => Promise<string | undefined>
  ): Promise<void> {
    try {
      // Initialize debugging session
      this.isSolved = false;

      // Get initial problem description
      let userQuestion = await getUserInput();
      if (!userQuestion) return;

      // Continue conversation until problem is solved
      while (!this.isSolved) {
        // Process the interaction using base class method
        await this.processInteraction(editor, async () => userQuestion);

        // If not solved, get next input
        if (!this.isSolved) {
          const nextInput = await getUserInput();
          if (!nextInput) break; // Exit if user cancels
          userQuestion = nextInput;
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Debugging conversation error: ${error}`);
      console.error("Debugging conversation error:", error);
    }
  }
}
