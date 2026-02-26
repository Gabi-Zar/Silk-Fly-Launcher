////////////////// CONST FOR INDEX ///////////////////
const title = document.getElementById("title");
const view = document.getElementById("view");

const HomeTemplate = document.getElementById("home-template");
const installedModsTemplate = document.getElementById("installed-mods-template");
const onlineModsTemplate = document.getElementById("online-mods-template");
const settingsTemplate = document.getElementById("settings-template");
const installedModTemplate = document.getElementById("installed-mod-template");
const modTemplate = document.getElementById("mod-template");

let oldPage;
let actualTheme = [];

let searchValueNexus = "";
let searchValueInstalled = "";
let onlineSortFilter = "downloads";
let installedSortFilter = "name";
let onlineSortOrder = "DESC";
let installedSortOrder = "ASC";
let onlineOffset = 0;
let installedOffset = 0;
let lastOnlineOffset = 0;
let lastInstalledOffset = 0;
let onlineModsCount = 10;
let installedModsCount = 10;
let onlineModsTotalCount;
let installedModsTotalCount;

//////////////////////////////////////////////////////
///////////////// CONST FOR WELCOME //////////////////

let actualPage = 0;

const pageDiv = document.getElementById("page");
const buttonDiv = document.getElementById("button-div");

const oneButtonTemplate = document.getElementById("one-button-template");
const twoButtonTemplate = document.getElementById("two-button-template");

const welcomeTemplate = document.getElementById("welcome-template");
const silksongPathTemplate = document.getElementById("path-template");
const nexusTemplate = document.getElementById("nexus-template");
const styleTemplate = document.getElementById("style-template");
const tutorialTemplate = document.getElementById("tutorial-template");

//////////////////////////////////////////////////////
////////////////////// STARTUP ///////////////////////

on_startup();

async function on_startup() {
    if ((await electronAPI.getPage()) == "index.html") {
        const theme = await files.loadTheme();
        changeTheme(theme[0], theme[1]);
        navigate("home");
    } else if ((await electronAPI.getPage()) == "welcome.html") {
        changeTheme("Silksong");
        welcomeNavigate();
    }
}

//////////////////////////////////////////////////////
///////////////////// NAVIGATE ///////////////////////

