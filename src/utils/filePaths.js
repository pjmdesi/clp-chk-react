// Filesystem path <-> fetchable URL conversions (Electron mode).
// Extracted from MainContainer so the platform-specific cases are unit-testable.

export const toFetchableFileUrl = maybePath => {
	if (typeof maybePath !== 'string') return null;
	const raw = maybePath.trim();
	if (!raw) return null;
	// Already a URL we can fetch.
	if (/^(app|file):\/\//i.test(raw)) return raw;

	// Windows drive path: C:\foo\bar.mp4 -> file:///C:/foo/bar.mp4
	if (/^[A-Za-z]:[\\/]/.test(raw)) {
		const normalized = raw.replace(/\\/g, '/');
		return `file:///${encodeURI(normalized)}`;
	}

	// UNC path: \\server\share\file.mp4 -> file://server/share/file.mp4
	if (/^\\\\[^\\]+\\[^\\]+/.test(raw)) {
		const withoutSlashes = raw.replace(/^\\\\/, '');
		const normalized = withoutSlashes.replace(/\\/g, '/');
		return `file://${encodeURI(normalized)}`;
	}

	// POSIX absolute path: /home/user/file.mp4 -> file:///home/user/file.mp4
	if (raw.startsWith('/')) {
		return `file://${encodeURI(raw)}`;
	}

	return null;
};

export const fileUrlToPath = fileUrl => {
	if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file://')) return null;
	try {
		let p = decodeURIComponent(new URL(fileUrl).pathname);
		// Windows file:// URLs include a leading slash before drive letter.
		if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
		return p;
	} catch {
		return null;
	}
};
