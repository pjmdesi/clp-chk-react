import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';
import Store from 'electron-store';

const { app, session, protocol, BrowserWindow, Menu, ipcMain, shell, ipcRenderer, contextBridge, screen } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// In production, app.isPackaged will be true
// In development, it will be false
const DEV = !app.isPackaged;

const isMac = process.platform === 'darwin';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Initialize electron-store for persistent data (will be initialized after app ready)
let store;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Blank menu
const menuTemplate = [
	// { role: 'appMenu' }
	// ...(isMac
	// 	? [
	// 			{
	// 				label: app.name,
	// 				submenu: [{ label: 'Settings...' }, { type: 'separator' }, { role: 'quit' }],
	// 			},
	// 		]
	// 	: []),
	// // { role: 'fileMenu' }
	// {
	// 	label: 'File',
	// 	submenu: [
	// 		isMac ? { role: 'close' } : { role: 'quit' },
	// 		{
	// 			role: 'submenu',
	// 			label: 'Left Video',
	// 			submenu: [
	// 				{
	// 					label: 'Load new file...',
	// 					click: async () => {
	// 						mainWindow.webContents.send('load-left-video');
	// 					},
	// 				},
	// 				{
	// 					label: 'Clear file',
	// 					click: async () => {
	// 						mainWindow.webContents.send('clear-left-video');
	// 					},
	// 				},
	// 			],
	// 		},
	// 		{
	// 			role: 'submenu',
	// 			label: 'Right Video',
	// 			submenu: [
	// 				{
	// 					label: 'Load new file...',
	// 					click: async () => {
	// 						mainWindow.webContents.send('load-right-video');
	// 					},
	// 				},
	// 				{
	// 					label: 'Clear file',
	// 					click: async () => {
	// 						mainWindow.webContents.send('clear-right-video');
	// 					},
	// 				},
	// 			],
	// 		},
	// 		{
	// 			label: 'Swap Videos',
	// 			click: async () => {
	// 				mainWindow.webContents.send('swap-videos');
	// 			},
	// 		},
	// 	],
	// },
	// // { role: 'editMenu' }
	// {
	// 	label: 'Clipper',
	// 	submenu: [
	// 		{
	// 			role: 'submenu',
	// 			label: 'Clip Type',
	// 			submenu: [
	// 				{
	// 					label: 'Vertical Clipper',
	// 					click: async () => {
	// 						mainWindow.webContents.send('set-clip-type', 'vertical');
	// 					},
	// 				},
	// 				{
	// 					label: 'Horizontal Clipper',
	// 					click: async () => {
	// 						mainWindow.webContents.send('set-clip-type', 'horizontal');
	// 					},
	// 				},
	// 				{
	// 					label: 'Circle Cutout',
	// 					click: async () => {
	// 						mainWindow.webContents.send('set-clip-type', 'circle');
	// 					},
	// 				},
	// 				{
	// 					label: 'Rectangle Cutout',
	// 					click: async () => {
	// 						mainWindow.webContents.send('set-clip-type', 'rectangle');
	// 					},
	// 				},
	// 			],
	// 		},
	// 		{ role: 'separator' },
	// 		{
	// 			label: 'Reset View',
	// 			click: async () => {
	// 				mainWindow.webContents.send('reset-view');
	// 			},
	// 		},
	// 	],
	// },
	// // { role: 'viewMenu' }
	// {
	// 	label: 'View',
	// 	submenu: [
	// 		{ role: 'reload' },
	// 		{ role: 'forceReload' },
	// 		{ type: 'separator' },
	// 		{ role: 'resetZoom', label: 'Reset App UI Zoom' },
	// 		{ role: 'zoomIn', label: 'Zoom In App UI' },
	// 		{ role: 'zoomOut', label: 'Zoom Out App UI' },
	// 		{ type: 'separator' },
	// 		{ role: 'togglefullscreen' },
	// 	],
	// },
	// // { role: 'windowMenu' }
	// {
	// 	label: 'Window',
	// 	submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }] : [{ role: 'close' }])],
	// },
	// {
	// 	role: 'help',
	// 	submenu: [
	// 		{
	// 			label: 'Visit the GitHub Repository...',
	// 			click: async () => {
	// 				const { shell } = require('electron');
	// 				await shell.openExternal('https://github.com/your-repo-url');
	// 			},
	// 		},
	// 	],
	// },
];

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

	mainWindow = new BrowserWindow({
		// Leave room for devtools when in development
		width: savedBounds?.width || defaultWidth,
		height: savedBounds?.height || defaultHeight,
		x: savedBounds?.x,
		y: savedBounds?.y,
		// minWidth: 900 + DEV * 600,
		// minHeight: 600 + DEV * 400,
		minWidth: 900,
		minHeight: 600,
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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function resizeCenteredWithinCurrentDisplay(win, targetW, targetH, animate = true) {
	if (!win || win.isDestroyed()) return;

	const display = screen.getDisplayMatching(win.getBounds());
	const wa = display.workArea; // { x, y, width, height }

	// Measure frame overhead (outer - content)
	const outer = win.getBounds();
	const content = win.getContentBounds();

	const frameW = Math.max(0, outer.width - content.width);
	const frameH = Math.max(0, outer.height - content.height);

	// Clamp content so OUTER fits within workArea
	const maxContentW = Math.max(1, wa.width - frameW);
	const maxContentH = Math.max(1, wa.height - frameH);

	const clampedW = clamp(Math.round(targetW), 1, maxContentW);
	const clampedH = clamp(Math.round(targetH), 1, maxContentH);

	const newOuterW = clampedW + frameW;
	const newOuterH = clampedH + frameH;

	// Center the OUTER window in the work area
	let newOuterX = Math.round(wa.x + (wa.width - newOuterW) / 2);
	let newOuterY = Math.round(wa.y + (wa.height - newOuterH) / 2);

	// Safety clamp (in case of rounding / odd WMs)
	newOuterX = clamp(newOuterX, wa.x, wa.x + wa.width - newOuterW);
	newOuterY = clamp(newOuterY, wa.y, wa.y + wa.height - newOuterH);

	// Convert outer position -> content position using current offsets
	const contentOffsetX = content.x - outer.x;
	const contentOffsetY = content.y - outer.y;

	win.setContentBounds(
		{
			x: newOuterX + contentOffsetX,
			y: newOuterY + contentOffsetY,
			width: clampedW,
			height: clampedH,
		},
		animate
	);

	// Linux WMs sometimes "correct" geometry after a tick; re-center once if needed.
	if (process.platform === 'linux') {
		setTimeout(() => {
			if (win.isDestroyed()) return;

			const d2 = screen.getDisplayMatching(win.getBounds());
			const wa2 = d2.workArea;

			const o2 = win.getBounds();
			const c2 = win.getContentBounds();

			const frameW2 = Math.max(0, o2.width - c2.width);
			const frameH2 = Math.max(0, o2.height - c2.height);

			const maxCW2 = Math.max(1, wa2.width - frameW2);
			const maxCH2 = Math.max(1, wa2.height - frameH2);

			const w2 = clamp(c2.width, 1, maxCW2);
			const h2 = clamp(c2.height, 1, maxCH2);

			const newOW2 = w2 + frameW2;
			const newOH2 = h2 + frameH2;

			let x2 = Math.round(wa2.x + (wa2.width - newOW2) / 2);
			let y2 = Math.round(wa2.y + (wa2.height - newOH2) / 2);

			x2 = clamp(x2, wa2.x, wa2.x + wa2.width - newOW2);
			y2 = clamp(y2, wa2.y, wa2.y + wa2.height - newOH2);

			const offX2 = c2.x - o2.x;
			const offY2 = c2.y - o2.y;

			win.setContentBounds({ x: x2 + offX2, y: y2 + offY2, width: w2, height: h2 }, false);
		}, 0);
	}
}

ipcMain.on('resize-window', (event, { width, height }) => {
	const allWindows = BrowserWindow.getAllWindows();
	if (allWindows.length === 0) return;

	resizeCenteredWithinCurrentDisplay(allWindows[0], width, height, true);
});
