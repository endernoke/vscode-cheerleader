import * as vscode from 'vscode';
import * as path from 'path';
import { playAudioFromFile } from '../services/play_voice';

export function activateHealth(context: vscode.ExtensionContext) {
    HealthManager.initialize(context);
}

interface HealthConfig {
    breakReminderEnabled: boolean;
    breakReminderIntervalMinutes: number;
    breakDurationMinutes: number;
}

export class HealthManager {
    private static instance: HealthManager | undefined;

    public static getInstance(): HealthManager {
        if (!HealthManager.instance) {
            throw new Error('HealthManager not initialized');
        }
        return HealthManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): HealthManager {
        if (!HealthManager.instance) {
            HealthManager.instance = new HealthManager(context);
            context.subscriptions.push(HealthManager.instance);
        }
        return HealthManager.instance;
    }

    private config: HealthConfig;
    private breakTimer: NodeJS.Timeout | undefined;
    private stopWorkTimer: NodeJS.Timeout | undefined;
    private stopTimeForceQuitTimer: NodeJS.Timeout | undefined;
    private configurationChangeListener: vscode.Disposable | undefined;

    private getAudioFilePath(fileName: string): string {
        return this.context.asAbsolutePath(path.join("assets", "audio", fileName));
    }

    private constructor(private readonly context: vscode.ExtensionContext) {
        this.context = context;
        this.config = this.loadConfig();
        this.initializeTimers();

        // Listen for configuration changes
        this.configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('cheerleader.health')) {
                this.config = this.loadConfig();
                this.restartTimers();
            }
        });
    }

    private loadConfig(): HealthConfig {
        const config = vscode.workspace.getConfiguration('cheerleader.health');
        return {
            breakReminderEnabled: config.get('breakReminderEnabled', true),
            breakReminderIntervalMinutes: config.get('breakReminderIntervalMinutes', 45),
            breakDurationMinutes: config.get('breakDurationMinutes', 5)
        };
    }

    private initializeTimers(): void {
        if (this.config.breakReminderEnabled) {
            this.scheduleBreakReminder();
        }
    }

    private async scheduleBreakReminder(): Promise<void> {
        const intervalMs = this.config.breakReminderIntervalMinutes * 60 * 1000;
        this.breakTimer = setInterval(() => this.showBreakReminder(), intervalMs);
    }

    async showBreakReminder(): Promise<void> {
        await playAudioFromFile(this.getAudioFilePath("break_reminder.mp3"), "Consider incrementing health counter");
        
        const result = await vscode.window.showInformationMessage(
            "Time for a quick break to help maintain productivity.",
            "Take Break",
            "Nah Health is Overrated"
        );

        if (result === "Take Break") {
            await this.startBreakTimer();
        }
    }

    private async startBreakTimer(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'breakTimer',
            'Break Time',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getBreakTimerHtml(this.config.breakDurationMinutes);

        panel.onDidDispose(() => {
            panel.dispose();
        });
    }

    private getBreakTimerHtml(minutes: number): string {
        const tips = [
            "Stand up and stretch",
            "Do some quick desk exercises",
            "Look at something 20 feet away for 20 seconds",
            "Take deep breaths",
            "Drink some water"
        ];

        return `
            <!DOCTYPE html>
            <html>
            <body style="padding: 20px;">
                <h2>Break Time!</h2>
                <div id="timer" style="font-size: 24px; margin: 20px 0;"></div>
                <h3>Quick Tips:</h3>
                <ul>
                    ${tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
                <script>
                    let timeLeft = ${minutes * 60};
                    function updateTimer() {
                        const minutes = Math.floor(timeLeft / 60);
                        const seconds = timeLeft % 60;
                        document.getElementById('timer').textContent = 
                            minutes + ':' + seconds.toString().padStart(2, '0');
                        
                        if (timeLeft <= 0) {
                            window.close();
                            return;
                        }
                        timeLeft--;
                        setTimeout(updateTimer, 1000);
                    }
                    updateTimer();
                </script>
            </body>
            </html>
        `;
    }

    private restartTimers(): void {
        if (this.breakTimer) {
            clearInterval(this.breakTimer);
            this.breakTimer = undefined;
        }
        this.initializeTimers();
    }

    // Method to set or update stop time
    public setStopTime(timeString: string): boolean {
        const [hours, minutes] = timeString.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);

        // Validate the time is in the future
        if (targetTime <= new Date()) {
            vscode.window.showErrorMessage('Stop time must be in the future!');
            return false;
        }

        // Clear any existing stop work timers
        this.clearStopWorkTimers();

        // Calculate time until target
        const timeUntilStop = targetTime.getTime() - new Date().getTime();

        // Set new timer
        this.stopWorkTimer = setTimeout(async () => {
            await playAudioFromFile(this.getAudioFilePath("rest_reminder.mp3"), "Time to wrap up and get some rest!");

            // Start force quit timer
            this.stopTimeForceQuitTimer = setTimeout(async () => {
                await playAudioFromFile(this.getAudioFilePath("quit.mp3"), "Say adios to VSCode!");
                await vscode.workspace.saveAll();
                vscode.commands.executeCommand('workbench.action.closeAllEditors');
                vscode.commands.executeCommand('workbench.action.closeWindow');
            }, 10 * 60 * 1000); // 10 minutes grace period
            // we don't have snooze btw, that is for the weak :)

        }, timeUntilStop);

        return true;
    }

    private clearStopWorkTimers(): void {
        if (this.stopWorkTimer) {
            clearTimeout(this.stopWorkTimer);
            this.stopWorkTimer = undefined;
        }
        if (this.stopTimeForceQuitTimer) {
            clearTimeout(this.stopTimeForceQuitTimer);
            this.stopTimeForceQuitTimer = undefined;
        }
    }

    public dispose(): void {
        if (this.breakTimer) {
            clearInterval(this.breakTimer);
        }
        this.clearStopWorkTimers();
        if (this.configurationChangeListener) {
            this.configurationChangeListener.dispose();
        }
    }
}
