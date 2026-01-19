const { app, BrowserWindow , ipcMain, dialog} = require('electron/main');
const path = require('node:path');
const Store = require('electron-store').default;
const fs = require('fs/promises');

const store = new Store();
const userSavePath = app.getPath('userData')

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
    store.set('silksong-path', path);
});

ipcMain.handle('load-path', () => {
    return store.get('silksong-path');
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