const title = document.getElementById("title");
const view = document.getElementById("view");

const HomeTemplate = document.getElementById("home-template");
const installedModsTemplate = document.getElementById("installed-mods-template");
const onlineModsTemplate = document.getElementById("online-mods-template");
const settingsTemplate = document.getElementById("settings-template");

const versionText = HomeTemplate.content.getElementById("version-text")

navigate("home")

files.userSavePath().then(path => {
  path = `${path}\\config.json`
  files.fileExists(path).then(result => {
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
      const installedModsTemplateCopy = installedModsTemplate.content.cloneNode(true)
      view.appendChild(installedModsTemplateCopy)
      break;

    case "mods-online":
      const onlineModsTemplateCopy = onlineModsTemplate.content.cloneNode(true)
      view.appendChild(onlineModsTemplateCopy)
      break;

    case "general-settings":
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
  const defaultSilksongPath = "C:/Program Files (x86)/Steam/steamapps/common/Hollow Knight Silksong/Hollow Knight Silksong.exe"
  if (await files.fileExists(defaultSilksongPath)) {
    await save.saveSilksongPath(defaultSilksongPath)
    if (document.getElementById("silksong-path-input")) {
      document.getElementById("silksong-path-input").value = await save.loadSilksongPath()
    }
  }
}