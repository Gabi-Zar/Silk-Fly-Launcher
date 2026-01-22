const title = document.getElementById("title");
const view = document.getElementById("view");

const HomeTemplate = document.getElementById("home-template");
const installedModsTemplate = document.getElementById("installed-mods-template");
const onlineModsTemplate = document.getElementById("online-mods-template");
const settingsTemplate = document.getElementById("settings-template");
const modTemplate = document.getElementById("mod-template");

const versionText = HomeTemplate.content.getElementById("version-text");
let bepinexVersion

navigate("home")

let savePath
files.userSavePath().then(path => {
    savePath = `${path}\\config.json`
    files.fileExists(savePath).then(result => {
        if(!result) {
            autoDetectGamePath()
        }
    });
});

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

            for(let i = 0; i <= 10; i++) {
                const modTemplateCopy = modTemplate.content.cloneNode(true)

                const modLinkButton = modTemplateCopy.getElementById("external-link")
                modLinkButton.addEventListener('click', function(event) {
                    event.preventDefault()
                    const modLink = modLinkButton.href
                    electronAPI.openExternalLink(modLink)
                })

                ModsContainer.appendChild(modTemplateCopy)
            }
            break;

        case "general-settings":
            title.innerText = "Settings";
            const settingsTemplateCopy = settingsTemplate.content.cloneNode(true)
            const silksongPathInput = settingsTemplateCopy.getElementById("silksong-path-input")

            silksongPathInput.value = await save.loadSilksongPath()

            silksongPathInput.addEventListener('input', async function(event) {
                let silksongPath = silksongPathInput.value
                await save.saveSilksongPath(silksongPath)
            });

            view.appendChild(settingsTemplateCopy)
    }
}

function launch(mode) {
    alert(`Launching the game in ${mode} mode.`);
}

async function autoDetectGamePath() {
    const defaultsSilksongPaths = [
        ":/Program Files (x86)/Steam/steamapps/common/Hollow Knight Silksong",
        ":/SteamLibrary/steamapps/common/Hollow Knight Silksong"
    ]
    for (const path of defaultsSilksongPaths) {
        for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
            const fullPath = `${String.fromCharCode(i)}${path}`
            if (await files.fileExists(fullPath)) {
                await save.saveSilksongPath(fullPath)
                if (document.getElementById("silksong-path-input")) {
                    document.getElementById("silksong-path-input").value = await save.loadSilksongPath()
                }
                return
            }
        }
    }
}

async function deleteData() {
    await files.delete(savePath)
    document.getElementById("silksong-path-input").value = await save.loadSilksongPath()
}

async function exportData() {
    await files.export()
}

async function importData() {
    await files.import()
    document.getElementById("silksong-path-input").value = await save.loadSilksongPath()
}

async function downloadMod() {
    console.log("WIP")
}

async function installBepinex() {
    bepinexVersion = await bepinex.install()
    setBepinexVersion()
}

async function uninstallBepinex() {
    bepinexVersion = await bepinex.uninstall()
    setBepinexVersion()
}

async function setBepinexVersion() {
    const bepinexVersionText = document.getElementById("bepinex-version-text")
    if(await bepinexVersion == undefined) {
        bepinexVersionText.innerText = "BepInEx is not installed"
    }
    else {
        bepinexVersionText.innerText = `BepInEx ${bepinexVersion} is installed`
    }
}