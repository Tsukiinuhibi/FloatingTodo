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
  mailGet: () => ipcRenderer.invoke('mail-get'),
  mailSet: cfg => ipcRenderer.invoke('mail-set', cfg),
  mailTest: () => ipcRenderer.invoke('mail-test'),
  openBackupDir: () => ipcRenderer.invoke('open-backup-dir'),
  openExternal: url => ipcRenderer.invoke('open-external', url),
  onUpdate: cb => ipcRenderer.on('update-status', (_e, s) => cb(s)),
  // 客服回覆文本
  csrLoad: () => ipcRenderer.sendSync('csr-load'),
  csrSave: json => ipcRenderer.sendSync('csr-save', json),
  csrKeepBroken: () => ipcRenderer.sendSync('csr-keep-broken'),
  csrSaveTxt: (name, text) => ipcRenderer.invoke('csr-save-txt', { name, text })
});
