import * as vscode from "vscode";
import { playAudioFromFile } from "./play_voice";
import { WebSocketService } from "./websocket_service";

export class EncouragementService {
  private static instance: EncouragementService;
  private lastActivity: number = Date.now();
  private changeCount: number = 0;
  private consecutiveSaves: number = 0;
  private webSocketService: WebSocketService;
  private isEnabled: boolean = true;
  private inactivityThreshold: number = 20 * 60 * 1000; // 20 minutes
  private changeThreshold: number = 50; // Number of changes before encouragement
  private inactivityCheckInterval: NodeJS.Timeout | undefined;
  private lastDiagnosticsErrorTime: number = Date.now();
  private lastEncouragementTime: number = Date.now();
  private lastLongCodingTime: number = Date.now();
  private cooldownPeriod: number = 2 * 60 * 1000; // 2 minutes between encouragements
  static context: vscode.ExtensionContext;

  static initialize(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private encouragementMessages = {
    coding: [
      {
        filename: "coding0.mp3",
        text: "Look at you, turning caffeine into code like a proper software alchemist!",
      },
      {
        filename: "coding1.mp3",
        text: "Still typing away? Your dedication is matched only by your monitor's eye strain!"
      }
    ],
    buildSuccess: [
      {
        filename: "buildSuccess0.mp3",
        text: "Build succeeded! Time to add this momentous occasion to your LinkedIn achievements.",
      },
      {
        filename: "buildSuccess1.mp3",
        text: "Your code actually works? That's more stable than my relationships!"
      }
    ],
    buildFailed: [
      {
        filename: "buildFailed0.mp3",
        text: "Don't worry, broken builds are just your computer's way of asking for attention.",
      },
      {
        filename: "buildFailed1.mp3",
        text: "The build failed, but hey, at least you're keeping the Stack Overflow servers busy!",
      }
    ],
    testSuccess: [
      {
        filename: "testSuccess0.mp3",
        text: "All tests passing? Someone check if the tests are actually running!",
      },
      {
        filename: "testSuccess1.mp3",
        text: "Roses are red, tests are green. The code works on my machine."
      }
    ],
    testFailed: [
      {
        filename: "testFailed0.mp3",
        text: "Your tests are just playing hard to get. They'll come around eventually.",
      },
      {
        filename: "testFailed1.mp3",
        text: "Pro tip: run tests with the lights off for a better success rate."
      }
    ],
    fileSaved: [
      {
        filename: "fileSaved0.mp3",
        text: "Another save? You must be the most paranoid developer I know!",
      },
      {
        filename: "fileSaved1.mp3",
        text: "POV: you're saving files like you're living in the 90s without auto-save."
      }
    ],
    longCoding: [
      {
        filename: "longCoding0.mp3",
        text: "Good job, your coding session is longer than a Lord of the Rings extended cut!",
      },
      {
        filename: "longCoding1.mp3",
        text: "Remember when you said 'just one more function' three hours ago? Good times!"
      }
    ],
    returningAfterBreak: [
      {
        filename: "returningAfterBreak0.mp3",
        text: "Welcome back! Your IDE missed you. It was getting lonely running all those background processes.",
      },
      {
        filename: "returningAfterBreak1.mp3",
        text: "Look who decided to return from their coffee expedition!"
      }
    ],
    bugsFixed: [
      {
        filename: "bugsFixed0.mp3",
        text: "Zero linter errors? Time to take a shower.",
      },
      {
        filename: "bugsFixed1.mp3",
        text: "Congratulations on achieving temporary perfection! Until the next dependency update, at least."
      }
    ]
  };

  private constructor() {
    this.webSocketService = WebSocketService.getInstance();
    this.setupInactivityCheck();
    this.loadConfiguration();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('cheerleader.encouragement')) {
        this.loadConfiguration();
      }
    });
  }

  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('cheerleader.encouragement');
    this.isEnabled = config.get('enabled', true);
    
    // Adjust thresholds based on frequency setting
    const frequency = config.get<string>('frequency', 'medium');
    switch (frequency) {
      case 'low':
        this.changeThreshold = 100;
        this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
        break;
      case 'medium':
        this.changeThreshold = 50;
        this.cooldownPeriod = 2 * 60 * 1000; // 2 minutes
        break;
      case 'high':
        this.changeThreshold = 25;
        this.cooldownPeriod = 1 * 60 * 1000; // 1 minute
        break;
    }
  }

  static getInstance(): EncouragementService {
    if (!EncouragementService.instance) {
      EncouragementService.instance = new EncouragementService();
    }
    return EncouragementService.instance;
  }

  private setupInactivityCheck(): void {
    // Check for inactivity every minute
    this.inactivityCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;

      // If user has been inactive but is now back
      if (timeSinceLastActivity > this.inactivityThreshold) {
        this.lastActivity = now; // Reset activity timer
        this.encourageOnReturn();
      }
      // If user has been coding for a long time without a significant break
      else if (timeSinceLastActivity < 5 * 60 * 1000 && // Active in last 5 minutes
               now - this.lastLongCodingTime > this.inactivityThreshold) { // Long coding session
        this.encourageLongCodingSession();
        this.lastLongCodingTime = now; // Reset long coding time
      }
    }, 60 * 1000); // Check every minute
  }

  enable(): void {
    this.isEnabled = true;
    const config = vscode.workspace.getConfiguration('cheerleader.encouragement');
    config.update('enabled', true, vscode.ConfigurationTarget.Global);
  }

  disable(): void {
    this.isEnabled = false;
    const config = vscode.workspace.getConfiguration('cheerleader.encouragement');
    config.update('enabled', false, vscode.ConfigurationTarget.Global);
  }

  /**
   * Main method to provide encouragement based on a specific event type
   */
  provideEncouragement(type: keyof typeof this.encouragementMessages): void {
    if (!this.isEnabled) return;
    
    const now = Date.now();
    if (now - this.lastEncouragementTime < this.cooldownPeriod) {
      return; // Don't encourage too frequently
    }

    const messages = this.encouragementMessages[type];
    if (!messages || messages.length === 0) return;

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    this.lastEncouragementTime = now;
    
    try {
      const fullFilePath = vscode.Uri.file(
          `${EncouragementService.context.extensionUri.fsPath}/assets/encouragement/${randomMessage.filename}`
        ).fsPath;
      playAudioFromFile(fullFilePath, randomMessage.text);
    } catch (error) {
      console.error("Error playing encouragement:", error);
    }
  }

  /**
   * Tracks and responds to text document changes
   */
  onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
    this.lastActivity = Date.now();
    this.changeCount += e.contentChanges.length;
    
    // Encourage after a significant number of changes
    if (this.changeCount >= this.changeThreshold) {
      this.changeCount = 0; // Reset the counter
      this.provideEncouragement('coding');
    }
  }

  /**
   * Responds to file saves
   */
  onFileSave(document: vscode.TextDocument): void {
    this.lastActivity = Date.now();
    this.consecutiveSaves++;
    
    // Encourage on save, but not too frequently
    if (this.consecutiveSaves >= 3) {
      this.consecutiveSaves = 0;
      this.provideEncouragement('fileSaved');
    }
  }

  /**
   * Responds to editor focus changes
   */
  onEditorChange(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;
    
    this.lastActivity = Date.now();
  }

  /**
   * Responds to build task completions
   */
  onTaskProcessEnd(e: vscode.TaskProcessEndEvent): void {
    this.lastActivity = Date.now();

    // Check if it's a build task
    if (e.execution.task.group === vscode.TaskGroup.Build
        || e.execution.task.group === vscode.TaskGroup.Rebuild
        || e.execution.task.name.toLowerCase().includes('build')
    ) {
      if (e.exitCode === 0) {
        this.provideEncouragement('buildSuccess');
      } else if (e.exitCode !== undefined) {
        this.provideEncouragement('buildFailed');
      }
    }
    // Check if it's a test task
    else if (e.execution.task.group === vscode.TaskGroup.Test
        || e.execution.task.name.toLowerCase().includes('test')
    ) {
      if (e.exitCode === 0) {
        this.provideEncouragement('testSuccess');
      } else if (e.exitCode !== undefined) {
        this.provideEncouragement('testFailed');
      }
    }
  }

  /**
   * Add diagnostics handler to encourage on errors or warnings
   */
  onDiagnosticsChange(diagnostics: vscode.Diagnostic[]): void {
    let hasErrors = false;
    let hasWarnings = false;
    
    // Check all diagnostics
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
        hasErrors = true;
      }
      if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
        hasWarnings = true;
      }
      if (hasErrors && hasWarnings) break;
    }    
    // Provide appropriate encouragement
    if (hasErrors || hasWarnings) {
      this.lastDiagnosticsErrorTime = Date.now();
    }
    if (!hasErrors && !hasWarnings) {
      this.provideEncouragement('bugsFixed');
    }
  }

  /**
   * Encourages user when returning after a break
   */
  private encourageOnReturn(): void {
    this.provideEncouragement('returningAfterBreak');
  }

  /**
   * Encourages user during long coding sessions
   */
  private encourageLongCodingSession(): void {
    this.provideEncouragement('longCoding');
  }

  dispose(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
    }
  }
}

