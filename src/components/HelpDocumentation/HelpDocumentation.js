import React from 'react';

function HelpDocumentation() {
	const docsUrl = 'https://github.com/pjmdesi/clp-chk-react#readme';
	const issuesUrl = 'https://github.com/pjmdesi/clp-chk-react/issues';
	const npmUrl = name => `https://www.npmjs.com/package/${encodeURIComponent(name)}`;

	const openExternal = (e, url) => {
		// In Electron, route through the main process so links open externally.
		if (window?.api?.openExternal) {
			e?.preventDefault?.();
			window.api.openExternal(url);
		}
	};

	const ExternalLink = ({ href, children }) => (
		<a href={href} onClick={e => openExternal(e, href)} target="_blank" rel="noreferrer">
			{children}
		</a>
	);

	return (
		<div id='helpDocumentation'>
			<h2>Help / Documentation</h2>
			<p>
				For help and documentation, see the project README on GitHub:{' '}
				<ExternalLink href={docsUrl}>ClpChk README</ExternalLink>
				.
			</p>
            <br />
			<p>
				If you run into issues or want to request features, please open an issue on GitHub:{' '}
				<ExternalLink href={issuesUrl}>Issue tracker</ExternalLink>.
			</p>
            <br />
			<h3>Credits &amp; Attributions</h3>
			<p>
				ClpChk is built on top of open-source software. Thanks to all the maintainers and contributors.
				 (For full license texts, see each package’s LICENSE in node_modules or the lockfile.)
			</p>
			<ul>
				<li>
					<ExternalLink href={npmUrl('electron')}>Electron</ExternalLink>
					&nbsp;— desktop runtime
				</li>
				<li>
					<ExternalLink href={npmUrl('react')}>React</ExternalLink>
					 and <ExternalLink href={npmUrl('react-dom')}>react-dom</ExternalLink>
					&nbsp;— UI framework
				</li>
				<li>
					<ExternalLink href={npmUrl('video.js')}>video.js</ExternalLink>
					&nbsp;— video playback
				</li>
				<li>
					<ExternalLink href={npmUrl('rc-slider')}>rc-slider</ExternalLink>
					&nbsp;— sliders
				</li>
				<li>
					<ExternalLink href={npmUrl('lucide-react')}>lucide-react</ExternalLink>
					&nbsp;— icons
				</li>
				<li>
					<ExternalLink href={npmUrl('react-resize-detector')}>react-resize-detector</ExternalLink>
					&nbsp;— resize handling
				</li>
				<li>
					<ExternalLink href={npmUrl('electron-store')}>electron-store</ExternalLink>
					&nbsp;— persisted settings/window state
				</li>
				<li>
					<ExternalLink href={npmUrl('custom-electron-titlebar')}>custom-electron-titlebar</ExternalLink>
					&nbsp;— custom window title bar
				</li>
			</ul>
            <br />
			<p>
				Build &amp; packaging tooling includes Electron Forge, Webpack, Babel, and Sass.
			</p>
		</div>
	);
}

export default HelpDocumentation;
