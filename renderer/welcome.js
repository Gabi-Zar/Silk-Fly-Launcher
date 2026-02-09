let actualPage = 0

const pageDiv = document.getElementById("page");
const buttonDiv = document.getElementById("button-div");

const oneButtonTemplate = document.getElementById("one-button-template");
const twoButtonTemplate = document.getElementById("two-button-template");

const welcomeTemplate = document.getElementById("welcome-template");
const silksongPathTemplate = document.getElementById("path-template");
const nexusTemplate = document.getElementById("nexus-template");
const styleTemplate = document.getElementById("style-template");
const tutorialTemplate = document.getElementById("tutorial-template");

navigate()

async function navigate() {
    pageDiv.replaceChildren()
    switch (actualPage) {
        case 0:
            pageDiv.appendChild(welcomeTemplate.content.cloneNode(true))
            buttonDiv.replaceChildren()
            buttonDiv.appendChild(oneButtonTemplate.content.cloneNode(true))
            break;

        case 1:
            pageDiv.appendChild(silksongPathTemplate.content.cloneNode(true))
            buttonDiv.replaceChildren()
            buttonDiv.appendChild(twoButtonTemplate.content.cloneNode(true))

            const silksongPathInput = document.getElementById("silksong-path-input")
            if (await files.loadSilksongPath() == "") {
                autoDetectGamePath()
            }
            else {
                document.getElementById("silksong-path-input").value = await files.loadSilksongPath()
            }

            silksongPathInput.addEventListener('input', async function(event) {
                let silksongPath = silksongPathInput.value
                await files.saveSilksongPath(silksongPath)
            });
            break;

        case 2:
            pageDiv.appendChild(nexusTemplate.content.cloneNode(true))
            const nexusLink = document.getElementById("external-link")
            nexusLink.addEventListener('click', function(event) {
                event.preventDefault()
                const url = nexusLink.href
                electronAPI.openExternalLink(url)
            })

            const nexusAPIInput = document.getElementById("nexus-api-input")
            nexusAPIInput.value = await files.loadNexusAPI()
            nexusAPIInput.addEventListener('input', async function(event) {
                let nexusAPI = nexusAPIInput.value
                await files.saveNexusAPI(nexusAPI)
            });
            break;

        case 3:
            pageDiv.appendChild(styleTemplate.content.cloneNode(true))
            break;

        case 4:
            pageDiv.appendChild(tutorialTemplate.content.cloneNode(true))
            break;

        case 5:
            electronAPI.loadMainPage()
            break;
    }
}

function next() {
    actualPage++
    navigate()
}

function back() {
    actualPage--
    navigate()
}

async function autoDetectGamePath() {
    await files.autoDetectGamePath()
    document.getElementById("silksong-path-input").value = await files.loadSilksongPath()
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

async function importData() {
    const res = await files.import()
    if (res) {
        electronAPI.loadMainPage()
    }
}