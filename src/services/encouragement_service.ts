import * as vscode from "vscode";
import { playTextToSpeech } from "./play_voice";
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
  private lastEncouragementTime: number = 0;
  private cooldownPeriod: number = 2 * 60 * 1000; // 2 minutes between encouragements

  private encouragementMessages = {
    coding: [
      "You're on fire! Keep up the great work!",
      "Look at that code flow! You're in the zone!",
      "Your coding rhythm is impressive today!",
      "Those are some elegant solutions you're writing!",
      "Keep going! Your progress is awesome!"
    ],
    buildSuccess: [
      "Build successful! Everything is working perfectly!",
      "Great job! Your code compiled without any issues!",
      "Success! Your build is ready to go!",
      "Nice work! Build completed successfully!"
    ],
    buildFailed: [
      "Don't worry about that build failure, you'll figure it out!",
      "Errors are just puzzles waiting to be solved. You've got this!",
      "Every bug is a learning opportunity. Keep at it!",
      "Build failed? No problem! I believe in your debugging skills!"
    ],
    testSuccess: [
      "All tests passed! Your code is solid!",
      "Perfect test run! You're crushing it today!",
      "Tests looking great! What a satisfying green check!",
      "Test success! Your attention to detail is paying off!"
    ],
    testFailed: [
      "Those failing tests are just pointing you in the right direction!",
      "Test failures happen to the best of us. You'll solve it soon!",
      "Every failing test brings you closer to perfect code!",
      "Don't let those test failures discourage you. You're making progress!"
    ],
    fileSaved: [
      "Nice save! Your work is coming along nicely!",
      "Progress saved! One step closer to completion!",
      "Great checkpoint! Your code is evolving well!",
      "Save successful! Keep up the momentum!"
    ],
    longCoding: [
      "Wow, you've been coding for a while now! How about a quick stretch?",
      "Your dedication is impressive! Remember to take short breaks occasionally!",
      "You're really focused today! Don't forget to rest your eyes from time to time!",
      "Amazing concentration! A quick water break might help keep your mind sharp!"
    ],
    returningAfterBreak: [
      "Welcome back! Ready to continue your awesome work?",
      "Nice to see you again! Your project missed you!",
      "Refreshed and ready to code? Let's do this!",
      "Back to coding? I knew you couldn't stay away for long!"
    ],
    contextSwitch: [
      "Switching tasks? Your versatility is impressive!",
      "New file, new opportunities to write great code!",
      "Multitasking like a pro! You handle context switching so well!",
      "Changing focus? Your adaptability makes you an excellent developer!"
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
               now - this.lastEncouragementTime > 30 * 60 * 1000) { // No encouragement in 30 minutes
        this.encourageLongCodingSession();
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
  private provideEncouragement(type: keyof typeof this.encouragementMessages): void {
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
      playTextToSpeech(randomMessage);
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
    this.provideEncouragement('contextSwitch');
  }

  /**
   * Responds to build task completions
   */
  onTaskEnd(e: vscode.TaskEndEvent): void {
    this.lastActivity = Date.now();
    
    // Check if it's a build task
    if (e.execution.task.group === vscode.TaskGroup.Build) {
      if (e.execution.task.name.toLowerCase().includes('error') || 
          e.execution.task.name.toLowerCase().includes('fail')) {
        this.provideEncouragement('buildFailed');
      } else {
        this.provideEncouragement('buildSuccess');
      }
    }
    // Check if it's a test task
    else if (e.execution.task.group === vscode.TaskGroup.Test) {
      if (e.execution.task.name.toLowerCase().includes('error') || 
          e.execution.task.name.toLowerCase().includes('fail')) {
        this.provideEncouragement('testFailed');
      } else {
        this.provideEncouragement('testSuccess');
      }
    }
  }

  /**
   * Add diagnostics handler to encourage on errors or warnings
   */
  onDiagnosticsChange(diagnosticCollection: vscode.DiagnosticCollection): void {
    // Only process if there are actual diagnostics
    if (!diagnosticCollection) return;
    
    let hasErrors = false;
    let hasWarnings = false;
    
    // Check all diagnostics
    diagnosticCollection.forEach((uri, diagnostics) => {
      if (!hasErrors || !hasWarnings) {
        for (const diagnostic of diagnostics) {
          if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
            hasErrors = true;
          }
          if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
            hasWarnings = true;
          }
          if (hasErrors && hasWarnings) break;
        }
      }
    });
    
    // Provide appropriate encouragement
    if (hasErrors) {
      this.provideEncouragement('buildFailed');
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
  
  const taskEndListener = vscode.tasks.onDidEndTask(
    (e) => service.onTaskEnd(e)
  );
  
  // Listen for diagnostics changes (errors/warnings)
  const diagnosticsListener = vscode.languages.onDidChangeDiagnostics(
    (e) => {
      for (const uri of e.uris) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        if (diagnostics.length > 0) {
          service.onDiagnosticsChange(vscode.languages.createDiagnosticCollection());
          break; // Only need to process once
        }
      }
    }
  );
  
  // Register commands to enable/disable encouragement
  const enableCommand = vscode.commands.registerCommand(
    'cheerleader.enableEncouragement',
    () => {
      service.enable();
      vscode.window.showInformationMessage('Cheerleader encouragement enabled!');
    }
  );
  
  const disableCommand = vscode.commands.registerCommand(
    'cheerleader.disableEncouragement',
    () => {
      service.disable();
      vscode.window.showInformationMessage('Cheerleader encouragement disabled!');
    }
  );
  
  // Add disposables to context
  context.subscriptions.push(
    documentChangeListener,
    fileSaveListener,
    editorChangeListener,
    taskEndListener,
    diagnosticsListener,
    enableCommand,
    disableCommand,
    { dispose: () => service.dispose() }
  );
}