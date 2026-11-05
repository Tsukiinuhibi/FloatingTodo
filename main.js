const { app, BrowserWindow, ipcMain, Notification, screen, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let autoUpdater = null;

// Windows 通知需要 AppUserModelId（需與 package.json build.appId 相同）
app.setAppUserModelId(app.isPackaged ? 'com.desktop.floating-todo' : process.execPath);

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 380, height: 660, x: width - 400, y: 40,
    minWidth: 340, minHeight: 460,
    frame: false, resizable: true, alwaysOnTop: false,
    backgroundColor: '#f7f5f0',
    title: '桌面代辦',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  win.loadFile('index.html');
  win.webContents.once('did-finish-load', setupUpdater);
}

// ---------- 視窗 ----------
ipcMain.handle('set-pin', (_e, on) => {
  win.setAlwaysOnTop(!!on, 'screen-saver');
  win.setVisibleOnAllWorkspaces(!!on);
  return win.isAlwaysOnTop();
});
ipcMain.on('win-min', () => win.minimize());
ipcMain.on('win-close', () => win.close());
ipcMain.handle('app-version', () => app.getVersion());

// ---------- 通知 ----------
ipcMain.on('notify', (_e, { title, body }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'build', 'icon.png') });
  n.on('click', () => { if (win.isMinimized()) win.restore(); win.show(); win.focus(); });
  n.show();
  if (!win.isFocused()) win.flashFrame(true);
});

// ---------- 繼承檔 ----------
ipcMain.handle('save-file', async (_e, { name, text }) => {
  const r = await dialog.showSaveDialog(win, {
    title: '匯出繼承檔',
    defaultPath: path.join(app.getPath('documents'), name.replace(/[\\/:*?"<>|]/g, '_')),
    filters: [{ name: '桌面代辦繼承檔', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return r.filePath;
});
ipcMain.handle('open-file', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: '選擇繼承檔',
    properties: ['openFile'],
    filters: [{ name: '桌面代辦繼承檔', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return { name: path.basename(r.filePaths[0]), text: fs.readFileSync(r.filePaths[0], 'utf8') };
});

// ---------- 螢幕滴管：擷取游標所在螢幕，開全螢幕取色層 ----------
ipcMain.handle('pick-color', async () => {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const sf = display.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(display.size.width * sf), height: Math.round(display.size.height * sf) }
  });
  const src = sources.find(s => String(s.display_id) === String(display.id)) || sources[0];
  if (!src) return null;
  const image = src.thumbnail.toDataURL();

  return new Promise(resolve => {
    const pw = new BrowserWindow({
      ...display.bounds, frame: false, resizable: false, movable: false, skipTaskbar: true,
      alwaysOnTop: true, fullscreenable: false, hasShadow: false, enableLargerThanScreen: true,
      backgroundColor: '#000000', show: false,
      webPreferences: { preload: path.join(__dirname, 'picker-preload.js'), contextIsolation: true }
    });
    pw.setAlwaysOnTop(true, 'screen-saver');
    let done = false;
    const onResult = (e, v) => { if (e.sender === pw.webContents) finish(v); };
    const finish = v => {
      if (done) return; done = true;
      ipcMain.removeListener('picker-result', onResult);
      if (!pw.isDestroyed()) pw.close();
      if (win && !win.isDestroyed()) win.focus();
      resolve(v || null);
    };
    ipcMain.on('picker-result', onResult);
    pw.on('closed', () => finish(null));
    pw.loadFile('picker.html').then(() => {
      pw.webContents.send('picker-image', image);
      pw.show(); pw.focus();
    });
  });
});

// ---------- 自動更新（GitHub Releases） ----------
function sendUpdate(s) { if (win && !win.isDestroyed()) win.webContents.send('update-status', s); }
function setupUpdater() {
  if (!app.isPackaged) { sendUpdate({ state: 'idle' }); return; }
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { return; }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-available', i => sendUpdate({ state: 'available', version: i.version }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }));
  autoUpdater.on('download-progress', p => sendUpdate({ state: 'progress', percent: p.percent }));
  autoUpdater.on('update-downloaded', i => sendUpdate({ state: 'downloaded', version: i.version }));
  autoUpdater.on('error', err => sendUpdate({ state: 'error', message: String(err && err.message || err).split('\n')[0].slice(0, 80) }));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 4000);
  setInterval(check, 6 * 3600e3);
}
ipcMain.on('update-check', () => {
  if (!autoUpdater) return sendUpdate({ state: 'error', message: '開發模式不支援更新' });
  autoUpdater.checkForUpdates().catch(() => {});
});
ipcMain.on('update-download', () => autoUpdater && autoUpdater.downloadUpdate().catch(() => {}));
ipcMain.on('update-install', () => autoUpdater && autoUpdater.quitAndInstall(false, true));

// ---------- 啟動 ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show(); win.focus();
  });
  app.whenReady().then(createWindow);
}
app.on('browser-window-focus', () => win && win.flashFrame(false));
app.on('window-all-closed', () => app.quit());
