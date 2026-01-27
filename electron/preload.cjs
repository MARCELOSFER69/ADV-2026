const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Informa que é Desktop
    isDesktop: true,

    // Ouvir status da atualização
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),

    // Futuro: Pontes para os robôs
    runRobot: (command, args) => ipcRenderer.invoke('run-robot', { command, args }),

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
});
