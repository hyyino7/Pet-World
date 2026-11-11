const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pet', {
    call: (action, input) => ipcRenderer.invoke('pet:command', action, input),
    listen: fn => ipcRenderer.on('pet:update', (_event, type, value) => fn(type, value)),
});
contextBridge.exposeInMainWorld('petBridge', {
    setBounds: (...values) => ipcRenderer.invoke('pet:command', 'bounds', values),
    setInputBusy: value => ipcRenderer.invoke('pet:command', 'input-busy', value),
    setInputRegions: value => ipcRenderer.invoke('pet:command', 'input-regions', value),
    setInteractive: value => ipcRenderer.invoke('pet:command', 'interactive', value),
    openDshSite: () => ipcRenderer.invoke('pet:command', 'toggle'),
    focusDshHost: () => ipcRenderer.invoke('pet:command', 'toggle'),
    onPointerLeft: fn => ipcRenderer.on('pet:pointer-left', () => fn()),
    captureScreen: () => ipcRenderer.invoke('pet:command', 'capture'),
    requestKeyboardFocus: () => ipcRenderer.invoke('pet:command', 'focus'),
});
