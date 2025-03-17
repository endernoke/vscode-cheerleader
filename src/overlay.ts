import * as vscode from "vscode";
import * as WebSocket from "ws";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import * as path from "path";
import * as fs from "fs";

function executeInBackground(
  command: string,
  args: string[] = []
): ChildProcess {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore", // Prevents blocking on stdio
    shell: true,
    env: {},
    windowsHide: true, // Hide the terminal window on Windows
  });

  // Unref the child process.  This allows the parent process to exit
  // even if the child is still running.
  child.unref();

  return child;
}

let overlayProcess: ChildProcess | null = null;
const WS_PORT = 3000;

let ws: any;

function getVSCodeWindowInfo() {
  // Mock response
  return { x: 100, y: 100, width: 800, height: 600 };
}

export function activateOverlay(context: vscode.ExtensionContext) {
  // Start WebSocket server
  const wss = new WebSocket.Server({ port: WS_PORT });

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
    executeInBackground("npx", ["electron", overlayAppPath]);
  } catch (e) {
    vscode.window.showErrorMessage("Error starting overlay app: " + e);
    return;
  }

  context.subscriptions.push(
    vscode.Disposable.from({
      dispose: () => {
        wss.close();
        if (overlayProcess) {
          overlayProcess.kill();
        }
      },
    })
  );
  // show info message
  // vscode.window.showInformationMessage("Overlay app started");
}