async function navigate(page) {
    if (oldPage == page) {
        return;
    }
    if (page == "refresh") {
        page = oldPage;
    }
    oldPage = page;

    view.replaceChildren();
    switch (page) {
        case "home":
            title.innerText = "Silk Fly Launcher";
            const HomeTemplateCopy = HomeTemplate.content.cloneNode(true);
            versionText = HomeTemplateCopy.getElementById("version-text");
            versionText.innerText = await versions.silkFlyLauncher();
            view.appendChild(HomeTemplateCopy);
            break;

        case "mods-installed":
            title.innerText = "Installed Mods";
            const installedModsTemplateCopy = installedModsTemplate.content.cloneNode(true);
            const installedModsContainer = installedModsTemplateCopy.getElementById("mods-container");
            const searchFormInstalled = installedModsTemplateCopy.getElementById("search-form");
            const searchInputInstalled = installedModsTemplateCopy.getElementById("search-input");

            searchFormInstalled.addEventListener("submit", function (event) {
                event.preventDefault();
            });
            searchInputInstalled.value = searchValueInstalled;

            view.appendChild(installedModsTemplateCopy);
            toggleSelectedListButton("sort-menu", installedSortFilter);
            setSortOrderButton();

            const { modsInfo, installedTotalCount } = await nexus.getMods(page);
            installedModsTotalCount = installedTotalCount;
            if (modsInfo == []) {
                break;
            }

            for (const modInfo of modsInfo) {
                const installedModTemplateCopy = installedModTemplate.content.cloneNode(true);
                if (modInfo.name) {
                    const modTitleText = installedModTemplateCopy.getElementById("mod-title");
                    modTitleText.innerText = modInfo.name;
                }
                if (modInfo.author) {
                    const modAuthorText = installedModTemplateCopy.getElementById("mod-author");
                    modAuthorText.innerText = `by ${modInfo.author}`;
                }
                if (modInfo.endorsements) {
                    const modEndorsementsNumber = installedModTemplateCopy.getElementById("mod-endorsements-number");
                    if (modInfo.endorsements > 1) {
                        modEndorsementsNumber.innerText = `${modInfo.endorsements} likes`;
                    } else {
                        modEndorsementsNumber.innerText = `${modInfo.endorsements} like`;
                    }
                }
                if (modInfo.downloads) {
                    const modDownloadsNumber = installedModTemplateCopy.getElementById("mod-downloads-number");
                    if (modInfo.downloads > 1) {
                        modDownloadsNumber.innerText = `${modInfo.downloads} downloads`;
                    } else {
                        modDownloadsNumber.innerText = `${modInfo.downloads} download`;
                    }
                }
                if (modInfo.summary) {
                    const modDescriptionText = installedModTemplateCopy.getElementById("mod-description");
                    modDescriptionText.innerText = modInfo.summary;
                }
                if (modInfo.pictureUrl) {
                    const modPicture = installedModTemplateCopy.getElementById("mod-icon");
                    modPicture.src = modInfo.pictureUrl;
                }
                if (modInfo.version && modInfo.updatedAt) {
                    const modVersionText = installedModTemplateCopy.getElementById("mod-version");
                    modVersionText.innerText = `V${modInfo.version} last updated on ${modInfo.updatedAt.slice(0, 10)}`;
                }

                const modUrl = `https://www.nexusmods.com/hollowknightsilksong/mods/${modInfo.modId}`;

                const modLinkButton = installedModTemplateCopy.getElementById("external-link");
                modLinkButton.href = modUrl;
                modLinkButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    const modLink = modLinkButton.href;
                    electronAPI.openExternalLink(modLink);
                });

                const uninstallModButton = installedModTemplateCopy.getElementById("uninstall-mod-button");
                uninstallModButton.addEventListener("click", async function (event) {
                    event.preventDefault();
                    await nexus.uninstall(modInfo.modId);

                    navigate("refresh");
                });

                installedModsContainer.appendChild(installedModTemplateCopy);
            }

            break;

        case "mods-online":
            title.innerText = "Online Mods";
            const onlineModsTemplateCopy = onlineModsTemplate.content.cloneNode(true);
            const ModsContainer = onlineModsTemplateCopy.getElementById("mods-container");
            const searchFormNexus = onlineModsTemplateCopy.getElementById("search-form");
            const searchInputNexus = onlineModsTemplateCopy.getElementById("search-input");

            searchFormNexus.addEventListener("submit", async function (event) {
                event.preventDefault();
            });
            searchInputNexus.value = searchValueNexus;

            view.appendChild(onlineModsTemplateCopy);
            toggleSelectedListButton("sort-menu", onlineSortFilter);
            setSortOrderButton();

            const { mods, onlineTotalCount } = await nexus.getMods(page);
            onlineModsTotalCount = onlineTotalCount;
            if (mods == undefined) {
                break;
            }
            for (const mod of mods) {
                if (mod.name == undefined) {
                    continue;
                }
                const modTemplateCopy = modTemplate.content.cloneNode(true);
                if (mod.name) {
                    const modTitleText = modTemplateCopy.getElementById("mod-title");
                    modTitleText.innerText = mod.name;
                }
                if (mod.author) {
                    const modAuthorText = modTemplateCopy.getElementById("mod-author");
                    modAuthorText.innerText = `by ${mod.author}`;
                }
                if (mod.endorsements) {
                    const modEndorsementsNumber = modTemplateCopy.getElementById("mod-endorsements-number");
                    if (mod.endorsements > 1) {
                        modEndorsementsNumber.innerText = `${mod.endorsements} likes`;
                    } else {
                        modEndorsementsNumber.innerText = `${mod.endorsements} like`;
                    }
                }
                if (mod.downloads) {
                    const modDownloadsNumber = modTemplateCopy.getElementById("mod-downloads-number");
                    if (mod.downloads > 1) {
                        modDownloadsNumber.innerText = `${mod.downloads} downloads`;
                    } else {
                        modDownloadsNumber.innerText = `${mod.downloads} download`;
                    }
                }
                if (mod.summary) {
                    const modDescriptionText = modTemplateCopy.getElementById("mod-description");
                    modDescriptionText.innerText = mod.summary;
                }
                if (mod.pictureUrl) {
                    const modPicture = modTemplateCopy.getElementById("mod-icon");
                    modPicture.src = mod.pictureUrl;
                }
                if (mod.version && mod.updatedAt) {
                    const modVersionText = modTemplateCopy.getElementById("mod-version");
                    modVersionText.innerText = `V${mod.version} last updated on ${mod.updatedAt.slice(0, 10)}`;
                }

                const modUrl = `https://www.nexusmods.com/hollowknightsilksong/mods/${mod.modId}`;

                const modLinkButton = modTemplateCopy.getElementById("external-link");
                modLinkButton.href = modUrl;
                modLinkButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    const modLink = modLinkButton.href;
                    electronAPI.openExternalLink(modLink);
                });

                modDownloadButton = modTemplateCopy.getElementById("download-mod-button");
                modDownloadButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    const modDownloadLink = `${modUrl}?tab=files`;
                    nexus.download(modDownloadLink);
                });

                ModsContainer.appendChild(modTemplateCopy);
            }
            break;

        case "general-settings":
            title.innerText = "Settings";
            const settingsTemplateCopy = settingsTemplate.content.cloneNode(true);
            const silksongPathInput = settingsTemplateCopy.getElementById("silksong-path-input");
            const nexusAPIForm = settingsTemplateCopy.getElementById("nexus-api-form");
            const versionsList = settingsTemplateCopy.getElementById("versions-list");
            const versionsDictionnary = {
                "Silk-Fly-Launcher": `Silk Fly Launcher: v${await versions.silkFlyLauncher()}`,
                Electron: `Electron: v${versions.electron()}`,
                Node: `Node.js: v${versions.node()}`,
                Chromium: `Chromium: v${versions.chromium()}`,
            };
            const lacePinCheckbox = settingsTemplateCopy.getElementById("lace-pin");

            silksongPathInput.value = await files.loadSilksongPath();
            silksongPathInput.addEventListener("input", async function (event) {
                let silksongPath = silksongPathInput.value;
                files.saveSilksongPath(silksongPath);
            });

            nexusAPIForm.addEventListener("submit", function (event) {
                event.preventDefault();
            });

            for (const element of versionsList.children) {
                element.innerText = versionsDictionnary[element.id];
            }

            const theme = await files.loadTheme();
            lacePinCheckbox.checked = theme[1];

            lacePinCheckbox.addEventListener("change", async function () {
                if (this.checked) {
                    const theme = await files.loadTheme();
                    changeTheme(theme[0], true);
                    toggleThemesMenu();
                } else {
                    const theme = await files.loadTheme();
                    changeTheme(theme[0], false);
                    toggleThemesMenu();
                }
            });

            view.appendChild(settingsTemplateCopy);
            setBepinexVersion();
            setThemeButton();
            toggleSelectedListButton("themes-menu", actualTheme[0]);
            setNexusAPI();
            break;
    }
}

