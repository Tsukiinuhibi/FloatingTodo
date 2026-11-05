const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setPin: on => ipcRenderer.invoke('set-pin', on),
  minimize: () => ipcRenderer.send('win-min'),
  close: () => ipcRenderer.send('win-close'),
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  version: () => ipcRenderer.invoke('app-version'),
  saveFile: (name, text) => ipcRenderer.invoke('save-file', { name, text }),
  openFile: () => ipcRenderer.invoke('open-file'),
  pickColor: () => ipcRenderer.invoke('pick-color'),
  updateCheck: () => ipcRenderer.send('update-check'),
  updateDownload: () => ipcRenderer.send('update-download'),
  updateInstall: () => ipcRenderer.send('update-install'),
  onUpdate: cb => ipcRenderer.on('update-status', (_e, s) => cb(s))
});
