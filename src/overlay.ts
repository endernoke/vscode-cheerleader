import * as vscode from "vscode";
import * as WebSocket from "ws";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { TaskScope, ShellExecution, Task, TaskDefinition, TaskPresentationOptions } from 'vscode';

interface LaunchOverlayTaskDefinition extends TaskDefinition {
  type: string;
  command: string;
}

function executeLaunchOverlayTask(overlayAppPath: string) {
  const taskDefinition: LaunchOverlayTaskDefinition = {
    type: 'shell',
    command: `npx electron ${overlayAppPath}`,
  };

  // Create shell execution with options to hide the terminal
  const presentationOptions: TaskPresentationOptions = {
    reveal: vscode.TaskRevealKind.Never,
    panel: vscode.TaskPanelKind.Dedicated,
    focus: false,
    echo: false,
    showReuseMessage: false,
    clear: false
  };

  const execution = new ShellExecution(
    taskDefinition.command
  );

  const task = new Task(
    taskDefinition,
    TaskScope.Global,
    'Cheerleader Overlay',
    'cheerleader',
    execution
  );

  task.presentationOptions = presentationOptions;

  vscode.tasks.executeTask(task).then(undefined, (error) => {
    vscode.window.showErrorMessage(`Failed to execute task: ${error}`);
  });
}

const WS_PORT = 3000;

let ws: WebSocket.WebSocket;
let wss: WebSocket.Server;

function getVSCodeWindowInfo() {
  // Mock response
  return { x: 100, y: 100, width: 800, height: 600 };
}

function startWebSocketServer() {
  wss = new WebSocket.Server({ port: WS_PORT });

  wss.on("connection", (_ws) => {
    console.log("Overlay window connected");

    ws = _ws;

    // Send initial window information
    ws.send(
      JSON.stringify({
        type: "window-info",
        data: getVSCodeWindowInfo(),
      })
    );

    // Set up interval to send window position updates
    const updateInterval = setInterval(() => {
      ws.send(
        JSON.stringify({
          type: "window-info",
          data: getVSCodeWindowInfo(),
        })
      );
    }, 1000);

    ws.on("close", () => {
      clearInterval(updateInterval);
    });
  });
}

export function activateOverlay(context: vscode.ExtensionContext) {
  const killOverlayApp = () => {
    // The overlay app will quit when the websocket is closed
    console.log("Closing WebSocket server");
    ws.close();
    wss.close();
    // vscode.window.showInformationMessage("Overlay app stopped");
  };

  // show info message
  // vscode.window.showInformationMessage("WebSocket server started on port " + WS_PORT);

  // Start the overlay electron app
  const overlayAppPath = path.join(__dirname, "..", "live2d-container");
  // vscode.window.showInformationMessage("Starting overlay app at " + overlayAppPath);
  if (!fs.existsSync(overlayAppPath)) {
    vscode.window.showErrorMessage(
      "Overlay app not found at " + overlayAppPath
    );
    return;
  }
  try {
    // Register command to manually trigger the task
    let disposable = vscode.commands.registerCommand('cheerleader.launchOverlay', () => {
      startWebSocketServer();
      executeLaunchOverlayTask(overlayAppPath);
    });

    context.subscriptions.push(disposable);

    context.subscriptions.push(
      vscode.commands.registerCommand("cheerleader.killOverlay", () => {
        killOverlayApp();
      })
    );

    // Start WebSocket server
    startWebSocketServer();
    // Run task on startup
    executeLaunchOverlayTask(overlayAppPath);
  } catch (e) {
    vscode.window.showErrorMessage("Error starting overlay app: " + e);
    return;
  }

  context.subscriptions.push(
    vscode.Disposable.from({
      dispose: killOverlayApp
    })
  );
  // show info message
  // vscode.window.showInformationMessage("Overlay app started");
}
