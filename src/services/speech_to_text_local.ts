import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Need to use require for these modules as they don't have TypeScript definitions
const vosk = require('vosk');
const mic = require('mic');

export class SpeechToTextService {
    private model: any;
    private recognizer: any;
    private micInstance: any;
    private micInputStream: any;
    private eventEmitter: EventEmitter = new EventEmitter();

    // Constants
    private readonly SAMPLE_RATE = 16000;
    private readonly MODEL_PATH: string;
    
    isListening: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        // Model path should be within extension directory
        this.MODEL_PATH = path.join(context.extensionPath, 'model');
    }

    /**
     * Start speech recognition
     */
    public async startListening(): Promise<void> {
        if (this.isListening) {
            return;
        }

        try {
            // Check if model exists
            if (!fs.existsSync(this.MODEL_PATH)) {
                vscode.window.showErrorMessage(
                    'Speech recognition model not found. Please download the model from ' +
                    'https://alphacephei.com/vosk/models and extract it to the "model" folder in the extension directory.'
                );
                return;
            }

            // Initialize Vosk
            vosk.setLogLevel(0);
            this.model = new vosk.Model(this.MODEL_PATH);
            this.recognizer = new vosk.Recognizer({ model: this.model, sampleRate: this.SAMPLE_RATE });

            // Initialize microphone
            this.micInstance = mic({
                rate: String(this.SAMPLE_RATE),
                channels: '1',
                debug: false,
                device: 'default',
            });

            this.micInputStream = this.micInstance.getAudioStream();

            // Handle audio data
            this.micInputStream.on('data', (data: Buffer) => {
                if (this.recognizer.acceptWaveform(data)) {
                    // Complete recognition result
                    const result = this.recognizer.result();
                    if (result && result.text) {
                        this.eventEmitter.emit('finalRecognition', result.text);
                        vscode.window.showInformationMessage(`Recognized: ${result.text}`);
                    }
                } else {
                    // Partial recognition result
                    const partial = this.recognizer.partialResult();
                    if (partial && partial.partial) {
                        this.eventEmitter.emit('partialRecognition', partial.partial);
                    }
                }
            });

            // Handle when audio processing is complete
            this.micInputStream.on('audioProcessExitComplete', () => {
                const finalResult = this.recognizer.finalResult();
                if (finalResult && finalResult.text) {
                    this.eventEmitter.emit('finalRecognition', finalResult.text);
                }
                this.cleanup();
            });

            // Start the microphone
            this.micInstance.start();
            this.isListening = true;
            vscode.window.showInformationMessage('Speech recognition started. Start speaking...');

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start speech recognition: ${error}`);
            this.cleanup();
        }
    }

    /**
     * Stop speech recognition
     */
    public stopListening(): void {
        if (!this.isListening) {
            return;
        }

        try {
            this.micInstance.stop();
            vscode.window.showInformationMessage('Speech recognition stopped.');
        } catch (error) {
            vscode.window.showErrorMessage(`Error stopping speech recognition: ${error}`);
        } finally {
            this.cleanup();
        }
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        if (this.recognizer) {
            this.recognizer.free();
            this.recognizer = null;
        }

        if (this.model) {
            this.model.free();
            this.model = null;
        }

        this.isListening = false;
    }

    /**
     * Register an event listener
     */
    public on(event: 'finalRecognition' | 'partialRecognition', listener: (text: string) => void): void {
        this.eventEmitter.on(event, listener);
    }
}

/**
 * Register speech to text commands in VS Code
 */
export function registerSpeechToTextCommand(context: vscode.ExtensionContext): void {
    const speechService = new SpeechToTextService(context);
    
    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(mic) Start Speech";
    statusBarItem.command = 'vscode-cheerleader.toggleSpeechRecognition';
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);
    
    // Toggle speech recognition command
    const toggleCommand = vscode.commands.registerCommand('vscode-cheerleader.toggleSpeechRecognition', async () => {
        if (speechService.isListening) {
            speechService.stopListening();
            statusBarItem.text = "$(mic) Start Speech";
        } else {
            await speechService.startListening();
            statusBarItem.text = "$(debug-stop) Stop Speech";
        }
    });
    
    // Start speech recognition command
    const startCommand = vscode.commands.registerCommand('vscode-cheerleader.startSpeechRecognition', async () => {
        await speechService.startListening();
        statusBarItem.text = "$(debug-stop) Stop Speech";
    });
    
    // Stop speech recognition command
    const stopCommand = vscode.commands.registerCommand('vscode-cheerleader.stopSpeechRecognition', () => {
        speechService.stopListening();
        statusBarItem.text = "$(mic) Start Speech";
    });
    
    context.subscriptions.push(toggleCommand, startCommand, stopCommand);
}
