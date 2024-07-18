# To-do List

(_Items are kind of in priority order for each section_)

## UI

* Fix issue where progress bar slider does not pause video when attempting to scrub while video is playing
  * *Issue is due to looped controls — i.e. slider position gets set by playbackStatus.playbackPosition which is set by video position as it updates (as video plays), slider cannot then set playbackStatus.playbackPosition because it will immediately be overridden by video if video is playing. __Need to force pause video, update video element playback position, which will then update playbackStatus.playbackPosition value.__*
* Add ability to re-center the video elements if the user double-clicks the middle mouse button.
* Add slider to control volume for each vid (maybe scroll on volume button fills in button outline?)
* Add warning when videos are not the same ratio / length
* (?) If videos are different lengths:
  * Allow timeline track to indicate where the shorter one ends
  * Allow user to pick whether black or last frame is shown
* Allow swapping vertical scroll and horizontal scroll functions (vertical scroll = zoom | horizontal scroll = scrub <-> vertical scroll = scrub | horizontal scroll = zoom) [ use event listener: _**onwheel**_ and use x & y coordinates to distinguish between the 2 ]
* Add notes overlay
* Add ability to change size of tool when right-clicking and dragging
* Modals
  * Create modal template
  * Hook up modal buttons
  * Create Settings Menu
    * Smooth Zoom (animate between zoom ticks)
    * Auto load last videos (if applicable) toggle
    * Zoom minimums and maximums
* Update timecode to use HH:MM:SS:FF format, add second entry to indicate second vid timecode if different framerate
* Add length time label to end of timeline scrubber
* Fix controller css animation at app launch
* Fix issue where clipped video doesn't position on the Y-axis correctly if the controller bar is docked on startup
* Display audio waveform to indicate which / how loud each video is playing. [source](https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/)
* Fix issue where panning doesn't work when clipping tool is locked.
* Create info page for controls and keyboard shortcuts (if there ever are any).
* Fix issue where divider auto doesn't work if divider was locked before toggling auto on.

## App

* Fix file directory opening feature (clicking on the filename should open the containing folder of the file)
* Fix issue where selected tool doesn't re-select after closing and opening a new file in one of the panes
  * Reproduce: Select any tool except divider, close one of the files, open a new file in the same pane, observe that divider is set as tool, but previously selected tool is still indicated in the controller bar.
* Add ability to open images
* Allow for rendering of comparison window to video file. _No idea how to do that..._ [Maybe this?](https://dev.to/yonatanbd/using-electron-to-create-videos-canvas-ffmpeg-5gdm)
* Show error when video file fails to load (e.g. app loads after video is deleted, attempting to pull up the last video loaded). Currently shows black, error only present in console.
* Allow loading of entire folder and ability to quickly pick video/images from opened folder (probably as a sidebar or maybe as a separate, smaller window).
  * Add A/B selector to select which panel gets replaced by the selected file in the loaded folder
  **[ A** | B ]
  * Allow user to drag files into the panes to replace ones currently there
* Add memory to recall on next app launch:
  * ~~Videos from last session~~ (5/14/24)
  * Tool & settings used from last session
  * General settings
  * Etc.

---

### Complete

* ~~Round zoom percentage values to match percentage label values.~~ (7/18/24)
* ~~Allow using horizontal scroll wheel to scrub video~~ (7/18/24)
* ~~Add video details overlay (added via same element as zoom overlay)~~ (7/18/24)
* ~~Create a snap at "real size" zoom (1:1 pixel ratio) wherever that falls based on video pixel values.~~ (7/18/24)
* ~~Add absolute size to zoom display (px as well as %)~~ (7/18/24)
* ~~Fix issue where resizing the window causes the clipped video to become misaligned with the non-clipped video. Non-clipped video is correct~~ (7/18/24)
  * *[Fixed by adding resize listener, and re-running clipMedia() on resize](https://www.npmjs.com/package/react-resize-detector)*
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