/**
 * Register event listeners and initialize encouragement service
 */
export function activateEncouragement(context: vscode.ExtensionContext): void {
  EncouragementService.initialize(context);
  const service = EncouragementService.getInstance();
  
  // Register event listeners
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (e) => service.onDocumentChange(e)
  );
  
  const fileSaveListener = vscode.workspace.onDidSaveTextDocument(
    (document) => service.onFileSave(document)
  );
  
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => service.onEditorChange(editor)
  );
  
  const taskEndListener = vscode.tasks.onDidEndTaskProcess(
    (e) => service.onTaskProcessEnd(e)
  );
  
  // Listen for diagnostics changes (errors/warnings)
  const diagnosticsListener = vscode.languages.onDidChangeDiagnostics(
    (e) => {
      let fullDiagnostics = e.uris.map(uri => vscode.languages.getDiagnostics(uri)).flat();
      service.onDiagnosticsChange(fullDiagnostics);
    }
  );

  const toggleCommand = vscode.commands.registerCommand(
    'cheerleader.toggleEncouragement',
    () => {
      const isEnabled = vscode.workspace.getConfiguration('cheerleader.encouragement').get('enabled', true);
      if (isEnabled) {
        service.disable();
        vscode.window.showInformationMessage('Cheerleader encouragement disabled!');
      } else {
        service.enable();
        vscode.window.showInformationMessage('Cheerleader encouragement enabled!');
      }
    }
  );
  
  // Add disposables to context
  context.subscriptions.push(
    documentChangeListener,
    fileSaveListener,
    editorChangeListener,
    taskEndListener,
    diagnosticsListener,
    toggleCommand,
    { dispose: () => service.dispose() }
  );

  // Command to test encouragement
  context.subscriptions.push(
    vscode.commands.registerCommand('cheerleader.testEncouragement', () => {
      service.provideEncouragement('coding');
    }
  ));
}