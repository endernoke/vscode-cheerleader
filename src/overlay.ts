import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  TaskScope,
  ShellExecution,
  Task,
  TaskDefinition,
  TaskPresentationOptions,
} from "vscode";
import { WebSocketService } from "./services/websocket_service";

interface LaunchOverlayTaskDefinition extends TaskDefinition {
  type: string;
  command: string;
  cwd?: string;
}

function executeLaunchOverlayTask(overlayAppPath: string) {
  const isWindows = process.platform === "win32";
  const npxCommand = isWindows ? "npx.cmd" : "npx";

  const taskDefinition: LaunchOverlayTaskDefinition = {
    type: "shell",
    command: `${npxCommand} electron .`,
    cwd: overlayAppPath,
  };

  const presentationOptions: TaskPresentationOptions = {
    reveal: vscode.TaskRevealKind.Never,
    panel: vscode.TaskPanelKind.Dedicated,
    focus: false,
    echo: false,
    showReuseMessage: false,
    clear: false,
  };

  const execution = new ShellExecution(taskDefinition.command, {
    cwd: taskDefinition.cwd,
  });

  const task = new Task(
    taskDefinition,
    vscode.TaskScope.Workspace,
    "Cheerleader Overlay",
    "cheerleader",
    execution,
    []
  );

  task.presentationOptions = presentationOptions;

  vscode.tasks.executeTask(task).then(undefined, (error) => {
    vscode.window.showErrorMessage(`Failed to execute task: ${error}`);
  });
}

function getVSCodeWindowInfo() {
  // Mock response
  return { x: 100, y: 100, width: 800, height: 600 };
}

export async function activateOverlay(context: vscode.ExtensionContext) {
  const webSocketService = WebSocketService.getInstance();

  const killOverlayApp = () => {
    console.log("Closing WebSocket server");
    webSocketService.dispose();
  };

  // Ensure we get the path to the overlay relative to the extension
  const overlayAppPath = path.join(context.extensionPath, "dist/live2d-container");

  if (!fs.existsSync(overlayAppPath)) {
    throw new Error("Overlay app not found at " + overlayAppPath);
  }

  // Register command to manually trigger the task
  let disposable = vscode.commands.registerCommand(
    "cheerleader.launchOverlay",
    async () => {
      const serverStarted = await webSocketService.startServer();
      if (serverStarted) {
        executeLaunchOverlayTask(overlayAppPath);
      } else {
        vscode.window.showInformationMessage('Another instance of the overlay is already running');
      }
    }
  );

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand("cheerleader.killOverlay", () => {
      killOverlayApp();
    })
  );

  context.subscriptions.push(
    vscode.Disposable.from({
      dispose: killOverlayApp,
    })
  );

  // Start the overlay app
  executeLaunchOverlayTask(overlayAppPath);
}
