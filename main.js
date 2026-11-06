const { app, BrowserWindow, ipcMain, Notification, screen, dialog, desktopCapturer, safeStorage, shell } = require('electron');

// 顯示名稱。內部名稱（package.json 的 productName = FloatingTodo）不能改：
// 它決定資料夾 %APPDATA%\FloatingTodo，改了舊的代辦資料就讀不到。
const APP_NAME = '上班便利小工具';
const path = require('path');
const fs = require('fs');

let win;
let autoUpdater = null;
let allowClose = false;

// Windows 通知需要 AppUserModelId（需與 package.json build.appId 相同）
app.setAppUserModelId(app.isPackaged ? 'com.desktop.floating-todo' : process.execPath);

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 380, height: 660, x: width - 400, y: 40,
    minWidth: 340, minHeight: 460,
    frame: false, resizable: true, alwaysOnTop: false,
    backgroundColor: '#f7f5f0',
    title: APP_NAME,
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

  // 關閉時：先隱藏視窗，做完本機備份與寄信再真正結束
  win.on('close', async e => {
    if (allowClose) return;
    e.preventDefault();
    win.hide();
    try { await runBackup(); } catch (err) {}
    allowClose = true;
    win.close();
  });
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

// ---------- 回信備份 ----------
const pad = n => String(n).padStart(2, '0');
const stamp = (d = new Date(), sep = true) => sep
  ? `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  : `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const cfgPath = () => path.join(app.getPath('userData'), 'mail.json');
const backupDir = () => path.join(app.getPath('documents'), '桌面代辦備份');
function loadCfg() {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); }
  catch (e) { return { enabled: false, provider: 'gmail', localBackup: true }; }
}
function saveCfg(c) { fs.writeFileSync(cfgPath(), JSON.stringify(c, null, 1)); }
function encPass(p) {
  if (safeStorage.isEncryptionAvailable()) return { enc: true, v: safeStorage.encryptString(p).toString('base64') };
  return { enc: false, v: Buffer.from(p).toString('base64') };
}
function decPass(o) {
  if (!o) return '';
  const b = Buffer.from(o.v, 'base64');
  return o.enc ? safeStorage.decryptString(b) : b.toString();
}
const safeName = s => String(s || '').replace(/[\\/:*?"<>|]/g, '_');

ipcMain.handle('mail-get', () => {
  const { pass, ...rest } = loadCfg();
  return { ...rest, hasPass: !!pass, backupDir: backupDir() };
});
ipcMain.handle('mail-set', (_e, n) => {
  const c = loadCfg();
  const { pass, ...rest } = n;
  Object.assign(c, rest);
  if (pass) c.pass = encPass(pass);
  saveCfg(c);
  return true;
});
ipcMain.handle('mail-test', async () => {
  const text = await getPayload();
  if (!text) return { ok: false, error: '無法讀取資料' };
  return sendBackupMail(text, true);
});
ipcMain.handle('open-backup-dir', () => { fs.mkdirSync(backupDir(), { recursive: true }); return shell.openPath(backupDir()); });
ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

async function getPayload() {
  if (!win || win.isDestroyed()) return null;
  return Promise.race([
    win.webContents.executeJavaScript('window.__backupPayload ? window.__backupPayload() : null'),
    new Promise(r => setTimeout(() => r(null), 3000))
  ]);
}
function writeLocalBackup(text) {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `桌面代辦備份_${stamp(new Date(), false)}.json`), text, 'utf8');
  const files = fs.readdirSync(dir).filter(f => /^桌面代辦備份_\d{8}_\d{6}\.json$/.test(f)).sort();
  files.slice(0, Math.max(0, files.length - 20)).forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} });
}
function friendlyError(err) {
  const code = err && (err.code || err.responseCode);
  if (code === 'EAUTH' || code === 535 || code === 534) return '帳號或密碼錯誤（Gmail 請使用應用程式密碼）';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND', 'ECONNREFUSED', 'EDNS'].includes(code)) return '無法連線到郵件伺服器，請確認網路或伺服器設定';
  return String(err && err.message || err).split('\n')[0].slice(0, 120);
}
async function sendBackupMail(text, isTest = false) {
  const c = loadCfg();
  if (!c.to || !c.user || !c.pass) return { ok: false, error: '回信設定不完整' };
  let data = {};
  try { data = JSON.parse(text); } catch (e) {}
  const name = (data.user && data.user.name) || '';
  const d = data.data || {};
  const count = (d.tasks || []).length + Object.values(d.required || {}).reduce((n, a) => n + a.length, 0);
  const csrCount = ((d.csr && d.csr.categories) || []).reduce((n, c) => n + (c.items || []).length, 0);
  const server = c.provider === 'custom'
    ? { host: c.host, port: +c.port || 465, secure: !!c.secure }
    : { host: 'smtp.gmail.com', port: 465, secure: true };
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ ...server, auth: { user: c.user, pass: decPass(c.pass) },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    await t.sendMail({
      from: `"${APP_NAME}" <${c.user}>`,
      to: c.to,
      subject: `${isTest ? '[測試] ' : ''}[${APP_NAME}備份] ${name ? name + ' ' : ''}${stamp()}`,
      text: [
        `這是「${APP_NAME}」${isTest ? '的測試備份信' : '在關閉時自動寄出的備份'}。`,
        '',
        `使用者：${name || '未命名'}`,
        `備份時間：${stamp()}`,
        `事項數量：${count} 筆`,
        `客服文本：${csrCount} 段`,
        '',
        '【如何還原】',
        '1. 下載這封信的附件（.json 檔）',
        `2. 開啟${APP_NAME} → 右上角 ⚙ 設定 → 繼承 → 選擇繼承檔匯入`,
        '3. 確認使用者後按「合併匯入」',
      ].join('\n'),
      attachments: [{ filename: `${APP_NAME}繼承檔_${safeName(name) || '備份'}_${stamp(new Date(), false)}.json`, content: text, contentType: 'application/json' }]
    });
    const n = loadCfg(); n.lastSent = Date.now(); saveCfg(n);
    return { ok: true };
  } catch (err) {
    const msg = friendlyError(err);
    const n = loadCfg(); n.lastError = { at: Date.now(), msg }; saveCfg(n);
    return { ok: false, error: msg };
  }
}
// 關閉或更新前執行：本機備份＋寄信（最多等 25 秒）
async function runBackup({ mail = true } = {}) {
  const text = await getPayload();
  if (!text) return;
  const c = loadCfg();
  if (c.localBackup !== false) {
    try { writeLocalBackup(text); const n = loadCfg(); n.lastLocal = Date.now(); saveCfg(n); } catch (e) {}
  }
  if (mail && c.enabled) await Promise.race([sendBackupMail(text), new Promise(r => setTimeout(r, 25000))]);
}

