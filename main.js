const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

// Default URL
const DEFAULT_URL = 'https://rahulbisht1826.github.io/.com/#/login';
// Default User Agent (Chrome Windows)
const DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let mainWindow;

function createWindow() {
  // Load saved settings
  const savedUrl = store.get('targetUrl', DEFAULT_URL);
  const isDesktop = store.get('isDesktop', true);

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set User Agent
  if (isDesktop) {
    mainWindow.webContents.setUserAgent(DESKTOP_USER_AGENT);
  }

  // Load the URL
  mainWindow.loadURL(savedUrl);

  // Handle external links (Single Link Browser logic)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check if the URL matches the current target domain logic
    // For now, we allow everything because the user requested to remove strict mode
    // "Remove strict mode... allow browsing any site"
    
    // However, if we want to open *external* links in a real browser, we might want logic here.
    // Standard Electron behavior: everything opens in this window unless target="_blank" logic is hit.
    // We will just allow it.
    return { action: 'allow' };
  });

  // Setup Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
             createSettingsWindow();
          }
        },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        {
          label: 'Toggle Desktop Mode',
          type: 'checkbox',
          checked: isDesktop,
          click: (menuItem) => {
            store.set('isDesktop', menuItem.checked);
            if (menuItem.checked) {
              mainWindow.webContents.setUserAgent(DESKTOP_USER_AGENT);
            } else {
              // Reset to default electron UA
              mainWindow.webContents.setUserAgent(app.userAgentFallback);
            }
            mainWindow.reload();
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createSettingsWindow() {
  const settingsWin = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // For simple settings logic
    }
  });
  
  settingsWin.loadFile('settings.html');
  settingsWin.once('ready-to-show', () => {
    settingsWin.show();
  });
}

// IPC handlers for Settings
ipcMain.on('get-settings', (event) => {
  event.reply('settings-data', {
    targetUrl: store.get('targetUrl', DEFAULT_URL)
  });
});

ipcMain.on('save-settings', (event, data) => {
  store.set('targetUrl', data.targetUrl);
  // Reload main window
  if (mainWindow) {
    mainWindow.loadURL(data.targetUrl);
  }
});


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
