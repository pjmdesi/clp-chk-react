// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { ipcRenderer, contextBridge } = require('electron');
const { Titlebar, TitlebarColor } = require('custom-electron-titlebar');
// const path = require('node:path');

const environment = process.env.NODE_ENV || 'production';

const DEV = environment === 'development';

const options = {
	backgroundColor: TitlebarColor.fromHex('#0000'),
	itemBackgroundColor: TitlebarColor.fromHex('#08162F'),
	containerOverflow: 'hidden',
	icon: `${DEV ? '.' : ''}/assets/images/app-icon.png`,
};

contextBridge.exposeInMainWorld('api', {
	openFile: filePath => ipcRenderer.send('open-file', filePath),
	openExternal: url => ipcRenderer.send('open-external', url),
	pickMediaFile: () => ipcRenderer.invoke('pick-media-file'),
	resizeWindow: dimensions => {
        console.log(`Setting dimensions to: ${dimensions.width}, ${dimensions.height}`);
        ipcRenderer.send('resize-window', dimensions)
    },
});

window.addEventListener('DOMContentLoaded', () => {
	// Title bar implementation
	new Titlebar(options);
});
