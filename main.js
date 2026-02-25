import { app, BrowserWindow, ipcMain, dialog, shell, Menu, safeStorage } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import NexusModule from "@nexusmods/nexus-api";
import { gql, GraphQLClient } from "graphql-request";
import { path7za } from "7zip-bin";
import node7z from "node-7z";
const { extractFull } = node7z;
import packageJson from "./package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gotTheLock = app.requestSingleInstanceLock();
const isDev = !app.isPackaged;
const VERSION = packageJson.version;
const NAME = packageJson.productName;
const userAgent = `${NAME}/${VERSION}`;

const store = new Store();
const bepinexStore = new Store({ name: "bepinex-version" });
const installedModsStore = new Store({ name: "installed-mods-list" });
const NexusAPIStore = new Store({ name: "nexus-api", encryptionKey: packageJson["AES-key-nexus-api"], fileExtension: "encrypted", clearInvalidConfig: true });

const userSavePath = app.getPath("userData");
const modSavePath = path.join(userSavePath, "mods");
const dataPath = path.join(userSavePath, "config.json");
let sevenZipPath = path7za;

const Nexus = NexusModule.default;
let nexus;
let installedCachedModList;
let installedTotalModsCount;
let onlineCachedModList;
let onlineTotalModsCount;

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
        show: false,
    });

    if (await fileExists(dataPath)) {
        htmlFile = "index.html";
    } else {
        htmlFile = "welcome.html";
    }

    mainWindow.loadFile(path.join("renderer", htmlFile));

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });
}

