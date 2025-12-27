# To-do List

(_Items are kind of in priority order for each section_)

## UI

### Bugs / Issues (UI)

* Only run the clip lock/unlock when clicking inside the video area when the window is focused. Otherwise, clicking outside the window and back in causes an unwanted toggle of the lock state.
* Fix positioning/zoom for auto wiper for divider clipper
* Need to account vertical video
  * Zoom to fit height instead of width when video is taller than wide
  * same with resizing window
* Minimum window size for Electron app doesn't quite match that of the internal web app container minimum size

#### MacOS Specific
* Rounded corners do not match default macOS window corners. Either need to override default window corner radius or find the correct value to match.
  * Border radius seems to change based on focus state of window
* Title bar buttons (close, minimize, maximize) are misaligned vertically
* Green maximize button does not seem to work correctly.
* File menu does not show
  * App name
    * Quit
    * Settings...
  * File
    * Load Left Video...
    * Load Right Video...
    * Swap Videos
  * Edit
    * Tools
      * Vertical Clipper
      * Horizontal Clipper
      * Circle Cutout
      * Rectangle Cutout
    * Reset Zoom
  * View
  * Window
  * Help

### Features (UI)

* Add a vertical divider clipper mode
* Add slider to control volume for each vid (maybe scroll on volume button fills in button outline?)
* Add warning when videos are not the same ratio / length
* (?) If videos are different lengths:
  * Allow timeline track to indicate where the shorter one ends
  * Allow user to pick whether black or last frame is shown
* Modals
  * Create modal template
  * Hook up modal buttons
  * Create Settings Menu using modals
* Add settings panel
  * Allow swapping vertical scroll and horizontal scroll functions (vertical scroll = zoom | horizontal scroll = scrub <-> vertical scroll = scrub | horizontal scroll = zoom) [ use event listener: _**onwheel**_ and use x & y coordinates to distinguish between the 2 ]
  * Invert zoom direction
  * Smooth Zoom (animate between zoom ticks)
  * Auto load last videos toggle
  * Zoom minimums and maximums
  * Lock zoom on resize toggle
* Add notes overlay
* Allow user to switch between time elapsed / time remaining display on timecode
* Create info page for controls and keyboard shortcuts, maybe inside settings panel
* add warning to indicate if different framerate
* Keyboard controls
  * Frame stepping
  * Zoom in/out
  * Tool mode switching
  * Tool option adjustments
    * Cutout size
    * Divider auto on/off (when fixed)
    * Divider auto speed (when fixed)
  * (?) Panning controls
  * (?) Clipper position controls
  * (?) Clipper lock toggle
  * (?) Reset zoom/offset
* Change remaining input to list different detected versions of the loaded file after one is added to a pane. It should still work as regular file picker input as well
* Display audio waveform to indicate which / how loud each video is playing. [source](https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/)
* Show errors
  * When unsupported file type is loaded
  * When file fails to load for any reason
  * When file metadata cannot be read
  * When file cannot be played for any reason
* Allow loading of entire folder and ability to quickly pick video/images from opened folder (probably as a sidebar or maybe as a separate, smaller window).
  * Add A/B selector to select which panel gets replaced by the selected file in the loaded folder
  **[ A** | B ]
  * Allow user to drag files into the panes to replace ones currently there

## App

### Bugs / Issues (app)

* Add memory to recall on next app launch:
  * ~~Videos from last session~~ (5/14/24)
    * This was working, but is now broken again, using a button to restore files
  * Selected tool & settings used from last session
* File compatibility issues | I need to add a check for several issues the user might run into while using this app. Here's a list of things I've thought of so far:
    1. They might choose video files of different lengths. If they do, I need to display an warning that says this, but the app should still work. The timecode slider should proceed past the shorter video file (displaying the last frame) until it reaches the end of the longer video.
    2. along the same lines, if the video files have different framrates, the timecode slider should display that of the larger framerate.
    3. If the user inputs files of different dimesnions, they should still match in size, adjusting the smaller one to match that of the larger one.
    4. If the user inputs a video file in one panel, and an image in the other, the second input should be refused (it should match whatever was first).

