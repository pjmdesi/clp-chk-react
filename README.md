# ClpChk — A quick and simple media comparison tool

Ever wanted to compare two videos or images side by side? ClpChk is a simple tool that allows you to do that quickly. It has a user-friendly interface and supports zooming and panning, making it easy to analyze differences in video quality.

I developed this tool to help with my own media analysis. I found no way to quickly to compare a compressed version of a video or image file side-by-side. I hope it can be useful for others as well.

This is a relatively simple web app based on React & Electron. I will be adding features & fixing bugs as I have time.

![App Screenshot](https://github.com/pjmdesi/clp-chk-react/blob/e3df210f608ab248912cc9c1bbefb8391f163086/src/assets/images/app-screenshot.png)
![App Recording](https://github.com/pjmdesi/clp-chk-react/blob/e3df210f608ab248912cc9c1bbefb8391f163086/src/assets/images/app-recording.gif)

## Features

Available as a deployable web app, ClpChk offers the following features:

- **Side-by-side comparison**: View two media files simultaneously.
- **Comparison tools**: Vertical divider, horizontal divider, box cutout, circle cutout, and an **Overlay** blend mode.
- **Zooming and panning**: Snap-based zoom, a vertical zoom slider, mouse-wheel zoom, trackpad pinch-to-zoom, and middle-mouse drag panning.
- **Playback controls** (videos): Timeline scrubber with timecode, play/pause, frame stepping, looping, and playback speed.
- **Audio controls** (videos): Per-side mute and volume.
- **Validation & warnings**: Helpful warnings for mismatched dimensions/durations/framerates; prevents comparing an image against a video.
- **Settings & shortcuts**: Settings modal for zoom + input preferences, plus keyboard shortcuts for common actions.

## Installation

You can download the latest release from the [Releases](https://github.com/pjmdesi/clp-chk-react/releases/latest) page. It is a purely [portable app](https://portableapps.com/about/what_is_a_portable_app), so installation is not required. Just download the exe and run it! You can even run it from a USB drive.

## Usage

1. Load your media files into the left and right panes by clicking on the respective "Load File" buttons or dragging them onto the buttons from another window.
2. Inspect the media files side by side. Use the following controls for easy manipulation:
    - Zoom with the scroll wheel (snap-based). A vertical zoom slider is also available.
    - Trackpad: pinch to zoom; two-finger scroll pans.
    - Pan by clicking and dragging with the middle mouse button.
    - Double middle-click resets zoom to 100% and clears pan offset.
    - Horizontal scroll wheel scrubs the timeline (videos only).
    - Toggle tool lock ("stick") by clicking inside the media area.
    - Change tool mode using the tool selector in the control bar (Divider / Cutout / Overlay).
    - Right-click while in divider mode toggles vertical/horizontal divider.
    - When using a cutout tool, adjust the size by right-clicking and dragging.
    - In the Electron app, click a loaded filename to open it in your file browser.

## Settings

Open Settings from the gear icon in the control bar (or use the shortcut below) to adjust:

- Zoom speed and min/max zoom bounds
- Invert zoom direction
- Swap vertical/horizontal scroll behaviors (zoom vs scrub)
- Double-click speed (used for middle-click reset)
- Toggle tooltips

## Keyboard shortcuts

- Zoom: `+`/`=` zoom in, `-` zoom out, `0` zoom to 100%, `Shift+0` zoom to 100% (smaller-dimension), `1` zoom to fit, `Shift+1` zoom to fill
- Tools: `V` vertical divider, `H` horizontal divider, `B` box cutout, `C` circle cutout, `Z` toggle tool lock
- Tool options: `A` toggle divider auto-move, `Shift+A` cycle auto-move direction/pattern, `[`/`]` decrease/increase tool size
- Playback (videos): `Space` play/pause, `←`/`→` step 1 frame, `Shift+←`/`Shift+→` step 10 frames, `Ctrl+←` start, `Ctrl+→` end, `L` toggle loop, `,`/`.` decrease/increase speed
- App: `Tab` swap left/right, `Ctrl+,` open Settings, `\` toggle docked/floating control bar

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Third-party notices for bundled dependencies are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
