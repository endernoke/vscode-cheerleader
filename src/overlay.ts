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
}

function executeLaunchOverlayTask(overlayAppPath: string) {
  // Make sure we're using the correct path for npx
  const isWindows = process.platform === "win32";
  const npxCommand = isWindows ? "npx.cmd" : "npx";

  const taskDefinition: LaunchOverlayTaskDefinition = {
    type: "shell",
  };

  // Create shell execution with options to hide the terminal
  const presentationOptions: TaskPresentationOptions = {
    reveal: vscode.TaskRevealKind.Never,
    panel: vscode.TaskPanelKind.Dedicated,
    focus: false,
    echo: false,
    showReuseMessage: false,
    clear: false,
  };

  // Use cwd to set the working directory to the overlay app path
  const execution = new ShellExecution(`${npxCommand} electron .`, {
    cwd: overlayAppPath,
  });

  const task = new Task(
    taskDefinition,
    TaskScope.Global,
    "Cheerleader Overlay",
    "cheerleader",
    execution
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

export function activateOverlay(context: vscode.ExtensionContext) {
  const webSocketService = WebSocketService.getInstance();

  const killOverlayApp = () => {
    console.log("Closing WebSocket server");
    webSocketService.close();
  };

  // Ensure we get the path to the overlay relative to the extension
  const overlayAppPath = path.join(context.extensionPath, "dist/live2d-container");

  if (!fs.existsSync(overlayAppPath)) {
    vscode.window.showErrorMessage(
      "Overlay app not found at " + overlayAppPath
    );
    return;
  }

  try {
    // Register command to manually trigger the task
    let disposable = vscode.commands.registerCommand(
      "cheerleader.launchOverlay",
      () => {
        webSocketService.startServer();
        executeLaunchOverlayTask(overlayAppPath);
      }
    );

    context.subscriptions.push(disposable);

    context.subscriptions.push(
      vscode.commands.registerCommand("cheerleader.killOverlay", () => {
        killOverlayApp();
      })
    );

    // Start WebSocket server and overlay app
    webSocketService.startServer();
    executeLaunchOverlayTask(overlayAppPath);
  } catch (e) {
    vscode.window.showErrorMessage(`Failed to start overlay: ${e}`);
  }

  context.subscriptions.push(
    vscode.Disposable.from({
      dispose: killOverlayApp,
    })
  );
}
