import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';
import Store from 'electron-store';

const { app, session, protocol, BrowserWindow, Menu, ipcMain, shell, ipcRenderer, contextBridge } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// In production, app.isPackaged will be true
// In development, it will be false
const DEV = !app.isPackaged;

// Initialize electron-store for persistent data (will be initialized after app ready)
let store;

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
]);

// import appIcon from path.join(__dirname, 'assets/images', 'app-icon.ico');

const createWindow = () => {
	// Create the browser window.

	// Load saved window bounds or use defaults
	// In development, always use default size to leave room for devtools
	const savedBounds = DEV ? null : store.get('windowBounds');
	const defaultWidth = 1000 + DEV * 600;
	const defaultHeight = 600 + DEV * 400;

	const mainWindow = new BrowserWindow({
		// Leave room for devtools when in development
		width: savedBounds?.width || defaultWidth,
		height: savedBounds?.height || defaultHeight,
		x: savedBounds?.x,
		y: savedBounds?.y,
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

	// Save window bounds when they change
	const saveBounds = () => {
		if (!mainWindow.isMaximized() && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
			const bounds = mainWindow.getBounds();
			store.set('windowBounds', bounds);
		}
	};

	// Debounce saving to avoid too frequent writes
	let saveBoundsTimeout;
	mainWindow.on('resize', () => {
		clearTimeout(saveBoundsTimeout);
		saveBoundsTimeout = setTimeout(saveBounds, 500);
	});

	mainWindow.on('move', () => {
		clearTimeout(saveBoundsTimeout);
		saveBoundsTimeout = setTimeout(saveBounds, 500);
	});

	// Save bounds when window is closed
	mainWindow.on('close', saveBounds);

	// const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

	// DEV &&
	// 	installExtension(REACT_DEVELOPER_TOOLS, { loadExtensionOptions: { allowFileAccess: true } })
	// 		.then(name => console.log(`Added Extension:  ${name}`))
	// 		.catch(err => console.error('An error occurred: ', err));

	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

	// Open the DevTools only in development - after content loads
	DEV &&
		setTimeout(() => {
			// reload the window to apply the react extension
			mainWindow.reload();
		}, 500);

	if (DEV) {
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.openDevTools();
        });
    }
};

const sizeWindowToFitVideo = () => {
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('size-window-to-fit-video');
	}
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Initialize electron-store after app is ready
	store = new Store();

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
ipcMain.on('open-file', (event, filePath) => {
	// Show the given file in a file manager. If possible, select the file.
	shell.showItemInFolder(filePath);
});

// Resize window to fit video dimensions
ipcMain.on('resize-window', (event, { width, height }) => {
	const allWindows = BrowserWindow.getAllWindows();
	if (allWindows.length > 0) {
		const mainWindow = allWindows[0];
		mainWindow.setSize(Math.round(width), Math.round(height), true);
	}
});

// Trigger size-window-to-fit-video from renderer
ipcMain.on('trigger-size-to-fit', () => {
	const allWindows = BrowserWindow.getAllWindows();
	if (allWindows.length > 0) {
		const mainWindow = allWindows[0];
		mainWindow.webContents.send('size-window-to-fit-video');
	}
});
