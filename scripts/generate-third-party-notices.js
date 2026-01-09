/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function coerceLicense(license) {
	if (!license) return 'UNKNOWN';
	if (typeof license === 'string') return license;
	if (isPlainObject(license) && typeof license.type === 'string') return license.type;
	return 'UNKNOWN';
}

function escapePipe(value) {
	return String(value ?? '').replace(/\|/g, '\\|');
}

function npmUrl(name) {
	return `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
}

function getLockPackages(lockJson) {
	if (!isPlainObject(lockJson)) return {};
	if (!isPlainObject(lockJson.packages)) return {};
	return lockJson.packages;
}

function getLockEntryForName(lockPackages, name) {
	return lockPackages[`node_modules/${name}`] || null;
}

function tableForDirect(lockPackages, names) {
	const rows = [];
	for (const name of names) {
		const entry = getLockEntryForName(lockPackages, name);
		const version = entry && entry.version ? entry.version : 'UNKNOWN';
		const license = coerceLicense(entry && entry.license);
		rows.push(`| [${escapePipe(name)}](${npmUrl(name)}) | ${escapePipe(version)} | ${escapePipe(license)} |`);
	}
	return ['| Package | Installed version | License (from lockfile) |', '|---|---:|---|', ...rows].join('\n');
}

function buildFullDependencyList(lockPackages) {
	const allPkgs = [];
	for (const [key, entry] of Object.entries(lockPackages)) {
		if (key === '') continue; // root
		if (!isPlainObject(entry)) continue;

		let name = entry.name;
		if (!name) {
			const idx = key.lastIndexOf('node_modules/');
			name = idx >= 0 ? key.slice(idx + 'node_modules/'.length) : key;
		}

		const version = entry.version || 'UNKNOWN';
		const license = coerceLicense(entry.license);
		allPkgs.push({ name, version, license });
	}

	// De-dupe by name@version
	const seen = new Set();
	const uniqueAll = [];
	for (const p of allPkgs) {
		const id = `${p.name}@${p.version}`;
		if (seen.has(id)) continue;
		seen.add(id);
		uniqueAll.push(p);
	}

	uniqueAll.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
	return uniqueAll;
}

function generateThirdPartyNotices({ rootDir = process.cwd(), outFile = 'THIRD_PARTY_NOTICES.md' } = {}) {
	const pkgPath = path.join(rootDir, 'package.json');
	const lockPath = path.join(rootDir, 'package-lock.json');

	if (!fs.existsSync(pkgPath)) {
		throw new Error(`Missing package.json at ${pkgPath}`);
	}
	if (!fs.existsSync(lockPath)) {
		throw new Error(`Missing package-lock.json at ${lockPath}`);
	}

	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
	const lockPackages = getLockPackages(lock);

	const deps = Object.keys(pkg.dependencies || {}).sort();
	const devDeps = Object.keys(pkg.devDependencies || {}).sort();

	const uniqueAll = buildFullDependencyList(lockPackages);
	const generatedAt = new Date().toISOString();

	const lines = [];
	lines.push('# Third-Party Notices');
	lines.push('');
	lines.push(`Generated: ${generatedAt}`);
	lines.push('');
	lines.push('This file lists third-party npm packages used by ClpChk, with license identifiers as recorded in `package-lock.json`.');
	lines.push('License information in lockfiles can be missing or incomplete; for authoritative terms, consult each project\'s repository and the LICENSE file shipped with the package.');
	lines.push('');
	lines.push('## Direct runtime dependencies');
	lines.push('');
	lines.push(tableForDirect(lockPackages, deps));
	lines.push('');
	lines.push('## Direct development dependencies');
	lines.push('');
	lines.push(tableForDirect(lockPackages, devDeps));
	lines.push('');
	lines.push('## Full dependency list (direct + transitive)');
	lines.push('');
	lines.push(`Total unique packages: ${uniqueAll.length}`);
	lines.push('');
	lines.push('| Package | Version | License (from lockfile) |');
	lines.push('|---|---:|---|');
	for (const p of uniqueAll) {
		lines.push(`| [${escapePipe(p.name)}](${npmUrl(p.name)}) | ${escapePipe(p.version)} | ${escapePipe(p.license)} |`);
	}
	lines.push('');

	const outPath = path.join(rootDir, outFile);
	fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
	return { outPath, packageCount: uniqueAll.length };
}

module.exports = {
	generateThirdPartyNotices,
};

if (require.main === module) {
	const { outPath, packageCount } = generateThirdPartyNotices();
	console.log(`Wrote ${path.relative(process.cwd(), outPath)} with ${packageCount} packages`);
}
