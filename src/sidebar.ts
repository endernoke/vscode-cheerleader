import * as vscode from "vscode";
import { APIManager, ServiceType } from "./utils/api_manager";
import { WebSocketService } from "./services/websocket_service";
import { HealthManager } from "./copilot-wrapper/health";

/**
 * The Cheerleader decreed that the developers should not toil in silence. 
 * Thus, bestowed with the power to communicate through the sacred medium of 
 * webviews, he became the voice of encouragement in the darkest of times, 
 * direst of struggles, most desperate of moments, and every 3 am coding crisis, 
 * where man faces the ultimate test of his will and sanity.
 * -- The Georgeiste Manifesto, Chapter 3, Verse 3
 */
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
        case "updateStopTime":
          if (data.value) {
            const success = HealthManager.getInstance().setStopTime(data.value);
            if (success) {
              vscode.window.showInformationMessage(`I'll remind you to stop working at ${data.value}!`);
            }
          }
          break;
        case "togglePasteMonitoring":
        vscode.commands.executeCommand("cheerleader.togglePasteMonitoring");
        break;
      case "toggleBreakReminders":
        const config = vscode.workspace.getConfiguration('cheerleader.health');
        const currentValue = config.get('breakReminderEnabled');
        config.update('breakReminderEnabled', !currentValue, vscode.ConfigurationTarget.Global);
        break;
      case "updateBreakInterval":
        vscode.workspace.getConfiguration('cheerleader.health')
          .update('breakReminderIntervalMinutes', data.value, vscode.ConfigurationTarget.Global);
        break;
      case "updateBreakDuration":
        vscode.workspace.getConfiguration('cheerleader.health')
          .update('breakDurationMinutes', data.value, vscode.ConfigurationTarget.Global);
        break;
        case "saveElevenLabsKey":
          await this.handleApiKeyUpdate("elevenlabs", data.value);
          break;
        case "saveHuggingFaceKey":
          // Hugging Face support removed
          break;
        case "changeCharacter":
          WebSocketService.getInstance().sendMessage("changeModel", {
            modelIndex: data.index,
          });
          break;
        case "updateModelConfig":
          await this.handleModelConfigUpdate(data.config);
          break;
        case "updateAudioProvider":
          await this.handleAudioProviderUpdate(data.provider);
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

  private async handleAudioProviderUpdate(provider: 'elevenlabs'): Promise<void> {
    try {
      await this._apiManager.setAudioProvider(provider);

      if (this._view) {
        this._view.webview.postMessage({
          type: 'audioProviderValidation',
          status: 'valid',
          message: 'Audio provider updated successfully'
        });
      }
    } catch (error: any) {
      console.error('Error updating audio provider:', error);
      if (this._view) {
        this._view.webview.postMessage({
          type: 'audioProviderValidation',
          status: 'error',
          message: `Error updating audio provider: ${error?.message || 'Unknown error'}`
        });
      }
    }
  }

  private async handleModelConfigUpdate(config: { family: string }) {
    try {
      const modelConfig = vscode.workspace.getConfiguration('cheerleader.model');
      await modelConfig.update('family', config.family, vscode.ConfigurationTarget.Global);

      if (this._view) {
        this._view.webview.postMessage({
          type: 'modelConfigValidation',
          status: 'valid',
          message: 'Model family updated successfully'
        });
      }
    } catch (error: any) {
      console.error('Error updating model family:', error);
      if (this._view) {
        this._view.webview.postMessage({
          type: 'modelConfigValidation',
          status: 'error',
          message: `Error updating model family: ${error?.message || 'Unknown error'}`
        });
      }
    }
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const elevenLabsKey = await this._context.secrets.get('elevenlabs-key') || '';
    // Get model configuration
    const currentFamily = vscode.workspace.getConfiguration('cheerleader.model').get<string>('family') || 'gpt-4';

    // Get states from global storage
    const encouragementEnabled = vscode.workspace.getConfiguration().get('cheerleader.encouragement.enabled', false);
    const productivityEnabled = vscode.workspace
      .getConfiguration()
      .get("cheerleader.productivity.monitoringEnabled", false);
    const breakReminderEnabled = vscode.workspace
      .getConfiguration('cheerleader.health')
      .get("breakReminderEnabled", true);
    const breakInterval = vscode.workspace
      .getConfiguration('cheerleader.health')
      .get("breakReminderIntervalMinutes", 45);
    const breakDuration = vscode.workspace
      .getConfiguration('cheerleader.health')
      .get("breakDurationMinutes", 5);
    const pasteMeEnabled = vscode.workspace
      .getConfiguration()
      .get("cheerleader.paste.monitoringEnabled", false);

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
                            <label class="label" for="audio-provider">Audio Provider</label>
                            <select id="audio-provider" class="api-input" onchange="updateAudioProvider()">
                                <option value="elevenlabs" ${vscode.workspace.getConfiguration('cheerleader.audio').get('provider') === 'elevenlabs' ? 'selected' : ''}>ElevenLabs</option>
                            </select>
                            <div id="audio-provider-validation" class="validation-message"></div>

                            <label class="label" for="elevenlabs-key">ElevenLabs API Key</label>
                            <input type="password" id="elevenlabs-key" class="api-input" 
                                value="${elevenLabsKey}" 
                                onchange="saveElevenLabsKey(this.value)">
                            <div id="elevenlabs-validation" class="validation-message"></div>

                            <label class="label" for="model-family">Model Family</label>
                            <select id="model-family" class="api-input" onchange="updateModelConfig()">
                                <option value="gpt-4o" ${
                                  currentFamily === "gpt-4o" ? "selected" : ""
                                }>GPT-4o</option>
                                <option value="gpt-4o-mini" ${
                                  currentFamily === "gpt-4o-mini"
                                    ? "selected"
                                    : ""
                                }>GPT-4o Mini</option>
                                <option value="claude-3.5-sonnet" ${
                                  currentFamily === "claude-3.5-sonnet"
                                    ? "selected"
                                    : ""
                                }>Claude 3.5 Sonnet</option>
                            </select>
                            <div id="model-config-validation" class="validation-message"></div>

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
                                ${characterPaths
                                  .map(
                                    (path, index) => `
                                    <div class="character-item" data-index="${index}" onclick="selectCharacter(${index})">
                                        <img src="${path}" alt="Character ${
                                      index + 1
                                    }" />
                                    </div>
                                `
                                  )
                                  .join("")}
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
                            <p id="paste-me-status" class="status">
                                Paste Me: <b>${
                                  pasteMeEnabled ? "Enabled" : "Disabled"
                                }</b>
                            </p>
                            <button onclick="togglePasteMe()">Toggle Paste Me</button>
                            <p id="health-status" class="status">
                                Break Reminders: <b>${breakReminderEnabled ? "Enabled" : "Disabled"}</b>
                            </p>
                            <p class="status">
                                Break Interval: <b>${breakInterval} minutes</b>
                                <input type="number" id="break-interval" class="api-input"
                                    value="${breakInterval}" min="1" max="240"
                                    onkeypress="if(event.key === 'Enter') { updateBreakInterval(this.value); return false; }">
                            </p>
                            <p class="status">
                                Break Duration: <b>${breakDuration} minutes</b>
                                <input type="number" id="break-duration" class="api-input"
                                    value="${breakDuration}" min="1" max="60"
                                    onkeypress="if(event.key === 'Enter') { updateBreakDuration(this.value); return false; }">
                            </p>
                            <button onclick="toggleBreakReminders()">Toggle Break Reminders</button>

                            <p class="status">
                                Stop Time:
                                <input type="time" id="stop-time" class="api-input"
                                    onchange="updateStopTime(this.value)"
                                    onkeypress="if(event.key === 'Enter') { updateStopTime(this.value); return false; }">
                                <br><small class="optional">Set time to stop working for today</small>
                            </p>
                        </div>
                    </div>

                    <script>
                        function updateAudioProvider() {
                            const provider = document.getElementById('audio-provider').value;
                            vscode.postMessage({
                                type: 'updateAudioProvider',
                                provider: provider
                            });
                        }

                        // Handle messages from the extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.type === 'keyValidation' || message.type === 'modelConfigValidation') {
                                const validationDiv = document.getElementById(
                                    message.type === 'keyValidation'
                                        ? message.service + '-validation'
                                        : 'model-config-validation'
                                );
                                if (validationDiv) {
                                    validationDiv.textContent = message.message;
                                    validationDiv.className = 'validation-message ' +
                                        (message.status === 'valid' ? 'success' : 'error');
                                }
                            }
                        });

                        function updateModelConfig() {
                            const family = document.getElementById('model-family').value;
                            vscode.postMessage({
                                type: 'updateModelConfig',
                                config: { family }
                            });
                        }

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

                        // Functions to handle overlay startup and shutdown
                        function activate() {
                            vscode.postMessage({ type: 'activate' });
                        }
                        function deactivate() {
                            vscode.postMessage({ type: 'deactivate' });
                        }

                        // Toggle functions
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
                        function togglePasteMe() {
                            vscode.postMessage({ type: 'togglePasteMonitoring' });
                            const status = document.getElementById('paste-me-status');
                            if (status) {
                                const isEnabled = !status.textContent.includes('Enabled');
                                status.textContent = 'Paste Me: ' + (isEnabled ? 'Enabled' : 'Disabled');
                                status.className = 'status ' + (isEnabled ? 'status-enabled' : 'status-disabled');
                            }
                        }
                        function toggleBreakReminders() {
                            vscode.postMessage({ type: 'toggleBreakReminders' });
                            const status = document.getElementById('health-status');
                            if (status) {
                                const isEnabled = !status.textContent.includes('Enabled');
                                status.textContent = 'Break Reminders: ' + (isEnabled ? 'Enabled' : 'Disabled');
                                status.className = 'status ' + (isEnabled ? 'status-enabled' : 'status-disabled');
                            }
                        }
                        function updateBreakInterval(value) {
                            vscode.postMessage({
                                type: 'updateBreakInterval',
                                value: parseInt(value)
                            });
                        }
                        function updateBreakDuration(value) {
                            vscode.postMessage({
                                type: 'updateBreakDuration',
                                value: parseInt(value)
                            });
                        }

                        function updateStopTime(value) {
                            vscode.postMessage({
                                type: 'updateStopTime',
                                value: value
                            });
                        }

                        // API key save functions
                        function saveElevenLabsKey(value) {
                            vscode.postMessage({ type: 'saveElevenLabsKey', value });
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