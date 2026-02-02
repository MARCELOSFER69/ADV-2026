const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
require('dotenv').config();
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
let isQuitting = false;
let restartAttempts = 0;
const MAX_RESTARTS = 5;
const RESTART_DELAY = 3000;


function startBackend() {
    if (serverProcess) {
        debugLog("[Electron] RGP Server is already running.");
        // Notify if already running
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('rgp-status', 'running');
        }
        return;
    }

    debugLog("[Electron] Iniciando RGP Server...");

    // In packaged app, use fork which works with Electron's node
    const { fork } = require('child_process');

    try {
        serverProcess = fork(serverScript, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env },
            execArgv: ['--max-old-space-size=512']
        });

        serverProcess.stdout.on('data', (data) => {
            const message = data.toString();
            debugLog(`[RGP] ${message}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rgp-output', message);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const message = data.toString();
            debugLog(`[RGP Error] ${message}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rgp-error', message);
            }
        });

        serverProcess.on('error', (err) => {
            debugLog('[RGP] Failed to start: ' + err.message);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rgp-status', 'error');
            }
        });

        serverProcess.on('exit', (code) => {
            debugLog('[RGP] Process exited with code: ' + code);
            serverProcess = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rgp-status', 'stopped');
            }

            // Health Check & Auto-Restart
            if (!isQuitting) {
                if (code !== 0 && restartAttempts < MAX_RESTARTS) {
                    debugLog(`[Electron] RGP Server crashed unexpectedly (Code ${code}). Restarting in ${RESTART_DELAY}ms... (Attempt ${restartAttempts + 1}/${MAX_RESTARTS})`);
                    restartAttempts++;
                    setTimeout(() => startBackend(), RESTART_DELAY);
                } else if (restartAttempts >= MAX_RESTARTS) {
                    debugLog(`[Electron] RGP Server crashed too many times. Giving up.`);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('rgp-error', 'ERRO CRÍTICO: O servidor interno falhou múltiplas vezes. Reinicie o aplicativo.');
                    }
                } else {
                    // Clean exit (code 0) or manual stop, reset attempts
                    restartAttempts = 0;
                }
            }
        });

        // Se o processo subir com sucesso, reseta contador após 10 segundos
        setTimeout(() => {
            if (serverProcess) restartAttempts = 0;
        }, 10000);

        debugLog("[Electron] RGP Server started successfully");
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('rgp-status', 'running');
        }

    } catch (e) {
        debugLog("[Electron] Failed to start RGP Server: " + e.message);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('rgp-status', 'error');
        }
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
            contextIsolation: true,
            webSecurity: true, // Security Enabled
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, '../public/icon.png') // Necessário ter um ícone
    });

    // Carrega o site (Localhost em Dev, Arquivo em Prod)
    // Em dev, esperamos o Vite subir
    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:3000');
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
    // startBackend(); // Removed for lazy loading

    // Register secure protocol for local resources
    protocol.handle('local-resource', (request) => {
        const filePath = request.url.replace('local-resource://', '');
        return net.fetch('file:///' + filePath);
    });

    createWindow();

    // Memory Monitoring
    const memoryLogPath = path.join(app.getPath('userData'), 'DEBUG_LOG.txt');
    setInterval(() => {
        try {
            const m = process.memoryUsage();
            const log = `[${new Date().toISOString()}] MEMORY: HeapUsed=${(m.heapUsed / 1024 / 1024).toFixed(2)}MB HeapTotal=${(m.heapTotal / 1024 / 1024).toFixed(2)}MB RSS=${(m.rss / 1024 / 1024).toFixed(2)}MB\n`;
            fs.appendFileSync(memoryLogPath, log);
        } catch (err) {
            console.error('Memory Log Error:', err);
        }
    }, 30000);
});

app.on('will-quit', () => {
    isQuitting = true;
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
// IPC for RGP Server
ipcMain.handle('start-rgp-server', async () => {
    startBackend();
    return { status: 'started' };
});

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
