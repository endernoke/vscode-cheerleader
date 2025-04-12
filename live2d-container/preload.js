/*
  The purpose of this script is to allow mouse events to pass through the overlay window, while capturing mouse events inside specified elements.
  This is useful for creating draggable elements inside the overlay window.
*/

const { ipcRenderer } = require('electron');

let isMouseOverInteractiveElement = false;

const setupIgnoreMouseEvents = () => {
  const interactiveElements = document.querySelectorAll('.interactive');
  interactiveElements.forEach((element) => {
    element.addEventListener('pointerenter', () => {
      isMouseOverInteractiveElement = true;
      ipcRenderer.send('set-ignore-mouse-events', false);
    });

    element.addEventListener('pointerout', () => {
      isMouseOverInteractiveElement = false;
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    });
  });
}

window.addEventListener('DOMContentLoaded', setupIgnoreMouseEvents);

// Expose the setIgnoreMouseEvents function to the renderer process
const { contextBridge } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, args) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, args);
    isMouseOverInteractiveElement = !ignore;
  },
  setupIgnoreMouseEvents: setupIgnoreMouseEvents,
  onStartSpeak: (callback) => ipcRenderer.on('startSpeak', callback),
  onStopSpeak: (callback) => ipcRenderer.on('stopSpeak', callback),
  onCloseButton: () => ipcRenderer.send('onCloseButton'),
  onQuit: (callback) => ipcRenderer.on('quit', callback),
  openLinkInBrowser: (url) => ipcRenderer.send('open-link-in-browser', url),
  runVSCodeCommand: (command) => ipcRenderer.send('run-vscode-command', command),
});