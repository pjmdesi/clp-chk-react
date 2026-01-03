import React from 'react';
import Icon from '../Icon';

const MIN_WIDTH = 360;
const MIN_HEIGHT = 200;
const EDGE_SIZE = 10;

const STORAGE_KEY = 'modalWindowState.v1';

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getContainerSize(containerRef) {
	const el = containerRef?.current;
	if (!el) return { width: window.innerWidth, height: window.innerHeight };
	const rect = el.getBoundingClientRect();
	return { width: rect.width, height: rect.height };
}

function getModalKey(currentModal) {
	if (!currentModal) return null;
	if (typeof currentModal === 'object') {
		if (typeof currentModal.key === 'string' && currentModal.key.trim()) return currentModal.key.trim();
		if (typeof currentModal.id === 'string' && currentModal.id.trim()) return currentModal.id.trim();
		if (typeof currentModal.title === 'string' && currentModal.title.trim()) return currentModal.title.trim();
	}
	if (typeof currentModal === 'function') return currentModal.name || 'anonymous-modal';
	return 'default-modal';
}

function loadAllSavedRects() {
	if (typeof window === 'undefined' || !window.localStorage) return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch (_) {
		return {};
	}
}

function sanitizeRect(rect) {
	if (!rect || typeof rect !== 'object') return null;
	const x = Number(rect.x);
	const y = Number(rect.y);
	const width = Number(rect.width);
	const height = Number(rect.height);
	if ([x, y, width, height].some(v => Number.isNaN(v))) return null;
	return {
		x,
		y,
		width: Math.max(width, MIN_WIDTH),
		height: Math.max(height, MIN_HEIGHT),
	};
}

function saveRect(modalKey, rect) {
	if (!modalKey || typeof window === 'undefined' || !window.localStorage) return;
	try {
		const all = loadAllSavedRects();
		all[modalKey] = rect;
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
	} catch (_) {
		// ignore storage failures
	}
}

