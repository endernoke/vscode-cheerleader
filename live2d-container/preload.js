/*
  The purpose of this script is to allow mouse events to pass through the overlay window, while capturing mouse events inside specified elements.
  This is useful for creating draggable elements inside the overlay window.
*/

const { ipcRenderer } = require('electron');

let isMouseOverInteractiveElement = false;

window.addEventListener('DOMContentLoaded', () => {
  const interactiveElements = document.querySelectorAll('.interactive');
  interactiveElements.forEach((element) => {
    element.addEventListener('mouseenter', () => {
      isMouseOverInteractiveElement = true;
      ipcRenderer.send('set-ignore-mouse-events', false);
    });

    element.addEventListener('mouseleave', () => {
      isMouseOverInteractiveElement = false;
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    });
  });
});

// Expose the setIgnoreMouseEvents function to the renderer process
const { contextBridge } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, args) => ipcRenderer.send('set-ignore-mouse-events', ignore, args),
  onStartSpeak: (callback) => ipcRenderer.on('startSpeak', callback),
  onStopSpeak: (callback) => ipcRenderer.on('stopSpeak', callback),
  onQuit: (callback) => ipcRenderer.on('quit', callback),
});