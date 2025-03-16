const { app, BrowserWindow, ipcMain } = require('electron');
const WebSocket = require('ws');
const path = require('path');

let mainWindow;
const WS_PORT = 3000;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    resizable: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.maximize();

  mainWindow.loadFile('index.html');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.show();

  // Welcome message in terminal (because the terminal cannot be closed, show something interesting)
  showWelcomeMessage();
  // open devtools for debugging
  // mainWindow.webContents.openDevTools();

  // Connect to VSCode extension's WebSocket server
  const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
  ws.on("error", (err) => {
    console.log(err);
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    // if (data.type === 'window-info') {
    //   const { x, y, width, height } = data.data;
    //   mainWindow.setBounds({ x, y, width, height });
    // }
  });

  ws.on('close', () => {
    // TODO: Add quit animation
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setIgnoreMouseEvents(ignore, options);
});