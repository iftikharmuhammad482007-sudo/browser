const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let blockedCount = 0;
let adBlockEnabled = true;

// List of ad/tracker domains (simplified)
const adDomains = [
  'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
  'facebook.com/tr', 'analytics.google.com', 'amazon-adsystem.com',
  'criteo.com', 'taboola.com', 'outbrain.com', 'adnxs.com'
];

function blockAds(filter) {
  if (!adBlockEnabled) return;
  filter.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    const isAd = adDomains.some(domain => url.includes(domain));
    if (isAd) {
      blockedCount++;
      callback({ cancel: true });
    } else {
      callback({});
    }
  });
}

function createWindow() {
  const ses = session.defaultSession;

  // Setup ad-blocking
  if (adBlockEnabled) {
    blockAds(ses.webRequest);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,    // allow direct require in renderer
      webviewTag: true,           // enable <webview>
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'icon.png'), // optional
    title: 'Electron Brave Browser'
  });

  mainWindow.loadFile('index.html'); // we'll create this from renderer code

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  // IPC for adblock toggle
  ipcMain.on('toggle-adblock', (event, enabled) => {
    adBlockEnabled = enabled;
    const ses = session.defaultSession;
    ses.webRequest.onBeforeRequest(null); // clear old
    if (enabled) blockAds(ses.webRequest);
  });

  ipcMain.on('get-blocked-stats', (event) => {
    event.reply('update-blocked-stats', blockedCount);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
