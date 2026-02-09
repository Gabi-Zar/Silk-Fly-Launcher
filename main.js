const { app, BrowserWindow , ipcMain, dialog, shell} = require('electron/main');
const path = require('node:path');
const Store = require('electron-store').default;
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const extract = require('extract-zip');
const Nexus = require('@nexusmods/nexus-api').default;

const store = new Store();
const userSavePath = app.getPath('userData')
const dataPath = `${userSavePath}\\config.json`
let silksongPath = store.get('silksong-path')
let nexusAPI = store.get('nexus-api')
let nexus = undefined

createNexus()

let bepinexFolderPath = `${silksongPath}/BepInEx`
let bepinexBackupPath = `${silksongPath}/BepInEx-Backup`
const bepinexFiles = [
        ".doorstop_version",
        "changelog.txt",
        "doorstop_config.ini",
        "winhttp.dll"
    ]

let bepinexVersion
let bepinexBackupVersion

let mainWindow

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    if(await fileExists(dataPath)) {
        htmlFile = "renderer/index.html"
    }
    else {
        htmlFile = "renderer/welcome.html"
    }

    mainWindow.loadFile(htmlFile)
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipcMain.handle('save-path', (event, path) => {
    saveSilksongPath(path)
});

function saveSilksongPath(path) {
    silksongPath = path;
    bepinexFolderPath = `${silksongPath}/BepInEx`
    bepinexBackupPath = `${silksongPath}/BepInEx-Backup`
    store.set('silksong-path', silksongPath);
}

ipcMain.handle('load-path', () => {
    silksongPath = store.get('silksong-path');
    if (silksongPath == undefined)  {
        return "";
    }
    return silksongPath;
});

ipcMain.handle('load-nexus-api', () => {
    nexusAPI = store.get('nexus-api');
    if (nexusAPI == undefined)  {
        return "";
    }
    return nexusAPI;
});

ipcMain.handle('save-nexus-api', (event, api) => {
    nexusAPI = api;
    createNexus()
    store.set('nexus-api', nexusAPI);
});

function saveBepinexVersion(version) {
    bepinexVersion = version;
    if (bepinexVersion == undefined) {
        store.delete('bepinex-version');
        return;
    }
    store.set('bepinex-version', version);
};

function saveBepinexBackupVersion(version) {
    bepinexBackupVersion = version;
    if (bepinexBackupVersion == undefined) {
        store.delete('bepinex-backup-version');
        return;
    }
    store.set('bepinex-backup-version', version);
};

ipcMain.handle('load-bepinex-version', () => {
    bepinexVersion = store.get('bepinex-version');
    return bepinexVersion;
});

ipcMain.handle('load-bepinex-backup-version', () => {
    bepinexBackupVersion = store.get('bepinex-backup-version');
    return bepinexBackupVersion;
});

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

ipcMain.handle('file-exists', async (_, filePath) => {
    return await fileExists(filePath);
});

ipcMain.handle('delete-data', async () => {
    await fs.unlink(dataPath)
});

ipcMain.handle('export-data', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Data',
        defaultPath: 'config.json',
        filters: [
            { name: 'JSON', extensions: ['json'] }
        ]
    })

    if (canceled || !filePath) return

    await fs.copyFile(dataPath, filePath)
})

ipcMain.handle('import-data', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Data',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePaths) return false

    if(await fileExists(dataPath)) {
        await fs.unlink(dataPath)
    }
    await fs.copyFile(filePaths[0], dataPath,fs.constants.COPYFILE_EXCL)
    return true
})

ipcMain.handle('open-link', async (event, link) => {
    await shell.openExternal(link)
})

ipcMain.handle('launch-game', async (event, mode) => {
    const silksongExecutablePath = `${silksongPath}/Hollow Knight Silksong.exe`
    if (mode === "modded"){
        if (await fileExists(bepinexFolderPath)) {
            await shell.openExternal(silksongExecutablePath)
        }
        else {
            await installBepinex()
            await shell.openExternal(silksongExecutablePath)
        }
    }
    if (mode === "vanilla"){
        if (await fileExists(bepinexFolderPath)) {
            await backupBepinex()
            await shell.openExternal(silksongExecutablePath)
        }
        else {
            await shell.openExternal(silksongExecutablePath)
        }
    }
})

