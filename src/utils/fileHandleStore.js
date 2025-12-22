// Utility for storing and retrieving file handles using IndexedDB
// This allows persistent file access in the browser

const DB_NAME = 'ClpChkFileHandles';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

const openDB = () => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
};

export const saveFileHandle = async (key, fileHandle) => {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		store.put(fileHandle, key);
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				resolve();
			};
			transaction.onerror = () => {
				console.error('Transaction error saving file handle:', transaction.error);
				reject(transaction.error);
			};
		});
	} catch (error) {
		console.error('Error saving file handle:', error);
	}
};

export const getFileHandle = async (key) => {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(key);

		return new Promise((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = () => {
				console.error('Error getting file handle for key', key, ':', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error getting file handle:', error);
		return null;
	}
};

export const deleteFileHandle = async (key) => {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		store.delete(key);
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.error('Error deleting file handle:', error);
	}
};

export const verifyPermission = async (fileHandle, readWrite = false) => {
	const options = {};
	if (readWrite) {
		options.mode = 'readwrite';
	}

	// Check if permission was already granted
	if ((await fileHandle.queryPermission(options)) === 'granted') {
		return true;
	}

	// Don't request permission automatically - return false
	// Permission request requires user activation (click, etc.)
	return false;
};

export const getFileFromHandle = async (fileHandle, requestPermission = false) => {
	if (!fileHandle) return null;

	try {
		// Check if we already have permission
		const hasPermission = (await fileHandle.queryPermission()) === 'granted';

		if (!hasPermission) {
			if (requestPermission) {
				// Only request permission if explicitly asked and in user interaction context
				if ((await fileHandle.requestPermission()) !== 'granted') {
					console.log('Permission denied for file');
					return null;
				}
			} else {
				console.log('No permission for file, skipping');
				return null;
			}
		}

		// Get the file
		const file = await fileHandle.getFile();
		return file;
	} catch (error) {
		console.error('Error getting file from handle:', error);
		return null;
	}
};
