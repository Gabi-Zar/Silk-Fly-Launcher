<h1 align="center">Silk Fly Launcher</h1>

<p align="center">
    <img alt="Release" src="https://img.shields.io/github/v/release/Gabi-Zar/Silk-Fly-Launcher?include_prereleases&style=flat&color=green">
    <img alt="Stars" src="https://img.shields.io/github/stars/Gabi-Zar/Silk-Fly-Launcher?style=flat&color=magenta">
    <img alt="Forks" src="https://img.shields.io/github/forks/Gabi-Zar/Silk-Fly-Launcher?style=flat&color=purple">
    <img alt="License" src="https://img.shields.io/github/license/Gabi-Zar/Silk-Fly-Launcher?style=flat&color=BB0000">
    <br>
    <a href="https://github.com/Gabi-Zar"><img title="Developer" src="https://img.shields.io/badge/developer-GabiZar-blue"></a>
    <img alt="Maintained" src="https://img.shields.io/badge/Maintained-Yes-009900">
    <img alt="Written In" src="https://img.shields.io/badge/Written%20In-Javascript-yellow?logo=javascript">
</p>

---

Silk Fly Launcher is an open-source mod manager for Hollow Knight: Silksong built with Electron, it download mods from Nexus Mods (Thunderstore comming in stable v1.0.0).

<p align="center">
    <img src="assets/github/about.png">
</p>

<details>
    <summary>More screenshots (click me)</summary>
    <p align="center">
        <img src="assets/github/online-mods.png">
        <img src="assets/github/settings.png">
        <img src="assets/github/about-steel.png">
        <img src="assets/github/search-citadel.png">
        <img src="assets/github/installed-mods-cradle.png">
        <img src="assets/github/about-greyroot.png">
        <img src="assets/github/latest-mods-abyss.png">
    </p>
</details>

## Features

- Install / Uninstall / Backup BepInEx for Silksong.
- Automatically detect Silksong installation path for Steam on Windows
- Browse and download Nexus mods directly in the app
- Multiple themes inspired by Silksong
- Launch Silksong in Vanilla or Modded without deleting the mods
- Securely store your Nexus API key on your device using Electron's safeStorage, and then encrypt it with an AES key (provided at build time) via Electron Store.
- Works on Windows (Linux coming soon)

## Compatibility

- [x] Windows x64
- [ ] Linux (Comming in v1.0.0)
- [ ] macOS (need a tester)

## Installation & Usage

1. Download the app in your desired format from the [GitHub Releases](https://github.com/Gabi-Zar/Silk-Fly-Launcher/releases) page or build it from source to have the latest features.

2. Install it and follow the in-app guide.

## How to build

1. Install [Git](https://git-scm.com/) and [Node JS](https://nodejs.org)
2. Clone the repo `git clone https://github.com/Gabi-Zar/Silk-Fly-Launcher `
3. Go into the repository `cd Silk-Fly-Launcher `
4. Install npm dependencies `npm install `
5. Start the app with `npm run start `
6. Optionnal dependencies:
    - [Wix toolset v3](https://github.com/wixtoolset/wix3/releases/tag/wix3141rtm) for msi windows build
7. Build the app with `npm run make:options `
8. Available Build options:
    - none - build all
    - zip - Make a zip for Windows x64
    - msi - Make a msi build for Windows x64

## Todo

#### For stable release 1.0.0

- [x] BepInEx support
- [x] Nexus support
- [ ] Disable / Enable Individual mods
- [ ] Automatic update
- [ ] Support for Thunderstore
- [ ] Linux support
- [ ] Support for offline mods
- [ ] Auto Download Mods Dependencies

#### For later

- [ ] Automatically detect Silksong installation path on other platforms
- [ ] Multiple mods profiles
- [ ] Support for MelonLoader
- [ ] French translation
- [ ] macOS support (need a tester)

##### Todo list sorted by importance

## Contributing

This is my first Electron project, I will love any feedback. Just open an issue or make a pull request.

## License and credit

This project is licensed under the [GPL-3.0 license](LICENSE).<br>
This product uses third-party modules or assets under open source [third-party](THIRD-PARTY-LICENSES) licenses.

> [!CAUTION]
> Some assets came from Hollow Knight: Silksong.
> Hollow Knight: Silksong is property of Team Cherry.
> This project is not affiliated with or endorsed by Team Cherry.

---

<p align="center">If you like this app, consider giving it a star on GitHub!</p>
