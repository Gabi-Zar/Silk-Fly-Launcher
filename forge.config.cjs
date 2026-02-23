const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const fs = require("fs/promises");
const path = require("path");

const buildTarget = process.env.BUILD_TARGET || "all";
let isPerMachine = buildTarget.includes("system") ? true : false;

const makers = [];
if (buildTarget.includes("msi") || buildTarget == "all") {
    makers.push({
        name: "@electron-forge/maker-wix",
        config: {
            icon: "./assets/icon.ico",
            perMachine: isPerMachine,
            ui: { enabled: true, chooseDirectory: true },
        },
    });
}

if (buildTarget == "zip" || buildTarget == "all") {
    makers.push({
        name: "@electron-forge/maker-zip",
        platforms: ["win32"],
    });
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: ["node_modules/7zip-bin"],
        ignore: [
            /^\/?test/,
            /^\/?docs/,
            /^\/?\.vscode/,
            /raw_assets/,
            /7zip-bin\/win/,
            /7zip-bin\/mac/,
            /7zip-bin\/linux/,
            /.*\.md$/,
            /.*\.map$/,
            /.*\.ts$/,
            /.*\.prettierignore$/,
            /.*\.gitignore$/,
            /.*\.ignore$/,
            /.package-lock.json/,
        ],
        icon: "./assets/icon",
        prune: true,
    },
    rebuildConfig: {},
    makers: makers,
    hooks: {
        postPackage: async (forgeConfig, options) => {
            if (!(options.outputPaths instanceof Array)) {
                return;
            }
            const localesPath = path.join(options.outputPaths[0], "locales");
            const locales = await fs.readdir(localesPath);
            for (const locale of locales) {
                if (locale != "en-US.pak") {
                    const localePath = path.join(localesPath, locale);
                    await fs.unlink(localePath);
                }
            }
        },
        postMake: async (forgeConfig, makeResults) => {
            if (buildTarget.includes("msi") || buildTarget == "all") {
                const outDir = path.join(__dirname, "out", "make", "wix");
                const customTag = buildTarget.includes("system") ? "system" : "user";
                const newDir = outDir.replace("wix", `wix-${customTag}`);
                if (await fileExists(newDir)) {
                    await fs.rm(newDir, { recursive: true });
                }
                await fs.rename(outDir, newDir);

                const files = await fs.readdir(newDir, { recursive: true });
                const msiFile = path.join(
                    newDir,
                    files.find((file) => file.endsWith(".msi")),
                );
                const newName = `${makeResults[0].packageJSON.productName}-${makeResults[0].platform}-${makeResults[0].arch}-${makeResults[0].packageJSON.version}-${customTag}.msi`;
                const newMsiFile = path.join(newDir, "x64", newName);
                await fs.rename(msiFile, newMsiFile);
            }

            console.log(`successful build for ${buildTarget}`);
        },
    },
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {},
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
