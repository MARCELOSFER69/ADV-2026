const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

// Iniciar Backend do Robô (RGP Server)
// Em produção, ele roda junto com o app.
const serverScript = path.join(__dirname, '../rgp_server.cjs');
let serverProcess;

function startBackend() {
    console.log("[Electron] Iniciando RGP Server...");
    serverProcess = spawn('node', [serverScript], { stdio: 'pipe' });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[RGP] ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[RGP Error] ${data}`);
    });
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
        backgroundColor: '#0f1014',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, '../public/icon.png') // Necessário ter um ícone
    });

    // Carrega o site (Localhost em Dev, Arquivo em Prod)
    // Em dev, esperamos o Vite subir
    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    console.log(`[Electron] Carregando: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    if (isDev) {
        // mainWindow.webContents.openDevTools();
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
    if (!isDev) {
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