async function welcomeNavigate() {
    pageDiv.replaceChildren();
    switch (actualPage) {
        case 0:
            pageDiv.appendChild(welcomeTemplate.content.cloneNode(true));
            buttonDiv.replaceChildren();
            buttonDiv.appendChild(oneButtonTemplate.content.cloneNode(true));
            break;

        case 1:
            pageDiv.appendChild(silksongPathTemplate.content.cloneNode(true));
            buttonDiv.replaceChildren();
            buttonDiv.appendChild(twoButtonTemplate.content.cloneNode(true));

            const silksongPathInput = document.getElementById("silksong-path-input");
            if ((await files.loadSilksongPath()) == "") {
                autoDetectGamePath();
            } else {
                document.getElementById("silksong-path-input").value = await files.loadSilksongPath();
            }

            silksongPathInput.addEventListener("input", async function (event) {
                let silksongPath = silksongPathInput.value;
                await files.saveSilksongPath(silksongPath);
            });
            break;

        case 2:
            pageDiv.appendChild(nexusTemplate.content.cloneNode(true));
            const nexusLink = document.getElementById("external-link");
            const nexusAPIForm = document.getElementById("nexus-api-form");

            nexusLink.addEventListener("click", function (event) {
                event.preventDefault();
                const url = nexusLink.href;
                electronAPI.openExternalLink(url);
            });

            nexusAPIForm.addEventListener("submit", function (event) {
                event.preventDefault();
            });
            setNexusAPI();
            break;

        case 3:
            pageDiv.appendChild(styleTemplate.content.cloneNode(true));
            toggleSelectedListButton("themes-menu", actualTheme[0]);
            break;

        case 4:
            pageDiv.appendChild(tutorialTemplate.content.cloneNode(true));
            break;

        case 5:
            electronAPI.loadMainPage();
            break;
    }
}

