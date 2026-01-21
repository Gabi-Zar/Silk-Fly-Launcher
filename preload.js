const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
});

contextBridge.exposeInMainWorld('save', {
    saveSilksongPath: (path) => ipcRenderer.invoke('save-path', path),
    loadSilksongPath: () => ipcRenderer.invoke('load-path')
});

contextBridge.exposeInMainWorld('files', {
    fileExists: (path) => ipcRenderer.invoke('file-exists', path),
    userSavePath: () => ipcRenderer.invoke('get-userSavePath'),
    delete: (path) => ipcRenderer.invoke('delete-data', path),
    export: () => ipcRenderer.invoke('export-data'),
    import: () => ipcRenderer.invoke('import-data')
});

contextBridge.exposeInMainWorld('electronAPI', {
    openExternalLink: (url) => ipcRenderer.invoke('open-link', url)
});

contextBridge.exposeInMainWorld('bepinex', {
    install: () => ipcRenderer.invoke('install-bepinex')
})