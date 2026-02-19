import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import extract from "extract-zip";
import NexusModule from "@nexusmods/nexus-api";
import { gql, GraphQLClient } from "graphql-request";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gotTheLock = app.requestSingleInstanceLock();
const isDev = !app.isPackaged;

const store = new Store();
const bepinexStore = new Store({ cwd: "bepinex-version" });
const installedModsStore = new Store({ cwd: "installed-mods-version" });

const userSavePath = app.getPath("userData");
const modSavePath = `${userSavePath}\\mods`;
const dataPath = `${userSavePath}\\config.json`;
let silksongPath = store.get("silksong-path");

const Nexus = NexusModule.default;
let nexusAPI = store.get("nexus-api");
let nexus = undefined;
createNexus();
let cachedModList = undefined;
let query = "";

let bepinexFolderPath = `${silksongPath}/BepInEx`;
let bepinexBackupPath = `${silksongPath}/BepInEx-Backup`;
const bepinexFiles = [".doorstop_version", "changelog.txt", "doorstop_config.ini", "winhttp.dll"];

let bepinexVersion;
let bepinexBackupVersion;

let mainWindow;
let nexusWindow;
let htmlFile;

//////////////////////////////////////////////////////
////////////////////// STARTUP ///////////////////////

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (event, argv) => {
        const nxmUrl = argv.find((arg) => arg.startsWith("nxm://"));
        if (nxmUrl) {
            handleNxmUrl(nxmUrl);
        }
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    if (await fileExists(dataPath)) {
        htmlFile = "index.html";
    } else {
        htmlFile = "welcome.html";
    }

    mainWindow.loadFile(`renderer/${htmlFile}`);
}

