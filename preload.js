const { contextBridge, ipcRenderer } = require("electron");

const VERSION = "1.0.0";

contextBridge.exposeInMainWorld("versions", {
    silkFlyLauncher: () => VERSION,
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
    loadInstalledModsInfo: () => ipcRenderer.invoke("load-installed-mods-info"),
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
    getMods: () => ipcRenderer.invoke("get-mods"),
    download: (link) => ipcRenderer.invoke("open-download", link),
    uninstall: (modId) => ipcRenderer.invoke("uninstall-mod", modId),
    search: (keywords) => ipcRenderer.invoke("search-nexus-mods", keywords),
    searchInstalled: (keywords) => ipcRenderer.invoke("search-installed-mods", keywords),
});
