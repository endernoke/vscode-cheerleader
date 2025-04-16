import { activeWindow, Result } from "get-windows";
import { playAudioFromFile } from "./play_voice";
import * as vscode from "vscode";

function isProductive(result: Result): boolean {
  // Mock function to check if the app is productive
  const productiveApps = [
    "Visual Studio Code",
    "Terminal",
    "Firefox",
    "Notion",
    "Slack",
    "Trello",
    "Asana",
    "Microsoft Teams",
    "Zoom",
    "Stack Overflow",
    "Medium",
    "Wikipedia",
    "Microsoft Word",
    "Microsoft Excel",
    "Microsoft PowerPoint",
    "ChatGPT",
    "Electron",
  ];

  // List of productive URLs (could be expanded)
  const productiveDomains = [
    /docs\.google\.com/,
    /github\.com/,
    /notion\.so/,
    /trello\.com/,
    /slack\.com/,
    /asana\.com/,
    /microsoft\.com/,
    /stackoverflow\.com/,
    /medium\.com/,
    /wikipedia\.org/,
  ];

  // Extract the app name and URL from the result
  const appName = result.owner.name; // Example: "Code", "Safari"
  const url = result.platform == "macos" ? result.url : result.title; // Example: "Personal - Instagram" (for web browsers)

  // Check if the app is in the productive apps list
  if (productiveApps.includes(appName)) {
    return true; // App or URL is considered productive
  }

  if (url && productiveApps.some((app) => url.includes(app))) {
    return true;
  }

  // Check if the URL belongs to a productive domain
  if (url && productiveDomains.some((pattern) => pattern.test(url))) {
    return true; // Website is considered productive
  }

  // Default assumption: Apps not matched in the lists are unproductive
  return false;
}

async function monitorRotting() {
  const result = await activeWindow();
  if (!result) return;

  if (!isProductive(result)) {
    console.log("Unproductive app detected:", result.owner.name);
    // I will generate this file from ElevenLabs and use a static one instead
    const audioFilePath = "../assets/rotting.wav";
    await playAudioFromFile(audioFilePath, "Hmm, rotting again?");
  }
}

export function registerMonitoringCommand(context: vscode.ExtensionContext) {
    let monitoringInterval: NodeJS.Timer | null = null;
    const MONITORING_INTERVAL = 5000; // Check every 5 seconds
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "cheerleader.toggleMonitoringRotting";

    function updateStatusBar() {
        if (monitoringInterval) {
            statusBarItem.text = "$(eye) Monitoring Productivity";
            statusBarItem.tooltip = "Click to stop monitoring";
        } else {
            statusBarItem.text = "$(eye-closed) Monitoring Stopped";
            statusBarItem.tooltip = "Click to start monitoring";
        }
        statusBarItem.show();
    }

    function startMonitoringRotting() {
        if (monitoringInterval) return; // Already monitoring
        monitoringInterval = setInterval(monitorRotting, MONITORING_INTERVAL);
        context.workspaceState.update("isMonitoring", true);
        updateStatusBar();
        console.log("Started productivity monitoring");
    }

    function stopMonitoringRotting() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval as NodeJS.Timeout);
            monitoringInterval = null;
            context.workspaceState.update("isMonitoring", false);
            updateStatusBar();
            console.log("Stopped productivity monitoring");
        }
    }

    const toggleCommand = vscode.commands.registerCommand(
        "cheerleader.toggleMonitoringRotting",
        () => {
            if (monitoringInterval) {
                stopMonitoringRotting();
                vscode.window.showInformationMessage("Productivity monitoring stopped.");
            } else {
                startMonitoringRotting();
                vscode.window.showInformationMessage("Productivity monitoring started.");
            }
        }
    );

    const startCommand = vscode.commands.registerCommand(
        "cheerleader.startMonitoringRotting",
        () => {
            startMonitoringRotting();
            vscode.window.showInformationMessage("Productivity monitoring started.");
        }
    );

    const stopCommand = vscode.commands.registerCommand(
        "cheerleader.stopMonitoringRotting",
        () => {
            stopMonitoringRotting();
            vscode.window.showInformationMessage("Productivity monitoring stopped.");
        }
    );

    context.subscriptions.push(startCommand, stopCommand, toggleCommand, statusBarItem);

    // Initialize status bar based on the current state
    const isMonitoring = context.workspaceState.get<boolean>("isMonitoring", false);
    if (isMonitoring) {
        startMonitoringRotting();
    } else {
        updateStatusBar();
    }
}
