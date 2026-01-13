import React from 'react';
import Icon from '../Icon';
import { saveFileHandle } from '../../utils/fileHandleStore';
import { saveFileMetadata } from '../../utils/fileMetadataStore';

const toFileUrl = filePath => {
	if (typeof filePath !== 'string') return null;
	const raw = filePath.trim();
	if (!raw) return null;
	if (/^file:\/\//i.test(raw)) return raw;
	if (/^[A-Za-z]:[\\/]/.test(raw)) {
		return `file:///${encodeURI(raw.replace(/\\/g, '/'))}`;
	}
	if (/^\\\\[^\\]+\\[^\\]+/.test(raw)) {
		const withoutSlashes = raw.replace(/^\\\\/, '');
		return `file://${encodeURI(withoutSlashes.replace(/\\/g, '/'))}`;
	}
	if (raw.startsWith('/')) return `file://${encodeURI(raw)}`;
	return null;
};

function MediaFileInput({
	setMediaFile,
	setSecondaryMediaFile,
	mediaKey,
	isInElectron,
	isInBrowser,
	onMissingFilePath,
	onHasFilePath,
	onSecondaryMissingFilePath,
	onSecondaryHasFilePath,
	onTooManyFilesSelected,
}) {
	const [isDragging, setIsDragging] = React.useState(false);

	const handleElectronPick = async e => {
		e?.preventDefault?.();
		if (!isInElectron) return;
		const pickMany = window?.api?.pickMediaFiles;
		const pickOne = window?.api?.pickMediaFile;
		if (!pickMany && !pickOne) {
			console.warn('[MediaFileInput] No Electron file picker API is available.');
			return;
		}

		try {
			let filePaths = [];
			if (pickMany) {
				filePaths = await pickMany();
			} else if (pickOne) {
				const single = await pickOne();
				filePaths = single ? [single] : [];
			}
			if (!Array.isArray(filePaths) || filePaths.length === 0) return;

			if (filePaths.length > 2) {
				onTooManyFilesSelected?.(filePaths.length);
			} else {
				onTooManyFilesSelected?.(0);
			}

			const loadPath = (filePath, setFn, onHas, onMissing) => {
				if (typeof filePath !== 'string' || !filePath.trim()) {
					onMissing?.();
					return;
				}
				const fileUrl = toFileUrl(filePath);
				if (!fileUrl) {
					onMissing?.();
					return;
				}

				const fileName = filePath.split(/[/\\]/).pop();
				const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
				const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
				const mediaType = isImage ? 'image' : 'video';

				saveFileMetadata(fileUrl, {
					fileName,
					filePath,
					mediaType,
					fileSize: null,
				});

				onHas?.();
				setFn?.(fileUrl);
			};

			loadPath(filePaths[0], setMediaFile, onHasFilePath, onMissingFilePath);
			if (filePaths[1] && setSecondaryMediaFile) {
				loadPath(filePaths[1], setSecondaryMediaFile, onSecondaryHasFilePath, onSecondaryMissingFilePath);
			}
		} catch (error) {
			console.error('[MediaFileInput] Error picking media file:', error);
		}
	};

	const handleClick = async (e) => {
		// Prevent default label behavior
		e.preventDefault();

		// In Electron, use a native dialog so we always get an absolute path.
		if (isInElectron) {
			return handleElectronPick(e);
		}

		// In browser with File System Access API, use native picker
		// Only use showOpenFilePicker in actual browsers, not in Electron
		if (isInBrowser && window.showOpenFilePicker) {
			try {
				const [fileHandle] = await window.showOpenFilePicker({
					types: [
						{
							description: 'Media Files',
							accept: {
								'video/*': ['.mp4', '.avi', '.mov', '.mpeg', '.mkv', '.webm'],
								'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
							}
						}
					],
					multiple: false
				});

				// Save the file handle for later use
				if (mediaKey) {
					await saveFileHandle(mediaKey, fileHandle);
				}

				// Get the file and create blob URL
				const file = await fileHandle.getFile();
				const blobUrl = URL.createObjectURL(file);

				// Determine media type
				const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

				// Store file metadata for later retrieval
				saveFileMetadata(blobUrl, {
					fileName: file.name,
					filePath: null, // Browser mode doesn't have full path
					mediaType: mediaType,
					fileSize: typeof file.size === 'number' ? file.size : null,
				});

				setMediaFile(blobUrl);
			} catch (error) {
				if (error.name !== 'AbortError') {
					console.error('Error accessing file:', error);
				}
			}
		}
	};

	const setMediaFileFromInput = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		// Electron: read file and convert to blob URL
		if (isInElectron && file.path) {
			try {
				const fileUrl = toFileUrl(file.path);
				if (!fileUrl) throw new Error('Failed to convert file.path to file:// URL');

				const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
				saveFileMetadata(fileUrl, {
					fileName: file.name,
					filePath: file.path,
					mediaType,
					fileSize: typeof file.size === 'number' ? file.size : null,
				});

				onHasFilePath?.();
				setMediaFile(fileUrl);
			} catch (error) {
				console.error('[MediaFileInput] Error creating blob from file:', error);
			}
		} else {
			if (isInElectron) {
				onMissingFilePath?.();
			}
			// Fallback for browsers without File System Access API (or Electron if File.path is not present)
			const blobUrl = URL.createObjectURL(file);

			// Determine media type
			const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

			// Store file metadata for later retrieval
			saveFileMetadata(blobUrl, {
				fileName: file.name,
				filePath: null,
				mediaType: mediaType,
				fileSize: typeof file.size === 'number' ? file.size : null,
			});

			setMediaFile(blobUrl);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDragEnter = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		// Only set to false if leaving the label element itself
		if (e.target.classList.contains('file-input')) {
			setIsDragging(false);
		}
	};

	const handleDrop = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];

			// Check if it's a valid media file
			if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
				console.warn('Invalid file type. Please drop a video or image file.');
				return;
			}

			// Electron: prefer using a file:// URL so we can persist/restore the real filesystem path.
			if (isInElectron && file.path) {
				try {
					const fileUrl = toFileUrl(file.path);
					if (!fileUrl) throw new Error('Failed to convert dropped file.path to file:// URL');
					const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
					saveFileMetadata(fileUrl, {
						fileName: file.name,
						filePath: file.path,
						mediaType: mediaType,
						fileSize: typeof file.size === 'number' ? file.size : null,
					});
					onHasFilePath?.();
					setMediaFile(fileUrl);
				} catch (error) {
					console.error('[MediaFileInput] Error creating blob from dropped file:', error);
				}
			} else {
				if (isInElectron) {
					onMissingFilePath?.();
				}
				// Browser mode (or Electron where dropped File.path is unavailable): cannot persist a real path.
				const blobUrl = URL.createObjectURL(file);
				const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

				saveFileMetadata(blobUrl, {
					fileName: file.name,
					filePath: null,
					mediaType: mediaType,
					fileSize: typeof file.size === 'number' ? file.size : null,
				});

				setMediaFile(blobUrl);
			}
		}
	};

	return (
		<>
			<label
				className={`file-input${isDragging ? ' dragging' : ''}`}
				onDragOver={handleDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<Icon name="FilePlay" className="input-icon" size={36} />
				<Icon name="FileImage" className="input-icon" size={36} />
				<span>Choose a media file</span>

				{/* Traditional file input - always present for label association and Electron */}
				<input
					type="file"
					accept="video/*, image/*"
					onChange={setMediaFileFromInput}
					style={
						(isInBrowser && window.showOpenFilePicker) || (isInElectron && (window?.api?.pickMediaFiles || window?.api?.pickMediaFile))
							? { display: 'none' }
							: undefined
					}
				/>

				{/* Clickable overlay for browsers with File System Access API */}
				{isInBrowser && window.showOpenFilePicker && (
					<div
						className="file-input-overlay"
						onClick={handleClick}
						style={{
							position: 'absolute',
							inset: 0,
							cursor: 'pointer',
							zIndex: 1
						}}
					/>
				)}

				{/* Clickable overlay for Electron native picker */}
				{isInElectron && (window?.api?.pickMediaFiles || window?.api?.pickMediaFile) && (
					<div
						className="file-input-overlay"
						onClick={handleElectronPick}
						style={{
							position: 'absolute',
							inset: 0,
							cursor: 'pointer',
							zIndex: 1,
						}}
					/>
				)}
			</label>
		</>
	);
}

export default MediaFileInput;
