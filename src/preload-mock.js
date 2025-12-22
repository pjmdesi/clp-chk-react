// Mock Electron preload API for browser development
if (typeof window !== 'undefined' && !window.electron) {
	window.electron = {
		// Add mock implementations of your Electron APIs here
		// This allows the app to run in a browser for development
		ipcRenderer: {
			send: (channel, data) => {
				console.log('Mock IPC send:', channel, data);
			},
			on: (channel, func) => {
				console.log('Mock IPC on:', channel);
			},
		},
	};
}

export {};
