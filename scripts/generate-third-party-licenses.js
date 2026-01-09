/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeDirName(pkgName) {
	// Replace path separators so scoped packages become a single folder name.
	return String(pkgName).replace(/[\\/]/g, '__');
}

function ensureDir(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath) {
	if (!fs.existsSync(filePath)) return null;
	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return null;
	}
}

function findNoticeFiles(packageDir) {
	// Common license/notice filenames.
	const candidates = [
		'LICENSE',
		'LICENSE.md',
		'LICENSE.txt',
		'license',
		'license.md',
		'license.txt',
		'COPYING',
		'COPYING.md',
		'COPYING.txt',
		'NOTICE',
		'NOTICE.md',
		'NOTICE.txt',
	];

	const found = [];
	for (const name of candidates) {
		const p = path.join(packageDir, name);
		if (fs.existsSync(p) && fs.statSync(p).isFile()) found.push(p);
	}
	return found;
}

function copyFileToDir(srcFile, destDir) {
	ensureDir(destDir);
	const destFile = path.join(destDir, path.basename(srcFile));
	fs.copyFileSync(srcFile, destFile);
	return destFile;
}

function generateThirdPartyLicenses({ rootDir = process.cwd(), outDir = 'third_party_licenses' } = {}) {
	const pkgPath = path.join(rootDir, 'package.json');
	const pkg = readJsonIfExists(pkgPath);
	if (!pkg) throw new Error(`Unable to read package.json at ${pkgPath}`);

	const depNames = new Set([
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.devDependencies || {}),
	]);

	const outPath = path.join(rootDir, outDir);
	if (fs.existsSync(outPath)) {
		fs.rmSync(outPath, { recursive: true, force: true });
	}
	ensureDir(outPath);

	const indexLines = [];
	indexLines.push('# Third-Party License Files');
	indexLines.push('');
	indexLines.push('This folder is generated and contains LICENSE/NOTICE files copied from third-party npm packages used by this repo.');
	indexLines.push('If a package does not ship a license file in its npm tarball, it may not appear here even though it is listed in THIRD_PARTY_NOTICES.md.');
	indexLines.push('');
	indexLines.push(`Generated: ${new Date().toISOString()}`);
	indexLines.push('');

	let packageCount = 0;
	let fileCount = 0;

	for (const name of Array.from(depNames).sort()) {
		const packageDir = path.join(rootDir, 'node_modules', name);
		const packageJson = readJsonIfExists(path.join(packageDir, 'package.json'));
		if (!packageJson) {
			// node_modules might not be installed; keep going.
			indexLines.push(`- ${name}: (missing in node_modules; skipped)`);
			continue;
		}

		const license = packageJson.license || 'UNKNOWN';
		const destPkgDir = path.join(outPath, safeDirName(name));
		const files = findNoticeFiles(packageDir);

		if (files.length === 0) {
			// Create a small metadata file so it’s obvious we tried.
			ensureDir(destPkgDir);
			fs.writeFileSync(
				path.join(destPkgDir, 'LICENSE_INFO.txt'),
				`Package: ${name}\nVersion: ${packageJson.version || 'UNKNOWN'}\nLicense field: ${typeof license === 'string' ? license : JSON.stringify(license)}\nNPM: https://www.npmjs.com/package/${encodeURIComponent(name)}\n`,
				'utf8'
			);
			indexLines.push(`- ${name}: no LICENSE/NOTICE file found (wrote LICENSE_INFO.txt)`);
			packageCount += 1;
			fileCount += 1;
			continue;
		}

		ensureDir(destPkgDir);
		const copiedNames = [];
		for (const f of files) {
			copyFileToDir(f, destPkgDir);
			copiedNames.push(path.basename(f));
			fileCount += 1;
		}

		indexLines.push(`- ${name} (${packageJson.version || 'UNKNOWN'}): ${copiedNames.join(', ')}`);
		packageCount += 1;
	}

	fs.writeFileSync(path.join(outPath, 'README.md'), indexLines.join('\n'), 'utf8');
	return { outPath, packageCount, fileCount };
}

module.exports = {
	generateThirdPartyLicenses,
};

if (require.main === module) {
	const { outPath, packageCount, fileCount } = generateThirdPartyLicenses();
	console.log(`Wrote ${path.relative(process.cwd(), outPath)} for ${packageCount} packages (${fileCount} files)`);
}
