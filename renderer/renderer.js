const title = document.getElementById("title");
const view = document.getElementById("view");

function navigate(page) {
  switch (page) {
    case "home":
      title.innerText = "Home";
      view.innerHTML = `
        <p>Welcome to the Silk Fly Launcher.</p>
      `;
      break;

    case "mods-installed":
      title.innerText = "Installed Mods";
      view.innerHTML = `
        <p>List of installed mods.</p>
      `;
      break;

    case "mods-online":
      title.innerText = "Online mods";
      view.innerHTML = `
        <p>Browse Nexus mods.</p>
      `;
      break;
  }
}

function launch(mode) {
  alert(`Launching the game in ${mode} mode.`);
}