app.whenReady().then(() => {
    if (isDev) {
        app.setAsDefaultProtocolClient("nxm", process.execPath, [path.resolve(process.argv[1])]);
    } else {
        app.setAsDefaultProtocolClient("nxm");
    }

    if (gotTheLock) {
        checkInstalledMods();
        createWindow();
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("open-url", (event, url) => {
    event.preventDefault();
    handleNxmUrl(url);
});

//////////////////////////////////////////////////////
///////////////// SAVING AND LOADING /////////////////
ipcMain.handle("save-path", (event, path) => {
    saveSilksongPath(path);
});
function saveSilksongPath(path) {
    silksongPath = path;
    bepinexFolderPath = `${silksongPath}/BepInEx`;
    bepinexBackupPath = `${silksongPath}/BepInEx-Backup`;
    store.set("silksong-path", silksongPath);
}

ipcMain.handle("load-path", () => {
    silksongPath = store.get("silksong-path");
    if (silksongPath == undefined) {
        return "";
    }
    return silksongPath;
});

function saveBepinexVersion(version) {
    bepinexVersion = version;
    if (bepinexVersion == undefined) {
        bepinexStore.delete("bepinex-version");
        return;
    }
    bepinexStore.set("bepinex-version", version);
}

ipcMain.handle("load-bepinex-version", () => {
    bepinexVersion = bepinexStore.get("bepinex-version");
    return bepinexVersion;
});

function saveBepinexBackupVersion(version) {
    bepinexBackupVersion = version;
    if (bepinexBackupVersion == undefined) {
        bepinexStore.delete("bepinex-backup-version");
        return;
    }
    bepinexStore.set("bepinex-backup-version", version);
}

ipcMain.handle("load-bepinex-backup-version", () => {
    bepinexBackupVersion = bepinexStore.get("bepinex-backup-version");
    return bepinexBackupVersion;
});

ipcMain.handle("save-nexus-api", (event, api) => {
    nexusAPI = api;
    createNexus();
    store.set("nexus-api", nexusAPI);
});

function loadNexusApi() {
    nexusAPI = store.get("nexus-api");
    if (nexusAPI == undefined) {
        return "";
    }
    return nexusAPI;
}

ipcMain.handle("load-nexus-api", () => {
    return loadNexusApi();
});

ipcMain.handle("save-theme", (event, theme, lacePinState) => {
    store.set("theme.theme", theme);
    store.set("theme.lacePinState", lacePinState);
});

ipcMain.handle("load-theme", () => {
    const theme = [store.get("theme.theme"), store.get("theme.lacePinState")];
    if (theme[0] == undefined) {
        return ["Silksong", false];
    }
    return theme;
});

async function saveModInfo(modId, suppr = false) {
    if (suppr == true) {
        installedModsStore.delete(String(modId));
        return;
    }

    const modInfo = await nexus.getModInfo(modId);

    installedModsStore.set(`${modId}.mod_id`, modInfo.mod_id);
    installedModsStore.set(`${modId}.name`, modInfo.name);
    installedModsStore.set(`${modId}.summary`, modInfo.summary);
    installedModsStore.set(`${modId}.picture_url`, modInfo.picture_url);
    installedModsStore.set(`${modId}.version`, modInfo.version);
    installedModsStore.set(`${modId}.updated_time`, modInfo.updated_time);
    installedModsStore.set(`${modId}.author`, modInfo.author);
}

ipcMain.handle("load-installed-mods-info", () => {
    let modsInfo = [];
    for (const [key, modInfo] of Object.entries(installedModsStore.store)) {
        modsInfo.push(modInfo);
    }

    modsInfo.sort((a, b) => a.name.localeCompare(b.name));
    modsInfo = modsInfo.filter((mod) => mod.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

    return modsInfo;
});

//////////////////////////////////////////////////////
/////////////////// DATA HANDLING ////////////////////

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

ipcMain.handle("delete-data", async () => {
    if (await fileExists(dataPath)) {
        await fs.unlink(dataPath);
    }
});

ipcMain.handle("export-data", async () => {
    if (!(await fileExists(dataPath))) {
        return;
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Export Data",
        defaultPath: "config.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (canceled || !filePath) return;

    await fs.copyFile(dataPath, filePath);
});

ipcMain.handle("import-data", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Import Data",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (canceled || !filePaths) return false;

    if (await fileExists(dataPath)) {
        await fs.unlink(dataPath);
    }
    await fs.copyFile(filePaths[0], dataPath, fs.constants.COPYFILE_EXCL);
    return true;
});

//////////////////////////////////////////////////////
////////////////////// BEPINEX ///////////////////////

async function installBepinex() {
    if (await fileExists(bepinexBackupPath)) {
        if (await fileExists(`${bepinexBackupPath}/BepInEx`)) {
            await fs.cp(`${bepinexBackupPath}/BepInEx`, bepinexFolderPath, { recursive: true });
        }

        for (const file of bepinexFiles) {
            const filePath = `${silksongPath}/${file}`;
            if (await fileExists(`${bepinexBackupPath}/${file}`)) {
                await fs.copyFile(`${bepinexBackupPath}/${file}`, filePath);
            }
        }
        await fs.rm(bepinexBackupPath, { recursive: true });

        bepinexBackupVersion = bepinexStore.get("bepinex-backup-version");
        saveBepinexVersion(bepinexBackupVersion);
        saveBepinexBackupVersion(undefined);
    } else {
        const GITHUB_URL = "https://api.github.com/repos/bepinex/bepinex/releases/latest";

        const res = await fetch(GITHUB_URL, {
            headers: {
                "User-Agent": "SilkFlyLauncher/1.0.0",
                Accept: "application/vnd.github+json",
            },
        });

        if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status}`);
        }

        const release = await res.json();

        const asset = release.assets.find((a) => a.name.endsWith(".zip") && a.name.toLowerCase().includes("win_x64"));

        await downloadAndUnzip(asset.browser_download_url, silksongPath);

        saveBepinexVersion(release.tag_name);
    }

    if (await fileExists(modSavePath)) {
        await fs.cp(`${modSavePath}`, `${bepinexFolderPath}/plugins`, { recursive: true });
    }
}

ipcMain.handle("install-bepinex", async () => {
    await installBepinex();
});

async function uninstallBepinex() {
    if (await fileExists(bepinexFolderPath)) {
        await fs.rm(bepinexFolderPath, { recursive: true });
    }

    for (const file of bepinexFiles) {
        const filePath = `${silksongPath}/${file}`;
        if (await fileExists(filePath)) {
            await fs.unlink(filePath);
        }
    }
    saveBepinexVersion(undefined);
}

ipcMain.handle("uninstall-bepinex", async () => {
    await uninstallBepinex();
});

async function backupBepinex() {
    if ((await fileExists(bepinexBackupPath)) == false) {
        await fs.mkdir(bepinexBackupPath);
    }

    if (fileExists(`${bepinexFolderPath}/plugins`)) {
        await fs.rm(`${bepinexFolderPath}/plugins`, { recursive: true });
    }

    if (await fileExists(bepinexFolderPath)) {
        await fs.cp(bepinexFolderPath, `${bepinexBackupPath}/BepInEx`, {
            recursive: true,
        });
    }

    for (const file of bepinexFiles) {
        const filePath = `${silksongPath}/${file}`;
        if (await fileExists(filePath)) {
            await fs.copyFile(filePath, `${bepinexBackupPath}/${file}`);
        }
    }

    saveBepinexBackupVersion(bepinexVersion);
    await uninstallBepinex();
}

ipcMain.handle("backup-bepinex", async () => {
    await backupBepinex();
});

ipcMain.handle("delete-bepinex-backup", async () => {
    if (await fileExists(bepinexBackupPath)) {
        await fs.rm(bepinexBackupPath, { recursive: true });
        saveBepinexBackupVersion(undefined);
    }
});

//////////////////////////////////////////////////////
/////////////////////// NEXUS ////////////////////////

async function createNexus() {
    if (nexusAPI == undefined) {
        return;
    }

    try {
        nexus = await Nexus.create(nexusAPI, "silk-fly-launcher", "1.0.0", "hollowknightsilksong");
    } catch (error) {
        console.log(error);
        nexus = undefined;
    }
}

ipcMain.handle("verify-nexus-api", async () => {
    return await verifyNexusAPI();
});

async function verifyNexusAPI() {
    if (nexus == undefined) {
        return false;
    }
    if (await nexus.getValidationResult()) {
        return true;
    }
}

ipcMain.handle("get-mods", async () => {
    if (!cachedModList) {
        if (!(await verifyNexusAPI())) {
            mainWindow.webContents.send("showToast", "Unable to fetch mods.", "error");
            return;
        }
        cachedModList = await nexus.getLatestAdded();
    }

    return cachedModList;
});

ipcMain.handle("open-download", async (event, link) => {
    if (!(await verifyNexusAPI())) {
        mainWindow.webContents.send("showToast", "Unable to download.", "error");
        return;
    }

    nexusWindow = new BrowserWindow({
        width: 1080,
        height: 720,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    nexusWindow.loadURL(link);
});

function handleNxmUrl(url) {
    nexusWindow.close();

    const parsedUrl = new URL(url);

    const key = parsedUrl.searchParams.get("key");
    const expires = Number(parsedUrl.searchParams.get("expires"));

    const [, , modId, , fileId] = parsedUrl.pathname.split("/");

    startDownload(Number(modId), Number(fileId), key, expires);
}

async function startDownload(modId, fileId, key, expires) {
    if (!(await verifyNexusAPI())) {
        mainWindow.webContents.send("showToast", "Unable to download.", "error");
        return;
    }

    const url = await nexus.getDownloadURLs(modId, fileId, key, expires);
    const download_url = url[0].URI;

    if (!(await fileExists(modSavePath))) {
        await fs.mkdir(modSavePath);
    }

    await downloadAndUnzip(download_url, `${modSavePath}/${modId}`);
    if (await fileExists(bepinexFolderPath)) {
        await fs.cp(`${modSavePath}/${modId}`, `${bepinexFolderPath}/plugins/${modId}`, { recursive: true });
    }

    saveModInfo(modId);
    mainWindow.webContents.send("showToast", "Mod downloaded successfully.");
}

async function checkInstalledMods() {
    for (const [key, modInfo] of Object.entries(installedModsStore.store)) {
        if (!(await fileExists(`${modSavePath}/${modInfo.mod_id}`))) {
            saveModInfo(key, true);
            await fs.rm(`${bepinexFolderPath}/plugins/${modInfo.mod_id}`, { recursive: true });
        }
    }
}

ipcMain.handle("uninstall-mod", async (event, modId) => {
    const modPath = `${bepinexFolderPath}/plugins/${modId}`;
    if (await fileExists(`${modSavePath}/${modId}`)) {
        await fs.rm(`${modSavePath}/${modId}`, { recursive: true });
    }
    if (await fileExists(modPath)) {
        await fs.rm(modPath, { recursive: true });
    }

    saveModInfo(modId, true);
});

ipcMain.handle("search-nexus-mods", async (event, keywords) => {
    const count = 10;
    const endpoint = "https://api.nexusmods.com/v2/graphql";
    const client = new GraphQLClient(endpoint, {
        headers: {
            "Content-Type": "application/json",
        },
    });

    const query = gql`
        query Mods($filter: ModsFilter, $offset: Int, $count: Int) {
            mods(filter: $filter, offset: $offset, count: $count) {
                nodes {
                    author
                    endorsements
                    modId
                    name
                    pictureUrl
                    summary
                    updatedAt
                    version
                }
            }
        }
    `;

    const variables = {
        filter: {
            op: "AND",
            gameDomainName: [{ value: "hollowknightsilksong" }],
            name: [{ value: keywords, op: "WILDCARD" }],
        },
        offset: 0,
        count: count,
    };

    const data = await client.request(query, variables);
    for (let i = 0; i < data.mods.nodes.length; i++) {
        data.mods.nodes[i].mod_id = data.mods.nodes[i].modId;
        delete data.mods.nodes[i].modId;
        data.mods.nodes[i].picture_url = data.mods.nodes[i].pictureUrl;
        delete data.mods.nodes[i].pictureUrl;
        data.mods.nodes[i].endorsement_count = data.mods.nodes[i].endorsements;
        delete data.mods.nodes[i].endorsements;
        data.mods.nodes[i].updated_time = data.mods.nodes[i].updatedAt;
        delete data.mods.nodes[i].updatedAt;
    }
    cachedModList = data.mods.nodes;
});

ipcMain.handle("search-installed-mods", async (event, keywords) => {
    query = keywords;
});

//////////////////////////////////////////////////////
//////////////////// UNCATEGORIZE ////////////////////

ipcMain.handle("auto-detect-game-path", async () => {
    const defaultsSilksongPaths = [":/Program Files (x86)/Steam/steamapps/common/Hollow Knight Silksong", ":/SteamLibrary/steamapps/common/Hollow Knight Silksong"];
    for (const path of defaultsSilksongPaths) {
        for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
            const fullPath = `${String.fromCharCode(i)}${path}`;
            if (await fileExists(fullPath)) {
                saveSilksongPath(fullPath);
                return;
            }
        }
    }
});

ipcMain.handle("load-main-page", () => {
    htmlFile = "index.html";
    mainWindow.loadFile(`renderer/${htmlFile}`);
});

ipcMain.handle("get-page", () => {
    return htmlFile;
});

ipcMain.handle("open-link", async (event, link) => {
    await shell.openExternal(link);
});

ipcMain.handle("open-window", async (event, file) => {
    const win = new BrowserWindow({
        width: 600,
        height: 720,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    win.title = file;
    win.loadFile(file);
});

ipcMain.handle("launch-game", async (event, mode) => {
    const silksongExecutablePath = `${silksongPath}/Hollow Knight Silksong.exe`;
    if (mode === "modded") {
        if (await fileExists(bepinexFolderPath)) {
            await shell.openExternal(silksongExecutablePath);
        } else {
            await installBepinex();
            await shell.openExternal(silksongExecutablePath);
        }
    }
    if (mode === "vanilla") {
        if (await fileExists(bepinexFolderPath)) {
            await backupBepinex();
            await shell.openExternal(silksongExecutablePath);
        } else {
            await shell.openExternal(silksongExecutablePath);
        }
    }
});

async function downloadAndUnzip(url, path) {
    const download = await fetch(url);
    if (!download.ok) {
        mainWindow.webContents.send("showToast", "Error during download.", "error");
        return;
    }

    const tempPath = `${userSavePath}\\tempZip.zip`;

    await pipeline(download.body, createWriteStream(tempPath));

    await extract(tempPath, { dir: path });
    await fs.unlink(tempPath);
}
