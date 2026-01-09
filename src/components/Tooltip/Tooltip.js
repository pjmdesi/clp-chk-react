import React from 'react';

function Tooltip( { appSettings} ) {
    const [tooltipVisible, setTooltipVisible] = React.useState(false);
    const [tooltipContent, setTooltipContent] = React.useState('');
    const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, bottom: 0 });

    const tooltipRef = React.useRef(null);
    const anchorRef = React.useRef(null);
    const hideTimeoutRef = React.useRef(null);

    const SPACING_PX = 8;
    const HIDE_DELAY_MS = 500;

	const showTooltips = appSettings?.showTooltips !== false;

    const getTooltipText = element => {
        if (!element || element.nodeType !== 1) return '';
        const title = element.getAttribute?.('title');
        if (typeof title === 'string' && title.trim()) return title.trim();
        const alt = element.getAttribute?.('alt');
        if (typeof alt === 'string' && alt.trim()) return alt.trim();
        return '';
    };

    const findTooltipAnchor = startElement => {
        let element = startElement;
        while (element && element !== document.body) {
            if (element.id === 'appTooltip') return null;
            const text = getTooltipText(element);
            if (text) {
                return { element, text };
            }
            element = element.parentElement;
        }
        return null;
    };

    const restoreAnchorTitleIfNeeded = element => {
        if (!element?.dataset) return;
        if (Object.prototype.hasOwnProperty.call(element.dataset, 'tooltipOriginalTitle')) {
            element.setAttribute('title', element.dataset.tooltipOriginalTitle);
            delete element.dataset.tooltipOriginalTitle;
        }
    };

    const suppressNativeTitleIfNeeded = (element, title) => {
        if (!element?.dataset) return;
        if (!title) return;
        // Prevent the browser's native tooltip from showing alongside ours.
        if (!Object.prototype.hasOwnProperty.call(element.dataset, 'tooltipOriginalTitle')) {
            element.dataset.tooltipOriginalTitle = title;
        }
        element.removeAttribute('title');
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const positionTooltip = React.useCallback(() => {
        const tooltipElem = tooltipRef.current;
        const anchorElem = anchorRef.current;
        if (!tooltipElem || !anchorElem) return;

        const boundsElem = tooltipElem.parentElement;
        if (!boundsElem) return;

        const boundsRect = boundsElem.getBoundingClientRect();
        const anchorRect = anchorElem.getBoundingClientRect();

        const tooltipWidth = tooltipElem.offsetWidth || 0;
        const tooltipHeight = tooltipElem.offsetHeight || 0;
        const boundsWidth = boundsRect.width || 0;
        const boundsHeight = boundsRect.height || 0;

        // Default: centered above anchor.
        let left = anchorRect.left - boundsRect.left + anchorRect.width / 2 - tooltipWidth / 2;
        // We position using `bottom` so the tooltip's bottom edge stays stable as height changes.
        // Compute target bottom-edge Y (in bounds coords): just above the anchor.
        let bottomEdgeY = anchorRect.top - boundsRect.top - SPACING_PX;
        let topEdgeY = bottomEdgeY - tooltipHeight;

        // Keep fully visible inside bounds.
        const maxLeft = Math.max(0, boundsWidth - tooltipWidth);
        left = clamp(left, 0, maxLeft);

        if (topEdgeY < 0) {
            // If it doesn't fit above, place below.
            topEdgeY = anchorRect.bottom - boundsRect.top + SPACING_PX;
            topEdgeY = clamp(topEdgeY, 0, Math.max(0, boundsHeight - tooltipHeight));
            bottomEdgeY = topEdgeY + tooltipHeight;
        } else {
            // Clamp so the tooltip remains fully visible.
            bottomEdgeY = clamp(bottomEdgeY, tooltipHeight, boundsHeight);
            topEdgeY = bottomEdgeY - tooltipHeight;
        }

        const bottom = boundsHeight - bottomEdgeY;
        setTooltipPosition({ left, bottom });
    }, []);

    React.useEffect(() => {
        const onPointerOver = event => {
            if (!showTooltips) return;

            const found = findTooltipAnchor(event.target);
            if (!found?.text) return;

            if (hideTimeoutRef.current) {
                window.clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            if (anchorRef.current && found.element === anchorRef.current && found.text === tooltipContent) {
                return;
            }

            // Restore previous element's title if we were suppressing it.
            if (anchorRef.current && anchorRef.current !== found.element) {
                restoreAnchorTitleIfNeeded(anchorRef.current);
            }

            // Suppress native title tooltip for the currently hovered element.
            const existingTitle = found.element.getAttribute('title');
            if (existingTitle && existingTitle.trim()) {
                suppressNativeTitleIfNeeded(found.element, existingTitle.trim());
            }

            anchorRef.current = found.element;
            setTooltipContent(found.text);
            setTooltipVisible(true);
        };

        const onPointerOut = event => {
            const anchorElem = anchorRef.current;
            if (!anchorElem) return;
            const nextTarget = event.relatedTarget;
            if (nextTarget && anchorElem.contains(nextTarget)) return;
            // If the pointerout isn't leaving our anchor (e.g., bubbling from inside), ignore.
            if (event.target && anchorElem.contains(event.target) === false && event.target !== anchorElem) {
                return;
            }

            if (hideTimeoutRef.current) {
                window.clearTimeout(hideTimeoutRef.current);
            }
            const anchorAtSchedule = anchorElem;
            hideTimeoutRef.current = window.setTimeout(() => {
                hideTimeoutRef.current = null;
                // Only hide if we haven't moved to a different tooltip anchor.
                if (anchorRef.current !== anchorAtSchedule) return;
                restoreAnchorTitleIfNeeded(anchorAtSchedule);
                anchorRef.current = null;
                setTooltipVisible(false);
            }, HIDE_DELAY_MS);
        };

        document.addEventListener('pointerover', onPointerOver, true);
        document.addEventListener('pointerout', onPointerOut, true);

        return () => {
            if (hideTimeoutRef.current) {
                window.clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
            document.removeEventListener('pointerover', onPointerOver, true);
            document.removeEventListener('pointerout', onPointerOut, true);
        };
    }, [tooltipContent, showTooltips]);

    // If tooltips are disabled, immediately hide and cleanup.
    React.useEffect(() => {
        if (showTooltips) return;
        if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        if (anchorRef.current) {
            restoreAnchorTitleIfNeeded(anchorRef.current);
            anchorRef.current = null;
        }
        setTooltipVisible(false);
    }, [showTooltips]);

    // Reposition after render so we can measure tooltip size.
    React.useLayoutEffect(() => {
        if (!tooltipVisible) return;
        const raf = window.requestAnimationFrame(() => {
            positionTooltip();
        });
        return () => window.cancelAnimationFrame(raf);
    }, [tooltipVisible, tooltipContent, positionTooltip]);

    // Keep position valid on resize/scroll while visible.
    React.useEffect(() => {
        if (!tooltipVisible) return;
        const onReflow = () => positionTooltip();
        window.addEventListener('resize', onReflow);
        window.addEventListener('scroll', onReflow, true);
        return () => {
            window.removeEventListener('resize', onReflow);
            window.removeEventListener('scroll', onReflow, true);
        };
    }, [tooltipVisible, positionTooltip]);

    return (
        <div
            id="appTooltip"
            ref={tooltipRef}
            role="tooltip"
            aria-hidden={!tooltipVisible}
            className={showTooltips && tooltipVisible && tooltipContent ? 'visible' : ''}
            style={{ left: `${tooltipPosition.left}px`, bottom: `${tooltipPosition.bottom}px` }}>
            {tooltipContent}
        </div>
    );
}

export default Tooltip;
