import * as vscode from 'vscode';
import { ElevenLabsClient } from 'elevenlabs';

export type ServiceType = 'elevenlabs' | 'huggingface';

interface APIManagerEvents {
    onKeyChange: (service: ServiceType, key: string) => void;
}

export class APIManager {
    private static instance: APIManager;
    private apiKeys: Map<ServiceType, string>;
    private clients: Map<ServiceType, any>;
    private eventHandlers: APIManagerEvents[];
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.apiKeys = new Map();
        this.clients = new Map();
        this.eventHandlers = [];
        this.context = context;
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
        // Load existing keys from secrets storage
        // Remind the user to set their keys if not found
        const elevenLabsKey = await this.context.secrets.get('elevenlabs-key');
        const huggingFaceKey = await this.context.secrets.get('huggingface-key');

        if (elevenLabsKey) {
            await this.setAPIKey('elevenlabs', elevenLabsKey);
        } else {
            vscode.window.showInformationMessage(
                'Please set your ElevenLabs API key in the sidebar.'
            );
        }

        if (huggingFaceKey) {
            await this.setAPIKey('huggingface', huggingFaceKey);
        } else {
            vscode.window.showInformationMessage(
                'If you want to use Hugging Face for transcription, please set your API key in the sidebar.'
            );
        }
    }

    public async setAPIKey(service: ServiceType, key: string): Promise<void> {
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
        const key = this.apiKeys.get(service);
        if (!key) {
            this.clients.delete(service);
            return;
        }

        try {
            switch (service) {
                case 'elevenlabs':
                    this.clients.set(service, this.createElevenLabsClient(key));
                    break;
                case 'huggingface':
                    // Hugging Face doesn't require client initialization,
                    // we just store the key for API calls
                    this.clients.set(service, { apiKey: key });
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

    public async validateKey(service: ServiceType, key: string): Promise<boolean> {
        try {
            switch (service) {
                case 'elevenlabs':
                    const client = new ElevenLabsClient({ apiKey: key });
                    // Try to access voices to validate the key
                    await client.voices.getAll();
                    return true;
                case 'huggingface':
                    // Implement Hugging Face key validation if needed
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