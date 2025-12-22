// Store metadata for blob URLs
const fileMetadataMap = new Map();

export const saveFileMetadata = (blobUrl, metadata) => {
	fileMetadataMap.set(blobUrl, metadata);
};

export const getFileMetadata = (blobUrl) => {
	return fileMetadataMap.get(blobUrl);
};

export const removeFileMetadata = (blobUrl) => {
	fileMetadataMap.delete(blobUrl);
};