function next() {
    actualPage++;
    welcomeNavigate();
}

function back() {
    actualPage--;
    welcomeNavigate();
}

//////////////////////////////////////////////////////
/////////////////// DATA HANDLING ////////////////////

async function initialImportData() {
    if (await files.import()) {
        electronAPI.loadMainPage();
    }
}

async function importData() {
    await files.import();
    document.getElementById("silksong-path-input").value = await files.loadSilksongPath();
    const lacePinCheckbox = document.getElementById("lace-pin");
    const theme = await files.loadTheme();
    lacePinCheckbox.checked = theme[1];
    changeTheme(theme[0]);
    toggleThemesMenu();
}

async function exportData() {
    await files.export();
}

async function deleteData() {
    const lacePinCheckbox = document.getElementById("lace-pin");
    lacePinCheckbox.checked = false;
    changeTheme("Silksong");
    toggleThemesMenu();
    await files.delete();
    document.getElementById("silksong-path-input").value = await files.loadSilksongPath();
}

//////////////////////////////////////////////////////
////////////////////// BEPINEX ///////////////////////

async function installBepinex() {
    await bepinex.install();
    setBepinexVersion();
}

async function uninstallBepinex() {
    await bepinex.uninstall();
    setBepinexVersion();
}

async function backupBepinex() {
    await bepinex.backup();
    setBepinexVersion();
}

async function deleteBepinexBackup() {
    await bepinex.deleteBackup();
    setBepinexVersion();
}

async function setBepinexVersion() {
    const bepinexVersionText = document.getElementById("bepinex-version-text");
    if (bepinexVersionText == undefined) {
        return;
    }

    const bepinexVersion = await files.loadBepinexVersion();
    const bepinexBackupVersion = await files.loadBepinexBackupVersion();
    if (bepinexVersion == undefined) {
        if (bepinexBackupVersion == undefined) {
            bepinexVersionText.innerText = "BepInEx is not installed";
        } else {
            bepinexVersionText.innerText = `BepInEx ${bepinexBackupVersion} is backed up`;
        }
    } else {
        bepinexVersionText.innerText = `BepInEx ${bepinexVersion} is installed`;
    }
}

async function searchInstalledMods() {
    const searchInput = document.getElementById("search-input");
    searchValueInstalled = searchInput.value;
    await nexus.searchInstalled(searchValueInstalled, installedOffset, installedModsCount, installedSortFilter, installedSortOrder);
    await navigate("refresh");
}

//////////////////////////////////////////////////////
/////////////////////// NEXUS ////////////////////////

