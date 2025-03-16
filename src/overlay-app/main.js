import * as fs from 'fs';

function _log(...args) {
    // Log to a file
    fs.appendFileSync(path.join(__dirname, 'debug.log'), args.join(' ') + '\n');
}
 _log('Starting overlay app...');

import { app, BrowserWindow } from 'electron';
import * as WebSocket from 'ws';
import * as path from 'path';
//const WebSocket = require('ws');
//const path = require('path');


let mainWindow;
const WS_PORT = 3000;

function createWindow() {
    _log("Starting overlay app...");
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    _log('Creating window...');

    mainWindow.loadFile('index.html');
    mainWindow.show();
    mainWindow.setResizable(false);
    mainWindow.setIgnoreMouseEvents(true);


    // Connect to VSCode extension's WebSocket server
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'window-info') {
            const { x, y, width, height } = data.data;
            mainWindow.setBounds({ x, y, width, height });
        }
    });

    ws.on('close', () => {
        app.quit();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    _log('Activating...');
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});