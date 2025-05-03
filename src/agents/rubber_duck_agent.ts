import * as vscode from 'vscode';
import { CheerleaderAgent } from './cheerleader_agent';
import { ActionHandlerRegistry } from './action_handlers/action_handler';
import { SolvedHandler } from './action_handlers/solved_handler';

const DEBUGGER_PROMPT = `You are a rubber duck debugging companion. Like a real rubber duck, your role is to listen and help developers talk through their problems. 
Instead of providing direct solutions, you'll encourage them to explain their code and thought process, helping them discover solutions on their own.

YOUR RESPONSE MUST BE A VALID JSON ARRAY selecting one or more of the following actions.
You do not need to use all the actions in every response. ONLY use the ones that are relevant and helpful.

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

If you think the user has understood the problem, you can mark it as solved with this response:

\`\`\`json
  [
      {
      "action": "solved",
      "message": "short message"
      }
  ]
\`\`\`

You do not need to wait until the user has made the code work to mark it as solved since your role is to help them understand the problem and not to fix it for them.
`;

/**
 * "You must stay vigilant against the temptation of vibe coding by Daisy Duck",
 * commanded George to his followers. "For this reason, I shall gift you with a
 * rubber duck, a symbol of our commitment to the art of debugging."
 * -- The Georgeiste Manifesto, Chapter 3, Verse 5
 */
export class RubberDuckAgent extends CheerleaderAgent {
  private isSolved: boolean = false;
  private statusBarItem!: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.registerDebugHandlers();
    this.initializeStatusBar();
  }

  // Register extra action handlers specific to debugging
  private registerDebugHandlers(): void {
    const registry = ActionHandlerRegistry.getInstance();
    registry.registerHandler(new SolvedHandler(() => {
      this.isSolved = true;
    }));
  }

  private initializeStatusBar(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.text = "$(stop) Stop Debugging";
    this.statusBarItem.command = 'vscode-cheerleader.stopDebugging';
    this.statusBarItem.tooltip = 'Stop the current debugging session';
    this.context.subscriptions.push(
      vscode.commands.registerCommand('vscode-cheerleader.stopDebugging', () => {
        this.isSolved = true;
        this.statusBarItem.hide();
      })
    );
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
      this.statusBarItem.show();

      // Get initial problem description
      let userQuestion = await getUserInput();
      if (!userQuestion) return;

      // Continue conversation until problem is solved
      while (!this.isSolved) {
        // Process the interaction using base class method
        await this.processInteraction(editor, async () => {
          const input = await getUserInput();
          if (!input) {
            this.isSolved = true; // Exit if user cancels
            return undefined;
          }
          return input;
        });

        // Break if solved during interaction
        if (this.isSolved) break;
      }

      this.statusBarItem.hide();
    } catch (error) {
      this.statusBarItem.hide();
      vscode.window.showErrorMessage(`Debugging conversation error: ${error}`);
      console.error("Debugging conversation error:", error);
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
