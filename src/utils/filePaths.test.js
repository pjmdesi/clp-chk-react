import { describe, it, expect } from 'vitest';
import { toFetchableFileUrl, fileUrlToPath } from './filePaths';

describe('toFetchableFileUrl', () => {
	it('converts Windows drive paths (backslashes, spaces encoded)', () => {
		expect(toFetchableFileUrl('C:\\videos\\clip 1.mp4')).toBe('file:///C:/videos/clip%201.mp4');
	});

	it('converts Windows drive paths with forward slashes', () => {
		expect(toFetchableFileUrl('D:/media/clip.mp4')).toBe('file:///D:/media/clip.mp4');
	});

	it('converts UNC paths', () => {
		expect(toFetchableFileUrl('\\\\nas\\share\\v.mp4')).toBe('file://nas/share/v.mp4');
	});

	it('converts POSIX absolute paths', () => {
		expect(toFetchableFileUrl('/home/pj/v.mp4')).toBe('file:///home/pj/v.mp4');
	});

	it('passes through existing file:// and app:// URLs unchanged', () => {
		expect(toFetchableFileUrl('file:///C:/x.mp4')).toBe('file:///C:/x.mp4');
		expect(toFetchableFileUrl('app://bundle/index.html')).toBe('app://bundle/index.html');
	});

	it('rejects relative paths, empty, and non-strings', () => {
		expect(toFetchableFileUrl('foo.mp4')).toBeNull();
		expect(toFetchableFileUrl('')).toBeNull();
		expect(toFetchableFileUrl('   ')).toBeNull();
		expect(toFetchableFileUrl(null)).toBeNull();
	});
});

describe('fileUrlToPath', () => {
	it('strips the leading slash before a Windows drive letter and decodes', () => {
		expect(fileUrlToPath('file:///C:/videos/clip%201.mp4')).toBe('C:/videos/clip 1.mp4');
	});

	it('keeps POSIX paths absolute', () => {
		expect(fileUrlToPath('file:///home/pj/v.mp4')).toBe('/home/pj/v.mp4');
	});

	it('returns null for non-file URLs and non-strings', () => {
		expect(fileUrlToPath('http://example.com/x.mp4')).toBeNull();
		expect(fileUrlToPath('C:\\videos\\clip.mp4')).toBeNull();
		expect(fileUrlToPath(null)).toBeNull();
	});

	it('round-trips a Windows path modulo slash direction', () => {
		const url = toFetchableFileUrl('C:\\videos\\clip 1.mp4');
		expect(fileUrlToPath(url)).toBe('C:/videos/clip 1.mp4');
	});
});
