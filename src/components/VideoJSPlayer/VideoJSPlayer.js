import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

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
					onLoadedMetadata({
						target: {
							id: id,
							duration: player.duration(),
							videoWidth: player.videoWidth(),
							videoHeight: player.videoHeight()
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
					}
				};
			}
		}
	}, []);

	// Update src
	React.useEffect(() => {
		const player = playerRef.current;
		if (player && src) {
			player.src({ src, type: 'video/mp4' });
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
