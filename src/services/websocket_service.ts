// import * as WebSocket from "ws";
import WebSocket, { WebSocketServer } from "ws";
import * as vscode from "vscode";

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocket.Server | null = null;
  private ws: WebSocket.WebSocket | null = null;
  private readonly WS_PORT = 54321;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  startServer() {
    if (this.wss) {
      return;
    }

    this.wss = new WebSocketServer({ port: this.WS_PORT });
    console.log("WebSocket server started on port", this.WS_PORT);

    this.wss.on("connection", (_ws) => {
      console.log("Overlay window connected");
      this.ws = _ws;

      _ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(message.type);
          if (message.type === 'run-vscode-command' && message.command) {
            vscode.commands.executeCommand(message.command);
          }
        } catch (error) {
          console.error("Error handling overlay message:", error);
        }
      });

      _ws.on("close", () => {
        this.ws = null;
        this.wss?.close();
        this.wss = null;
      });
    });
  }

  sendMessage(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  /**
   * Activate the Live2D character's speech animation
   * @param text The text to be spoken
   * @param duration The duration of the speech animation in milliseconds
   */
  startSpeak(text: string, duration: number = 3000) {
    this.sendMessage('startSpeak', { text, duration });
  }

  stopSpeak() {
    this.sendMessage('stopSpeak', {});
  }

  close() {
    this.ws?.close();
    this.wss?.close();
    this.ws = null;
    this.wss = null;
  }
}