import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';

const { app, session, protocol, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const environment = process.env.NODE_ENV || 'production';

const DEV = environment === 'development';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Blank menu
const menuTemplate = [];

const applicationMenu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(applicationMenu);

setupTitlebar();

protocol.registerSchemesAsPrivileged([
	{
		scheme: 'app',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
		},
	},
	{
		scheme: 'file',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			bypassCSP: true,
		},
	},
	{
		scheme: 'media-loader',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			bypassCSP: true,
		},
	},
]);

// import appIcon from path.join(__dirname, 'assets/images', 'app-icon.ico');

const createWindow = () => {
	// Create the browser window.

	console.log(path.join(__dirname, 'assets/images', 'app-icon.png'));

	const mainWindow = new BrowserWindow({
		// Leave room for devtools when in development
		width: 1000 + DEV * 600,
		height: 600 + DEV * 400,
		minWidth: 900 + DEV * 600,
		minHeight: 600 + DEV * 400,
		titleBarStyle: DEV ? 'default' : 'hidden',
		titleBarOverlay: !DEV,
		transparent: !DEV,
		frame: DEV,
		icon: path.join(__dirname, 'assets/images', 'app-icon.png'),
		setBackgroundColor: '#0E2144',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: !DEV,
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
	});

	const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

	DEV &&
		installExtension(REACT_DEVELOPER_TOOLS, { loadExtensionOptions: { allowFileAccess: true } })
			.then(name => console.log(`Added Extension:  ${name}`))
			.catch(err => console.error('An error occurred: ', err));

	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

	// Open the DevTools.
	DEV && mainWindow.webContents.openDevTools();

	DEV &&
		setTimeout(() => {
			// reload the window to apply the react extension
			mainWindow.reload();
		}, 500);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	protocol.handle('media-loader', (request, callback) => {
		const url = request.url.replace('media-loader://', '');
        console.log({url});
		try {
			return callback(url);
		} catch (err) {
			console.error(err);
			return callback(404);
		}
	});

	createWindow();

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

ipcMain.on('toMain', (event, args) => {
	fs.readFile('path/to/file', (error, data) => {
		// Do something with file contents

		// Send result back to renderer process
		win.webContents.send('fromMain', responseObj);
	});
});

ipcMain.handle('my-invokable-ipc', async (event, ...args) => {
    const result = await somePromise(...args)
    return result
  })
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
