import React from 'react';
import 'video.js/dist/video-js.css';

import MediaFileInput from '../MediaFileInput';
import VideoJSPlayer from '../VideoJSPlayer';

import { getZoomBounds } from '../../settings/userSettingsSchema';
import ImagePlayer from '../ImagePlayer';
import PlayerSlider from '../PlayerSlider';
import { getFileMetadata } from '../../utils/fileMetadataStore';
import { getSlaveTarget } from '../../utils/videoSync';
import MediaInfoBar from '../MediaInfoBar';
import ClipperLock from '../ClipperLock';
import ValidationMessage from '../ValidationMessage';

function InfoOverlay({ info }) {
	return <div id="infoOverlayElem" dangerouslySetInnerHTML={{ __html: info }}></div>;
}

function MediaContainer({
	toolSettings,
	appSettings,
	setToolSettings,
	playbackStatus,
	leftMedia,
	rightMedia,
	setLeftMedia,
	setRightMedia,
	PlayerControls,
	mainContainerSize,
	unifiedMediaDimensions,
	setUnifiedMediaDimensions,
	leftMediaMetaData,
	setLeftMediaMetaData,
	rightMediaMetaData,
	setRightMediaMetaData,
	isInElectron,
	isInBrowser,
	setCurrentModal,
	shorterVideoOffset = 0,
}) {
	const mediaContainerElem = React.useRef(),
		leftMediaElem = React.useRef(),
		rightMediaElem = React.useRef(),
		videoClipper = React.useRef();

	// Keep current playback status available to async callbacks (rAF sync loop, listeners).
	const playbackStatusRef = React.useRef(playbackStatus);
	playbackStatusRef.current = playbackStatus;

	// Keep current tool settings available to async callbacks (intervals/listeners).
	const toolSettingsRef = React.useRef(toolSettings);
	toolSettingsRef.current = toolSettings;

	// Keep current metadata available to play/seek effects + sync loop without making
	// those effects re-run every time framerate / dimensions / etc. update — re-firing
	// the playing branch mid-playback re-seeks both videos and causes visible stutter.
	const leftMetaRef = React.useRef(null);
	leftMetaRef.current = leftMediaMetaData;
	const rightMetaRef = React.useRef(null);
	rightMetaRef.current = rightMediaMetaData;

	// Shorter video offset, kept in a ref so the sync loop reads fresh values without
	// re-running the whole effect when the user is dragging the offset band.
	const shorterVideoOffsetRef = React.useRef(0);
	shorterVideoOffsetRef.current = shorterVideoOffset;

	// Keep the latest clipMedia function for autoscan interval callbacks.
	const clipMediaRef = React.useRef(null);
	// Keep the latest wheel handler to avoid stale closures (listener is registered once).
	const handleScrollRef = React.useRef(null);

	// Keep clipper position in a ref for immediate reads during high-frequency events.
	const clipperPositionRef = React.useRef({ x: null, y: null });

	// Keep clipper + media wrapper styles in a single state object.
	// We update them together (in rAF) so they commit to the DOM in lock-step.
	const [clipLayout, setClipLayout] = React.useState({
		clipperPosition: { x: null, y: null },
		clipperStyle: {},
		clipperMaskStyle: {},
		clippedMediaWrapperStyle: { minWidth: '200%', zIndex: 3 },
		unClippedMediaWrapperStyle: { minWidth: '100%' },
	});
	const clipLayoutRef = React.useRef(clipLayout);
	clipLayoutRef.current = clipLayout;

	const pendingClipLayoutRef = React.useRef(null);
	const clipLayoutRafRef = React.useRef(null);

	React.useEffect(() => {
		return () => {
			if (clipLayoutRafRef.current) {
				cancelAnimationFrame(clipLayoutRafRef.current);
				clipLayoutRafRef.current = null;
			}
		};
	}, []);

	const scheduleClipLayoutCommit = nextLayout => {
		pendingClipLayoutRef.current = nextLayout;
		if (clipLayoutRafRef.current) return;
		clipLayoutRafRef.current = requestAnimationFrame(() => {
			clipLayoutRafRef.current = null;
			if (pendingClipLayoutRef.current) {
				setClipLayout(pendingClipLayoutRef.current);
			}
		});
	};

	const { clipperStyle, clipperMaskStyle, clippedMediaWrapperStyle, unClippedMediaWrapperStyle } = clipLayout;

	const [mediaOffset, setMediaOffset] = React.useState({ x: null, y: null }),
		[containerOverlayInfo, setContainerOverlayInfo] = React.useState(''),
		[toolModeBeforeMediaRemoval, setToolModeBeforeMediaRemoval] = React.useState('divider'),
		[userInputDevice, setUserInputDevice] = React.useState('mouse'),
		[firstRun, setFirstRun] = React.useState(true),
		continuousClipInterval = React.useRef(null),
		displayOverlayInfoTimeout = React.useRef(null),
		leftFramerateData = React.useRef({ samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null }),
		rightFramerateData = React.useRef({ samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null }),
		previousZoomScale = React.useRef(toolSettings.zoomScale),
		[validationWarnings, setValidationWarnings] = React.useState([]);

	const upsertValidationWarning = React.useCallback(warning => {
		if (!warning || typeof warning !== 'object') return;
		if (!warning.type || !warning.message) return;
		setValidationWarnings(prev => {
			const filtered = prev.filter(w => w?.type !== warning.type);
			return [...filtered, warning];
		});
	}, []);

	const removeValidationWarning = React.useCallback(type => {
		if (!type) return;
		setValidationWarnings(prev => prev.filter(w => w?.type !== type));
	}, []);

	// Determine if media are images or videos
	const leftMediaType = leftMediaMetaData?.mediaType || (leftMedia ? getFileMetadata(leftMedia)?.mediaType : null);
	const rightMediaType = rightMediaMetaData?.mediaType || (rightMedia ? getFileMetadata(rightMedia)?.mediaType : null);

	// Choose which video is the "master" clock: whichever is longer.
	// If durations are missing/equal, default to right to preserve legacy behavior.
	const masterSide = React.useMemo(() => {
		if (!(leftMediaType === 'video' && rightMediaType === 'video')) return 'right';
		const ld = leftMediaMetaData?.duration;
		const rd = rightMediaMetaData?.duration;
		if (typeof ld !== 'number' || !Number.isFinite(ld)) return 'right';
		if (typeof rd !== 'number' || !Number.isFinite(rd)) return 'right';
		if (ld === rd) return 'right';
		return ld > rd ? 'left' : 'right';
	}, [leftMediaType, rightMediaType, leftMediaMetaData?.duration, rightMediaMetaData?.duration]);
	const masterSideRef = React.useRef(masterSide);
	masterSideRef.current = masterSide;
	const durationsDiffer = React.useMemo(() => {
		if (!(leftMediaType === 'video' && rightMediaType === 'video')) return false;
		const ld = leftMediaMetaData?.duration;
		const rd = rightMediaMetaData?.duration;
		if (typeof ld !== 'number' || !Number.isFinite(ld)) return false;
		if (typeof rd !== 'number' || !Number.isFinite(rd)) return false;
		return Math.abs(ld - rd) > 0.01;
	}, [leftMediaType, rightMediaType, leftMediaMetaData?.duration, rightMediaMetaData?.duration]);
	const leftShouldLoop = toolSettings.playerLoop && (!durationsDiffer || masterSide === 'left');
	const rightShouldLoop = toolSettings.playerLoop && (!durationsDiffer || masterSide === 'right');

	// Video sync state (buffering + sync loop)
	const leftIsWaitingRef = React.useRef(false);
	const rightIsWaitingRef = React.useRef(false);
	const pausedByBufferingRef = React.useRef(false);
	const resumeAfterBufferingRef = React.useRef(false);
	const bufferingDebounceTimeoutRef = React.useRef(null);
	const prevMasterTimeRef = React.useRef({ left: null, right: null });
	const prevPlaybackStateRef = React.useRef('paused');
	const slaveFrozenRef = React.useRef(false);

	const safePlay = React.useCallback(elem => {
		try {
			const result = elem?.play?.();
			if (result && typeof result.then === 'function') {
				result.catch(err => {
					// Expected when a pause interrupts play (common during rapid state changes).
					if (err?.name !== 'AbortError') {
						 
						console.warn('Video play() failed:', err);
					}
				});
			}
		} catch {}
	}, []);

	const safePause = React.useCallback(elem => {
		try {
			elem?.pause?.();
		} catch {}
	}, []);

	const getFreezeTime = React.useCallback((duration, framerate = 30) => {
		if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return 0;
		const fr = typeof framerate === 'number' && Number.isFinite(framerate) && framerate > 0 ? framerate : 30;
		// Avoid seeking exactly to duration (some players wrap to 0 / show first frame).
		return Math.max(0, Math.min(duration - 0.001, duration - 1 / fr));
	}, []);

	const freezeVideoAtEnd = React.useCallback(
		(elem, duration, framerate) => {
			if (!elem) return;
			const t = getFreezeTime(duration, framerate);
			slaveFrozenRef.current = true;
			try {
				const player = elem.getPlayer?.();
				// Prefer waiting for the seek to complete before pausing.
				if (player && typeof player.one === 'function') {
					player.one('seeked', () => {
						safePause(elem);
					});
					elem.currentTime = t;
					return;
				}
			} catch {}
			try {
				elem.currentTime = t;
			} catch {}
			safePause(elem);
		},
		[getFreezeTime, safePause]
	);

	// Track buffering state. We pause/resume the actual players but do NOT toggle app playback state
	// (avoids controller play/pause flicker).
	React.useEffect(() => {
		if (!(leftMedia && rightMedia && leftMediaType === 'video' && rightMediaType === 'video')) {
			leftIsWaitingRef.current = false;
			rightIsWaitingRef.current = false;
			pausedByBufferingRef.current = false;
			resumeAfterBufferingRef.current = false;
			if (bufferingDebounceTimeoutRef.current) {
				clearTimeout(bufferingDebounceTimeoutRef.current);
				bufferingDebounceTimeoutRef.current = null;
			}
			return;
		}

		const left = leftMediaElem.current;
		const right = rightMediaElem.current;
		if (!left?.on || !left?.off || !right?.on || !right?.off) return;

		const isEffectivelyEnded = (elem, meta) => {
			try {
				const dur = meta?.duration ?? elem?.duration;
				if (typeof dur !== 'number' || !Number.isFinite(dur) || dur <= 0) return false;
				const t = elem?.currentTime;
				if (typeof t !== 'number' || !Number.isFinite(t)) return false;
				return t >= dur - 0.05;
			} catch {
				return false;
			}
		};

		const schedulePauseIfBuffering = () => {
			if (bufferingDebounceTimeoutRef.current) return;
			bufferingDebounceTimeoutRef.current = setTimeout(() => {
				bufferingDebounceTimeoutRef.current = null;
				const status = playbackStatusRef.current;
				if (!status || status.isScrubbing || status.playbackState !== 'playing') return;

				// Only pause playback when the current master is buffering.
				// If only the slave buffers (or is ended), keep master playing.
				const masterIsLeft = masterSideRef.current === 'left';
				const masterBuffering = masterIsLeft ? leftIsWaitingRef.current : rightIsWaitingRef.current;
				if (masterBuffering && !pausedByBufferingRef.current) {
					pausedByBufferingRef.current = true;
					resumeAfterBufferingRef.current = true;
					safePause(leftMediaElem.current);
					safePause(rightMediaElem.current);
				}
			}, 150);
		};

		const maybeResumeAfterBuffering = () => {
			const status = playbackStatusRef.current;
			const isBuffering = leftIsWaitingRef.current || rightIsWaitingRef.current;
			if (isBuffering) return;
			if (!pausedByBufferingRef.current || !resumeAfterBufferingRef.current) return;
			if (!status || status.isScrubbing || status.playbackState !== 'playing') return;
			// Only auto-resume if we were the ones who paused.
			pausedByBufferingRef.current = false;
			resumeAfterBufferingRef.current = false;
			const masterElem = masterSideRef.current === 'left' ? leftMediaElem.current : rightMediaElem.current;
			const slaveElem = masterSideRef.current === 'left' ? rightMediaElem.current : leftMediaElem.current;
			safePlay(masterElem);
			safePlay(slaveElem);
		};

		const onLeftWaiting = () => {
			// If this video is at its end (shorter duration case), don't treat it as buffering.
			if (isEffectivelyEnded(leftMediaElem.current, leftMediaMetaData)) return;
			leftIsWaitingRef.current = true;
			schedulePauseIfBuffering();
		};
		const onRightWaiting = () => {
			if (isEffectivelyEnded(rightMediaElem.current, rightMediaMetaData)) return;
			rightIsWaitingRef.current = true;
			schedulePauseIfBuffering();
		};
		const onLeftResume = () => {
			leftIsWaitingRef.current = false;
			maybeResumeAfterBuffering();
		};
		const onRightResume = () => {
			rightIsWaitingRef.current = false;
			maybeResumeAfterBuffering();
		};

		// Video.js emits waiting/stalled when playback is blocked by buffering.
		left.on('waiting', onLeftWaiting);
		left.on('stalled', onLeftWaiting);
		left.on('playing', onLeftResume);
		left.on('canplay', onLeftResume);

		right.on('waiting', onRightWaiting);
		right.on('stalled', onRightWaiting);
		right.on('playing', onRightResume);
		right.on('canplay', onRightResume);

		return () => {
			left.off('waiting', onLeftWaiting);
			left.off('stalled', onLeftWaiting);
			left.off('playing', onLeftResume);
			left.off('canplay', onLeftResume);

			right.off('waiting', onRightWaiting);
			right.off('stalled', onRightWaiting);
			right.off('playing', onRightResume);
			right.off('canplay', onRightResume);

			if (bufferingDebounceTimeoutRef.current) {
				clearTimeout(bufferingDebounceTimeoutRef.current);
				bufferingDebounceTimeoutRef.current = null;
			}
		};
	}, [leftMedia, rightMedia, leftMediaType, rightMediaType]);

	// Frame-locked drift correction.
	//
	// The previous implementation polled at 250ms. At 30fps that's only 4 corrections
	// per second, which lets a few frames of drift accumulate before the loop notices.
	// Instead we drive correction off requestVideoFrameCallback on the master's real
	// <video> element, so we re-check sync exactly when a master frame is presented
	// (typically 30–60 Hz). We read master mediaTime directly from the rVFC metadata,
	// which is the precise time of the frame being painted — not the wall-clock-ish
	// currentTime that timeupdate gives.
	React.useEffect(() => {
		const shouldRun =
			leftMedia &&
			rightMedia &&
			leftMediaType === 'video' &&
			rightMediaType === 'video' &&
			playbackStatus.playbackState === 'playing' &&
			!playbackStatus.isScrubbing;

		if (!shouldRun) return;

		const masterIsLeft = masterSideRef.current === 'left';
		const masterApi = masterIsLeft ? leftMediaElem.current : rightMediaElem.current;
		const slaveApi = masterIsLeft ? rightMediaElem.current : leftMediaElem.current;
		if (!masterApi || !slaveApi) return;

		const masterVideoEl = typeof masterApi.getMediaElement === 'function' ? masterApi.getMediaElement() : null;
		const hasRVFC = !!(masterVideoEl && typeof masterVideoEl.requestVideoFrameCallback === 'function');

		// Sync strategy: ALWAYS SLOW THE LEADER, never push the laggard.
		//
		// The classic master/slave-with-rate-boost approach breaks down when a
		// decoder can't quite manage 1× (which is exactly when sync matters most):
		// pushing the slave to 1.10× makes its already-overloaded decoder drop more
		// frames, and it stays behind regardless. Holding the leader back to the
		// laggard's pace converges to frame-locked sync at the cost of dipping a few
		// percent under real-time during the worst stretches — a much better trade
		// for a side-by-side comparison tool.
		//
		// Tier thresholds (seconds):
		//   - SUB_FRAME_EPS: ~half a 60fps frame. Below this is visually
		//     imperceptible and within rVFC jitter; restore both rates to base.
		//   - HARD_SEEK_THRESHOLD: drift so large that slowing the leader would take
		//     too long; snap the leader BACKWARD to the laggard (never skip frames
		//     forward — that defeats the whole point of frame-perfect compare).
		//   - In between: proportional slow-down on whichever side is ahead.
		const SUB_FRAME_EPS = 0.008;
		const HARD_SEEK_THRESHOLD = 0.30;
		const KP = 0.8;
		const MAX_SLOWDOWN_FRAC = 0.20; // Up to 20% slowdown on the leader (≥ 0.80×).
		// Skip rate corrections for the first N master frames. During decoder warmup
		// per-frame timing is noisy and a correction can compound the noise. Hard-snaps
		// still happen if drift is enormous.
		const STARTUP_GRACE_FRAMES = 30;
		// After applying a correction, wait this many frames before checking again.
		// Lets the rate change or seek take effect before stacking another correction.
		const RATE_COOLDOWN_FRAMES = 4;
		const SNAP_COOLDOWN_FRAMES = 10;
		const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

		const setRateIfNeeded = (api, rate) => {
			try {
				const cur = api.playbackRate;
				if (typeof cur === 'number' && Math.abs(cur - rate) <= 0.001) return;
				api.playbackRate = rate;
			} catch {}
		};

		let cancelled = false;
		let pendingId = null;
		let frameCount = 0;
		let cooldown = 0;

		// Drive the playhead/timecode UI from here, once per presented master frame.
		// video.js 'timeupdate' only fires ~4x/sec, which makes the timecode skip
		// several frames per update; rVFC hands us every frame with its exact
		// presentation time (mediaTime), which is what a frame-counting readout needs.
		let lastEmittedTime = null;
		const emitPlayheadTime = t => {
			if (typeof t !== 'number' || !Number.isFinite(t)) return;
			if (t === lastEmittedTime) return;
			lastEmittedTime = t;
			PlayerControls.setCurrentTime(t);
		};

		const getBaseRate = () => {
			const speed = toolSettingsRef.current?.playerSpeed;
			return typeof speed === 'number' && Number.isFinite(speed) && speed > 0 ? speed : 1;
		};

		const onFrame = (_now, metadata) => {
			if (cancelled) return;
			const status = playbackStatusRef.current;
			if (!status || status.playbackState !== 'playing' || status.isScrubbing) return;
			if (leftIsWaitingRef.current || rightIsWaitingRef.current || pausedByBufferingRef.current) {
				schedule();
				return;
			}

			// Skip while either side is mid-seek. The decoder is already busy moving to
			// a new position; any read we do is stale, and any correction we apply
			// interrupts the in-progress seek and tends to make the unclipped player
			// visibly chop.
			try {
				const masterSeeking = typeof masterApi.seeking === 'function' && masterApi.seeking();
				const slaveSeeking = typeof slaveApi.seeking === 'function' && slaveApi.seeking();
				if (masterSeeking || slaveSeeking) {
					schedule();
					return;
				}
			} catch {}

			const masterTime = typeof metadata?.mediaTime === 'number' && Number.isFinite(metadata.mediaTime)
				? metadata.mediaTime
				: masterApi.currentTime;

			// UI position updates happen every frame, even during correction cooldowns.
			emitPlayheadTime(masterTime);

			// Cooldown after a correction — let the rate change or seek take effect
			// before stacking another correction on top.
			if (cooldown > 0) {
				cooldown--;
				schedule();
				return;
			}

			const slaveMeta = masterSideRef.current === 'left' ? rightMetaRef.current : leftMetaRef.current;
			const slaveDur = slaveMeta?.duration ?? slaveApi.duration;
			const slaveFr = slaveMeta?.framerate ?? 30;
			const offset = shorterVideoOffsetRef.current || 0;
			const baseRate = getBaseRate();

			// Map master time into slave's offset-shifted window.
			// state === 'after'  : master is past the slave's end → freeze slave on last frame.
			// state === 'before' : master hasn't reached the slave's start yet → freeze on frame 0.
			// state === 'active' : slave is playing within its window; run drift correction.
			const slaveInfo = getSlaveTarget(masterTime, slaveDur, offset);

			if (slaveInfo.state === 'after') {
				try {
					slaveApi.playbackRate = baseRate;
					freezeVideoAtEnd(slaveApi, slaveDur, slaveFr);
				} catch {}
				schedule();
				return;
			}

			if (slaveInfo.state === 'before') {
				// Hold slave on its first frame; the slaveFrozenRef so the resume logic
				// below picks it up when the master enters the slave's window.
				try {
					slaveApi.playbackRate = baseRate;
					if (Math.abs(slaveApi.currentTime - 0) > 0.005) slaveApi.currentTime = 0;
					if (typeof slaveApi.paused === 'function' && !slaveApi.paused()) safePause(slaveApi);
					slaveFrozenRef.current = true;
				} catch {}
				schedule();
				return;
			}

			// state === 'active' from here on.

			// Was previously frozen (slave outside its window) and the master is now
			// inside the slave window — resume slave at the right time.
			if (slaveFrozenRef.current) {
				try {
					slaveFrozenRef.current = false;
					slaveApi.currentTime = slaveInfo.time;
					slaveApi.playbackRate = baseRate;
					safePlay(slaveApi);
				} catch {}
				schedule();
				return;
			}

			const slaveTime = slaveApi.currentTime;
			// Compare slave to its OFFSET-SHIFTED target, not to raw master time —
			// otherwise we'd think the slave is permanently behind by `offset` seconds.
			const delta = slaveTime - slaveInfo.time;
			if (!Number.isFinite(delta)) {
				schedule();
				return;
			}

			const absDelta = Math.abs(delta);
			frameCount++;
			const inStartupGrace = frameCount < STARTUP_GRACE_FRAMES;

			if (absDelta < SUB_FRAME_EPS) {
				// Within noise floor — both at base rate.
				setRateIfNeeded(masterApi, baseRate);
				setRateIfNeeded(slaveApi, baseRate);
			} else if (absDelta >= HARD_SEEK_THRESHOLD) {
				// Drift too large for slowdown to recover quickly. Snap the LEADER
				// backward to the laggard's time so the slower decoder doesn't have
				// to skip frames forward.
				// Offsets: slave's target is slaveInfo.time (== masterTime - offset);
				// the equivalent master time for a given slaveTime is slaveTime + offset.
				try {
					if (delta > 0) {
						// Slave is ahead of its target — snap slave back to target.
						slaveApi.currentTime = slaveInfo.time;
					} else {
						// Master is ahead of slave's position — snap master back to
						// the master-timeline position that corresponds to slaveTime.
						masterApi.currentTime = slaveTime + offset;
					}
				} catch {}
				setRateIfNeeded(masterApi, baseRate);
				setRateIfNeeded(slaveApi, baseRate);
				cooldown = SNAP_COOLDOWN_FRAMES;
			} else if (!inStartupGrace) {
				// Slow the leader. Laggard always at base rate (we don't push a
				// decoder past what it can handle).
				const slowdown = clamp(KP * absDelta, 0, MAX_SLOWDOWN_FRAC);
				const leaderRate = baseRate * (1 - slowdown);
				if (delta > 0) {
					// Slave ahead.
					setRateIfNeeded(slaveApi, leaderRate);
					setRateIfNeeded(masterApi, baseRate);
				} else {
					// Master ahead.
					setRateIfNeeded(masterApi, leaderRate);
					setRateIfNeeded(slaveApi, baseRate);
				}
				cooldown = RATE_COOLDOWN_FRAMES;
			} else {
				// Startup grace — both at base rate while decoder stabilizes.
				setRateIfNeeded(masterApi, baseRate);
				setRateIfNeeded(slaveApi, baseRate);
			}

			schedule();
		};

		const schedule = () => {
			if (cancelled) return;
			if (hasRVFC) {
				try { pendingId = masterVideoEl.requestVideoFrameCallback(onFrame); } catch {}
			} else {
				// Fallback for browsers without rVFC: use rAF + currentTime sampling.
				pendingId = window.requestAnimationFrame(() => onFrame(0, { mediaTime: masterApi.currentTime }));
			}
		};

		schedule();

		return () => {
			cancelled = true;
			if (pendingId != null) {
				if (hasRVFC && typeof masterVideoEl?.cancelVideoFrameCallback === 'function') {
					try { masterVideoEl.cancelVideoFrameCallback(pendingId); } catch {}
				} else {
					try { window.cancelAnimationFrame(pendingId); } catch {}
				}
				pendingId = null;
			}
			// Restore both rates — either side may have been slowed.
			const restoreRate = getBaseRate();
			try { masterApi.playbackRate = restoreRate; } catch {}
			try { slaveApi.playbackRate = restoreRate; } catch {}
		};
	}, [
		playbackStatus.playbackState,
		playbackStatus.isScrubbing,
		leftMedia,
		rightMedia,
		leftMediaType,
		rightMediaType,
		masterSide,
		safePlay,
		freezeVideoAtEnd,
	]);

	// Play/pause the videos when playback state changes.
	// Note: metadata + playerSpeed are read from refs so this effect doesn't re-fire
	// when framerate detection or other metadata updates land — re-firing the playing
	// branch mid-playback would re-seek both videos and cause visible stutter.
	//
	// On transition to 'playing' we seek both videos and then wait for both decoders
	// to reach HAVE_FUTURE_DATA (or fire 'canplay') before calling play(). Starting
	// both before each decoder is primed at the target frame is what causes the
	// stuttery / wrong-speed first second of playback: one side renders smoothly
	// while the other catches up by dropping frames.
	React.useEffect(() => {
		const prevPlaybackState = prevPlaybackStateRef.current;
		prevPlaybackStateRef.current = playbackStatus.playbackState;

		if (!(leftMedia && rightMedia && leftMediaType === 'video' && rightMediaType === 'video')) return;

		const leftMeta = leftMetaRef.current;
		const rightMeta = rightMetaRef.current;
		const speed = typeof toolSettingsRef.current?.playerSpeed === 'number' ? toolSettingsRef.current.playerSpeed : 1;

		if (playbackStatus.playbackState === 'playing') {
			const leftEl = leftMediaElem.current;
			const rightEl = rightMediaElem.current;
			if (!leftEl || !rightEl) return;

			const leftDuration = leftMeta?.duration || leftEl.duration;
			const rightDuration = rightMeta?.duration || rightEl.duration;
			const masterIsLeft = masterSideRef.current === 'left';
			const masterElem = masterIsLeft ? leftEl : rightEl;
			const slaveElem = masterIsLeft ? rightEl : leftEl;
			const masterDuration = masterIsLeft ? leftDuration : rightDuration;
			const slaveDuration = masterIsLeft ? rightDuration : leftDuration;
			const slaveFr = (masterIsLeft ? rightMeta?.framerate : leftMeta?.framerate) ?? 30;
			const offset = shorterVideoOffsetRef.current || 0;

			const rawTarget = playbackStatusRef.current?.playbackPosition ?? playbackStatus.playbackPosition;
			const masterTarget = Math.min(rawTarget, masterDuration);
			const slaveTargetInfo = getSlaveTarget(masterTarget, slaveDuration, offset);
			// When state is 'after' we still want the visible frame, not the exact
			// duration value (which can wrap to frame 0 on some players).
			const slaveSeekTime = slaveTargetInfo.state === 'after'
				? getFreezeTime(slaveDuration, slaveFr)
				: slaveTargetInfo.time;
			const slaveOutOfRange = slaveTargetInfo.state !== 'active';

			// Only seek if the player isn't already at the target — needless seeks
			// reset the decoder pipeline and add latency to the play() call.
			const SEEK_EPS = 0.001;
			if (Math.abs(masterElem.currentTime - masterTarget) > SEEK_EPS) masterElem.currentTime = masterTarget;
			if (Math.abs(slaveElem.currentTime - slaveSeekTime) > SEEK_EPS) slaveElem.currentTime = slaveSeekTime;
			masterElem.playbackRate = speed;
			slaveElem.playbackRate = speed;

			let cancelled = false;
			const READY_TO_PLAY = 3; // HAVE_FUTURE_DATA
			const READINESS_TIMEOUT_MS = 1500;

			const waitForReady = api =>
				new Promise(resolve => {
					if (!api) {
						resolve();
						return;
					}
					const readState = () => {
						try {
							return typeof api.readyState === 'function' ? api.readyState() : 0;
						} catch {
							return 0;
						}
					};
					if (readState() >= READY_TO_PLAY) {
						resolve();
						return;
					}
					let timeoutId = null;
					const cleanup = () => {
						try { api.off?.('canplay', onReady); } catch {}
						try { api.off?.('canplaythrough', onReady); } catch {}
						if (timeoutId != null) clearTimeout(timeoutId);
					};
					const onReady = () => {
						cleanup();
						resolve();
					};
					try { api.on?.('canplay', onReady); } catch {}
					try { api.on?.('canplaythrough', onReady); } catch {}
					timeoutId = setTimeout(() => {
						cleanup();
						resolve();
					}, READINESS_TIMEOUT_MS);
				});

			const masterReady = waitForReady(masterElem);
			// If slave is frozen (before or after its window) we don't need it to be
			// ready to play — it just sits paused on the correct edge frame.
			const slaveReady = slaveOutOfRange ? Promise.resolve() : waitForReady(slaveElem);

			Promise.all([masterReady, slaveReady]).then(() => {
				if (cancelled) return;
				const status = playbackStatusRef.current;
				// User might have hit pause / scrubbed while we were waiting.
				if (!status || status.playbackState !== 'playing' || status.isScrubbing) return;

				if (slaveOutOfRange) {
					safePlay(masterElem);
					safePause(slaveElem);
				} else {
					// Kick off both plays in the same microtask so wall-clock start times
					// are as close as the browser will allow.
					safePlay(masterElem);
					safePlay(slaveElem);
				}
			});

			return () => {
				cancelled = true;
			};
		}

		if (playbackStatus.playbackState === 'paused') {
			leftMediaElem.current.playbackRate = speed;
			rightMediaElem.current.playbackRate = speed;
			if (leftMediaType === 'video') safePause(leftMediaElem.current);
			if (rightMediaType === 'video') safePause(rightMediaElem.current);

			// On the playing -> paused transition, adopt the master's ACTUAL paused
			// position into app state rather than letting the paused-seek effect drag
			// the videos back to the last-emitted position (which trails the video
			// slightly). The paused-seek effect then re-aligns the slave to this
			// exact time, so pausing holds position instead of nudging backward.
			if (prevPlaybackState === 'playing') {
				const masterElem = masterSideRef.current === 'left' ? leftMediaElem.current : rightMediaElem.current;
				const t = masterElem?.currentTime;
				if (typeof t === 'number' && Number.isFinite(t)) {
					PlayerControls.setCurrentTime(t);
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [playbackStatus.playbackState, leftMedia, rightMedia, leftMediaType, rightMediaType, safePlay, safePause, getFreezeTime]);

	// Apply seeks while scrubbing or paused (never during normal playing ticks).
	// rAF-coalesced: a rapid scrub fires this effect many times per second, but we
	// only ever write currentTime once per animation frame with the latest target.
	// Without this, every scrub tick queues a separate seek operation, which backs
	// up the decoder pipeline and produces choppy playback once playback resumes.
	//
	// Slave (shorter video) time is `masterTime - offset`, clamped to [0, slaveDuration].
	// Outside that window, slave sits frozen on its first or last frame.
	// We include shorterVideoOffset in deps so dragging the offset band re-seeks the
	// slave to the new effective position immediately.
	React.useEffect(() => {
		if (!(leftMedia && rightMedia && leftMediaType === 'video' && rightMediaType === 'video')) return;
		if (!(playbackStatus.isScrubbing || playbackStatus.playbackState === 'paused')) return;

		const target = playbackStatus.playbackPosition;
		const raf = requestAnimationFrame(() => {
			const leftEl = leftMediaElem.current;
			const rightEl = rightMediaElem.current;
			if (!leftEl || !rightEl) return;
			const leftMeta = leftMetaRef.current;
			const rightMeta = rightMetaRef.current;
			const leftDuration = leftMeta?.duration || leftEl.duration;
			const rightDuration = rightMeta?.duration || rightEl.duration;
			const masterIsLeft = masterSideRef.current === 'left';
			const masterDuration = masterIsLeft ? leftDuration : rightDuration;
			const slaveDuration = masterIsLeft ? rightDuration : leftDuration;
			const slaveFr = (masterIsLeft ? rightMeta?.framerate : leftMeta?.framerate) ?? 30;
			const offset = shorterVideoOffsetRef.current || 0;

			const masterTime = Math.min(target, masterDuration);
			const slaveInfo = getSlaveTarget(masterTime, slaveDuration, offset);
			const slaveSeekTime = slaveInfo.state === 'after'
				? getFreezeTime(slaveDuration, slaveFr)
				: slaveInfo.time;

			const masterEl = masterIsLeft ? leftEl : rightEl;
			const slaveEl = masterIsLeft ? rightEl : leftEl;
			masterEl.currentTime = masterTime;
			slaveEl.currentTime = slaveSeekTime;
		});

		return () => cancelAnimationFrame(raf);
	}, [
		playbackStatus.playbackPosition,
		playbackStatus.isScrubbing,
		playbackStatus.playbackState,
		leftMedia,
		rightMedia,
		leftMediaType,
		rightMediaType,
		shorterVideoOffset,
		getFreezeTime,
	]);

	// Switches between auto and manual mode for the divider tool
	// Also reapply when media files are loaded to ensure clipper is styled correctly
	React.useEffect(() => {
		if (!leftMedia || !rightMedia) {
			setToolSettings(prevSettings => {
				const newToolSettings = { ...prevSettings };
				newToolSettings.toolOptions.auto = false;
				newToolSettings.toolOptions.stick = true;
				return newToolSettings;
			});
			return;
		}

		clearInterval(continuousClipInterval.current);
		if ((toolSettings.toolMode === 'divider' || toolSettings.toolMode === 'horizontalDivider') && toolSettings.toolOptions.auto) {
			clipMediaContinuous();
		} else {
			clearInterval(continuousClipInterval.current);
			clipMedia();
		}
	}, [toolSettings.toolMode, toolSettings.toolOptions, leftMedia, rightMedia]);

	// Only after media files were previously loaded (don't override localStorage on initial mount)
	const previousLeftMedia = React.useRef(leftMedia);
	const previousRightMedia = React.useRef(rightMedia);

	// Check if we had media before but now one is missing (media was removed)
	// Save the current tool mode and switch to divider mode
	// When both media are present again, restore the previous tool mode
	// Set initial tool mode to divider on first run
	React.useEffect(() => {
		const hadMedia = previousLeftMedia.current && previousRightMedia.current;
		const nowMissingMedia = !leftMedia || !rightMedia;
		const nowHaveMedia = leftMedia && rightMedia;

		// If first run, set tool mode to divider
		if (firstRun) {
			setFirstRun(false);
			const newToolSettings = { ...toolSettings };
			newToolSettings.toolOptions.auto = false;
			newToolSettings.toolMode = 'divider';
			newToolSettings.toolOptions.stick = true;
			setToolSettings(newToolSettings);
			clipMedia();
			return;
		}

		if (hadMedia && nowMissingMedia) {
			// Save current tool mode before switching to divider (only if not already divider)
			if (toolSettings.toolMode !== 'divider') {
				setToolModeBeforeMediaRemoval(toolSettings.toolMode);
			}

			const newToolSettings = { ...toolSettings };
			newToolSettings.toolMode = 'divider';
			newToolSettings.toolOptions.auto = false;
			newToolSettings.toolOptions.stick = true;

			clipperPositionRef.current.x = mediaContainerElem.current ? mediaContainerElem.current.offsetWidth / 2 : '50%';
			setToolSettings(newToolSettings);
		} else if (!hadMedia && nowHaveMedia && toolModeBeforeMediaRemoval !== 'divider') {
			// Restore previous tool mode when both media are present again
			const newToolSettings = { ...toolSettings };
			newToolSettings.toolMode = toolModeBeforeMediaRemoval;
			setToolSettings(newToolSettings);
		}

		// Update refs for next render
		previousLeftMedia.current = leftMedia;
		previousRightMedia.current = rightMedia;

		clipMedia();
	}, [leftMedia, rightMedia, firstRun]);

	// Validate media compatibility when both metadata sets are available
	// Recalculate unified dimensions when metadata loads
	// Then run clipMedia to apply new dimensions
	React.useEffect(() => {
		const compatTypes = ['mixedMediaTypes', 'differentDurations', 'differentFramerates', 'differentDimensions'];

		if (!leftMediaMetaData || !rightMediaMetaData) {
			// Keep non-compatibility warnings (e.g., persistence warnings) while either side is still loading.
			setValidationWarnings(prev => prev.filter(w => !compatTypes.includes(w?.type)));
		} else {
			const warnings = [];

			// Check 1: Mixed media types (video vs image)
			if (leftMediaMetaData.mediaType !== rightMediaMetaData.mediaType) {
				warnings.push({
					type: 'mixedMediaTypes',
					severity: 'error',
					message: `Cannot compare ${leftMediaMetaData.mediaType} with ${rightMediaMetaData.mediaType}. Please select two files of the same type.`,
				});
			}

			// Check 2: Different video durations
			if (leftMediaMetaData.mediaType === 'video' && rightMediaMetaData.mediaType === 'video') {
				const durationDiff = Math.abs(leftMediaMetaData.duration - rightMediaMetaData.duration);
				if (durationDiff > 0.1) {
					// More than 0.1 second difference
					warnings.push({
						type: 'differentDurations',
						severity: 'info',
						message: `Videos have different durations: ${leftMediaMetaData.duration.toFixed(2)}s vs ${rightMediaMetaData.duration.toFixed(2)}s. The shorter video will display its last frame after it ends.`,
					});
				}

				// Check 3: Different framerates
				if (leftMediaMetaData.framerate && rightMediaMetaData.framerate) {
					if (leftMediaMetaData.framerate !== rightMediaMetaData.framerate) {
						const maxFramerate = Math.max(leftMediaMetaData.framerate, rightMediaMetaData.framerate);
						warnings.push({
							type: 'differentFramerates',
							severity: 'info',
							message: `Videos have different framerates: ${leftMediaMetaData.framerate}fps vs ${rightMediaMetaData.framerate}fps. Using ${maxFramerate}fps for playback controls.`,
						});
					}
				}
			}

			// Check 4: Different dimensions
			const dimensionsDiffer = leftMediaMetaData.width !== rightMediaMetaData.width || leftMediaMetaData.height !== rightMediaMetaData.height;
			if (dimensionsDiffer) {
				warnings.push({
					type: 'differentDimensions',
					severity: 'info',
					message: `Media files have different dimensions: ${leftMediaMetaData.width}×${leftMediaMetaData.height} vs ${rightMediaMetaData.width}×${rightMediaMetaData.height}. The smaller will be scaled up to match the larger dimensions.`,
				});
			}

			setValidationWarnings(prev => {
				const preserved = prev.filter(w => !compatTypes.includes(w?.type));
				return [...preserved, ...warnings];
			});
		}

		let unifiedWidth = 0,
			unifiedHeight = 0,
			unifiedAspectRatio = 1,
			unifiedFramerate = 0;

		if (leftMediaMetaData && rightMediaMetaData) {
			// Use the larger dimensions to ensure both fit
			unifiedWidth = Math.max(leftMediaMetaData.width, rightMediaMetaData.width);
			unifiedHeight = Math.max(leftMediaMetaData.height, rightMediaMetaData.height);
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
			// Use the higher framerate for playback controls
			unifiedFramerate = Math.max(leftMediaMetaData.framerate || 0, rightMediaMetaData.framerate || 0);
		} else if (leftMediaMetaData) {
			unifiedWidth = leftMediaMetaData.width;
			unifiedHeight = leftMediaMetaData.height;
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
			unifiedFramerate = leftMediaMetaData.framerate || 0;
		} else if (rightMediaMetaData) {
			unifiedWidth = rightMediaMetaData.width;
			unifiedHeight = rightMediaMetaData.height;
			unifiedAspectRatio = unifiedHeight / unifiedWidth;
			unifiedFramerate = rightMediaMetaData.framerate || 0;
		}

		setUnifiedMediaDimensions({ width: unifiedWidth, height: unifiedHeight, aspectRatio: unifiedAspectRatio, framerate: unifiedFramerate });
	}, [leftMediaMetaData, rightMediaMetaData]);

	// When unified media dimensions change, re-clip media
	// When the size of the cutout changes, re-clip the media
	React.useEffect(() => {
		clipMedia();
	}, [unifiedMediaDimensions, toolSettings.toolOptions.value]);

	// Updates the playback speed of the videos (images don't have playback speed)
	// Updates the volume of the videos (images don't have audio)
	React.useEffect(() => {
		if (leftMediaType === 'video' || rightMediaType === 'video') {
			updateMediaPlaybackSpeed();
		}
		if (leftMedia && rightMedia) {
			if (leftMediaType === 'video') leftMediaElem.current.volume = toolSettings.playerAudio.left.volume;
			if (rightMediaType === 'video') rightMediaElem.current.volume = toolSettings.playerAudio.right.volume;
		}
	}, [toolSettings.playerSpeed, leftMediaType, rightMediaType, toolSettings.playerAudio]);

	// Updates the clipper position when the main container size changes
	React.useEffect(() => {
		const newClipperPosition = {
			x: mediaContainerElem.current ? mediaContainerElem.current.offsetWidth / 2 : null,
			y: mediaContainerElem.current ? mediaContainerElem.current.offsetHeight / 2 : null,
		};
		clipperPositionRef.current = newClipperPosition;
	}, [mainContainerSize]);

	// Runs the clipMedia function when the zoom scale or viewport size changes
	// Scale the offset proportionally with zoom to keep container center as focal point
	React.useEffect(() => {
		if (previousZoomScale.current !== toolSettings.zoomScale) {
			const zoomRatio = toolSettings.zoomScale / previousZoomScale.current;
			const scaledOffset = {
				x: currentOffsetRef.current.x * zoomRatio,
				y: currentOffsetRef.current.y * zoomRatio,
			};
			const boundedOffset = getBoundedOffset(scaledOffset);
			currentOffsetRef.current = boundedOffset;
			setMediaOffset(boundedOffset);
			previousZoomScale.current = toolSettings.zoomScale;
			clipMedia(null, boundedOffset);
		} else {
			clipMedia();
		}
	}, [toolSettings.zoomScale, mainContainerSize]);

	// Update saved tool mode and run clipMedia when user changes the tool
	React.useEffect(() => {
		if (leftMedia && rightMedia) {
			setToolModeBeforeMediaRemoval(toolSettings.toolMode);
			clipMedia();
		}
	}, [toolSettings.toolMode]);

	// Display the new zoom info in the overlay info element when the media elements are resized
	React.useEffect(() => {
		const zoomLevel = toolSettings.zoomScale;
		const unifiedW = unifiedMediaDimensions?.width || 0;
		const unifiedH = unifiedMediaDimensions?.height || 0;
		const wrapperW = unifiedW * zoomLevel;
		const wrapperH = unifiedH * zoomLevel;

		// Find which special zoom point is active (if any) using the same labels used for
		// snap stepping + slider tick marks.
		const tickMarks = zoomSnapModelRef.current?.tickMarks || [];
		const specialZoomPoint = tickMarks.find(p => typeof p?.value === 'number' && Math.abs(p.value - zoomLevel) < 0.001)?.label || null;

		const getContainedDimensions = (containerW, containerH, mediaW, mediaH) => {
			if (!containerW || !containerH || !mediaW || !mediaH) return { width: 0, height: 0, scale: 0 };
			const scale = Math.min(containerW / mediaW, containerH / mediaH);
			return { width: mediaW * scale, height: mediaH * scale, scale };
		};

		const rightDims = rightMediaMetaData ? getContainedDimensions(wrapperW, wrapperH, rightMediaMetaData.width, rightMediaMetaData.height) : { width: 0, height: 0, scale: 0 };
		const leftDims = leftMediaMetaData ? getContainedDimensions(wrapperW, wrapperH, leftMediaMetaData.width, leftMediaMetaData.height) : { width: 0, height: 0, scale: 0 };

		const rightRendered = { width: Math.round(rightDims.width) || 0, height: Math.round(rightDims.height) || 0 };
		const leftRendered = { width: Math.round(leftDims.width) || 0, height: Math.round(leftDims.height) || 0 };
		const renderedDimsDiffer = rightRendered.width !== leftRendered.width || rightRendered.height !== leftRendered.height;

		let zoomInfo = `<h3>Zoom: ${Math.round(zoomLevel * 100)}%</h3>`;
		let zoomSpecialPoint = {
			left: '',
			right: specialZoomPoint ? `[${specialZoomPoint}]` : '',
		};

		if (rightMediaMetaData && leftMediaMetaData) {
			if (renderedDimsDiffer) {
				if (leftDims.width > rightDims.width) {
					zoomSpecialPoint.left = specialZoomPoint ? `[${specialZoomPoint}]` : '';
				} else if (rightDims.width > leftDims.width) {
					zoomSpecialPoint.right = specialZoomPoint ? `[${specialZoomPoint}]` : '';
				}

				zoomInfo += `<h6>L: ${leftRendered.width}px <small>⨉</small> ${leftRendered.height}px ${zoomSpecialPoint.left}</h6>`;

				zoomInfo += `<h6>R: ${rightRendered.width}px <small>⨉</small> ${rightRendered.height}px ${zoomSpecialPoint.right}</h6>`;
			} else {
				zoomInfo += `<h6>${rightRendered.width}px <small>⨉</small> ${rightRendered.height}px ${zoomSpecialPoint.right}</h6>`;
			}
		} else {
			zoomInfo += `<h6>${rightRendered.width}px <small>⨉</small> ${rightRendered.height}px ${zoomSpecialPoint.right}</h6>`;
		}

		displayOverlayInfo(zoomInfo);
	}, [toolSettings.zoomScale, rightMediaMetaData, leftMediaMetaData, unifiedMediaDimensions]);

	const getBoundedOffset = offset => {
		if (!rightMediaMetaData || !mediaContainerElem.current) return offset;

		const unifiedW = unifiedMediaDimensions?.width || 0;
		const unifiedH = unifiedMediaDimensions?.height || 0;
		const displayedWidth = unifiedW * toolSettings.zoomScale;
		const displayedHeight = unifiedH * toolSettings.zoomScale;

		// Max offset is half the displayed media size
		// This ensures media edges can reach container center but not pass it
		const maxOffsetX = displayedWidth / 2;
		const maxOffsetY = displayedHeight / 2;

		return {
			x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
			y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y)),
		};
	};

	// Framerate detection using requestVideoFrameCallback.
	// `videoElement` must be the underlying <video> element (not a video.js wrapper).
	//
	// Each rVFC call gives us the source-time of a frame submitted to the compositor.
	// Between consecutive calls, mediaTimeDiff is at minimum 1/fps (one source frame)
	// and increases when the decoder drops frames (mediaTime jumps by multiple frames
	// while presentedFrames advances by 1). So the minimum sample is always the most
	// accurate estimate of the true frame period. We use the 10th percentile instead
	// of the absolute min for noise resistance, and reject implausibly low / high
	// values so a stretch of dropped frames during decoder warmup can't land a bogus
	// "8 fps" in the metadata.
	const detectFramerate = (videoElement, framerateDataRef, isLeft) => {
		if (!videoElement || typeof videoElement.requestVideoFrameCallback !== 'function') return;

		// Cancel any in-flight detection from a previous source.
		const prev = framerateDataRef.current?.callbackId;
		if (prev != null && typeof videoElement.cancelVideoFrameCallback === 'function') {
			try { videoElement.cancelVideoFrameCallback(prev); } catch {}
		}

		const MIN_SAMPLES = 30;
		const MAX_SAMPLES = 120;
		const MIN_PLAUSIBLE_FPS = 12;
		const MAX_PLAUSIBLE_FPS = 240;
		const PERCENTILE = 0.1;

		framerateDataRef.current = {
			samples: [],
			lastMediaTime: 0,
			lastFrameNum: 0,
			callbackId: null,
			lastReportedFps: null,
		};

		const computeFps = samples => {
			if (samples.length < MIN_SAMPLES) return null;
			const sorted = samples.slice().sort((a, b) => a - b);
			const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * PERCENTILE));
			const period = sorted[idx];
			if (!Number.isFinite(period) || period <= 0) return null;
			const fps = Math.round(1 / period);
			if (fps < MIN_PLAUSIBLE_FPS || fps > MAX_PLAUSIBLE_FPS) return null;
			return fps;
		};

		const reportFps = fps => {
			const data = framerateDataRef.current;
			if (!data || data.lastReportedFps === fps) return;
			data.lastReportedFps = fps;
			if (isLeft) {
				setLeftMediaMetaData(prev => (prev && prev.framerate === fps ? prev : { ...prev, framerate: fps }));
			} else {
				setRightMediaMetaData(prev => (prev && prev.framerate === fps ? prev : { ...prev, framerate: fps }));
			}
		};

		const ticker = (now, metadata) => {
			const data = framerateDataRef.current;
			if (!data) return;

			const mediaTime = typeof metadata?.mediaTime === 'number' ? metadata.mediaTime : 0;
			const frameNum = typeof metadata?.presentedFrames === 'number' ? metadata.presentedFrames : 0;
			const mediaTimeDiff = mediaTime - data.lastMediaTime;
			const frameNumDiff = frameNum - data.lastFrameNum;

			// Skip first call (no baseline), backwards jumps (seek), and absurd gaps (>1s of source time).
			const validBaseline = data.lastFrameNum > 0;
			const validForward = mediaTimeDiff > 0 && frameNumDiff > 0;
			const reasonablyShort = mediaTimeDiff < 1;

			if (validBaseline && validForward && reasonablyShort && data.samples.length < MAX_SAMPLES) {
				data.samples.push(mediaTimeDiff / frameNumDiff);

				if (data.samples.length >= MIN_SAMPLES) {
					const fps = computeFps(data.samples);
					if (fps) reportFps(fps);
				}
			}

			data.lastMediaTime = mediaTime;
			data.lastFrameNum = frameNum;

			if (data.samples.length < MAX_SAMPLES) {
				data.callbackId = videoElement.requestVideoFrameCallback(ticker);
			}
		};

		framerateDataRef.current.callbackId = videoElement.requestVideoFrameCallback(ticker);
	};

	const handleLoadedMetadata = video => {
		let target = video.target;

		if (target.id === 'left-video' || target.id === 'left-image') {
			// Get metadata from stored file info
			const fileMetadata = getFileMetadata(leftMedia);
			const fileName = fileMetadata?.fileName || leftMedia.split(/[/\\]/).pop();
			const isImage = target.id === 'left-image';

			setLeftMediaMetaData({
				fileName: fileName,
				filePath: fileMetadata?.filePath || null,
				mediaType: fileMetadata?.mediaType || (isImage ? 'image' : 'video'),
				duration: isImage ? 0 : target.duration,
				width: isImage ? target.naturalWidth : target.videoWidth,
				height: isImage ? target.naturalHeight : target.videoHeight,
				framerate: isImage ? 0 : 30, // Default for video, will be updated by detection
				fileSize: fileMetadata?.fileSize || null,
			});

			// Reset and start framerate detection for left video only.
			// Use the real underlying <video> element (exposed by VideoJSPlayer's synthetic event).
			if (!isImage) {
				leftFramerateData.current = { samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null };
				detectFramerate(target.mediaElement || target, leftFramerateData, true);
			}
		}

		if (target.id === 'right-video' || target.id === 'right-image') {
			// Get metadata from stored file info
			const fileMetadata = getFileMetadata(rightMedia);
			const fileName = fileMetadata?.fileName || rightMedia.split(/[/\\]/).pop();
			const isImage = target.id === 'right-image';

			setRightMediaMetaData({
				fileName: fileName,
				filePath: fileMetadata?.filePath || null,
				mediaType: fileMetadata?.mediaType || (isImage ? 'image' : 'video'),
				duration: isImage ? 0 : target.duration,
				width: isImage ? target.naturalWidth : target.videoWidth,
				height: isImage ? target.naturalHeight : target.videoHeight,
				framerate: isImage ? 0 : 30, // Default for video, will be updated by detection
			});

			// Reset and start framerate detection for right video only.
			// Use the real underlying <video> element (exposed by VideoJSPlayer's synthetic event).
			if (!isImage) {
				rightFramerateData.current = { samples: [], lastMediaTime: 0, lastFrameNum: 0, callbackId: null };
				detectFramerate(target.mediaElement || target, rightFramerateData, false);
			}
		}

		const currentPlaybackEndTime = playbackStatus.playbackEndTime;

		const newPlaybackEndTime = Math.max(currentPlaybackEndTime, video.target.duration || 0);

		PlayerControls.setEndTime(newPlaybackEndTime);

		if (playbackStatus.playbackPosition > newPlaybackEndTime) {
			PlayerControls.setCurrentTime(newPlaybackEndTime);
		}
	};

	// Master 'timeupdate' handler: loop detection + slave window freezing ONLY.
	// The playhead/timecode position is NOT emitted from here — timeupdate fires
	// ~4x/sec, far too coarse for a frame-accurate readout. The rVFC sync loop
	// above emits the position on every presented master frame instead.
	const handleTimeUpdate = side => e => {
		// Don't react while user is scrubbing the slider
		if (playbackStatus.isScrubbing) return;
		if (playbackStatusRef.current?.playbackState !== 'playing') return;
		// Only the current master drives loop/freeze handling.
		if (side !== masterSideRef.current) return;
		if (leftIsWaitingRef.current || rightIsWaitingRef.current || pausedByBufferingRef.current) return;

		const t = e.target.currentTime;
		if (typeof t === 'number' && Number.isFinite(t)) {
			// Detect looping by time jumping backwards on the master.
			const prev = prevMasterTimeRef.current?.[side];
			prevMasterTimeRef.current[side] = t;
			const looped = typeof prev === 'number' && Number.isFinite(prev) && t + 0.25 < prev;
			const offset = shorterVideoOffsetRef.current || 0;
			if (looped) {
				// Master looped back; resume the slave from the offset-shifted new time.
				slaveFrozenRef.current = false;
				const masterIsLeft = side === 'left';
				const slaveElem = masterIsLeft ? rightMediaElem.current : leftMediaElem.current;
				const slaveMeta = masterIsLeft ? rightMediaMetaData : leftMediaMetaData;
				const slaveDur = slaveMeta?.duration ?? slaveElem?.duration;
				const slaveFr = slaveMeta?.framerate ?? 30;
				const info = getSlaveTarget(t, slaveDur, offset);
				try {
					slaveElem.playbackRate = toolSettings.playerSpeed;
					if (info.state === 'after') {
						freezeVideoAtEnd(slaveElem, slaveDur, slaveFr);
					} else if (info.state === 'before') {
						slaveElem.currentTime = 0;
						safePause(slaveElem);
					} else {
						slaveElem.currentTime = info.time;
						safePlay(slaveElem);
					}
				} catch {}
			}

			// If master has passed the slave's window (either before its start or
			// after its end), force-freeze it on the appropriate edge frame.
			if (leftMediaType === 'video' && rightMediaType === 'video') {
				const masterIsLeft = masterSideRef.current === 'left';
				const slaveElem = masterIsLeft ? rightMediaElem.current : leftMediaElem.current;
				const slaveMeta = masterIsLeft ? rightMediaMetaData : leftMediaMetaData;
				const slaveDur = slaveMeta?.duration ?? slaveElem?.duration;
				const slaveFr = slaveMeta?.framerate ?? 30;
				const info = getSlaveTarget(t, slaveDur, offset);
				if (info.state === 'after') {
					freezeVideoAtEnd(slaveElem, slaveDur, slaveFr);
				}
			}
		}
	};

	const updateMediaPlaybackSpeed = () => {
		if (leftMedia && rightMedia) {
			if (leftMediaType === 'video') leftMediaElem.current.playbackRate = toolSettings.playerSpeed;
			if (rightMediaType === 'video') rightMediaElem.current.playbackRate = toolSettings.playerSpeed;
		}
	};

	// Electron-only: reveal the media file in the OS file manager (Explorer/Finder).
	// Media sources are blob URLs in Electron; the real path is stored in file metadata.
	const openMediaFile = React.useCallback(
		mediaSource => {
			if (!isInElectron) return;
			if (!mediaSource) return;

			let filePath = null;

			if (typeof mediaSource === 'string') {
				const fileMetadata = getFileMetadata(mediaSource);
				filePath = fileMetadata?.filePath || null;

				// Fallback if we ever pass an actual file path or file:// URL.
				if (!filePath && mediaSource.startsWith('file://')) {
					try {
						filePath = decodeURIComponent(new URL(mediaSource).pathname);
						// Windows file:// URLs include a leading slash before the drive letter.
						if (/^\/[A-Za-z]:\//.test(filePath)) {
							filePath = filePath.slice(1);
						}
					} catch (e) {
						filePath = null;
					}
				} else if (!filePath) {
					// If it's already a path, pass it through.
					filePath = mediaSource;
				}
			}

			if (!filePath) {
				console.warn('[MediaContainer] Cannot open media file (missing file path).');
				return;
			}

			if (window?.api?.openFile) {
				window.api.openFile(filePath);
			} else {
				console.warn('[MediaContainer] window.api.openFile is not available.');
			}
		},
		[isInElectron]
	);

	// Show overlay info element
	// After a timeout, hide the overlay info element again
	// Optionally cancel the timeout to prevent clearing the overlay info
	const displayOverlayInfo = (info, cancelTimeout = false) => {
		clearTimeout(displayOverlayInfoTimeout.current);

		setContainerOverlayInfo(info);

		!cancelTimeout &&
			(displayOverlayInfoTimeout.current = setTimeout(() => {
				setContainerOverlayInfo('');
			}, 750));
	};

	const clipMedia = (event, customOffset = null) => {
		// Get the container element
		const mediaContElem = mediaContainerElem.current;
		if (!mediaContElem) return;

		const baseLayout = pendingClipLayoutRef.current || clipLayoutRef.current;

		// Use custom offset if provided, otherwise use state offset
		const currentOffset = customOffset !== null ? customOffset : mediaOffset;

		const containerDims = mediaContElem.getBoundingClientRect();

		// Get the cursor position based on the event or set it to the center of the container
		let cursor = { x: event ? event.pageX : containerDims.width / 2, y: event ? event.pageY : containerDims.height / 2 };

		let clipperPos = {
			x: (clipperPositionRef.current.x ?? baseLayout.clipperPosition.x) || containerDims.width / 2,
			y: (clipperPositionRef.current.y ?? baseLayout.clipperPosition.y) || containerDims.height / 2,
		};

		// Only update divider position from direct pointer movement (or autoscan).
		// Wheel events should never move the divider; they should only zoom.
		const shouldUpdateClipperFromEvent = !toolSettings.stick && event && typeof event.type === 'string' && (event.type === 'mousemove' || event.type === 'autoscan');

		// If the tool is not in stick mode and a qualifying event is passed, update the clipper position to use the event data
		if (shouldUpdateClipperFromEvent) {
			clipperPos = {
				x: cursor.x - containerDims.left,
				y: cursor.y - containerDims.top,
			};
		}

		// Update ref immediately for subsequent events.
		clipperPositionRef.current = clipperPos;

		const mediaContElemOffset = {
			X: containerDims.width,
			Y: containerDims.height,
		};

		const zoom = toolSettings.zoomScale || 1;

		// Set media wrapper dimensions
		const mediaWrapperWidth = unifiedMediaDimensions.width * zoom;
		const mediaWrapperHeight = unifiedMediaDimensions.height * zoom;

		let nextClipperStyle = baseLayout.clipperStyle;
		let nextClipperMaskStyle = baseLayout.clipperMaskStyle;
		let nextClippedStyle = baseLayout.clippedMediaWrapperStyle;
		let nextUnclippedStyle = baseLayout.unClippedMediaWrapperStyle;

		if (toolSettings.toolMode === 'divider' || toolSettings.toolMode === 'horizontalDivider') {
			const dividerAxis = toolSettings.toolMode === 'divider' ? 'X' : 'Y';
			const dividerOrtho = dividerAxis === 'X' ? 'Y' : 'X';

			const rawPosition = dividerAxis === 'X' ? Math.min(clipperPos.x, containerDims.width) : Math.min(clipperPos.y, containerDims.height);
			// Align to device pixels to reduce subpixel shimmering.
			const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
			const position = Math.max(0, Math.round(rawPosition * dpr) / dpr);
			const LOCK_SWAP_THRESHOLD_PX = 56;

			// Keep clipper full-size and reveal the clipped region via clip-path on an inner mask.
			// This prevents the clipped media from needing a half-width compensation move
			// and ensures UI (divider line + lock) are not clipped.
			if (dividerAxis === 'X') {
				const rightInset = Math.max(0, containerDims.width - position);
				const lockDirX = position < LOCK_SWAP_THRESHOLD_PX ? 1 : -1; // -1 = left of line, 1 = right of line
				nextClipperStyle = {
					width: '100%',
					height: '100%',
					'--divider-pos': `${position}px`,
					'--lock-dir-x': String(lockDirX),
				};
				nextClipperMaskStyle = {
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					clipPath: `inset(0px ${rightInset}px 0px 0px)`,
					WebkitClipPath: `inset(0px ${rightInset}px 0px 0px)`,
				};
			} else {
				const bottomInset = Math.max(0, containerDims.height - position);
				const lockDirY = position < LOCK_SWAP_THRESHOLD_PX ? 1 : -1; // -1 = above line, 1 = below line
				nextClipperStyle = {
					width: '100%',
					height: '100%',
					'--divider-pos': `${position}px`,
					'--lock-dir-y': String(lockDirY),
				};
				nextClipperMaskStyle = {
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					clipPath: `inset(0px 0px ${bottomInset}px 0px)`,
					WebkitClipPath: `inset(0px 0px ${bottomInset}px 0px)`,
				};
			}

			const mediaAxisValue = currentOffset[dividerAxis.toLowerCase()] - (dividerAxis === 'X' ? mediaWrapperWidth : mediaWrapperHeight) / 2;
			const mediaOrthoValue = currentOffset[dividerOrtho.toLowerCase()] - (dividerAxis === 'X' ? mediaWrapperHeight : mediaWrapperWidth) / 2;
			const mediaTranslateAxis = `translate${dividerAxis}(${mediaAxisValue}px)`;
			const mediaTranslateOrtho = `translate${dividerOrtho}(${mediaOrthoValue}px)`;

			const mediaWrapperStyle = {
				left: '50%',
				top: '50%',
				width: mediaWrapperWidth,
				height: mediaWrapperHeight,
				transform: `${mediaTranslateAxis} ${mediaTranslateOrtho}`,
			};

			const clippedMediaWrapperStyle = {
				...mediaWrapperStyle,
				opacity: '100%',
			};

			// Keep existing styles if metadata isn't ready yet.
			if (leftMediaMetaData) nextClippedStyle = clippedMediaWrapperStyle;
			if (rightMediaMetaData) nextUnclippedStyle = mediaWrapperStyle;
		}

		// Cutout tools
		if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
			const cutoutSettings = {
				radius: toolSettings.toolOptions.value[toolSettings.toolMode],
			};

			const cutoutClipperStyle = {
				width: cutoutSettings.radius * 2,
				height: cutoutSettings.radius * 2,
				left: clipperPos.x - cutoutSettings.radius,
				top: clipperPos.y - cutoutSettings.radius,
			};

			// Clipper bounds
			if (clipperPos.x < 0) cutoutClipperStyle.left = -cutoutSettings.radius;
			if (clipperPos.x > containerDims.width) cutoutClipperStyle.left = containerDims.width - cutoutSettings.radius;
			if (clipperPos.y < 0) cutoutClipperStyle.top = -cutoutSettings.radius;
			if (clipperPos.y > containerDims.height) cutoutClipperStyle.top = containerDims.height - cutoutSettings.radius;

			const mediaTranslateX = currentOffset.x - mediaWrapperWidth / 2;
			const mediaTranslateY = currentOffset.y - mediaWrapperHeight / 2;
			const cutoutTranslateX = mediaTranslateX + (containerDims.width / 2 - cutoutClipperStyle.left - cutoutSettings.radius);
			const cutoutTranslateY = mediaTranslateY + (containerDims.height / 2 - cutoutClipperStyle.top - cutoutSettings.radius);

			const mediaTranslateValue = `translateX(${mediaTranslateX}px) translateY(${mediaTranslateY}px)`;
			const cutoutMediaTranslateValue = `translateX(${cutoutTranslateX}px) translateY(${cutoutTranslateY}px)`;

			const mediaWrapperStyle = {
				left: '50%',
				top: '50%',
				width: mediaWrapperWidth,
				height: mediaWrapperHeight,
				transform: mediaTranslateValue,
			};

			const cutoutWrapperStyle = {
				...mediaWrapperStyle,
				transform: cutoutMediaTranslateValue,
				opacity: '100%',
			};

			if (leftMediaMetaData) nextClippedStyle = cutoutWrapperStyle;
			if (rightMediaMetaData) nextUnclippedStyle = mediaWrapperStyle;
			nextClipperStyle = cutoutClipperStyle;
			nextClipperMaskStyle = { width: '100%', height: '100%', overflow: 'hidden' };
		}

		// Overlay tool
		if (toolSettings.toolMode === 'overlay') {
			nextClipperStyle = {
				width: '100%',
				height: '100%',
			};

			const mediaTranslateX = currentOffset.x - mediaWrapperWidth / 2;
			const mediaTranslateY = currentOffset.y - mediaWrapperHeight / 2;

			const mediaStyle = {
				left: '50%',
				top: '50%',
				width: `${toolSettings.zoomScale * unifiedMediaDimensions.width}px`,
				height: `${toolSettings.zoomScale * unifiedMediaDimensions.height}px`,
				transform: `translateX(${mediaTranslateX}px) translateY(${mediaTranslateY}px)`,
			};

			const opacityValue = toolSettings.toolOptions.value.overlay;
			const overlayMediaStyle = {
				...mediaStyle,
				opacity: `${opacityValue * 100}%`,
			};

			nextClippedStyle = overlayMediaStyle;
			nextUnclippedStyle = mediaStyle;
			nextClipperMaskStyle = { width: '100%', height: '100%', overflow: 'hidden' };
		}

		scheduleClipLayoutCommit({
			clipperPosition: clipperPos,
			clipperStyle: nextClipperStyle,
			clipperMaskStyle: nextClipperMaskStyle,
			clippedMediaWrapperStyle: nextClippedStyle,
			unClippedMediaWrapperStyle: nextUnclippedStyle,
		});
	};

	// Ensure interval callbacks can always call the latest clipMedia implementation.
	clipMediaRef.current = clipMedia;

	// Auto-clip media continuously based on tool settings
	const clipMediaContinuous = () => {
		// Force turn off stick mode (once)
		if (toolSettingsRef.current?.stick) {
			setToolSettings({ ...toolSettingsRef.current, stick: false });
		}

		let position = toolSettingsRef.current.toolOptions.type === 'rightToLeft' ? 100 : 0,
			positionDirection = 1,
			timingSegment = 10,
			mediaContElem = mediaContainerElem.current;

		const tick = () => {
			const ts = toolSettingsRef.current;
			if (!ts?.toolOptions?.auto) return;
			if (!mediaContElem) return;

			const axis = ts.toolMode === 'horizontalDivider' ? 'Y' : 'X';
			const ratePerMinute = ts.toolOptions?.value?.[ts.toolMode] ?? ts.toolOptions?.value?.divider;
			const positionDeltaScale = (typeof ratePerMinute === 'number' && Number.isFinite(ratePerMinute) ? ratePerMinute : 24) / 60;

			if (ts.toolOptions.type === 'rightToLeft' || ts.toolOptions.type === 'bottomToTop') {
				position <= 0 ? (position = 100) : (position += -1 * positionDeltaScale);
			} else if (ts.toolOptions.type === 'leftToRight' || ts.toolOptions.type === 'topToBottom') {
				position >= 100 ? (position = 0) : (position += positionDeltaScale);
			} else {
				position >= 100 && (positionDirection = -1);
				position <= 0 && (positionDirection = 1);
				position += positionDirection * positionDeltaScale;
			}

			const rect = mediaContElem.getBoundingClientRect();
			const scrollX = window.scrollX || 0;
			const scrollY = window.scrollY || 0;
			const pageXCenter = rect.left + scrollX + rect.width / 2;
			const pageYCenter = rect.top + scrollY + rect.height / 2;
			const pageX = rect.left + scrollX + (position / 100) * rect.width;
			const pageY = rect.top + scrollY + (position / 100) * rect.height;

			const autoscanEvent = {
				type: 'autoscan',
				pageX: axis === 'X' ? pageX : pageXCenter,
				pageY: axis === 'Y' ? pageY : pageYCenter,
			};

			clipMediaRef.current?.(autoscanEvent, currentOffsetRef.current);
		};

		continuousClipInterval.current = setInterval(tick, timingSegment);
		// Start immediately (no need to wait for the first interval tick)
		tick();
	};

	const detectTrackPad = e => {
		let isTrackpad = false;

		// Use data about scroll event to determine input device
		if (e.deltaY && e.deltaX) {
			// If both deltaY and deltaX are present, it's likely a trackpad
			isTrackpad = true;
		} else if (e.deltaY) {
			// If only deltaY is present, check the magnitude
			if (Math.abs(e.deltaY) < 15) {
				// Small deltaY values often indicate a trackpad
				isTrackpad = true;
			}
		} else if (e.deltaX) {
			// If only deltaX is present, check the magnitude
			if (Math.abs(e.deltaX) < 15) {
				// Small deltaX values often indicate a trackpad
				isTrackpad = true;
			}
		}

		setUserInputDevice(isTrackpad ? 'trackpad' : 'mouse');
		return isTrackpad;
	};

	const isDraggingRef = React.useRef(false);
	const lastWindowFocusAtRef = React.useRef(0);
	const FOCUS_CLICK_IGNORE_MS = 500;

	// Electron-only: ignore the click that *focuses* the app window.
	// On some platforms the window may become focused before React's click handler runs,
	// so we cannot determine the prior focus state at click-time. Instead, we record the
	// timestamp of the last focus event and ignore toggles for a short window afterwards.
	React.useEffect(() => {
		if (!isInElectron) return;

		const onBlur = () => {
			// No-op; we only care about when focus was gained.
		};

		const onFocus = () => {
			lastWindowFocusAtRef.current = Date.now();
		};

		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);

		return () => {
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
		};
	}, [isInElectron]);

	const handleMouseMove = e => {
		// Cancel if both media are not present
		if (!leftMedia || !rightMedia) return;
		// Cancel if currently dragging (middle mouse button)
		if (isDraggingRef.current) return;
		// Cancel if the tool is a divider and auto mode is enabled
		if ((toolSettings.toolMode === 'divider' || toolSettings.toolMode === 'horizontalDivider') && toolSettings.toolOptions.auto) return;
		// Cancel if the tool is set to stick mode
		if (toolSettings.stick) return;

		// Send the event to the clipMedia function to update the clipper
		clipMedia(e);
	};

	const zoomPrecision = 3;
	const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
	const roundZoom = value => Number(Number(value).toFixed(zoomPrecision));

	const computeZoomSnapModel = React.useCallback(() => {
		const { zoomMin, zoomMax } = getZoomBounds(toolSettings, appSettings);
		const zoomSpeed = typeof toolSettings.zoomSpeed === 'number' ? toolSettings.zoomSpeed : 0.02;

		const min = clamp(roundZoom(zoomMin), 0.01, 100);
		const max = clamp(roundZoom(zoomMax), min, 100);
		const anchor = 1;

		const keyOf = p => roundZoom(p).toFixed(zoomPrecision);

		// zoomSpeed is a fractional step per snap, e.g. 0.02 => 2%.
		const step = zoomSpeed > 0 ? zoomSpeed : 0.02;
		const factor = 1 + step;

		// Base points (geometric scale around 1.0)
		const basePointsMap = new Map();
		const addBase = v => basePointsMap.set(keyOf(v), roundZoom(v));

		addBase(anchor);
		addBase(min);
		addBase(max);

		// Down from 1.0
		let v = anchor;
		for (let i = 0; i < 500; i++) {
			const next = roundZoom(v / factor);
			if (next <= min) break;
			addBase(next);
			v = next;
		}

		// Up from 1.0
		v = anchor;
		for (let i = 0; i < 500; i++) {
			const next = roundZoom(v * factor);
			if (next >= max) break;
			addBase(next);
			v = next;
		}

		let basePoints = Array.from(basePointsMap.values()).sort((a, b) => a - b);

		// Labeled special snap points (these become slider tick marks + overlay labels).
		const tickMarksMap = new Map();
		const addTickMark = (value, label) => {
			if (typeof value !== 'number' || !Number.isFinite(value)) return;
			if (typeof label !== 'string' || !label) return;
			const rounded = roundZoom(clamp(value, min, max));
			const k = keyOf(rounded);
			const existing = tickMarksMap.get(k);
			if (!existing) {
				tickMarksMap.set(k, { value: rounded, label });
				return;
			}
			if (existing.label === label) return;
			existing.label = `${existing.label}/${label}`;
		};

		addTickMark(min, 'Min');
		addTickMark(anchor, '1:1');
		addTickMark(max, 'Max');

		// Unlabeled special points used for snap insertion/removal behavior.
		const insertSpecialMap = new Map();
		const addInsertSpecial = v => {
			if (typeof v !== 'number' || !Number.isFinite(v)) return;
			const rounded = roundZoom(clamp(v, min, max));
			// Never allow any special point to override the 100% snap.
			if (keyOf(rounded) === keyOf(anchor)) return;
			insertSpecialMap.set(keyOf(rounded), rounded);
		};

		const containerW = mediaContainerElem.current?.offsetWidth || 0;
		const containerH = mediaContainerElem.current?.offsetHeight || 0;
		const unifiedW = unifiedMediaDimensions?.width || 0;
		const unifiedH = unifiedMediaDimensions?.height || 0;

		if (containerW > 0 && containerH > 0 && unifiedW > 0 && unifiedH > 0) {
			// Fill-window: scale so unified width fills container width
			const fillRatio = containerW / unifiedW;
			addInsertSpecial(fillRatio);
			addTickMark(fillRatio, 'Fill');

			// Fit-to-window: scale so unified dimensions fit entirely within container
			const fitRatio = Math.min(containerW / unifiedW, containerH / unifiedH);
			addInsertSpecial(fitRatio);
			addTickMark(fitRatio, 'Fit');
		}

		// Pixel-perfect for smaller media (based on width baseline / 100% anchored to larger width)
		const leftW = leftMediaMetaData?.width || 0;
		const rightW = rightMediaMetaData?.width || 0;
		const smallerW = leftW && rightW ? Math.min(leftW, rightW) : leftW || rightW;
		if (unifiedW > 0 && smallerW > 0 && smallerW !== unifiedW) {
			const oneToOneSmRatio = smallerW / unifiedW;
			addInsertSpecial(oneToOneSmRatio);
			addTickMark(oneToOneSmRatio, '1:1 (Smaller)');
		}

		const insertSpecialPoints = Array.from(insertSpecialMap.values()).sort((a, b) => a - b);

		// For each special point, remove the adjacent base points (one smaller + one larger)
		// unless that adjacent point is exactly the 100% snap or a bound (min/max).
		const baseRemovals = new Set();
		const isProtected = p => keyOf(p) === keyOf(anchor) || keyOf(p) === keyOf(min) || keyOf(p) === keyOf(max);
		for (const sp of insertSpecialPoints) {
			// Find insertion index in basePoints (first base > sp)
			let idx = 0;
			while (idx < basePoints.length && basePoints[idx] <= sp) idx++;
			const lower = idx > 0 ? basePoints[idx - 1] : null;
			const upper = idx < basePoints.length ? basePoints[idx] : null;

			if (lower !== null && !isProtected(lower)) baseRemovals.add(keyOf(lower));
			if (upper !== null && !isProtected(upper)) baseRemovals.add(keyOf(upper));
		}

		if (baseRemovals.size) {
			basePoints = basePoints.filter(p => !baseRemovals.has(keyOf(p)));
		}

		const combined = new Map();
		const addCombined = p => combined.set(keyOf(p), roundZoom(p));
		for (const p of basePoints) addCombined(p);
		for (const p of insertSpecialPoints) addCombined(p);

		// Ensure anchor + bounds always present
		addCombined(anchor);
		addCombined(min);
		addCombined(max);

		const snapPoints = Array.from(combined.values()).sort((a, b) => a - b);
		const tickMarks = Array.from(tickMarksMap.values()).sort((a, b) => a.value - b.value);
		return { snapPoints, tickMarks, min, max };
	}, [appSettings?.zoomMin, appSettings?.zoomMax, toolSettings.zoomSpeed, mainContainerSize, unifiedMediaDimensions, leftMediaMetaData, rightMediaMetaData]);

	const zoomSnapModelRef = React.useRef({ snapPoints: [], tickMarks: [], min: 0, max: 1 });
	const zoomSnapModel = React.useMemo(() => computeZoomSnapModel(), [computeZoomSnapModel]);
	zoomSnapModelRef.current = zoomSnapModel;

	const getNextSnap = (currentZoom, direction, snapPoints) => {
		const eps = 0.001;
		if (!Array.isArray(snapPoints) || snapPoints.length === 0) return currentZoom;

		if (direction > 0) {
			for (const p of snapPoints) {
				if (p > currentZoom + eps) return p;
			}
			return currentZoom;
		}

		if (direction < 0) {
			for (let i = snapPoints.length - 1; i >= 0; i--) {
				if (snapPoints[i] < currentZoom - eps) return snapPoints[i];
			}
			return currentZoom;
		}

		return currentZoom;
	};

	// Animates the mainContainer element if user attempts to zoom beyond min/max bounds
	const pulseZoomBound = boundType => {
		const elem = mediaContainerElem.current;
		if (!elem) return;

		const className = boundType === 'min' ? 'zoom-in-anim' : 'zoom-out-anim';
		elem.classList.add(className);
		setTimeout(() => {
			elem.classList.remove(className);
		}, 500);
	};

	// Zoom handling based on scroll input from mouse wheel scroll or trackpad pinch.
	// - If zoomLevel is provided, it's treated as an explicit target.
	// - Otherwise, direction/steps will move between snap points.
	const handleMediaZoom = (zoomLevel = null, { direction = 0, steps = 1 } = {}) => {
		const newToolSettings = { ...toolSettings };
		const { snapPoints, min, max } = zoomSnapModelRef.current || computeZoomSnapModel();

		const minThreshold = min + 0.01;
		const maxThreshold = max - 0.01;

		// Explicit zoom target (e.g., slider)
		if (typeof zoomLevel === 'number' && Number.isFinite(zoomLevel)) {
			let target = roundZoom(clamp(zoomLevel, min, max));
			if (target === min && zoomLevel < minThreshold) pulseZoomBound('min');
			if (target === max && zoomLevel > maxThreshold) pulseZoomBound('max');
			newToolSettings.zoomScale = target;
			setToolSettings(newToolSettings);
			return;
		}

		// Snap stepping (scroll/pinch)
		let current = roundZoom(clamp(toolSettings.zoomScale, min, max));
		let next = current;
		const count = Math.max(1, Math.floor(steps));

		for (let i = 0; i < count; i++) {
			const candidate = getNextSnap(next, direction, snapPoints);
			if (candidate === next) break;
			next = candidate;
		}

		if (next === current) {
			console.log(direction, current, min, max);

			if (direction < 0 && current <= minThreshold) pulseZoomBound('min');
			if (direction > 0 && current >= maxThreshold) pulseZoomBound('max');
			return;
		}

		newToolSettings.zoomScale = next;
		setToolSettings(newToolSettings);
	};

	const trackpadZoom = e => {
		// Pinch-to-zoom: do NOT apply swap/invert. Snap between defined zoom points.
		const direction = e.deltaY < 0 ? 1 : -1;
		const steps = Math.max(1, Math.round(Math.abs(e.deltaY) / 40));
		handleMediaZoom(null, { direction, steps });
	};

	// Pan media based on trackpad scroll
	const trackpadScroll = e => {
		// Pan media based on scroll deltas
		const panSpeed = 1; // Adjust this value to change panning speed
		const newOffset = {
			x: mediaOffset.x - e.deltaX * panSpeed,
			y: mediaOffset.y - e.deltaY * panSpeed,
		};

		// Constrain offset to prevent excessive panning
		const boundedOffset = getBoundedOffset(newOffset);

		// Update state
		setMediaOffset(boundedOffset);
		clipMedia(null, newOffset);
	};

	const mouseScroll = e => {
		// Mouse input only:
		// - swapScrollDirections swaps vertical/horizontal behaviors.
		// - invertZoomDirection flips zoom in/out.
		let deltaX = e.deltaX;
		let deltaY = e.deltaY;
		if (toolSettings.swapScrollDirections) {
			[deltaX, deltaY] = [deltaY, deltaX];
		}

		// Zoom videos when vertical intent dominates (many devices produce small deltaX noise).
		if (deltaY !== 0 && Math.abs(deltaY) >= Math.abs(deltaX)) {
			let direction = deltaY < 0 ? 1 : -1;
			if (toolSettings.invertZoomDirection) direction *= -1;
			const steps = Math.max(1, Math.round(Math.abs(deltaY) / 100));
			handleMediaZoom(null, { direction, steps });
		} else if (deltaX !== 0) {
			// seek frames if secondary scroll (with threshold to avoid accidental triggers)
			seekFrames(deltaX < 0 ? 0.5 : -0.5);
		}

		clipMedia(e);
	};

	// Sends scroll events to appropriate handler based on input device parameters
	const handleScroll = e => {
		// We take over wheel handling for pan/zoom; prevent the browser/Electron default scroll.
		e.preventDefault();
		e.stopPropagation();

		// if (!rightMedia || !leftMedia) return;
		const isTrackpad = detectTrackPad(e);
		if (isTrackpad) {
			let pinchZooming = e.ctrlKey || e.metaKey;

			if (pinchZooming) {
				trackpadZoom(e);
			} else {
				trackpadScroll(e);
			}
		} else {
			mouseScroll(e);
		}
	};

	// Ensure the wheel listener always uses the latest handler (prevents stale toolMode/zoomScale).
	handleScrollRef.current = handleScroll;

	const offsetStartRef = React.useRef({ x: 0, y: 0 });
	const startingOffsetRef = React.useRef({ x: 0, y: 0 });
	const currentOffsetRef = React.useRef({ x: 0, y: 0 });

	const handleMiddleDrag = event => {
		event.preventDefault();

		const dragDelta = {
			x: event.clientX - offsetStartRef.current.x,
			y: event.clientY - offsetStartRef.current.y,
		};

		const newOffset = {
			x: startingOffsetRef.current.x + dragDelta.x,
			y: startingOffsetRef.current.y + dragDelta.y,
		};

		// Constrain offset to prevent excessive panning
		const boundedOffset = getBoundedOffset(newOffset);

		// Update ref immediately (synchronous)
		currentOffsetRef.current = boundedOffset;
		// Update state for re-render
		setMediaOffset(boundedOffset);
		clipMedia(null, boundedOffset);
	};

	// For right mouse drag to resize clipper
	// Store starting size and mouse position in refs
	const startingSizeRef = React.useRef({ size: 0 });
	const startingPositionRef = React.useRef({ x: 0, y: 0 });
	const currentPositionRef = React.useRef({ x: 0, y: 0 });
	const currentSizeRef = React.useRef({ size: 0 });
	const cutoutMinSize = React.useRef(100);
	const cutoutMaxSize = React.useRef(500);

	const handleRightDrag = event => {
		event.preventDefault();

		const dragDelta = {
			x: event.clientX - startingPositionRef.current.x,
			y: event.clientY - startingPositionRef.current.y,
		};

		let newSize = Math.sqrt(Math.pow(currentPositionRef.current.x + dragDelta.x, 2) + Math.pow(currentPositionRef.current.y + dragDelta.y, 2));

		// Enforce minimum size
		if (newSize < cutoutMinSize.current) newSize = cutoutMinSize.current;

		if (newSize > cutoutMaxSize.current) newSize = cutoutMaxSize.current;

		currentSizeRef.current.size = newSize;

		const newToolSettings = { ...toolSettings };
		newToolSettings.toolOptions.value[toolSettings.toolMode] = newSize;
		// // Update state for re-render
		setToolSettings(newToolSettings);
		clipMedia();
	};

	const handleMouseUp = event => {
		event.preventDefault();
		isDraggingRef.current = false;
		mediaContainerElem.current.removeEventListener('mousemove', handleMiddleDrag);
		mediaContainerElem.current.removeEventListener('mousemove', handleRightDrag);
		mediaContainerElem.current.removeEventListener('mouseup', handleMouseUp);
	};

	const lastMiddleClickTimeRef = React.useRef(0);

	// Controls mouse down events for panning (middle mouse) and clipper resizing (right mouse)
	const handleMouseDown = event => {
		if (!leftMedia || !rightMedia) return;

		// Middle mouse button for panning
		if (event.button === 1) {
			event.preventDefault();

			// Check for double-click (within the doubleClickSpeed threshold defined by the user in app settings)
			const now = Date.now();
			const timeSinceLastClick = now - lastMiddleClickTimeRef.current;

			if (timeSinceLastClick < appSettings.doubleClickSpeed) {
				// Double-click detected - reset zoom and offset
				const newToolSettings = { ...toolSettings, zoomScale: 1 };
				setToolSettings(newToolSettings);

				currentOffsetRef.current = { x: 0, y: 0 };
				setMediaOffset({ x: 0, y: 0 });

				lastMiddleClickTimeRef.current = 0;
				return;
			}

			lastMiddleClickTimeRef.current = now;

			isDraggingRef.current = true;

			offsetStartRef.current = {
				x: event.clientX,
				y: event.clientY,
			};

			// Use ref instead of state to get the current value synchronously
			startingOffsetRef.current = { ...currentOffsetRef.current };

			mediaContainerElem.current.addEventListener('mousemove', handleMiddleDrag, false);
			mediaContainerElem.current.addEventListener('mouseup', handleMouseUp, false);

			return;
		}

		// Right mouse button for quickly updating the clipper settings
		if (event.button === 2) {
			// prevent default context menu
			event.preventDefault();

			// As user drags while holding right mouse button, change size of clipper, if applicable
			if (toolSettings.toolMode === 'circleCutout' || toolSettings.toolMode === 'boxCutout') {
				isDraggingRef.current = true;

				startingPositionRef.current = {
					x: event.clientX,
					y: event.clientY,
				};

				cutoutMinSize.current = toolSettings.toolOptions.cutoutValueBounds[toolSettings.toolMode].min;
				cutoutMaxSize.current = toolSettings.toolOptions.cutoutValueBounds[toolSettings.toolMode].max;

				startingSizeRef.current = { ...currentSizeRef.current };

				mediaContainerElem.current.addEventListener('mousemove', handleRightDrag, false);
				mediaContainerElem.current.addEventListener('mouseup', handleMouseUp, false);

				return;
			}

			// If user right clicks while in vertical divider mode, switch to horizontal divider mode, and vice versa
			if (toolSettings.toolMode === 'divider' || toolSettings.toolMode === 'horizontalDivider') {
				const newToolSettings = { ...toolSettings };
				newToolSettings.toolMode = toolSettings.toolMode === 'divider' ? 'horizontalDivider' : 'divider';
				setToolSettings(newToolSettings);
			}

			return;
		}
	};

	// Prevent the native context menu inside the media container.
	// Note: the context menu is triggered by the separate `contextmenu` event (often on mouseup),
	// so preventing default on mousedown is not sufficient.
	const handleContextMenu = e => {
		e.preventDefault();
	};

	// Toggle clipper lock on click
	// Prevents the clipper from moving when the mouse moves
	const toggleClipperLock = e => {
		// Electron-only: ignore clicks that occur immediately after the window gains focus.
		// This prevents the user's "click to focus" from also toggling the clipper lock.
		if (isInElectron && Date.now() - (lastWindowFocusAtRef.current || 0) < FOCUS_CLICK_IGNORE_MS) return;
		if (e.target.id !== 'mediaContainer' && e.target.parentElement.id !== 'mediaContainer' && e.target.parentElement.id !== 'videoClipper') return;
		if (!leftMedia || !rightMedia) return;
		if (toolSettings.toolMode === 'overlay') return;
		if (toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto) return;
		setToolSettings({ ...toolSettings, stick: !toolSettings.stick });

		// Detect double click to reset clipper position
		if (e.detail === 2) {
			const newClipperPosition = {
				x: mediaContainerElem.current ? mediaContainerElem.current.offsetWidth / 2 : null,
				y: mediaContainerElem.current ? mediaContainerElem.current.offsetHeight / 2 : null,
			};
            setToolSettings(ts => ({ ...ts, stick: true }));
			clipperPositionRef.current = newClipperPosition;
			clipMedia();
		}
	};

	const getCurrentFrame = media => {
		return media.currentTime;
	};

	const getNewPosition = (media, nrOfFrames) => {
		return getCurrentFrame(media) + nrOfFrames; //+ 0.00001
	};

	// see: http://www.inconduit.com/smpte/
	const seekFrames = frameCount => {
		// Only seek on videos, not images
		if (leftMediaType !== 'video' || rightMediaType !== 'video') return;

		playbackStatus.playbackState !== 'paused' && PlayerControls.pause();
		setNewPosition(frameCount);
	};

	const setNewPosition = frameCount => {
		// Only set position on videos, not images
		if (leftMediaType !== 'video' || rightMediaType !== 'video') return;

		let newPosLeft = getNewPosition(leftMediaElem.current, frameCount),
			newPosRight = getNewPosition(rightMediaElem.current, frameCount);

		// use the most recent frame as the one to sync to
		if (newPosLeft > newPosRight) {
			leftMediaElem.current.currentTime = newPosLeft;
			rightMediaElem.current.currentTime = newPosLeft;
		} else {
			// the right media is at the latest frame OR they're equal and it doesn't matter
			leftMediaElem.current.currentTime = newPosRight;
			rightMediaElem.current.currentTime = newPosRight;
		}
	};

	React.useEffect(() => {
		const elem = mediaContainerElem.current;
		if (!elem) return;

		const wheelListener = e => {
			handleScrollRef.current?.(e);
		};

		elem.addEventListener('wheel', wheelListener, { passive: false });
		return () => {
			elem.removeEventListener('wheel', wheelListener);
		};
	}, []);

	return (
		<div
			id="mediaContainer"
			ref={mediaContainerElem}
			onMouseMove={handleMouseMove}
			onContextMenuCapture={handleContextMenu}
			className={[
				leftMediaMetaData ? 'left-media-loaded' : '',
				rightMediaMetaData ? 'right-media-loaded' : '',
				!(leftMediaMetaData && rightMediaMetaData) ? 'media-metadata-loading' : 'empty',
			]
				.join(' ')
				.trim()}
			onClick={toggleClipperLock}
			onMouseDown={handleMouseDown}
			// onWheel={handleScroll}
		>
			<InfoOverlay info={containerOverlayInfo} />
			{leftMedia ? (
				<MediaInfoBar
					mediaSide="left"
					mediaSource={leftMedia}
					mediaType={leftMediaType}
					mediaMetaData={leftMediaMetaData}
					isInBrowser={isInBrowser}
					openMediaFile={openMediaFile}
					toolSettings={toolSettings}
					setToolSettings={setToolSettings}
					setMediaSource={setLeftMedia}
					setCurrentModal={setCurrentModal}
				/>
			) : (
				<MediaFileInput
					setMediaFile={setLeftMedia}
					setSecondaryMediaFile={setRightMedia}
					mediaKey="leftMediaHandle"
					oppositeMediaMetaData={rightMediaMetaData}
					isInElectron={isInElectron}
					isInBrowser={isInBrowser}
					onMissingFilePath={() =>
						upsertValidationWarning({
							type: 'missingFilePathLeft',
							severity: 'warning',
							message:
								'Could not save a filesystem path for the left media. Files loaded via drag & drop may not restore after restart. Use the file picker to enable restore.',
						})
					}
					onHasFilePath={() => removeValidationWarning('missingFilePathLeft')}
					onSecondaryMissingFilePath={() =>
						upsertValidationWarning({
							type: 'missingFilePathRight',
							severity: 'warning',
							message:
								'Could not save a filesystem path for the right media. Files loaded via drag & drop may not restore after restart. Use the file picker to enable restore.',
						})
					}
					onSecondaryHasFilePath={() => removeValidationWarning('missingFilePathRight')}
					onTooManyFilesSelected={count => {
						if (typeof count === 'number' && count > 2) {
							upsertValidationWarning({
								type: 'tooManyFilesSelected',
								severity: 'info',
								message: `You selected ${count} files. Only the first two will be loaded.`,
							});
						} else {
							removeValidationWarning('tooManyFilesSelected');
						}
					}}
				/>
			)}
			{rightMedia ? (
				<>
					<MediaInfoBar
						mediaSide="right"
						mediaSource={rightMedia}
						mediaType={rightMediaType}
						mediaMetaData={rightMediaMetaData}
						isInBrowser={isInBrowser}
						toolSettings={toolSettings}
						setToolSettings={setToolSettings}
						setMediaSource={setRightMedia}
						setCurrentModal={setCurrentModal}
						openMediaFile={openMediaFile}
					/>
					{rightMediaType === 'video' ? (
						<VideoJSPlayer
							videoRef={rightMediaElem}
							id="right-video"
							onTimeUpdate={handleTimeUpdate('right')}
							onLoadedMetadata={handleLoadedMetadata}
							src={rightMedia || ''}
							loop={rightShouldLoop}
							onEnded={() => {
								if (!rightShouldLoop) PlayerControls.pause();
							}}
							muted={toolSettings.playerAudio.right.muted}
							volume={toolSettings.playerAudio.right.volume}
							playbackRate={toolSettings.playerSpeed}
							style={unClippedMediaWrapperStyle}
						/>
					) : (
						<ImagePlayer imageRef={rightMediaElem} id="right-image" onLoad={handleLoadedMetadata} src={rightMedia || ''} style={unClippedMediaWrapperStyle} />
					)}
				</>
			) : (
				<MediaFileInput
					setMediaFile={setRightMedia}
					setSecondaryMediaFile={setLeftMedia}
					mediaKey="rightMediaHandle"
					oppositeMediaMetaData={leftMediaMetaData}
					isInElectron={isInElectron}
					isInBrowser={isInBrowser}
					onMissingFilePath={() =>
						upsertValidationWarning({
							type: 'missingFilePathRight',
							severity: 'warning',
							message:
								'Could not save a filesystem path for the right media. Files loaded via drag & drop may not restore after restart. Use the file picker to enable restore.',
						})
					}
					onHasFilePath={() => removeValidationWarning('missingFilePathRight')}
					onSecondaryMissingFilePath={() =>
						upsertValidationWarning({
							type: 'missingFilePathLeft',
							severity: 'warning',
							message:
								'Could not save a filesystem path for the left media. Files loaded via drag & drop may not restore after restart. Use the file picker to enable restore.',
						})
					}
					onSecondaryHasFilePath={() => removeValidationWarning('missingFilePathLeft')}
					onTooManyFilesSelected={count => {
						if (typeof count === 'number' && count > 2) {
							upsertValidationWarning({
								type: 'tooManyFilesSelected',
								severity: 'info',
								message: `You selected ${count} files. Only the first two will be loaded.`,
							});
						} else {
							removeValidationWarning('tooManyFilesSelected');
						}
					}}
				/>
			)}
			<div
				id="videoClipper"
				ref={videoClipper}
				style={clipperStyle}
				className={`${toolSettings.toolMode}${leftMedia ? '' : ' empty'}${toolSettings.stick ? ' stuck' : ''}${
					toolSettings.toolMode === 'divider' && toolSettings.toolOptions.auto ? ' auto' : ''
				}`}>
				<ClipperLock id="clipperLock" locked={toolSettings.stick} />
				<div className="clipper-mask" style={clipperMaskStyle}>
					{leftMedia &&
						(leftMediaType === 'video' ? (
							<VideoJSPlayer
								videoRef={leftMediaElem}
								id="left-video"
								style={clippedMediaWrapperStyle}
								onTimeUpdate={handleTimeUpdate('left')}
								onLoadedMetadata={handleLoadedMetadata}
								src={leftMedia || ''}
								loop={leftShouldLoop}
								onEnded={() => {
									if (!leftShouldLoop) PlayerControls.pause();
								}}
								muted={toolSettings.playerAudio.left.muted}
								volume={toolSettings.playerAudio.left.volume}
								playbackRate={toolSettings.playerSpeed}
							/>
						) : (
							<ImagePlayer imageRef={leftMediaElem} id="left-image" onLoad={handleLoadedMetadata} src={leftMedia || ''} style={clippedMediaWrapperStyle} />
						))}
				</div>
			</div>
			{leftMedia && rightMedia && (
				<PlayerSlider
					defaultSliderValue={100}
					id="zoomLevelSlider"
					className={[
						toolSettings.controllerBarOptions.floating ? 'floating-offset' : '',
						leftMediaType === 'video' || rightMediaType === 'video' ? 'video-media' : 'image-media',
					].join(' ')}
					name="Zoom Level"
					sliderMinMax={[getZoomBounds(toolSettings, appSettings).zoomMin * 100, getZoomBounds(toolSettings, appSettings).zoomMax * 100]}
					value={toolSettings.zoomScale * 100}
					stepValue={0.1}
					ticks={zoomSnapModel.tickMarks.map(p => ({ value: p.value * 100, label: p.label }))}
					snapToTicks={true}
					snapThreshold={4}
					direction="vertical"
					onChange={value => handleMediaZoom(value / 100)}
					// valueFormatter={value => Math.round(0.5 * Math.pow(12, (value - 50) / 550) * 100)}
					option={toolSettings.zoomScale}
					label="%"
				/>
			)}
			{validationWarnings.length > 0 && <ValidationMessage messages={validationWarnings} setMessages={setValidationWarnings} />}
		</div>
	);
}

export default MediaContainer;
