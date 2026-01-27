const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
// Use app.isPackaged instead of electron-is-dev (more reliable)
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

// Immediate debug log file next to the exe
const debugLogPath = path.join(path.dirname(process.execPath), 'DEBUG_LOG.txt');
function debugLog(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        fs.appendFileSync(debugLogPath, line);
    } catch (e) {
        // If that fails, try appData
        try {
            fs.appendFileSync(path.join(app.getPath('userData'), 'DEBUG_LOG.txt'), line);
        } catch (e2) { }
    }
}

// debugLog('App starting...');
// debugLog('execPath: ' + process.execPath);
// debugLog('app.isPackaged: ' + app.isPackaged);

// Iniciar Backend do Robô (RGP Server)
// Em produção, ele roda junto com o app.
const serverScript = path.join(__dirname, '../rgp_server.cjs');
let serverProcess;

function startBackend() {
    debugLog("[Electron] Iniciando RGP Server...");

    // In packaged app, use fork which works with Electron's node
    const { fork } = require('child_process');

    try {
        serverProcess = fork(serverScript, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env }
        });

        serverProcess.stdout.on('data', (data) => {
            debugLog(`[RGP] ${data}`);
        });

        serverProcess.stderr.on('data', (data) => {
            debugLog(`[RGP Error] ${data}`);
        });

        serverProcess.on('error', (err) => {
            debugLog('[RGP] Failed to start: ' + err.message);
        });

        serverProcess.on('exit', (code) => {
            debugLog('[RGP] Process exited with code: ' + code);
        });

        debugLog("[Electron] RGP Server started successfully");
    } catch (e) {
        debugLog("[Electron] Failed to start RGP Server: " + e.message);
    }
}

// Configuração de Logs da Atualização
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#020617', // Match navy-950
        autoHideMenuBar: true,
        frame: false, // Remove default title bar for custom one
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Allow loading local resources
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, '../public/icon.png') // Necessário ter um ícone
    });

    // Carrega o site (Localhost em Dev, Arquivo em Prod)
    // Em dev, esperamos o Vite subir
    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        const appPath = app.getAppPath();
        const prodPath = path.join(appPath, 'dist', 'index.html');

        debugLog('===========================================');
        debugLog('[Electron] App Path: ' + appPath);
        debugLog('[Electron] Trying to load: ' + prodPath);
        debugLog('[Electron] File exists: ' + fs.existsSync(prodPath));
        debugLog('===========================================');

        // Add load events to debug
        mainWindow.webContents.on('did-start-loading', () => {
            debugLog('[Electron] Started loading...');
        });
        mainWindow.webContents.on('did-finish-load', () => {
            debugLog('[Electron] Finished loading!');
        });
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            debugLog('[Electron] FAILED TO LOAD: ' + errorCode + ' ' + errorDescription);
        });
        mainWindow.webContents.on('dom-ready', () => {
            debugLog('[Electron] DOM Ready!');
        });

        mainWindow.loadFile(prodPath).catch(err => {
            debugLog('[Electron] LoadFile Error: ' + err);
        });
    }

    // DevTools only in development
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => (mainWindow = null));

    // Links externos abrem no navegador padrão
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Verificar atualizações ao abrir
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();
    }
}

// === CICLO DE VIDA DO APP ===
app.on('ready', () => {
    startBackend();
    createWindow();
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// === IPC HANDLERS FOR CUSTOM TITLE BAR ===
ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() || false;
});

// === AUTO UPDATER EVENTS ===
autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', 'Verificando atualizações...');
});
autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-status', 'Atualização disponível! Baixando...');
});
autoUpdater.on('update-not-available', () => {
    // Silencioso se não tiver nada
});
autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', `Erro na atualização: ${err.message}`);
});
autoUpdater.on('download-progress', (progressObj) => {
    const msg = `Baixando: ${Math.round(progressObj.percent)}%`;
    mainWindow?.webContents.send('update-status', msg);
});
autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'Atualização pronta! Reiniciando...');
    autoUpdater.quitAndInstall();
});
