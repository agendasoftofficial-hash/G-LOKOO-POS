const { app, BrowserWindow, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let win;
let tray;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    icon: path.join(__dirname, '../public/g-lokoo-logo.png'),
    webPreferences: {
      contextIsolation: true
    }
  });

  const url =
    process.env.GLOKOO_POS_URL ||
    'https://glokoophonesandaccessories.vercel.app';

  win.loadURL(url);

  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    console.log('Auto-update disabled in development mode.');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for G-LOKOO POS updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('G-LOKOO POS is up to date.');
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(
      `Downloading update: ${Math.round(progress.percent)}%`
    );
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update downloaded: ${info.version}`);

    const choice = dialog.showMessageBoxSync(win, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'G-LOKOO POS Update',
      message: `G-LOKOO POS ${info.version} has been downloaded.`,
      detail:
        'The update will be installed when the application restarts.'
    });

    if (choice === 0) {
      app.isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(
    path.join(__dirname, '../public/g-lokoo-logo.png')
  );

  tray.setToolTip('G-LOKOO POS');

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open G-LOKOO POS',
        click: () => win.show()
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ])
  );

  tray.on('double-click', () => {
    win.show();
  });

  setupAutoUpdater();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});