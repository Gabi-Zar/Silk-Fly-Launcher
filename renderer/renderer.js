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
            view.appendChild(HomeTemplateCopy);
            break;

        case "mods-installed":
            title.innerText = "Installed Mods";
            const installedModsTemplateCopy = installedModsTemplate.content.cloneNode(true);
            const installedModsContainer = installedModsTemplateCopy.getElementById("mods-container");
            const searchFormInstalled = installedModsTemplateCopy.getElementById("search-form");

            searchFormInstalled.addEventListener("submit", async function (event) {
                event.preventDefault();
            });

            view.appendChild(installedModsTemplateCopy);

            const modsInfo = await files.loadInstalledModsInfo();
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
                if (modInfo.summary) {
                    const modDescriptionText = installedModTemplateCopy.getElementById("mod-description");
                    modDescriptionText.innerText = modInfo.summary;
                }
                if (modInfo.picture_url) {
                    const modPicture = installedModTemplateCopy.getElementById("mod-icon");
                    modPicture.src = modInfo.picture_url;
                }
                if (modInfo.version && modInfo.updated_time) {
                    const modVersionText = installedModTemplateCopy.getElementById("mod-version");
                    modVersionText.innerText = `V${modInfo.version} last updated on ${modInfo.updated_time.slice(0, 10)}`;
                }

                const modUrl = `https://www.nexusmods.com/hollowknightsilksong/mods/${modInfo.mod_id}`;

                const modLinkButton = installedModTemplateCopy.getElementById("external-link");
                modLinkButton.href = modUrl;
                modLinkButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    const modLink = modLinkButton.href;
                    electronAPI.openExternalLink(modLink);
                });

                modDownloadButton = installedModTemplateCopy.getElementById("uninstall-mod-button");
                modDownloadButton.addEventListener("click", async function (event) {
                    event.preventDefault();
                    await nexus.uninstall(modInfo.mod_id);

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

            searchFormNexus.addEventListener("submit", async function (event) {
                event.preventDefault();
            });

            view.appendChild(onlineModsTemplateCopy);

            mods = await nexus.getLatestMods();
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
                if (mod.endorsement_count) {
                    const modEndorsementsNumber = modTemplateCopy.getElementById("mod-endorsements-number");
                    if (mod.endorsement_count > 1) {
                        modEndorsementsNumber.innerText = `${mod.endorsement_count} likes`;
                    } else {
                        modEndorsementsNumber.innerText = `${mod.endorsement_count} like`;
                    }
                }
                if (mod.summary) {
                    const modDescriptionText = modTemplateCopy.getElementById("mod-description");
                    modDescriptionText.innerText = mod.summary;
                }
                if (mod.picture_url) {
                    const modPicture = modTemplateCopy.getElementById("mod-icon");
                    modPicture.src = mod.picture_url;
                }
                if (mod.version && mod.updated_timestamp) {
                    const modVersionText = modTemplateCopy.getElementById("mod-version");
                    modVersionText.innerText = `V${mod.version} last updated on ${mod.updated_time.slice(0, 10)}`;
                }

                const modUrl = `https://www.nexusmods.com/hollowknightsilksong/mods/${mod.mod_id}`;

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
            const nexusAPIInput = settingsTemplateCopy.getElementById("nexus-api-input");
            const versionsList = settingsTemplateCopy.getElementById("versions-list");
            const versionsDictionnary = {
                "Silk-Fly-Launcher": `Silk Fly Launcher: v${versions.silkFlyLauncher()}`,
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

            nexusAPIInput.value = await files.loadNexusAPI();
            nexusAPIInput.addEventListener("input", async function (event) {
                let nexusAPI = nexusAPIInput.value;
                files.saveNexusAPI(nexusAPI);
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
            verifyNexusAPI();
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
            nexusLink.addEventListener("click", function (event) {
                event.preventDefault();
                const url = nexusLink.href;
                electronAPI.openExternalLink(url);
            });

            const nexusAPIInput = document.getElementById("nexus-api-input");
            nexusAPIInput.value = await files.loadNexusAPI();
            nexusAPIInput.addEventListener("input", async function (event) {
                let nexusAPI = nexusAPIInput.value;
                await files.saveNexusAPI(nexusAPI);
            });
            break;

        case 3:
            pageDiv.appendChild(styleTemplate.content.cloneNode(true));
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
    document.getElementById("nexus-api-input").value = await files.loadNexusAPI();
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
    document.getElementById("nexus-api-input").value = await files.loadNexusAPI();
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
    console.log(searchInput.value);
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
    const searchInput = document.getElementById("search-input");
    console.log(searchInput.value);
}

//////////////////////////////////////////////////////
/////////////////////// THEMES ///////////////////////

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
