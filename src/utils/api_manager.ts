import * as vscode from 'vscode';
import { ElevenLabsClient } from 'elevenlabs';

export type ServiceType = 'elevenlabs';
export type AudioProvider = 'elevenlabs';

interface APIManagerEvents {
    onKeyChange: (service: ServiceType, key: string) => void;
}

export class APIManager {
    private static instance: APIManager;
    private apiKeys: Map<ServiceType, string>;
    private clients: Map<ServiceType, any>;
    private eventHandlers: APIManagerEvents[];
    private context: vscode.ExtensionContext;
    private audioProvider: AudioProvider;

    private constructor(context: vscode.ExtensionContext) {
        this.apiKeys = new Map();
        this.clients = new Map();
        this.eventHandlers = [];
        this.context = context;
        this.audioProvider = vscode.workspace.getConfiguration('cheerleader.audio').get('provider', 'elevenlabs');
    }

    public static getInstance(context?: vscode.ExtensionContext): APIManager {
        if (!APIManager.instance && context) {
            APIManager.instance = new APIManager(context);
        } else if (!APIManager.instance) {
            throw new Error('APIManager must be initialized with context first');
        }
        return APIManager.instance;
    }

    public async initialize() {
        // Get the current provider from settings
        const currentProvider = this.getAudioProvider();
        
        // Only load the key for the current provider
        const key = await this.context.secrets.get(`${currentProvider}-key`);
        
        if (key) {
            try {
                await this.setAPIKey(currentProvider, key);
            } catch (error) {
                console.error(`Failed to initialize ${currentProvider} client:`, error);
                vscode.window.showErrorMessage(
                    `Failed to initialize ${currentProvider}. Please check your API key in the sidebar.`
                );
            }
        } else {
            vscode.window.showInformationMessage(
                `Please set your ${currentProvider} API key in the sidebar.`
            );
        }
    }

    public async setAPIKey(service: ServiceType, key: string): Promise<void> {
        // Only store key if it's for the current provider
        const currentProvider = this.getAudioProvider();
        if (service !== currentProvider) {
            throw new Error(`Cannot set API key for ${service} while using ${currentProvider} provider`);
        }

        // Store in secrets
        await this.context.secrets.store(`${service}-key`, key);
        
        // Update local map
        this.apiKeys.set(service, key);
        
        // Reinitialize client
        await this.reinitializeClient(service);
        
        // Notify listeners
        this.notifyKeyChange(service, key);
    }

    public getClient<T>(service: ServiceType): T | undefined {
        return this.clients.get(service) as T;
    }

    public addEventListener(handler: APIManagerEvents) {
        this.eventHandlers.push(handler);
    }

    public removeEventListener(handler: APIManagerEvents) {
        const index = this.eventHandlers.indexOf(handler);
        if (index > -1) {
            this.eventHandlers.splice(index, 1);
        }
    }

    private async reinitializeClient(service: ServiceType): Promise<void> {
        // Clear all existing clients since we only use one at a time
        this.clients.clear();

        const key = this.apiKeys.get(service);
        if (!key) {
            return;
        }

        // Only initialize if it matches the current audio provider
        const currentProvider = this.getAudioProvider();
        if (service !== currentProvider) {
            return;
        }

        try {
            switch (service) {
                case 'elevenlabs':
                    this.clients.set(service, this.createElevenLabsClient(key));
                    break;
            }
        } catch (error) {
            console.error(`Failed to initialize ${service} client:`, error);
            throw error;
        }
    }

    private createElevenLabsClient(apiKey: string): ElevenLabsClient {
        return new ElevenLabsClient({
            apiKey: apiKey
        });
    }

    private notifyKeyChange(service: ServiceType, key: string) {
        this.eventHandlers.forEach(handler => {
            handler.onKeyChange(service, key);
        });
    }

    public getAudioProvider(): AudioProvider {
        return this.audioProvider;
    }

    public async setAudioProvider(provider: AudioProvider): Promise<void> {
        this.audioProvider = provider;
        
        // Clear all clients since we're switching providers
        this.clients.clear();
        
        // Update VSCode settings
        await vscode.workspace.getConfiguration('cheerleader.audio')
            .update('provider', provider, vscode.ConfigurationTarget.Global);
        
        // Initialize the new provider
        await this.initialize();
    }

    public async validateKey(service: ServiceType, key: string): Promise<boolean> {
        try {
            switch (service) {
                case 'elevenlabs':
                    const client = new ElevenLabsClient({ apiKey: key });
                    await client.voices.getAll();
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            console.error(`Failed to validate ${service} key:`, error);
            return false;
        }
    }
}