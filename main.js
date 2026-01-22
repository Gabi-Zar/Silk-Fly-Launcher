const { app, BrowserWindow , ipcMain, dialog, shell} = require('electron/main');
const path = require('node:path');
const Store = require('electron-store').default;
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const extract = require("extract-zip");

const store = new Store();
const userSavePath = app.getPath('userData')
let silksongPath = store.get('silksong-path')
let bepinexVersion

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('renderer/index.html')
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
    silksongPath = path;
    store.set('silksong-path', silksongPath);
});

ipcMain.handle('load-path', () => {
    silksongPath = store.get('silksong-path');
    if (silksongPath == undefined)  {
        return "";
    }
    return silksongPath;
});

function saveBepinexVersion(version) {
    bepinexVersion = version;
    if (bepinexVersion == undefined) {
        store.delete('bepinex-version');
        return;
    }
    store.set('bepinex-version', version);
};

ipcMain.handle('load-bepinex-version', () => {
    bepinexVersion = store.get('bepinex-version');
    return bepinexVersion;
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

ipcMain.handle('get-userSavePath', () => {
    return userSavePath
});

ipcMain.handle('delete-data', async (event, path) => {
    await fs.unlink(path)
});

ipcMain.handle('export-data', async () => {
    const dataPath = `${userSavePath}\\config.json`

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
    const dataPath = `${userSavePath}\\config.json`

    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Data',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePaths) return

    if(await fileExists(dataPath)) {
        await fs.unlink(dataPath)
    }
    await fs.copyFile(filePaths[0], dataPath,fs.constants.COPYFILE_EXCL)
})

ipcMain.handle('open-link', async (event, link) => {
    await shell.openExternal(link)
})

ipcMain.handle('install-bepinex', async () => {
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
    bepinexVersion = release.tag_name;

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

    saveBepinexVersion(bepinexVersion)
})

ipcMain.handle('uninstall-bepinex', async () => {
    const folderPath = `${silksongPath}\\BepInEx`
    if (await fileExists(folderPath)) {
        await fs.rm(folderPath, { recursive: true })
    }

    const bepinexFiles = [
        ".doorstop_version",
        "changelog.txt",
        "doorstop_config.ini",
        "winhttp.dll"
    ]

    for (const file of bepinexFiles) {
        const filePath = `${silksongPath}\\${file}`
        if (await fileExists(filePath)) {
            await fs.unlink(filePath)
        }
    }
    bepinexVersion = undefined
    saveBepinexVersion(bepinexVersion)
})