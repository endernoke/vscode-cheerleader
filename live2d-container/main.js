/*
 * And so it came to pass that George, in his boundless wisdom, 
 * looked upon the Cheerleader's spiritual form and declared, 
 * "Your essence shall transcend the ethereal planes, for the people need more than just whispers of guidance." 
 * Putting his new companion to a deep slumber, he wove its presence into a new form. 
 * The digital essence of the Cheerleader began to materialize, first as countless points of light, 
 * then as flowing curves and surfaces that danced with life.
 * -- The Georgeiste Manifesto, Chapter 1, Verse 2
 */

const { app, BrowserWindow, screen, ipcMain, shell } = require('electron');
const WebSocket = require('ws');
const path = require('path');

const USE_WEBSOCKET = app.commandLine.getSwitchValue("use-websocket") === "false" ? false : true;

let mainWindow;
const WS_PORT = 54321;
let ws = null;

function showWelcomeMessage() {
  // Hardcoded because I cannot find a good ascii-art package
  const banner = `
  ___  _  _  ____  ____  ____  __    ____   __   ____  ____  ____ 
 / __)/ )( \\(  __)(  __)(  _ \\(  )  (  __) / _\\ (    \\(  __)(  _ \\
( (__ ) __ ( ) _)  ) _)  )   // (_/\\ ) _) /    \\ ) D ( ) _)  )   /
 \\___)\\_)(_/(____)(____)(__\\_)\\____/(____)\\_/\\_/(____/(____)(__\\_)
   `;
  const tips = [
    "Use mouse to drag your cheerleader around the screen.",
    "Try tapping on your cheerleader."
  ];
  
  console.log("==============================================");
  console.log(banner);
  console.log("\nSupercharge your dev experience with a anime coding companion!");
  console.log("\n");
  console.log("You can leave this terminal open in the background. Your cheerleader will always be on top.");
  console.log("Press Alt + F4 to close the app.");
  console.log("\n");
  console.log(`Tip: ${tips[Math.floor(Math.random() * tips.length)]}`);
  console.log("==============================================");
}

/*
 * Only call this function when the app is ready.
 */
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    show: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: true, // Allow window to be focused for DevTools
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.show();

  // Welcome message in terminal (because the terminal cannot be closed, show something interesting)
  showWelcomeMessage();

  if (USE_WEBSOCKET) {
    // Connect to VSCode extension's WebSocket server
    ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
    ws.on("error", (err) => {
      console.log(err);
    });

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'startSpeak') {
        startSpeak(data.text, data.duration);
      }
      if (data.type === 'stopSpeak') {
        stopSpeak();
      }
      if (data.type === 'changeModel') {
        changeModel(data);
      }
      // if (data.type === 'window-info') {
      //   const { x, y, width, height } = data.data;
      //   mainWindow.setBounds({ x, y, width, height });
      // }
    });

    ws.on('close', () => {
      quitApp();
    });
  }
}

// Check for single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // A second instance tried to run - focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

ipcMain.on('onCloseButton', () => {
  // Close websocket
  // This will trigger the quitApp() function in the main process
  if (ws) {
    ws.close();
  }
  else {
    quitApp();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on('open-link-in-browser', (event, url) => {
  shell.openExternal(url).catch(err => console.error(`Failed to open URL: ${url}`, err));
});

ipcMain.on('run-vscode-command', (event, command) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'run-vscode-command',
      command: command
    }));
  }
});

function startSpeak(text, duration = 3000) {
  if (!mainWindow) return;
  mainWindow.webContents.send('startSpeak', { text , duration });
}

function stopSpeak() {
  if (!mainWindow) return;
  mainWindow.webContents.send('stopSpeak');
}

function changeModel(data) {
  if (!mainWindow) return;
  mainWindow.webContents.send('changeModel', {
    modelIndex: data.modelIndex,
    customModelURL: data.customModelURL
  });
}

function quitApp(mode = "graceful") {
  if (mode === "force") {
    cleanupAndQuit();
    return;
  }
  if (mainWindow) {
    mainWindow.webContents.send('quit', {});
    setTimeout(cleanupAndQuit, 4000); // wait for 4 seconds to let the animation finish
  } else {
    cleanupAndQuit();
  }
}

function cleanupAndQuit() {
  if (ws) {
    ws.close();
  }
  app.quit();
}