app.whenReady().then(() => {
    if (isDev) {
        app.setAsDefaultProtocolClient("nxm", process.execPath, [path.resolve(process.argv[1])]);
    } else {
        app.setAsDefaultProtocolClient("nxm");
        sevenZipPath = path7za.replace("\\app.asar\\node_modules", "");
        Menu.setApplicationMenu(null);
    }

    if (gotTheLock) {
        createNexus(loadNexusApi());
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
    store.set("silksong-path", path);
}

function loadSilksongPath() {
    const silksongPath = store.get("silksong-path");
    if (silksongPath == undefined) {
        return "";
    }
    return silksongPath;
}

ipcMain.handle("load-path", () => {
    return loadSilksongPath();
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

ipcMain.handle("save-nexus-api", async (event, api) => {
    if (api) {
        const encryptedAPI = safeStorage.encryptString(api);
        NexusAPIStore.set("nexus-api", encryptedAPI.toString("base64"));
    } else {
        NexusAPIStore.delete("nexus-api");
    }
    await createNexus(api);
});

function loadNexusApi() {
    const encryptedAPI = NexusAPIStore.get("nexus-api");
    if (encryptedAPI) {
        return safeStorage.decryptString(Buffer.from(encryptedAPI, "base64"));
    }
}

ipcMain.handle("load-nexus-api", () => {
    if (loadNexusApi()) {
        return true;
    }
    return false;
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

    const modInfo = onlineCachedModList.find((mod) => mod.modId == modId);
    installedModsStore.set(String(modId), modInfo);
}

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
    const silksongPath = loadSilksongPath();
    const bepinexBackupPath = path.join(silksongPath, "BepInEx-Backup");

    if (!(await fileExists(silksongPath))) {
        mainWindow.webContents.send("showToast", "Path to the game invalid", "warning");
        return;
    }

    if (await fileExists(bepinexBackupPath)) {
        mainWindow.webContents.send("showToast", "Installing Bepinex from Backup");

        await fs.cp(bepinexBackupPath, silksongPath, { recursive: true });
        await fs.rm(bepinexBackupPath, { recursive: true });

        bepinexBackupVersion = bepinexStore.get("bepinex-backup-version");
        saveBepinexVersion(bepinexBackupVersion);
        saveBepinexBackupVersion(undefined);
    } else {
        mainWindow.webContents.send("showToast", "Installing Bepinex from Github");

        const GITHUB_URL = "https://api.github.com/repos/bepinex/bepinex/releases/latest";

        const res = await fetch(GITHUB_URL, {
            headers: {
                "User-Agent": userAgent,
                Accept: "application/vnd.github+json",
            },
        });

        if (!res.ok) {
            if (res.status == 403) {
                mainWindow.webContents.send("showToast", "Github has blocked the application. Please try again later.", "error");
            }
            throw new Error(`GitHub API error: ${res.status}`);
        }

        const release = await res.json();

        const asset = release.assets.find((a) => a.name.endsWith(".zip") && a.name.toLowerCase().includes("win_x64"));

        await downloadAndUnzip(asset.browser_download_url, silksongPath);

        saveBepinexVersion(release.tag_name);
    }

    if (await fileExists(modSavePath)) {
        await fs.cp(modSavePath, path.join(silksongPath, "BepInEx", "plugins"), { recursive: true });
    }
}

ipcMain.handle("install-bepinex", async () => {
    await installBepinex();
});

async function uninstallBepinex() {
    const silksongPath = loadSilksongPath();
    const bepinexFolderPath = path.join(silksongPath, "BepInEx");

    if (!(await fileExists(silksongPath))) {
        mainWindow.webContents.send("showToast", "Path to the game invalid", "warning");
        return;
    }

    if (await fileExists(bepinexFolderPath)) {
        await fs.rm(bepinexFolderPath, { recursive: true });
    }

    for (const file of bepinexFiles) {
        const filePath = path.join(silksongPath, file);
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
    const silksongPath = loadSilksongPath();
    const bepinexFolderPath = path.join(silksongPath, "BepInEx");
    const bepinexBackupPath = path.join(silksongPath, "BepInEx-Backup");
    const BepinexPluginsPath = path.join(silksongPath, "BepInEx", "plugins");

    if (!(await fileExists(silksongPath))) {
        mainWindow.webContents.send("showToast", "Path to the game invalid", "warning");
        return;
    }

    if ((await fileExists(bepinexBackupPath)) == false) {
        await fs.mkdir(bepinexBackupPath);
    }

    if (fileExists(BepinexPluginsPath)) {
        await fs.rm(BepinexPluginsPath, { recursive: true });
    }

    if (await fileExists(bepinexFolderPath)) {
        await fs.cp(bepinexFolderPath, path.join(bepinexBackupPath, "BepInEx"), {
            recursive: true,
        });
    }

    for (const file of bepinexFiles) {
        const filePath = path.join(silksongPath, file);
        if (await fileExists(filePath)) {
            await fs.copyFile(filePath, path.join(bepinexBackupPath, file));
        }
    }

    saveBepinexBackupVersion(bepinexVersion);
    await uninstallBepinex();
}

ipcMain.handle("backup-bepinex", async () => {
    await backupBepinex();
});

ipcMain.handle("delete-bepinex-backup", async () => {
    const silksongPath = loadSilksongPath();
    const bepinexBackupPath = path.join(silksongPath, "BepInEx-Backup");

    if (!(await fileExists(silksongPath))) {
        mainWindow.webContents.send("showToast", "Path to the game invalid", "warning");
        return;
    }

    if (await fileExists(bepinexBackupPath)) {
        await fs.rm(bepinexBackupPath, { recursive: true });
        saveBepinexBackupVersion(undefined);
    }
});

//////////////////////////////////////////////////////
/////////////////////// NEXUS ////////////////////////

async function createNexus(api) {
    if (api == undefined) {
        nexus = undefined;
        return;
    }

    try {
        nexus = await Nexus.create(api, NAME, VERSION, "hollowknightsilksong");
    } catch (error) {
        if (error.mStatusCode == 401) {
            mainWindow.webContents.send("showToast", "Invalid Nexus API key", "error");
        }
        if (error.code == "ENOTFOUND") {
            mainWindow.webContents.send("showToast", "Unable to communicate with Nexus servers", "error");
        }
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

ipcMain.handle("get-mods", async (event, type) => {
    if (type == "mods-installed") {
        if (!installedCachedModList) {
            await searchInstalledMods("");
        }
        return { modsInfo: installedCachedModList, installedTotalCount: installedTotalModsCount };
    } else if (type == "mods-online") {
        if (!onlineCachedModList) {
            await searchNexusMods("");
        }
        return { mods: onlineCachedModList, onlineTotalCount: onlineTotalModsCount };
    }
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
        backgroundColor: "#000000",
    });

    nexusWindow.loadURL(link);
});

function handleNxmUrl(url) {
    if (nexusWindow) {
        nexusWindow.close();
    }

    const parsedUrl = new URL(url);

    const key = parsedUrl.searchParams.get("key");
    const expires = Number(parsedUrl.searchParams.get("expires"));

    const [, , modId, , fileId] = parsedUrl.pathname.split("/");

    startDownload(Number(modId), Number(fileId), key, expires);
}

async function startDownload(modId, fileId, key, expires) {
    modId = String(modId);
    const bepinexFolderPath = path.join(loadSilksongPath(), "BepInEx");

    if (!(await verifyNexusAPI())) {
        mainWindow.webContents.send("showToast", "Unable to download.", "error");
        return;
    }

    const url = await nexus.getDownloadURLs(modId, fileId, key, expires);
    const download_url = url[0].URI;

    if (!(await fileExists(modSavePath))) {
        await fs.mkdir(modSavePath);
    }

    await downloadAndUnzip(download_url, path.join(modSavePath, modId));
    if (await fileExists(bepinexFolderPath)) {
        await fs.cp(path.join(modSavePath, modId), path.join(bepinexFolderPath, "plugins", modId), { recursive: true });
    }

    saveModInfo(modId);
    mainWindow.webContents.send("showToast", "Mod downloaded successfully.");
    installedCachedModList = undefined;
}

async function checkInstalledMods() {
    const bepinexFolderPath = path.join(loadSilksongPath(), "BepInEx");

    for (const [key, modInfo] of Object.entries(installedModsStore.store)) {
        modInfo.modId = String(modInfo.modId);
        if (!(await fileExists(path.join(modSavePath, modInfo.modId)))) {
            saveModInfo(key, true);
            await fs.rm(path.join(bepinexFolderPath, "plugins", modInfo.modId), { recursive: true });
        }
    }
}

ipcMain.handle("uninstall-mod", async (event, modId) => {
    modId = String(modId);
    const BepinexPluginsPath = path.join(loadSilksongPath(), "BepInEx", "plugins");
    const modPath = path.join(BepinexPluginsPath, modId);
    if (await fileExists(path.join(modSavePath, modId))) {
        await fs.rm(path.join(modSavePath, modId), { recursive: true });
    }
    if (await fileExists(modPath)) {
        await fs.rm(modPath, { recursive: true });
    }

    for (let i = 0; i < installedCachedModList.length; i++) {
        if (installedCachedModList[i].modId == modId) {
            installedCachedModList.splice(i, 1);
        }
    }

    saveModInfo(modId, true);
});

ipcMain.handle("search-nexus-mods", async (event, keywords, offset, count, sortFilter, sortOrder) => {
    await searchNexusMods(keywords, offset, count, sortFilter, sortOrder);
});

async function searchNexusMods(keywords, offset = 0, count = 10, sortFilter = "downloads", sortOrder = "DESC") {
    if (keywords.length == 1) {
        mainWindow.webContents.send("showToast", "Your query must contain at least 2 characters.", "warning");
        return;
    }

    const endpoint = "https://api.nexusmods.com/v2/graphql";
    const client = new GraphQLClient(endpoint, {
        headers: {
            "User-Agent": userAgent,
            "Content-Type": "application/json",
        },
    });

    const query = gql`
        query Mods($filter: ModsFilter, $offset: Int, $count: Int, $sort: [ModsSort!]) {
            mods(filter: $filter, offset: $offset, count: $count, sort: $sort) {
                nodes {
                    author
                    endorsements
                    modId
                    name
                    pictureUrl
                    summary
                    updatedAt
                    createdAt
                    version
                    downloads
                    fileSize
                }
                totalCount
            }
        }
    `;

    let variables = {
        filter: {
            op: "AND",
            gameDomainName: [{ value: "hollowknightsilksong" }],
            name: [{ value: keywords, op: "WILDCARD" }],
        },
        offset: offset,
        count: count,
        sort: [{ [sortFilter]: { direction: sortOrder } }],
    };
    if (!keywords) {
        delete variables.filter.name;
    }

    const data = await client.request(query, variables);
    onlineCachedModList = data.mods.nodes;

    for (let i = 0; i < onlineCachedModList.length; i++) {
        if (onlineCachedModList[i].modId == 26) {
            onlineCachedModList.splice(i, 1);
        }
    }

    onlineTotalModsCount = data.mods.totalCount;
}

ipcMain.handle("search-installed-mods", async (event, keywords, offset, count, sortFilter, sortOrder) => {
    await searchInstalledMods(keywords, offset, count, sortFilter, sortOrder);
});

async function searchInstalledMods(keywords, offset = 0, count = 10, sortFilter = "name", sortOrder = "ASC") {
    let modsInfo = [];
    for (const [key, modInfo] of Object.entries(installedModsStore.store)) {
        modsInfo.push(modInfo);
    }

    const modsInfoFiltered = modsInfo.filter((mod) => mod.name.toLowerCase().includes(keywords.toLowerCase()));
    const sortFactor = sortOrder == "ASC" ? 1 : -1;

    let modsInfoSorted;
    if (sortFilter == "name" || sortFilter == "createdAt" || sortFilter == "updatedAt") {
        modsInfoSorted = modsInfoFiltered.sort((a, b) => sortFactor * a[sortFilter].localeCompare(b[sortFilter]));
    } else if (sortFilter == "downloads" || sortFilter == "endorsements" || sortFilter == "size") {
        if (sortFilter == "size") {
            sortFilter = "fileSize";
        }
        modsInfoSorted = modsInfoFiltered.sort((a, b) => sortFactor * (a[sortFilter] - b[sortFilter]));
    }

    installedTotalModsCount = modsInfoSorted.length;
    installedCachedModList = modsInfoSorted.slice(offset, offset + count);
}

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
    mainWindow.loadFile(path.join("renderer", htmlFile));
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
    const silksongExecutablePath = path.join(loadSilksongPath(), "Hollow Knight Silksong.exe");
    if (!fileExists(silksongExecutablePath)) {
        mainWindow.webContents.send("showToast", "Path to the game invalid", "warning");
        return;
    }

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

async function downloadAndUnzip(url, toPath) {
    url = new URL(url);
    const fileName = url.pathname.split("/").pop();
    const extension = fileName.split(".").pop().toLowerCase();

    const download = await fetch(url.href);
    if (!download.ok) {
        mainWindow.webContents.send("showToast", "Error during download.", "error");
        return;
    }

    const tempPath = path.join(userSavePath, `tempArchive.${extension}`);
    await pipeline(download.body, createWriteStream(tempPath));
    await extractArchive(tempPath, toPath);
    await fs.unlink(tempPath);
}

function extractArchive(archivePath, destPath) {
    return new Promise((resolve, reject) => {
        const stream = extractFull(archivePath, destPath, {
            $bin: sevenZipPath,
        });

        stream.on("end", resolve);
        stream.on("error", reject);
    });
}

ipcMain.handle("get-version", () => {
    return VERSION;
});
