// Centralized defaults for app-wide keyboard controls mapping.

export const keyboardControlsMap = {
    zoomIn: {
        keys: ['=', '+'],
        description: 'Zoom In',
        action: 'zoomIn',
    },
    zoomOut: {
        keys: ['-', '_'],
        description: 'Zoom Out',
        action: 'zoomOut',
    },
    zoomTo100: {
        keys: ['0'],
        description: 'Zoom to 100% [1:1]',
        action: 'zoomTo100',
    },
    zoomTo100Smaller: {
        keys: ['0'],
        modifiers: ['shift'],
        description: 'Zoom to 100% [1:1] (Smaller Dimension)',
        action: 'zoomTo100Smaller',
    },
    zoomToFit: {
        keys: ['1'],
        description: 'Zoom to Fit',
        action: 'zoomToFit',
    },
    zoomToFill: {
        keys: ['1'],
        modifiers: ['shift'],
        description: 'Zoom to Fill',
        action: 'zoomToFill',
    },
    toggleToolLock: {
        keys: ['z', 'Z'],
        description: 'Toggle Tool Lock',
        action: 'toggleToolLock',
    },
    toolDividerHorizontal: {
        keys: ['h', 'H'],
        description: 'Switch to Horizontal Divider Tool',
        action: 'toolDividerHorizontal',
    },
    toolDividerVertical: {
        keys: ['v', 'V'],
        description: 'Switch to Vertical Divider Tool',
        action: 'toolDividerVertical',
    },
    toolAutoMoveToggle: {
        keys: ['a', 'A'],
        description: 'Toggle Auto-Move for Divider Tool',
        action: 'toolAutoMoveToggle',
    },
    toolAutoMoveDirection: {
        keys: ['a', 'A'],
        modifiers: ['shift'],
        description: 'Change Auto-Move Direction for Divider Tool',
        action: 'toolAutoMoveDirection',
    },
    toolBoxCutout: {
        keys: ['b', 'B'],
        description: 'Switch to Box Cutout Tool',
        action: 'toolBoxCutout',
    },
    toolCircleCutout: {
        keys: ['c', 'C'],
        description: 'Switch to Circle Cutout Tool',
        action: 'toolCircleCutout',
    },
    toolSizeIncrease: {
        keys: [']'],
        description: 'Increase Tool Size',
        action: 'toolSizeIncrease',
    },
    toolSizeDecrease: {
        keys: ['['],
        description: 'Decrease Tool Size',
        action: 'toolSizeDecrease',
    },
    swapVideos: {
        keys: ['tab'],
        // modifiers: ['shift'],
        description: 'Swap Left/Right Videos',
        action: 'swapVideos',
    },
    openSettingsModal: {
        keys: [',', '<'],
        modifiers: ['ctrl'],
        description: 'Open Settings Modal',
        action: 'openSettingsModal',
    },
    videoPlayPause: {
        keys: ['space'],
        description: 'Toggle Play/Pause',
        action: 'videoPlayPause',
    },
    videoFrameForward: {
        keys: ['arrowright'],
        description: 'Skip Forward One Frame',
        action: 'videoFrameForward',
    },
    videoFrameBackward: {
        keys: ['arrowleft'],
        description: 'Skip Backward One Frame',
        action: 'videoFrameBackward',
    },
    videoFrameForwardLarge: {
        keys: ['arrowright'],
        modifiers: ['shift'],
        description: 'Skip Forward 10 Frames',
        action: 'videoFrameForwardLarge',
    },
    videoFrameBackwardLarge: {
        keys: ['arrowleft'],
        modifiers: ['shift'],
        description: 'Skip Backward 10 Frames',
        action: 'videoFrameBackwardLarge',
    },
    videoMoveToStart: {
        keys: ['arrowleft'],
        modifiers: ['ctrl'],
        description: 'Move to Start of Video',
        action: 'videoMoveToStart',
    },
    videoMoveToEnd: {
        keys: ['arrowright'],
        modifiers: ['ctrl'],
        description: 'Move to End of Video',
        action: 'videoMoveToEnd',
    },
    videoToggleLoop: {
        keys: ['l', 'L'],
        description: 'Toggle Video Looping',
        action: 'videoToggleLoop',
    },
    videoIncreaseSpeed: {
        keys: ['.','>'],
        description: 'Increase Video Playback Speed',
        action: 'videoIncreaseSpeed',
    },
    videoDecreaseSpeed: {
        keys: [',','<'],
        description: 'Decrease Video Playback Speed',
        action: 'videoDecreaseSpeed',
    },
    toggleControllerDocking: {
        keys: ['\\', '|'],
        description: 'Toggle Controller Docking Position',
        action: 'toggleControllerDocking',
    },
    clearLocalSettings: {
        keys: ['c', 'C'],
        modifiers: ['ctrl', 'shift'],
        description: 'Clear Local Settings (Local Storage)',
        action: 'clearLocalSettings',
        hideInUI: true,
    },
    closeLeftVideo: {
        keys: ['[', '{'],
        modifiers: ['ctrl', 'shift'],
        description: 'Close Left Video',
        action: 'closeLeftVideo',
    },
    closeRightVideo: {
        keys: [']', '}'],
        modifiers: ['ctrl', 'shift'],
        description: 'Close Right Video',
        action: 'closeRightVideo',
    },
};

export default keyboardControlsMap;
