const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("versions", {
    silkFlyLauncher: () => ipcRenderer.invoke("get-version"),
    node: () => process.versions.node,
    chromium: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld("files", {
    delete: () => ipcRenderer.invoke("delete-data"),
    export: () => ipcRenderer.invoke("export-data"),
    import: () => ipcRenderer.invoke("import-data"),

    autoDetectGamePath: () => ipcRenderer.invoke("auto-detect-game-path"),
    saveSilksongPath: (path) => ipcRenderer.invoke("save-path", path),
    loadSilksongPath: () => ipcRenderer.invoke("load-path"),
    loadBepinexVersion: () => ipcRenderer.invoke("load-bepinex-version"),
    loadBepinexBackupVersion: () => ipcRenderer.invoke("load-bepinex-backup-version"),
    saveNexusAPI: (api) => ipcRenderer.invoke("save-nexus-api", api),
    loadNexusAPI: () => ipcRenderer.invoke("load-nexus-api"),
    saveTheme: (theme, lacePinState) => ipcRenderer.invoke("save-theme", theme, lacePinState),
    loadTheme: () => ipcRenderer.invoke("load-theme"),
});

contextBridge.exposeInMainWorld("electronAPI", {
    openExternalLink: (url) => ipcRenderer.invoke("open-link", url),
    openWindow: (file) => ipcRenderer.invoke("open-window", file),
    launchGame: (mode) => ipcRenderer.invoke("launch-game", mode),
    loadMainPage: () => ipcRenderer.invoke("load-main-page"),
    getPage: () => ipcRenderer.invoke("get-page"),
    onShowToast: (callback) => {
        ipcRenderer.on("showToast", (event, message, type, duration) => {
            callback(message, type, duration);
        });
    },
});

contextBridge.exposeInMainWorld("bepinex", {
    install: () => ipcRenderer.invoke("install-bepinex"),
    uninstall: () => ipcRenderer.invoke("uninstall-bepinex"),
    backup: () => ipcRenderer.invoke("backup-bepinex"),
    deleteBackup: () => ipcRenderer.invoke("delete-bepinex-backup"),
});

contextBridge.exposeInMainWorld("nexus", {
    verifyAPI: () => ipcRenderer.invoke("verify-nexus-api"),
    getMods: (type) => ipcRenderer.invoke("get-mods", type),
    download: (link) => ipcRenderer.invoke("open-download", link),
    uninstall: (modId) => ipcRenderer.invoke("uninstall-mod", modId),
    search: (keywords, offset, count, sortFilter, sortOrder) => ipcRenderer.invoke("search-nexus-mods", keywords, offset, count, sortFilter, sortOrder),
    searchInstalled: (keywords, offset, count, sortFilter, sortOrder) => ipcRenderer.invoke("search-installed-mods", keywords, offset, count, sortFilter, sortOrder),
});
