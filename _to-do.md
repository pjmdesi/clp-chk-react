# To-do List

(_Items are in priority order for each section_)

## UI

* Fix issue where progress bar slider does not pause video when attempting to scrub while video is playing
* Add slider to control volume for each vid
* Add warning when videos are not the same ratio / length
* Allow using horizontal scroll wheel to scrub video
* Allow swapping vertical scroll and horizontal scroll functions (vertical scroll = zoom | horizontal scroll = scrub <-> vertical scroll = scrub | horizontal scroll = zoom) [ use event listener: _**onwheel**_ and use x & y coordinates to distinguish between the 2 ]
* Add video details overlay
* Add notes overlay
* Add ability to change size of tool when right-clicking and dragging
* Modals
  * Create modal template
  * Hook up modal buttons
* Update timecode to use HH:MM:SS:FF format, add second entry to indicate second vid timecode if different framerate
* Add length time label to end of timeline scrubber
* If videos are different lengths:
  * Allow timeline track to indicate where the shorter one ends
  * Allow user to pick whether black or last frame is shown
* Fix controller css animation at app launch
* Display audio waveform to indicate which / how loud each video is playing. [source](https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/)

## App

* Fix file directory opening feature
* Add ability to open images
* Allow for rendering of comparison window to video file. _No idea how to do that..._ [Maybe this?](https://dev.to/yonatanbd/using-electron-to-create-videos-canvas-ffmpeg-5gdm)
* Show error when video file fails to load (e.g. app loads after video is deleted, attempting to pull up the last video loaded). Currently shows black, error only present in console.
* Allow loading of entire folder and ability to quickly pick video/images from opened folder (probably as a sidebar or maybe as a separate, smaller window).
  * Add A/B selector to select which panel gets replaced by the selected file in the loaded folder
  **[ A** | B ]
* Add memory to recall on next app launch:
  * ~~Videos from last session~~ (5/14/24)
  * Tool & settings used from last session
  * General settings
  * Etc.

---

### Complete

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