async function verifyNexusAPI() {
    response = await nexus.verifyAPI();

    const nexusCheckImage = document.getElementById("nexus-check-image");
    if (nexusCheckImage == undefined) {
        return;
    }

    if (response) {
        nexusCheckImage.src = "assets/icons/check.svg";
    } else {
        nexusCheckImage.src = "assets/icons/cross.svg";
    }
}

async function searchNexusMods() {
    let searchInput = document.getElementById("search-input");
    searchValueNexus = searchInput.value;
    await nexus.search(searchValueNexus, onlineOffset, onlineModsCount, onlineSortFilter, onlineSortOrder);
    await navigate("refresh");
    searchInput = document.getElementById("search-input");
    searchInput.value = searchValueNexus;
}

async function setNexusAPI() {
    const nexusAPIInput = document.getElementById("nexus-api-input");
    const secretString = "●".repeat(1000);
    if (!(await files.loadNexusAPI())) {
        if (nexusAPIInput.value && nexusAPIInput.value != secretString) {
            await files.saveNexusAPI(nexusAPIInput.value);
            nexusAPIInput.value = secretString;
            nexusAPIInput.readOnly = true;
        } else {
            nexusAPIInput.value = "";
            nexusAPIInput.readOnly = false;
        }
    } else {
        nexusAPIInput.value = secretString;
        nexusAPIInput.readOnly = true;
    }
    verifyNexusAPI();
}

async function resetNexusAPI() {
    if (await files.loadNexusAPI()) {
        await files.saveNexusAPI(undefined);
        setNexusAPI();
    }
}

//////////////////////////////////////////////////////
//////////////// THEMES / SORT / LIST ////////////////

function toggleThemesMenu() {
    const themesMenu = document.getElementById("themes-menu");
    if (themesMenu) {
        themesMenu.classList.toggle("show");
    }
}

async function setThemeButton() {
    const themesButton = document.getElementById("themes-button");
    if (themesButton) {
        const theme = await files.loadTheme();
        themesButton.textContent = theme[0];
    }
}

function changeTheme(theme, state) {
    toggleThemesMenu();
    toggleSelectedListButton("themes-menu", theme);

    const lacePinCheckbox = document.getElementById("lace-pin");
    if (lacePinCheckbox) {
        lacePinState = lacePinCheckbox.checked;
    } else if (state) {
        lacePinState = state;
    } else {
        lacePinState = false;
    }

    if (actualTheme[0] == theme && actualTheme[1] == lacePinState) {
        return;
    }
    actualTheme = [theme, lacePinState];

    files.saveTheme(theme, lacePinState);

    setThemeButton();

    // prettier-ignore
    const themesColors = {
        "var":             ["--primary-color", "--secondary-color", "--background-color"],
        "Silksong":        ["rgba(255, 25,  0,   0.3)", "#ff6b6b", "rgba(255, 72,  0,   0.2)"],
        "Citadel of song": ["rgba(160, 116, 89,  0.3)", "#d3ba91", "rgba(123, 102, 93,  0.2)"],
        "Cradle":          ["rgba(123, 136, 255, 0.3)", "#7c9fea", "rgba(61,  88,  150, 0.2)"],
        "Abyss":           ["rgba(255, 255, 255, 0.3)", "#ececec", "rgba(255, 255, 255, 0.2)"],
        "Greyroot":        ["rgba(181, 255, 180, 0.3)", "#c1ffcd", "rgba(90,  165, 130, 0.2)"],
        "Surface":         ["rgba(75,  120, 255, 0.3)", "#87c3ff", "rgba(42,  107, 203, 0.2)"],
        "Steel":           ["rgba(164, 164, 164, 0.3)", "#c5b9b9", "rgba(255, 255, 255, 0.2)"]
    }

    for (let i = 0; i < 3; i++) {
        document.documentElement.style.setProperty(themesColors.var[i], themesColors[theme][i]);
    }

    const backgroundVideo = document.getElementById("background-video");
    let backgroundVideoPath = `assets/background/${theme}.mp4`;
    if (lacePinState) {
        backgroundVideoPath = `assets/background/${theme} Lace Pin.mp4`;
    }

    backgroundVideo.src = backgroundVideoPath;
}

