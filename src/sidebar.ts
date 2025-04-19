import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cheerleader-controls";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "activate":
            vscode.commands.executeCommand("cheerleader.launchOverlay");
            break;
        case "deactivate":
            vscode.commands.executeCommand("cheerleader.killOverlay");
            break;
        case "toggleEncouragement":
            vscode.commands.executeCommand("cheerleader.toggleEncouragement");
            break;
        case "toggleProductivity":
            vscode.commands.executeCommand("cheerleader.toggleMonitoringRotting");
            break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get states from global storage (placeholder names)
    const encouragementEnabled = vscode.workspace.getConfiguration().get('cheerleader.encouragement.enabled', false);
    const productivityEnabled = vscode.workspace
      .getConfiguration()
      .get("cheerleader.productivity.monitoringEnabled", false);

    return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <style>
                        body {
                            padding: 10px;
                            color: var(--vscode-foreground);
                            font-family: var(--vscode-font-family);
                        }
                        .section {
                            margin-bottom: 20px;
                            padding: 10px;
                            background: var(--vscode-panel-background);
                            border-radius: 4px;
                        }
                        h3 {
                            margin-top: 0;
                            color: var(--vscode-foreground);
                            font-weight: normal;
                            font-size: 13px;
                            text-transform: uppercase;
                        }
                        button {
                            width: 100%;
                            padding: 8px;
                            margin: 5px 0;
                            background: var(--vscode-button-background);
                            color: var(--vscode-button-foreground);
                            border: none;
                            border-radius: 2px;
                            cursor: pointer;
                        }
                        button:hover {
                            background: var(--vscode-button-hoverBackground);
                        }
                        .status {
                            font-size: 12px;
                            margin-bottom: 5px;
                            color: var(--vscode-descriptionForeground);
                        }
                    </style>
                </head>
                <body>
                    <div class="section">
                        <h3>Extension Control</h3>
                        <button onclick="activate()">Activate Cheerleader</button>
                        <button onclick="deactivate()">Deactivate Cheerleader</button>
                    </div>

                    <div class="section">
                        <h3>Character Selection</h3>
                        <p class="status">Coming soon...</p>
                    </div>

                    <div class="section">
                        <h3>Features</h3>
                        <p id="encouragement-status" class="status">
                            Encouragement: <b>${encouragementEnabled ? "Enabled" : "Disabled"}</b>
                        </p>
                        <button onclick="toggleEncouragement()">Toggle Encouragement</button>
                        <p id="rotting-status" class="status">
                            Productivity Tracking: <b>${productivityEnabled ? "Enabled" : "Disabled"}</b>
                        </p>
                        <button onclick="toggleProductivity()">Toggle Productivity</button>
                    </div>

                    <script>
                        const vscode = acquireVsCodeApi();
                        function activate() {
                            vscode.postMessage({ type: 'activate' });
                        }
                        function deactivate() {
                            vscode.postMessage({ type: 'deactivate' });
                        }
                        function toggleEncouragement() {
                            vscode.postMessage({ type: 'toggleEncouragement' });
                            const status = document.getElementById('encouragement-status');
                            if (status) {
                                const isEnabled = !status.textContent.includes('Enabled');
                                status.textContent = 'Encouragement: ' + (isEnabled ? 'Enabled' : 'Disabled');
                                status.className = 'status ' + (isEnabled ? 'status-enabled' : 'status-disabled');
                            }
                        }
                        function toggleProductivity() {
                            vscode.postMessage({ type: 'toggleProductivity' });
                            const status = document.getElementById('rotting-status');
                            if (status) {
                                const isEnabled = !status.textContent.includes('Enabled');
                                status.textContent = 'Productivity Tracking: ' + (isEnabled ? 'Enabled' : 'Disabled');
                                status.className = 'status ' + (isEnabled ? 'status-enabled' : 'status-disabled');
                            }
                        }
                    </script>
                </body>
            </html>
        `;
  }
}

export function activateSidebar(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );
}