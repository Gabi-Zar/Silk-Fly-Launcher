const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('save', {
  saveSilksongPath: (path) =>
    ipcRenderer.invoke('save-path', path),
  loadSilksongPath: () =>
    ipcRenderer.invoke('load-path')
})

contextBridge.exposeInMainWorld('files', {
  fileExists: (path) => ipcRenderer.invoke('file-exists', path)
});