async function installBepinex() {
    if (await fileExists(bepinexBackupPath)) {
        if (await fileExists(`${bepinexBackupPath}/BepInEx`)) {
            await fs.cp(`${bepinexBackupPath}/BepInEx`, bepinexFolderPath, { recursive: true })
        }

        for (const file of bepinexFiles) {
            const filePath = `${silksongPath}/${file}`
            if (await fileExists(`${bepinexBackupPath}/${file}`)) {
                await fs.copyFile(`${bepinexBackupPath}/${file}`, filePath)
            }
        }
        await fs.rm(bepinexBackupPath, { recursive: true })

        bepinexBackupVersion = store.get('bepinex-backup-version')
        saveBepinexVersion(bepinexBackupVersion)
        saveBepinexBackupVersion(undefined)
    }
    else {
        const GITHUB_URL = "https://api.github.com/repos/bepinex/bepinex/releases/latest"

        const res = await fetch(GITHUB_URL, {
            headers: {
                "User-Agent": "SilkFlyLauncher/1.0.0",
                "Accept": "application/vnd.github+json",
            }
        })

        if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status}`)
        }

        const release = await res.json();

        const asset = release.assets.find(
            a => a.name.endsWith(".zip") && a.name.toLowerCase().includes("win_x64")
        );

        const download = await fetch(asset.browser_download_url)
        if (!download.ok) {
            throw new Error("Download error");
        }
        const filePath = `${userSavePath}\\bepinex.zip`

        await pipeline(
            download.body,
            createWriteStream(filePath)
        )

        await extract(filePath, { dir: silksongPath})
        await fs.unlink(filePath)

        saveBepinexVersion(release.tag_name)
    }
}

ipcMain.handle('install-bepinex', async () => {
    await installBepinex()
})

async function uninstallBepinex() {
    if (await fileExists(bepinexFolderPath)) {
        await fs.rm(bepinexFolderPath, { recursive: true })
    }

    for (const file of bepinexFiles) {
        const filePath = `${silksongPath}/${file}`
        if (await fileExists(filePath)) {
            await fs.unlink(filePath)
        }
    }
    saveBepinexVersion(undefined)
}

ipcMain.handle('uninstall-bepinex', async () => {
    await uninstallBepinex()
})

async function backupBepinex() {
    if (await fileExists(bepinexBackupPath) == false) {
        await fs.mkdir(bepinexBackupPath)
    }

    if (await fileExists(bepinexFolderPath)) {
        await fs.cp(bepinexFolderPath, `${bepinexBackupPath}/BepInEx`, { recursive: true })
    }

    for (const file of bepinexFiles) {
        const filePath = `${silksongPath}/${file}`
        if (await fileExists(filePath)) {
            await fs.copyFile(filePath, `${bepinexBackupPath}/${file}`)
        }
    }

    saveBepinexBackupVersion(bepinexVersion)
    await uninstallBepinex()
}

ipcMain.handle('backup-bepinex', async () => {
    await backupBepinex()
})

ipcMain.handle('delete-bepinex-backup', async () => {
    if (await fileExists(bepinexBackupPath)) {
        await fs.rm(bepinexBackupPath, { recursive: true })
        saveBepinexBackupVersion(undefined)
    }
})

async function createNexus() {
    if (nexusAPI == undefined) {
        return
    }

    try {
        nexus = await Nexus.create(
            nexusAPI,
            'silk-fly-launcher',
            '1.0.0',
            'hollowknightsilksong'
        );
    } catch (error) {
        nexus = undefined
    }
}

ipcMain.handle('verify-nexus-api', async () => {
    return await verifyNexusAPI()
})

async function verifyNexusAPI() {
    if (nexus == undefined) {
        return false
    }
    if (await nexus.getValidationResult()) {
        return true
    }
}

ipcMain.handle('get-latest-mods', async () => {
    if (nexus == undefined) {
        return
    }

    mods = await nexus.getLatestAdded()
    return mods
})

ipcMain.handle('download-mod', async (event, link) => {
    if (nexus == undefined) {
        return
    }

    const nexusWindow = new BrowserWindow({
        width: 1080,
        height: 720,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    nexusWindow.loadURL(link)
})

ipcMain.handle('auto-detect-game-path', async () => {
    const defaultsSilksongPaths = [
        ":/Program Files (x86)/Steam/steamapps/common/Hollow Knight Silksong",
        ":/SteamLibrary/steamapps/common/Hollow Knight Silksong"
    ]
    for (const path of defaultsSilksongPaths) {
        for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
            const fullPath = `${String.fromCharCode(i)}${path}`
            if (await fileExists(fullPath)) {
                saveSilksongPath(fullPath)
                return
            }
        }
    }
})

ipcMain.handle('load-main-page', () => {
    mainWindow.loadFile("renderer/index.html")
})