function clampRectToContainer(rect, containerRef) {
	const { width: containerWidth, height: containerHeight } = getContainerSize(containerRef);

	// Priority rules:
	// 1) Keep size as-is when it fits the container.
	// 2) If off-screen, move just enough to fit.
	// 3) Only shrink if the modal is larger than the container.
	const minAllowedWidth = Math.min(MIN_WIDTH, containerWidth);
	const minAllowedHeight = Math.min(MIN_HEIGHT, containerHeight);

	let nextWidth = rect.width;
	let nextHeight = rect.height;

	// Only shrink when necessary to fit.
	if (nextWidth > containerWidth) nextWidth = containerWidth;
	if (nextHeight > containerHeight) nextHeight = containerHeight;

	// Enforce minimum size where possible.
	nextWidth = Math.max(nextWidth, minAllowedWidth);
	nextHeight = Math.max(nextHeight, minAllowedHeight);

	let nextX = rect.x;
	let nextY = rect.y;

	if (nextWidth <= containerWidth) {
		nextX = clamp(nextX, 0, Math.max(0, containerWidth - nextWidth));
	} else {
		nextX = 0;
	}

	if (nextHeight <= containerHeight) {
		nextY = clamp(nextY, 0, Math.max(0, containerHeight - nextHeight));
	} else {
		nextY = 0;
	}

	return { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
}

function ModalWindow({ currentModal, setCurrentModal, containerRef }) {
	const closeModal = React.useCallback(() => {
		setCurrentModal(null);
	}, [setCurrentModal]);

	const modalKey = React.useMemo(() => getModalKey(currentModal), [currentModal]);

	const windowRef = React.useRef(null);
	const rectRef = React.useRef(null);
	const dragStateRef = React.useRef(null);
	const resizeStateRef = React.useRef(null);
	const lastOpenedKeyRef = React.useRef(null);

	const [{ x, y, width, height }, setRect] = React.useState(() => {
		const { width: containerWidth, height: containerHeight } = getContainerSize(containerRef);
		const initialWidth = Math.min(640, Math.max(MIN_WIDTH, containerWidth - 48));
		const initialHeight = Math.min(480, Math.max(MIN_HEIGHT, containerHeight - 48));
		return {
			x: Math.max(0, Math.floor((containerWidth - initialWidth) / 2)),
			y: Math.max(0, Math.floor((containerHeight - initialHeight) / 2)),
			width: initialWidth,
			height: initialHeight,
		};
	});

	// Desired rect is what the user last set; it should not shrink just because the container shrank.
	const [desiredRect, setDesiredRect] = React.useState(() => ({ x, y, width, height }));

	React.useEffect(() => {
		rectRef.current = { x, y, width, height };
	}, [x, y, width, height]);

	// Restore saved desired rect whenever a (new) modal opens.
	React.useEffect(() => {
		if (!currentModal) return;
		if (!modalKey) return;
		if (lastOpenedKeyRef.current === modalKey) return;
		lastOpenedKeyRef.current = modalKey;

		const all = loadAllSavedRects();
		const saved = sanitizeRect(all?.[modalKey]);
		const base = saved || rectRef.current || { x, y, width, height };
		setDesiredRect(base);
		setRect(prev => {
			const next = clampRectToContainer(base, containerRef);
			if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) return prev;
			return next;
		});
	}, [currentModal, modalKey, containerRef]);

	// Persist desired rect while a modal is open.
	React.useEffect(() => {
		if (!currentModal) return;
		if (!modalKey) return;
		saveRect(modalKey, desiredRect);
	}, [currentModal, modalKey, desiredRect]);

	React.useEffect(() => {
		if (!currentModal) return;

		const onKeyDown = ev => {
			if (ev.key === 'Escape') {
				ev.preventDefault();
				closeModal();
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [currentModal, closeModal]);

	// When the container resizes, clamp the desired rect to stay in bounds.
	// This allows the modal to grow back up to the user's last chosen size when the container grows.
	React.useEffect(() => {
		if (!currentModal) return;

		const el = containerRef?.current;
		if (!el || typeof ResizeObserver === 'undefined') return;

		const ro = new ResizeObserver(() => {
			setRect(prev => {
				const next = clampRectToContainer(desiredRect, containerRef);
				if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) {
					return prev;
				}
				return next;
			});
		});

		ro.observe(el);
		return () => ro.disconnect();
	}, [currentModal, containerRef, desiredRect]);

	React.useEffect(() => {
		if (!currentModal) {
			lastOpenedKeyRef.current = null;
		}
	}, [currentModal]);

	if (!currentModal) return null;

	let title = '';
	let body = null;

	if (React.isValidElement(currentModal)) {
		body = currentModal;
	} else if (typeof currentModal === 'function') {
		const Component = currentModal;
		body = <Component closeModal={closeModal} />;
	} else if (typeof currentModal === 'object') {
		title = currentModal.title || '';
		if (React.isValidElement(currentModal.content)) {
			body = currentModal.content;
		} else if (typeof currentModal.component === 'function') {
			const Component = currentModal.component;
			body = <Component {...(currentModal.props || {})} closeModal={closeModal} />;
		}
	}

	const beginDrag = ev => {
		if (ev.button !== 0) return;
		const { width: containerWidth, height: containerHeight } = getContainerSize(containerRef);
		const current = rectRef.current || { x, y, width, height };
		dragStateRef.current = {
			pointerId: ev.pointerId,
			startX: ev.clientX,
			startY: ev.clientY,
			origX: current.x,
			origY: current.y,
			containerWidth,
			containerHeight,
		};
		ev.currentTarget.setPointerCapture(ev.pointerId);
	};

	const onDragMove = ev => {
		const state = dragStateRef.current;
		if (!state || state.pointerId !== ev.pointerId) return;

		const dx = ev.clientX - state.startX;
		const dy = ev.clientY - state.startY;
		const current = rectRef.current || { x, y, width, height };
		const nextX = clamp(state.origX + dx, 0, Math.max(0, state.containerWidth - current.width));
		const nextY = clamp(state.origY + dy, 0, Math.max(0, state.containerHeight - current.height));
		const next = { ...current, x: nextX, y: nextY };
		setRect(next);
		setDesiredRect(desired => ({ ...desired, x: nextX, y: nextY }));
	};

	const endDrag = ev => {
		const state = dragStateRef.current;
		if (!state || state.pointerId !== ev.pointerId) return;
		dragStateRef.current = null;
		try {
			ev.currentTarget.releasePointerCapture(ev.pointerId);
		} catch (_) {
			// no-op
		}
	};

	const beginResize = (handle, ev) => {
		if (ev.button !== 0) return;
		const { width: containerWidth, height: containerHeight } = getContainerSize(containerRef);
		const current = rectRef.current || { x, y, width, height };
		resizeStateRef.current = {
			handle,
			pointerId: ev.pointerId,
			startX: ev.clientX,
			startY: ev.clientY,
			orig: current,
			containerWidth,
			containerHeight,
		};
		ev.currentTarget.setPointerCapture(ev.pointerId);
	};

	const onResizeMove = ev => {
		const state = resizeStateRef.current;
		if (!state || state.pointerId !== ev.pointerId) return;

		const dx = ev.clientX - state.startX;
		const dy = ev.clientY - state.startY;
		const handle = state.handle;
		const orig = state.orig;

		let nextX = orig.x;
		let nextY = orig.y;
		let nextWidth = orig.width;
		let nextHeight = orig.height;

		// Horizontal
		if (handle.includes('e')) {
			const maxWidth = state.containerWidth - orig.x;
			nextWidth = clamp(orig.width + dx, MIN_WIDTH, Math.max(MIN_WIDTH, maxWidth));
		}
		if (handle.includes('w')) {
			const maxLeftShift = orig.width - MIN_WIDTH;
			const leftShift = clamp(dx, -orig.x, maxLeftShift);
			nextX = orig.x + leftShift;
			nextWidth = orig.width - leftShift;
		}

		// Vertical
		if (handle.includes('s')) {
			const maxHeight = state.containerHeight - orig.y;
			nextHeight = clamp(orig.height + dy, MIN_HEIGHT, Math.max(MIN_HEIGHT, maxHeight));
		}
		if (handle.includes('n')) {
			const maxUpShift = orig.height - MIN_HEIGHT;
			const upShift = clamp(dy, -orig.y, maxUpShift);
			nextY = orig.y + upShift;
			nextHeight = orig.height - upShift;
		}

		// Final clamp to container bounds
		nextWidth = clamp(nextWidth, MIN_WIDTH, Math.max(MIN_WIDTH, state.containerWidth));
		nextHeight = clamp(nextHeight, MIN_HEIGHT, Math.max(MIN_HEIGHT, state.containerHeight));
		nextX = clamp(nextX, 0, Math.max(0, state.containerWidth - nextWidth));
		nextY = clamp(nextY, 0, Math.max(0, state.containerHeight - nextHeight));

		const next = { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
		setRect(next);
		setDesiredRect(next);
	};

	const endResize = ev => {
		const state = resizeStateRef.current;
		if (!state || state.pointerId !== ev.pointerId) return;
		resizeStateRef.current = null;
		try {
			ev.currentTarget.releasePointerCapture(ev.pointerId);
		} catch (_) {
			// no-op
		}
	};

	return (
		<div
			id="modalWindow"
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Modal'}
			ref={windowRef}
			style={{ left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` }}
			onMouseDown={ev => {
				ev.stopPropagation();
			}}>
			<div className="modal-header">
				<div
					className="modal-titlebar"
					onPointerDown={beginDrag}
					onPointerMove={onDragMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}>
					<div className="modal-title">{title}</div>
				</div>
				<button className="modal-close" title="Close" onClick={closeModal}>
					<Icon name="X" />
				</button>
			</div>
			<div className="modal-body">{body}</div>

			{/* Resize handles */}
			<div className="modal-resize-handle n" onPointerDown={ev => beginResize('n', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle s" onPointerDown={ev => beginResize('s', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle e" onPointerDown={ev => beginResize('e', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle w" onPointerDown={ev => beginResize('w', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle ne" onPointerDown={ev => beginResize('ne', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle nw" onPointerDown={ev => beginResize('nw', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle se" onPointerDown={ev => beginResize('se', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
			<div className="modal-resize-handle sw" onPointerDown={ev => beginResize('sw', ev)} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
		</div>
	);
}

export default ModalWindow;
