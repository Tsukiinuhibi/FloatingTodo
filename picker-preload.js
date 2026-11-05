const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picker', {
  onImage: cb => ipcRenderer.on('picker-image', (_e, img) => cb(img)),
  done: hex => ipcRenderer.send('picker-result', hex)
});