function toggleSortMenu() {
    const sortMenu = document.getElementById("sort-menu");
    if (sortMenu) {
        sortMenu.classList.toggle("show");
    }
}

function setSortOrderButton() {
    let sortOrder;
    if (oldPage == "mods-installed") {
        sortOrder = installedSortOrder;
    } else if (oldPage == "mods-online") {
        sortOrder = onlineSortOrder;
    }

    const sortOrderButton = document.getElementById("sort-order-image");
    if (sortOrderButton) {
        if (sortOrder == "ASC") {
            sortOrderButton.src = "assets/icons/sort-order-2.svg";
        } else {
            sortOrderButton.src = "assets/icons/sort-order-1.svg";
        }
    }
}

function changeSort(sortFilterParameter) {
    toggleSortMenu();
    toggleSelectedListButton("sort-menu", sortFilterParameter);

    if (oldPage == "mods-installed") {
        installedSortFilter = sortFilterParameter;
        searchInstalledMods();
    } else if (oldPage == "mods-online") {
        onlineSortFilter = sortFilterParameter;
        searchNexusMods();
    }
}

function inverseSort() {
    if (oldPage == "mods-installed") {
        if (installedSortOrder == "ASC") {
            installedSortOrder = "DESC";
        } else {
            installedSortOrder = "ASC";
        }
        searchInstalledMods();
    } else if (oldPage == "mods-online") {
        if (onlineSortOrder == "ASC") {
            onlineSortOrder = "DESC";
        } else {
            onlineSortOrder = "ASC";
        }
        searchNexusMods();
    }
}

function toggleSelectedListButton(ListMenuId, buttonId) {
    const themesMenu = document.getElementById(ListMenuId);
    if (themesMenu) {
        Array.from(themesMenu.children).forEach((child) => {
            child.classList.remove("selected");
        });
    }

    const themesButton = document.getElementById(buttonId);
    if (themesButton) {
        themesButton.classList.toggle("selected");
    }
}

//////////////////////////////////////////////////////
//////////////////// UNCATEGORIZE ////////////////////

async function launch(mode) {
    await electronAPI.launchGame(mode);
    setBepinexVersion();
}

async function autoDetectGamePath() {
    await files.autoDetectGamePath();
    if (document.getElementById("silksong-path-input")) {
        document.getElementById("silksong-path-input").value = await files.loadSilksongPath();
    }
}

function showToast(message, type = "info", duration = 3000) {
    const toastDiv = document.getElementById("toast-div");
    const toast = document.createElement("p");

    toast.classList.add("toast", type);
    toast.innerText = message;
    toastDiv.appendChild(toast);
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
}

electronAPI.onShowToast(showToast);

function changeModsPage(offsetChange) {
    if (oldPage == "mods-installed") {
        if (offsetChange == "min") {
            installedOffset = 0;
        } else if (offsetChange == "max") {
            installedOffset = installedModsTotalCount;
        } else {
            installedOffset += installedModsCount * offsetChange;
            installedOffset = clamp(installedOffset, 0, installedModsTotalCount);
        }
        installedOffset = Math.floor(installedOffset / 10) * 10;
        if (lastInstalledOffset != installedOffset) {
            lastInstalledOffset = installedOffset;
            searchInstalledMods();
        }
    } else if (oldPage == "mods-online") {
        if (offsetChange == "min") {
            onlineOffset = 0;
        } else if (offsetChange == "max") {
            onlineOffset = onlineModsTotalCount;
        } else {
            onlineOffset += onlineModsCount * offsetChange;
            onlineOffset = clamp(onlineOffset, 0, onlineModsTotalCount);
        }
        onlineOffset = Math.floor(onlineOffset / 10) * 10;
        if (lastOnlineOffset != onlineOffset) {
            lastOnlineOffset = onlineOffset;
            searchNexusMods();
        }
    }
}

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}
