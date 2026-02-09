const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
});

contextBridge.exposeInMainWorld('files', {
    fileExists: (path) => ipcRenderer.invoke('file-exists', path),
    delete: () => ipcRenderer.invoke('delete-data'),
    export: () => ipcRenderer.invoke('export-data'),
    import: () => ipcRenderer.invoke('import-data'),

    autoDetectGamePath: () => ipcRenderer.invoke('auto-detect-game-path'),
    saveSilksongPath: (path) => ipcRenderer.invoke('save-path', path),
    loadSilksongPath: () => ipcRenderer.invoke('load-path'),
    loadBepinexVersion: () => ipcRenderer.invoke('load-bepinex-version'),
    loadBepinexBackupVersion: () => ipcRenderer.invoke('load-bepinex-backup-version'),
    saveNexusAPI: (api) => ipcRenderer.invoke('save-nexus-api', api),
    loadNexusAPI: () => ipcRenderer.invoke('load-nexus-api')
});

contextBridge.exposeInMainWorld('electronAPI', {
    openExternalLink: (url) => ipcRenderer.invoke('open-link', url),
    launchGame: (mode) => ipcRenderer.invoke('launch-game', mode),
    loadMainPage: () => ipcRenderer.invoke('load-main-page')
});

contextBridge.exposeInMainWorld('bepinex', {
    install: () => ipcRenderer.invoke('install-bepinex'),
    uninstall: () => ipcRenderer.invoke('uninstall-bepinex'),
    backup: () => ipcRenderer.invoke('backup-bepinex'),
    deleteBackup: () => ipcRenderer.invoke('delete-bepinex-backup')
})

contextBridge.exposeInMainWorld('nexus', {
    verifyAPI: () => ipcRenderer.invoke('verify-nexus-api'),
    getLatestMods: () => ipcRenderer.invoke('get-latest-mods'),
    download: (link) => ipcRenderer.invoke('download-mod', link)
})