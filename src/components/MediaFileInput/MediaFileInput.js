import React from 'react';
import Icon from '../Icon';
import { saveFileHandle } from '../../utils/fileHandleStore';
import { saveFileMetadata } from '../../utils/fileMetadataStore';

function MediaFileInput({ setMediaFile, mediaKey }) {
	// Check if running in Electron or browser
	// In Electron, window.api is exposed by the preload script
	const isInElectron = typeof window !== 'undefined' && window.api && window.api.openFile;
	const isInBrowser = !isInElectron;

	const [isDragging, setIsDragging] = React.useState(false);

	const handleClick = async (e) => {
		// Prevent default label behavior
		e.preventDefault();

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
		if (file.path) {
			try {
				// In Electron, read the file as an ArrayBuffer and create a blob
				const arrayBuffer = await file.arrayBuffer();
				const blob = new Blob([arrayBuffer], { type: file.type || 'video/mp4' });
				const blobUrl = URL.createObjectURL(blob);

				// Determine media type
				const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

				// Store file metadata for later retrieval
				saveFileMetadata(blobUrl, {
					fileName: file.name,
					filePath: file.path, // Full path in Electron
					mediaType: mediaType,
				});

				setMediaFile(blobUrl);
			} catch (error) {
				console.error('[MediaFileInput] Error creating blob from file:', error);
			}
		} else {
			// Fallback for browsers without File System Access API
			const blobUrl = URL.createObjectURL(file);

			// Determine media type
			const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

			// Store file metadata for later retrieval
			saveFileMetadata(blobUrl, {
				fileName: file.name,
				filePath: null,
				mediaType: mediaType,
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

			// Process the file (reuse the same logic as file input)
			if (isInElectron && file.path) {
				try {
					const arrayBuffer = await file.arrayBuffer();
					const blob = new Blob([arrayBuffer], { type: file.type || 'video/mp4' });
					const blobUrl = URL.createObjectURL(blob);

					const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

					saveFileMetadata(blobUrl, {
						fileName: file.name,
						filePath: file.path,
						mediaType: mediaType,
					});

					setMediaFile(blobUrl);
				} catch (error) {
					console.error('[MediaFileInput] Error creating blob from dropped file:', error);
				}
			} else {
				// Browser mode
				const blobUrl = URL.createObjectURL(file);
				const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

				saveFileMetadata(blobUrl, {
					fileName: file.name,
					filePath: null,
					mediaType: mediaType,
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
				<Icon name="FileVideo" className="input-icon" size={48} />
				<Icon name="FileImage" className="input-icon" size={48} />
				<span>Pick a file or drag&nbsp;it&nbsp;here</span>

				{/* Traditional file input - always present for label association and Electron */}
				<input
					type="file"
					accept="video/*, image/*"
					onChange={setMediaFileFromInput}
					style={isInBrowser && window.showOpenFilePicker ? { display: 'none' } : undefined}
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
			</label>
		</>
	);
}

export default MediaFileInput;
