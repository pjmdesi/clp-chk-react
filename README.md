# ClpChk — A quick and simple media comparison tool

Ever wanted to compare two videos or images side by side? ClpChk is a simple tool that allows you to do that quickly. It has a user-friendly interface and supports zooming and panning, making it easy to analyze differences in video quality.

I developed this tool to help with my own media analysis. I found no way to quickly to compare a compressed version of a video or image file side-by-side. I hope it can be useful for others as well.

This is a relatively simple web app based on React & Electron. I will be adding features & fixing bugs as I have time.

![App Screenshot](https://github.com/pjmdesi/clp-chk-react/blob/feb5b3c913729fd21f7c112a6e27c2965d03e3af/src/assets/images/app-screenshot.png)

## Features

Available as a deployable web app, ClpChk offers the following features:

- **Side-by-side comparison**: View two media files simultaneously.
- **Zooming and panning**: Easily navigate your loaded media files for detailed analysis.
- **Clipping shapes**: Use different clipping shapes to focus on specific areas of the media.
- **Playback controls**: Play, pause, and change playback speed.
- **File support**: Load various video and image file formats.

## Installation

You can download the latest release from the [Releases](https://github.com/pjmdesi/clp-chk-react/releases/tag/v0.0.1) page. It is a purely [portable app](https://portableapps.com/about/what_is_a_portable_app), so installation is not required. Just download the exe and run it! You can even run it from a USB drive.

## Usage

1. Load your media files into the left and right panes by clicking on the respective "Load File" buttons or dragging them onto the buttons from another window.
2. Inspect the media files side by side. Use the following controls for easy manipulation:
    * Zoom with the scroll wheel: down to zoom in, up to zoom out (zoom slider also available, inverted scroll option coming soon)
    * Double middle-click to reset the zoom.
    * Pan by clicking and dragging with the middle mouse button.
    * Unlock/lock the clipper position by clicking anywhere in the media area.
    * Change the clipper mode using the tool selector in the control bar at the bottom.
    * When using a clipper shape, adjust the size by right-clicking and dragging, even while locked.
