import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Map common video extensions to MIME types so video.js can pick the right source handler.
//
// We pass these to player.src({src, type}). video.js then asks the HTML5 tech
// `canPlayType(type)` to decide whether it can handle the source. If that returns ""
// the source is refused with MEDIA_ERR_SRC_NOT_SUPPORTED — even when Chromium's
// underlying media stack would happily decode the actual file bytes.
//
// Several containers fall into that trap: matroska, avi, and mpeg-program-stream
// all have MIME types that Chromium's canPlayType returns "" for, even though
// common codecs inside them (H.264, H.265, AAC) decode fine in practice. For those
// we map to a *permissive* type Chromium claims to support; the HTML5 tech then
// loads the file and Chromium sniffs and decodes the real container at the OS layer.
const VIDEO_MIME_BY_EXT = {
	mp4: 'video/mp4',
	m4v: 'video/mp4',
	mov: 'video/quicktime',
	webm: 'video/webm',
	// mkv is matroska; webm is a strict subset of matroska. Chromium accepts
	// video/webm via canPlayType, and the media stack handles the actual file regardless.
	mkv: 'video/webm',
	ogv: 'video/ogg',
	ogg: 'video/ogg',
	// mpeg-PS and avi: no canPlayType support in Chromium; fall back to mp4 so the
	// source is loaded. Whether the file actually plays then depends purely on
	// whether Chromium can decode the codecs inside.
	mpeg: 'video/mp4',
	mpg: 'video/mp4',
	avi: 'video/mp4',
};

const guessVideoMimeType = url => {
	if (typeof url !== 'string' || !url) return 'video/mp4';
	const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
	const ext = match ? match[1].toLowerCase() : '';
	return VIDEO_MIME_BY_EXT[ext] || 'video/mp4';
};

function VideoJSPlayer({ src, id, onTimeUpdate, onLoadedMetadata, onEnded, loop, muted, playbackRate, volume, style, videoStyle, videoRef }) {
	const containerRef = React.useRef(null);
	const wrapperRef = React.useRef(null);
	const playerRef = React.useRef(null);
	const videoElementRef = React.useRef(null);

	React.useEffect(() => {
		// Make sure Video.js player is only initialized once
		if (!playerRef.current && wrapperRef.current) {
			const videoElement = document.createElement('video-js');
			videoElement.classList.add('vjs-big-play-centered');
			wrapperRef.current.appendChild(videoElement);
			videoElementRef.current = videoElement;

			const player = videojs(videoElement, {
				controls: false,
				preload: 'auto',
				fluid: false,
				responsive: false,
				fill: false,
				html5: {
					vhs: {
						overrideNative: true
					},
					nativeVideoTracks: false,
					nativeAudioTracks: false,
					nativeTextTracks: false
				}
			});

			playerRef.current = player;

			// Set up event listeners
			player.on('timeupdate', () => {
				if (onTimeUpdate) {
					onTimeUpdate({ target: { currentTime: player.currentTime() } });
				}
			});

			player.on('loadedmetadata', () => {
				if (onLoadedMetadata) {
					const mediaEl = player.el()?.querySelector('video') || null;
					onLoadedMetadata({
						target: {
							id: id,
							duration: player.duration(),
							videoWidth: player.videoWidth(),
							videoHeight: player.videoHeight(),
							// Expose the real <video> element so consumers can use
							// requestVideoFrameCallback for accurate frame timing.
							mediaElement: mediaEl,
						}
					});
				}
			});

			player.on('ended', () => {
				if (onEnded) {
					onEnded();
				}
			});

			// Expose player methods via ref
			if (videoRef) {
				videoRef.current = {
					on: (eventName, handler) => player.on(eventName, handler),
					off: (eventName, handler) => player.off(eventName, handler),
					paused: () => player.paused(),
					seeking: () => player.seeking(),
					readyState: () => player.readyState(),
					bufferedEnd: () => (typeof player.bufferedEnd === 'function' ? player.bufferedEnd() : 0),
					getPlayer: () => player,
					play: () => player.play(),
					pause: () => player.pause(),
					get currentTime() {
						return player.currentTime();
					},
					set currentTime(time) {
						player.currentTime(time);
					},
					get duration() {
						return player.duration();
					},
					get playbackRate() {
						return player.playbackRate();
					},
					set playbackRate(rate) {
						player.playbackRate(rate);
					},
					get volume() {
						return player.volume();
					},
					set volume(vol) {
						player.volume(vol);
					},
					get muted() {
						return player.muted();
					},
					set muted(val) {
						player.muted(val);
					},
					get videoWidth() {
						return player.videoWidth();
					},
					get videoHeight() {
						return player.videoHeight();
					},
					get offsetWidth() {
						return wrapperRef.current ? wrapperRef.current.offsetWidth : 0;
					},
					get offsetHeight() {
						return wrapperRef.current ? wrapperRef.current.offsetHeight : 0;
					},
					// Returns the underlying <video> element so callers can use
					// requestVideoFrameCallback or other native DOM APIs. The element
					// is queried lazily because video.js may swap it on src changes.
					getMediaElement: () => {
						const p = playerRef.current;
						if (!p || (typeof p.isDisposed === 'function' && p.isDisposed())) return null;
						return p.el()?.querySelector('video') || null;
					},
				};
			}
		}
	}, []);

	// Update src
	React.useEffect(() => {
		const player = playerRef.current;
		if (player && src) {
			player.src({ src, type: guessVideoMimeType(src) });
		}
	}, [src]);

	// Update loop
	React.useEffect(() => {
		const player = playerRef.current;
		if (player) {
			player.loop(loop);
		}
	}, [loop]);

	// Update muted
	React.useEffect(() => {
		const player = playerRef.current;
		if (player) {
			player.muted(muted);
		}
	}, [muted]);

	// Update playback rate
	React.useEffect(() => {
		const player = playerRef.current;
		if (player && playbackRate) {
			player.playbackRate(playbackRate);
		}
	}, [playbackRate]);

	// Update volume
	React.useEffect(() => {
		const player = playerRef.current;
		if (player && typeof volume !== 'undefined') {
			player.volume(volume);
		}
	}, [volume]);

	// Update styles on the wrapper for positioning.
	// Layout effect applies before paint, preventing visible jitter during rapid updates.
	React.useLayoutEffect(() => {
		if (wrapperRef.current && style) {
			const wrapper = wrapperRef.current;
			Object.keys(style).forEach(key => {
				const value = typeof style[key] === 'number' ? `${style[key]}px` : style[key];
				// Use setProperty with 'important' to ensure our dimensions override any defaults
				wrapper.style.setProperty(key, value, 'important');
			});
		}
	}, [style]);

	// Update styles on the video element for transform/positioning.
	// Layout effect applies before paint, preventing visible jitter during rapid updates.
	React.useLayoutEffect(() => {
		if (playerRef.current && videoStyle) {
			const videoElement = playerRef.current.el().querySelector('video');
			if (videoElement) {
				Object.keys(videoStyle).forEach(key => {
					const value = typeof videoStyle[key] === 'number' ? `${videoStyle[key]}px` : videoStyle[key];
					// Use setProperty with 'important' to override CSS !important rules
					videoElement.style.setProperty(key, value, 'important');
				});
			}
		}
	}, [videoStyle]);

	// Dispose the player on unmount
	React.useEffect(() => {
		const player = playerRef.current;

		return () => {
			if (player && !player.isDisposed()) {
				player.dispose();
				playerRef.current = null;
			}
		};
	}, []);

	return (
		<div className="videojs-wrapper" ref={wrapperRef}>
		</div>
	);
}

export default VideoJSPlayer;
