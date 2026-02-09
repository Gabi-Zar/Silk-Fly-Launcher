const title = document.getElementById("title");
const view = document.getElementById("view");

const HomeTemplate = document.getElementById("home-template");
const installedModsTemplate = document.getElementById("installed-mods-template");
const onlineModsTemplate = document.getElementById("online-mods-template");
const settingsTemplate = document.getElementById("settings-template");
const modTemplate = document.getElementById("mod-template");

const versionText = HomeTemplate.content.getElementById("version-text");

navigate("home")

async function navigate(page) {
    view.replaceChildren()
    switch (page) {
        case "home":
            title.innerText = "Home";
            const HomeTemplateCopy = HomeTemplate.content.cloneNode(true)
            const versionText = HomeTemplateCopy.getElementById("version-text")
            versionText.innerText =
                `Chrome version: (v${versions.chrome()}), ` +
                `Node.js version: (v${versions.node()}), Electron version: (v${versions.electron()})`
            view.appendChild(HomeTemplateCopy)
            break;

        case "mods-installed":
            title.innerText = "Installed Mods";
            const installedModsTemplateCopy = installedModsTemplate.content.cloneNode(true)
            view.appendChild(installedModsTemplateCopy)
            break;

        case "mods-online":
            title.innerText = "Online Mods";
            const onlineModsTemplateCopy = onlineModsTemplate.content.cloneNode(true)
            const ModsContainer = onlineModsTemplateCopy.getElementById("mods-container")
            view.appendChild(onlineModsTemplateCopy)

            mods = await nexus.getLatestMods()
            if (mods == undefined) {
                break;
            }
            for(const mod of mods) {
                if (mod.name == undefined) {
                    continue
                }
                const modTemplateCopy = modTemplate.content.cloneNode(true)
                if (mod.name) {
                    const modTitleText = modTemplateCopy.getElementById("mod-title")
                    modTitleText.innerText = mod.name
                }
                if (mod.author) {
                    const modAuthorText = modTemplateCopy.getElementById("mod-author")
                    modAuthorText.innerText = `by ${mod.author}`
                }
                if (mod.endorsement_count) {
                    const modEndorsementsNumber = modTemplateCopy.getElementById("mod-endorsements-number")
                    if (mod.endorsement_count > 1) {
                        modEndorsementsNumber.innerText = `${mod.endorsement_count} likes`
                    }
                    else {
                        modEndorsementsNumber.innerText = `${mod.endorsement_count} like`
                    }
                }
                if (mod.summary) {
                    const modDescriptionText = modTemplateCopy.getElementById("mod-description")
                    modDescriptionText.innerText = mod.summary
                }
                if (mod.picture_url) {
                    const modPicture = modTemplateCopy.getElementById("mod-icon")
                    modPicture.src = mod.picture_url
                }
                if (mod.version && mod.updated_timestamp) {
                    const modVersionText = modTemplateCopy.getElementById("mod-version")
                    modVersionText.innerText = `V${mod.version} last updated on ${mod.updated_time.slice(0, 10)}`
                }

                const modUrl = `https://www.nexusmods.com/hollowknightsilksong/mods/${mod.mod_id}`

                const modLinkButton = modTemplateCopy.getElementById("external-link")
                modLinkButton.href = modUrl
                modLinkButton.addEventListener('click', function(event) {
                    event.preventDefault()
                    const modLink = modLinkButton.href
                    electronAPI.openExternalLink(modLink)
                })

                modDownloadButton = modTemplateCopy.getElementById("download-mod-button")
                modDownloadButton.addEventListener('click', function(event) {
                    event.preventDefault()
                    const modDownloadLink = `${modUrl}?tab=files`
                    nexus.download(modDownloadLink)
                })

                ModsContainer.appendChild(modTemplateCopy)
            }
            break;

        case "general-settings":
            title.innerText = "Settings";
            const settingsTemplateCopy = settingsTemplate.content.cloneNode(true)
            const silksongPathInput = settingsTemplateCopy.getElementById("silksong-path-input")
            const nexusAPIInput = settingsTemplateCopy.getElementById("nexus-api-input")

            silksongPathInput.value = await files.loadSilksongPath()
            silksongPathInput.addEventListener('input', async function(event) {
                let silksongPath = silksongPathInput.value
                await files.saveSilksongPath(silksongPath)
            });

            nexusAPIInput.value = await files.loadNexusAPI()
            nexusAPIInput.addEventListener('input', async function(event) {
                let nexusAPI = nexusAPIInput.value
                await files.saveNexusAPI(nexusAPI)
            });

            view.appendChild(settingsTemplateCopy)
            setBepinexVersion()
            verifyNexusAPI()
            break;
    }
}

async function launch(mode) {
    alert(`Launching the game in ${mode} mode.`);
    await electronAPI.launchGame(mode);
    setBepinexVersion()
}

async function autoDetectGamePath() {
    await files.autoDetectGamePath()
    if (document.getElementById("silksong-path-input")) {
        document.getElementById("silksong-path-input").value = await files.loadSilksongPath()
    }
}

async function deleteData() {
    await files.delete()
    document.getElementById("silksong-path-input").value = await files.loadSilksongPath()
    document.getElementById("nexus-api-input").value = await files.loadNexusAPI()
}

async function exportData() {
    await files.export()
}

async function importData() {
    await files.import()
    document.getElementById("silksong-path-input").value = await files.loadSilksongPath()
    document.getElementById("nexus-api-input").value = await files.loadNexusAPI()
}

async function installBepinex() {
    await bepinex.install()
    setBepinexVersion()
}

async function uninstallBepinex() {
    await bepinex.uninstall()
    setBepinexVersion()
}

async function backupBepinex() {
    await bepinex.backup()
    setBepinexVersion()
}

async function deleteBepinexBackup() {
    await bepinex.deleteBackup()
    setBepinexVersion()
}

async function setBepinexVersion() {
    const bepinexVersionText = document.getElementById("bepinex-version-text")
    if (bepinexVersionText == undefined) {
        return
    }
    
    const bepinexVersion = await files.loadBepinexVersion()
    const bepinexBackupVersion = await files.loadBepinexBackupVersion()
    if(bepinexVersion == undefined) {
        if(bepinexBackupVersion == undefined) {
        bepinexVersionText.innerText = "BepInEx is not installed"
        }
        else {
            bepinexVersionText.innerText = `BepInEx ${bepinexBackupVersion} is backed up`
        }
    }
    else {
        bepinexVersionText.innerText = `BepInEx ${bepinexVersion} is installed`
    }
}

async function verifyNexusAPI() {
    response = await nexus.verifyAPI()

    const nexusCheckImage = document.getElementById("nexus-check-image")
    if (nexusCheckImage == undefined) {
        return
    }

    if (response) {
        nexusCheckImage.src = "assets/check.svg"
    }
    else {
        nexusCheckImage.src = "assets/cross.svg"
    }
}