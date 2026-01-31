const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Informa que é Desktop
    isDesktop: true,

    // Ouvir status da atualização
    onUpdateStatus: (callback) => {
        const handler = (_event, value) => callback(value);
        ipcRenderer.on('update-status', handler);
        return () => ipcRenderer.removeListener('update-status', handler);
    },

    // Futuro: Pontes para os robôs
    runRobot: (command, args) => ipcRenderer.invoke('run-robot', { command, args }),
    startRgpServer: () => ipcRenderer.invoke('start-rgp-server'),
    onRgpStatus: (callback) => {
        const handler = (_event, value) => callback(value);
        ipcRenderer.on('rgp-status', handler);
        return () => ipcRenderer.removeListener('rgp-status', handler);
    },

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
});