// ---------- 繼承檔 ----------
ipcMain.handle('save-file', async (_e, { name, text }) => {
  const r = await dialog.showSaveDialog(win, {
    title: '匯出繼承檔',
    defaultPath: path.join(app.getPath('documents'), name.replace(/[\\/:*?"<>|]/g, '_')),
    filters: [{ name: `${APP_NAME}繼承檔`, extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return r.filePath;
});
ipcMain.handle('open-file', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: '選擇繼承檔',
    properties: ['openFile'],
    filters: [{ name: `${APP_NAME}繼承檔`, extensions: ['json'] }]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return { name: path.basename(r.filePaths[0]), text: fs.readFileSync(r.filePaths[0], 'utf8') };
});

// ---------- 客服回覆文本：資料檔（userData/csr-data.json） ----------
// 同步讀寫（介面一修改就存），先寫暫存檔再改名，避免寫到一半斷電把檔案弄壞
const csrPath = () => path.join(app.getPath('userData'), 'csr-data.json');
ipcMain.on('csr-load', e => {
  try { e.returnValue = fs.readFileSync(csrPath(), 'utf8'); } catch (err) { e.returnValue = null; }
});
ipcMain.on('csr-save', (e, json) => {
  try {
    const tmp = csrPath() + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, csrPath());
    e.returnValue = true;
  } catch (err) { e.returnValue = false; }
});
// 讀取失敗的資料檔先留一份，不要被新的內容蓋掉
ipcMain.on('csr-keep-broken', e => {
  try { fs.copyFileSync(csrPath(), csrPath().replace(/\.json$/, `_讀取失敗_${stamp(new Date(), false)}.json`)); } catch (err) {}
  e.returnValue = true;
});
ipcMain.handle('csr-save-txt', async (_e, { name, text }) => {
  try {
    const r = await dialog.showSaveDialog(win, {
      title: '匯出客服回覆文本備份',
      defaultPath: path.join(app.getPath('documents'), safeName(name)),
      filters: [{ name: '文字檔', extensions: ['txt'] }]
    });
    if (r.canceled || !r.filePath) return { status: 'canceled' };
    fs.writeFileSync(r.filePath, text, 'utf8');
    return { status: 'saved', path: r.filePath };
  } catch (err) { return { status: 'error', error: String(err && err.message || err).slice(0, 120) }; }
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
ipcMain.on('update-install', async () => {
  if (!autoUpdater) return;
  if (win && !win.isDestroyed()) win.hide();
  try { await runBackup({ mail: false }); } catch (e) {}     // 軟體更新：只存本機備份，不寄信
  allowClose = true;
  autoUpdater.quitAndInstall(false, true);
});

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
