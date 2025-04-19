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
  private lastEncouragementTime: number = 0;
  private cooldownPeriod: number = 2 * 60 * 1000; // 2 minutes between encouragements
  static context: vscode.ExtensionContext;

  static initialize(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private encouragementMessages = {
    coding: [
      {
        filename: "coding0.mp3",
        text: "You're on fire! Keep up the great work!"
      },
      {
        filename: "coding1.mp3",
        text: "Look at that code flow! You're in the zone!"
      },
      {
        filename: "coding2.mp3",
        text: "You're making great progress! Keep it up!"
      },
      {
        filename: "coding3.mp3",
        text: "Keep going! Your progress is awesome!"
      }
    ],
    buildSuccess: [
      {
        filename: "buildSuccess0.mp3",
        text: "Build successful! Everything is working perfectly!"
      },
      {
        filename: "buildSuccess1.mp3",
        text: "Great job! Your code compiled without any issues!"
      },
      {
        filename: "buildSuccess2.mp3",
        text: "Success! Your build is ready to go!"
      },
      {
        filename: "buildSuccess3.mp3",
        text: "Nice work! Build completed successfully!"
      }
    ],
    buildFailed: [
      {
        filename: "buildFailed0.mp3",
        text: "Don't worry about that build failure, you'll figure it out!"
      },
      {
        filename: "buildFailed1.mp3",
        text: "Errors are just puzzles waiting to be solved. You've got this!"
      },
      {
        filename: "buildFailed2.mp3",
        text: "Every bug is a learning opportunity. Keep at it!"
      },
      {
        filename: "buildFailed3.mp3",
        text: "Build failed? No problem! I believe in your debugging skills!"
      }
    ],
    testSuccess: [
      {
        filename: "testSuccess0.mp3",
        text: "All tests passed! Your code is solid!"
      },
      {
        filename: "testSuccess1.mp3",
        text: "Perfect test run! You're crushing it today!"
      },
      {
        filename: "testSuccess2.mp3",
        text: "Tests looking great! What a satisfying green check!"
      },
      {
        filename: "testSuccess3.mp3",
        text: "Test success! Your attention to detail is paying off!"
      }
    ],
    testFailed: [
      {
        filename: "testFailed0.mp3",
        text: "Those failing tests are just pointing you in the right direction!"
      },
      {
        filename: "testFailed1.mp3",
        text: "Test failures happen to the best of us. You'll solve it soon!"
      },
      {
        filename: "testFailed2.mp3",
        text: "Every failing test brings you closer to perfect code!"
      },
      {
        filename: "testFailed3.mp3",
        text: "Don't let those test failures discourage you. You're making progress!"
      }
    ],
    fileSaved: [
      {
        filename: "fileSaved0.mp3",
        text: "Nice save! Your work is coming along nicely!"
      },
      {
        filename: "fileSaved1.mp3",
        text: "Progress saved! One step closer to completion!"
      },
      {
        filename: "fileSaved2.mp3",
        text: "Great checkpoint! Your code is evolving well!"
      },
      {
        filename: "fileSaved3.mp3",
        text: "Save successful! Keep up the momentum!"
      }
    ],
    longCoding: [
      {
        filename: "longCoding0.mp3",
        text: "Wow, you've been coding for a while now! How about a quick stretch?"
      },
      {
        filename: "longCoding1.mp3",
        text: "Your dedication is impressive! Remember to take short breaks occasionally!"
      },
      {
        filename: "longCoding2.mp3",
        text: "You're really focused today! Don't forget to rest your eyes from time to time!"
      },
      {
        filename: "longCoding3.mp3",
        text: "Amazing concentration! A quick water break might help keep your mind sharp!"
      }
    ],
    returningAfterBreak: [
      {
        filename: "returningAfterBreak0.mp3",
        text: "Welcome back! Ready to continue your awesome work?"
      },
      {
        filename: "returningAfterBreak1.mp3",
        text: "Nice to see you again! Your project missed you!"
      },
      {
        filename: "returningAfterBreak2.mp3",
        text: "Refreshed and ready to code? Let's do this!"
      },
      {
        filename: "returningAfterBreak3.mp3",
        text: "Back to coding? I knew you couldn't stay away for long!"
      }
    ],
    contextSwitch: [
      {
        filename: "contextSwitch0.mp3",
        text: "Switching tasks? Your versatility is impressive!"
      },
      {
        filename: "contextSwitch1.mp3",
        text: "New file, new opportunities to write great code!"
      },
      {
        filename: "contextSwitch2.mp3",
        text: "Multitasking like a pro! You handle context switching so well!"
      },
      {
        filename: "contextSwitch3.mp3",
        text: "Changing focus? Your adaptability makes you an excellent developer!"
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
    this.provideEncouragement('contextSwitch');
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
      for (const uri of e.uris) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        if (diagnostics.length > 0) {
          service.onDiagnosticsChange(vscode.languages.createDiagnosticCollection());
          break; // Only need to process once
        }
      }
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