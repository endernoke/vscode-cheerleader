import * as vscode from "vscode";
import { APIManager, ServiceType } from "./services/api_manager";
import { WebSocketService } from "./services/websocket_service";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cheerleader-controls";
  private _view?: vscode.WebviewView;
  private _apiManager: APIManager;

  constructor(
    private readonly _context: vscode.ExtensionContext
  ) {
    this._apiManager = APIManager.getInstance(this._context);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    this._getHtmlForWebview(webviewView.webview).then((html) => {
      webviewView.webview.html = html;
    });

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
        case "saveElevenLabsKey":
            await this.handleApiKeyUpdate('elevenlabs', data.value);
            break;
        case "saveHuggingFaceKey":
            await this.handleApiKeyUpdate('huggingface', data.value);
            break;
        case "changeCharacter":
            WebSocketService.getInstance().sendMessage('changeModel', { modelIndex: data.index });
            break;
      }
    });
  }

  private async handleApiKeyUpdate(service: ServiceType, key: string) {
    try {
      // First validate the key
      const isValid = await this._apiManager.validateKey(service, key);
      
      if (!isValid) {
        if (this._view) {
          this._view.webview.postMessage({
            type: 'keyValidation',
            service,
            status: 'invalid',
            message: `Invalid ${service} API key`
          });
        }
        return;
      }

      // If valid, save and initialize client
      await this._apiManager.setAPIKey(service, key);

      // Notify webview of success
      if (this._view) {
        this._view.webview.postMessage({
          type: 'keyValidation',
          service,
          status: 'valid',
          message: `${service} API key successfully saved and validated`
        });
      }
    } catch (error: any) { // Type assertion to any to access error.message
      console.error(`Error handling ${service} API key update:`, error);
      if (this._view) {
        this._view.webview.postMessage({
          type: 'keyValidation',
          service,
          status: 'error',
          message: `Error saving ${service} API key: ${error?.message || 'Unknown error'}`
        });
      }
    }
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const elevenLabsKey = await this._context.secrets.get('elevenlabs-key') || '';
    const huggingFaceKey = await this._context.secrets.get('huggingface-key') || '';

    // Get states from global storage
    const encouragementEnabled = vscode.workspace.getConfiguration().get('cheerleader.encouragement.enabled', false);
    const productivityEnabled = vscode.workspace
      .getConfiguration()
      .get("cheerleader.productivity.monitoringEnabled", false);

    // Create character paths for the grid
    const characters = [
        "Nika",
        "Neko",
        "Jiu",
        "Phro",
        "Sam",
        "Shirley",
        "Thorne",
        "Sonia",
    ];
    const characterPaths = [];
    for (let i = 0; i < 8; i++) {
      characterPaths.push(webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, `assets/characters/${characters[i]}.png`)).toString());
    }

    return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Security-Policy">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <style>
                        body {
                            padding: 10px;
                            color: var(--vscode-foreground);
                            font-family: var(--vscode-font-family);
                        }
                        .section {
                            margin-bottom: 10px;
                            background: var(--vscode-panel-background);
                            border-radius: 4px;
                        }
                        .section-header {
                            padding: 4px 10px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            user-select: none;
                        }
                        .section-header h3 {
                            margin: 0;
                            font-size: 12px;
                        }
                        .section-header:hover {
                            background: var(--vscode-list-hoverBackground);
                        }
                        .section-content {
                            padding: 10px;
                            display: none;
                        }
                        .section.open .section-content {
                            display: block;
                        }
                        .section-header:before {
                            content: "▶";
                            font-size: 10px;
                            margin-right: 5px;
                            transition: transform 0.2s;
                        }
                        .section.open .section-header:before {
                            transform: rotate(90deg);
                        }
                        .status {
                            font-size: 12px;
                            margin-bottom: 5px;
                            color: var(--vscode-descriptionForeground);
                        }
                        .api-input {
                            width: 100%;
                            padding: 6px;
                            margin: 4px 0;
                            background: var(--vscode-input-background);
                            color: var(--vscode-input-foreground);
                            border: 1px solid var(--vscode-input-border);
                            border-radius: 2px;
                        }
                        .label {
                            font-size: 12px;
                            margin-bottom: 2px;
                            display: block;
                        }
                        .optional {
                            color: var(--vscode-descriptionForeground);
                            font-size: 11px;
                        }
                        .validation-message {
                            font-size: 11px;
                            margin-top: 4px;
                            display: none;
                        }
                        .validation-message.error {
                            color: var(--vscode-errorForeground);
                            display: block;
                        }
                        .validation-message.success {
                            color: var(--vscode-gitDecoration-addedResourceForeground);
                            display: block;
                        }
                        button {
                            width: 100%;
                            padding: 6px 12px;
                            margin: 8px 0;
                            background: var(--vscode-button-background);
                            color: var(--vscode-button-foreground);
                            border: none;
                            border-radius: 2px;
                            cursor: pointer;
                            font-size: 12px;
                            font-family: var(--vscode-font-family);
                        }
                        button:hover {
                            background: var(--vscode-button-hoverBackground);
                        }
                        button:active {
                            background: var(--vscode-button-background);
                            opacity: 0.8;
                        }
                        
                        /* Character grid styles */
                        .character-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            grid-gap: 10px;
                            margin-bottom: 10px;
                        }
                        .character-item {
                            width: 100%;
                            aspect-ratio: 1;
                            border: 2px solid transparent;
                            border-radius: 4px;
                            overflow: hidden;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .character-item:hover {
                            transform: scale(1.05);
                        }
                        .character-item.selected {
                            border-color: var(--vscode-focusBorder);
                        }
                        .character-item img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .character-note {
                            font-size: 11px;
                            margin-top: 5px;
                            color: var(--vscode-descriptionForeground);
                        }
                    </style>
                </head>
                <body>
                    <div class="section open">
                        <div class="section-header">
                            <h3>Control and Config</h3>
                        </div>
                        <div class="section-content">
                            <label class="label" for="elevenlabs-key">ElevenLabs API Key</label>
                            <input type="password" id="elevenlabs-key" class="api-input" 
                                value="${elevenLabsKey}" 
                                onchange="saveElevenLabsKey(this.value)">
                            <div id="elevenlabs-validation" class="validation-message"></div>
                            
                            <label class="label" for="huggingface-key">
                                Hugging Face API Key <span class="optional">(optional)</span>
                            </label>
                            <input type="password" id="huggingface-key" class="api-input" 
                                value="${huggingFaceKey}" 
                                onchange="saveHuggingFaceKey(this.value)">
                            <div id="huggingface-validation" class="validation-message"></div>

                            <button onclick="activate()">Activate Cheerleader</button>
                            <button onclick="deactivate()">Deactivate Cheerleader</button>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h3>Character Selection</h3>
                        </div>
                        <div class="section-content">
                            <div class="character-grid">
                                ${characterPaths.map((path, index) => `
                                    <div class="character-item" data-index="${index}" onclick="selectCharacter(${index})">
                                        <img src="${path}" alt="Character ${index+1}" />
                                    </div>
                                `).join('')}
                            </div>
                            <button onclick="changeCharacter()">Select Character</button>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h3>Features</h3>
                        </div>
                        <div class="section-content">
                            <p id="encouragement-status" class="status">
                                Encouragement: <b>${
                                  encouragementEnabled ? "Enabled" : "Disabled"
                                }</b>
                            </p>
                            <button onclick="toggleEncouragement()">Toggle Encouragement</button>
                            <p id="rotting-status" class="status">
                                Productivity Tracking: <b>${
                                  productivityEnabled ? "Enabled" : "Disabled"
                                }</b>
                            </p>
                            <button onclick="toggleProductivity()">Toggle Productivity</button>
                        </div>
                    </div>

                    <script>
                        const vscode = acquireVsCodeApi();
                        let selectedCharacterIndex = 0;
                        
                        // Add click handlers for section headers
                        document.querySelectorAll('.section-header').forEach(header => {
                            header.addEventListener('click', () => {
                                const section = header.parentElement;
                                if (section) {
                                    section.classList.toggle('open');
                                }
                            });
                        });

                        // Handle messages from the extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.type === 'keyValidation') {
                                const validationDiv = document.getElementById(message.service + '-validation');
                                if (validationDiv) {
                                    validationDiv.textContent = message.message;
                                    validationDiv.className = 'validation-message ' + 
                                        (message.status === 'valid' ? 'success' : 'error');
                                }
                            }
                        });

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
                        function saveElevenLabsKey(value) {
                            vscode.postMessage({ type: 'saveElevenLabsKey', value });
                        }
                        function saveHuggingFaceKey(value) {
                            vscode.postMessage({ type: 'saveHuggingFaceKey', value });
                        }

                        // Character selection functions
                        function selectCharacter(index) {
                            selectedCharacterIndex = index;
                            
                            // Remove selected class from all items
                            document.querySelectorAll('.character-item').forEach(item => {
                                item.classList.remove('selected');
                            });
                            
                            // Add selected class to clicked item
                            document.querySelector(\`.character-item[data-index="\${index}"]\`).classList.add('selected');
                        }
                        
                        function changeCharacter() {
                            vscode.postMessage({ 
                                type: 'changeCharacter',
                                index: selectedCharacterIndex
                            });
                        }

                        // Pre-select the first character
                        window.addEventListener('load', () => {
                            selectCharacter(0);
                        });
                    </script>
                </body>
            </html>
        `;
  }
}

export function activateSidebar(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );
}