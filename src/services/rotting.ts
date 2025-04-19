import { playAudioFromFile } from "./play_voice";
import * as vscode from "vscode";
import type { Result } from "get-windows";

/**
 * George called the Cheerleader to the mountains and delivered the first commandment:
 * "Thou shalt not rot, for I have given you the power to be productive."
 * -- The Georgeiste Manifesto, Chapter 3, Verse 1
 */
function isProductive(result: Result): boolean {
  const productiveApps = [
    "Visual Studio Code",
    "Code",
    "iTerm2",
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
    return true;
  }

  if (url && productiveApps.some((app) => url.includes(app))) {
    return true;
  }

  // Check if the URL belongs to a productive domain
  if (url && productiveDomains.some((pattern) => pattern.test(url))) {
    return true;
  }

  // Default unproductive 
  return false;
}

const audioFiles = {
  "rotting1.mp3": "Hmm, rotting again?",
  "rotting2.mp3": "Productivity has left the chat.",
  "rotting3.mp3": "Me watching you browse instead of code 👁️👄👁️",
};

let globalContext: vscode.ExtensionContext;

async function monitorRotting() {
  // Dynamically import get-windows
  const { activeWindow } = await import('get-windows');
  const result = await activeWindow();
  if (!result) return;

  const currentProductiveState = isProductive(result);
  const lastProductiveState = globalContext.globalState.get<boolean>("lastProductiveState", true);
  
  // Only notify when transitioning from productive to unproductive
  if (lastProductiveState && !currentProductiveState) {
    console.log("Unproductive app detected:", result.owner.name);
    const audioFileEntries = Object.entries(audioFiles);
    const [fileName, text] = audioFileEntries[Math.floor(Math.random() * audioFileEntries.length)];
    const audioFilePath = vscode.Uri.file(
      `${globalContext.extensionUri.fsPath}/assets/rotting/${fileName}`
    ).fsPath;
    await playAudioFromFile(audioFilePath, text, 10);
  }
  
  globalContext.globalState.update("lastProductiveState", currentProductiveState);
}

/**
 * Registers the command to toggle productivity monitoring.
 * This command allows users to start or stop the monitoring of their productivity.
 * @note You can use the following two contexts in other parts of the app:
 * @context "isMonitoringRotting" - A boolean value indicating whether the monitoring is currently active.
 * @context "lastProductiveState" - A boolean value indicating the last known productive state.
 */
export function registerMonitoringCommand(context: vscode.ExtensionContext) {
    globalContext = context;
    let monitoringInterval: NodeJS.Timer | null = null;
    const MONITORING_INTERVAL = 5000;

    function startMonitoringRotting() {
        if (monitoringInterval) return;
        monitoringInterval = setInterval(monitorRotting, MONITORING_INTERVAL);
        const config = vscode.workspace.getConfiguration('cheerleader.productivity');
        config.update('monitoringEnabled', true, vscode.ConfigurationTarget.Global);
        console.log("Started productivity monitoring");
    }

    function stopMonitoringRotting() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval as NodeJS.Timeout);
            monitoringInterval = null;
            const config = vscode.workspace.getConfiguration('cheerleader.productivity');
            config.update('monitoringEnabled', false, vscode.ConfigurationTarget.Global);
            console.log("Stopped productivity monitoring");
        }
    }

    // Update to check configuration instead of global state
    const config = vscode.workspace.getConfiguration('cheerleader.productivity');
    if (config.get('monitoringEnabled', false)) {
        startMonitoringRotting();
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

    context.subscriptions.push(toggleCommand);
}
