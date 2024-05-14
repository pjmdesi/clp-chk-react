import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';

const { app, session, protocol, BrowserWindow, Menu, ipcMain, shell, ipcRenderer, contextBridge } = require('electron');
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
        sandbox: false,
		icon: path.join(__dirname, 'assets/images', 'app-icon.png'),
		setBackgroundColor: '#0E2144',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			webSecurity: !DEV,
			allowRunningInsecureContent: false,
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
	mainWindow.webContents.openDevTools();

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

// open file with default application
ipcMain.on('open-file', filePath => {
	// Open the given file in the desktop's default manner.
	const file = shell.openPath(filePath);

    console.log({file});

	// Show the given file in a file manager. If possible, select the file.
	shell.showItemInFolder(filePath);
});