### Features (app)

* Need to support GIF files
  * For now, just treat them as special images (no playback controls, can only be paried with other GIFs)
  * Eventually, add playback controls for GIFs as well and allow them to be compatible with video files
* Allow for rendering of comparison media to file. _No idea how to do that..._ [Maybe this?](https://dev.to/yonatanbd/using-electron-to-create-videos-canvas-ffmpeg-5gdm)
  * Images should render to jpg or allow user to choose format in settings
  * Videos should render to mp4 or allow user to choose format in settings
* Add ability to open files via file browser context menu (right-click on file -> Open with -> select app)

---

### Complete


* ~~Auto resize button isn't quite correct, need to adjust to fit perfectly in both dimensions~~ (12/22/25)
  * ~~Need to account for if video is larger than user's screen resolution~~ (12/22/25)
  * ~~Adjust button icon to indicate if current size is larger or smaller than video's native size~~ (12/22/25)
* ~~Fix issue where selected tool doesn't re-select after closing and opening a new file in one of the panes~~ (12/21/25)
* ~~Add ability to change size of tool when right-clicking and dragging~~ (12/21/25)
* ~~circle toolMode is broken for videos again~~ (12/21/25)
* ~~Add ability to open images~~ (12/20/25)
* ~~Fix file directory opening feature (clicking on the filename should open the containing folder of the file)~~ (12/20/25)
* ~~Fix issue where panning doesn't work when clipping tool is locked.~~ (12/20/25)
* ~~Update timecode to use HH:MM:SS:FF format~~ (12/20/25)
* ~~Add ability to re-center the video elements if the user double-clicks the middle mouse button.~~ (12/20/25)
* ~~Fix issue where progress bar slider does not pause video when attempting to scrub while video is playing~~
  * ~~_Issue is due to looped controls — i.e. slider position gets set by playbackStatus.playbackPosition which is set by video position as it updates (as video plays), slider cannot then set playbackStatus.playbackPosition because it will immediately be overridden by video if video is playing. __Need to force pause video, update video element playback position, which will then update playbackStatus.playbackPosition value.___~~ (12/20/25)
* ~~Round zoom percentage values to match percentage label values.~~ (7/18/24)
* ~~Allow using horizontal scroll wheel to scrub video~~ (7/18/24)
* ~~Add video details overlay (added via same element as zoom overlay)~~ (7/18/24)
* ~~Create a snap at "real size" zoom (1:1 pixel ratio) wherever that falls based on video pixel values.~~ (7/18/24)
* ~~Add absolute size to zoom display (px as well as %)~~ (7/18/24)
* ~~Fix issue where resizing the window causes the clipped video to become misaligned with the non-clipped video. Non-clipped video is correct~~ (7/18/24)
* ~~Allow picking audio track that plays~~ (5/14/24)
* ~~Add ability to stick position of clipper~~ (5/14/24)
* ~~Fix loop button~~ (5/14/24)
* ~~Figure out icons for swap videos & loop.~~ (5/14/24)
* ~~Fix UI issue where controller bar is hidden due to clipper size pushing it below container bounds~~ (5/14/24)
* ~~Fix icons in Windows taskbar & window Title bar~~ (5/14/24)
* ~~Add pan on middle click + drag~~  (6/15/24)
* ~~Add zoom on scroll wheel~~ (6/15/24)
  * ~~Show zoom position/scale display~~ (6/15/24)
  * ~~Show animation on media container elem when attempting to zoom in/out beyond the limits~~ (6/15/24)
  * ~~Fix slight scale mismatch between videos when zoomed in divider mode~~ (6/15/24)
* ~~Fix issue where clipped video is scaled too large when clipper is larger than media container~~ (6/15/24)
