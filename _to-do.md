# To-do List
### _Items are in priority order for each section_

## UI
* Fix issue where progress bar slider does not pause video when attempting to scrub while video is playing
* Add slider to control volume for each vid
* Fix issue where clipped video is scaled to large when clipper is larger than media container
* Add warning when videos are not the same ratio / length
* Add ability to open images
* Add zoom on scroll wheel
* Add video details overlay
* Add notes overlay
* Modals
  * Create modal template
  * Hook up modal buttons
* Update timecode to use HH:MM:SS:FF format, add second entry to indicate second vid timecode if different framerate
* Add length time label to end of timeline scrubber
* If videos are different lengths:
  * Allow timeline track to indicate where the shorter one ends
  * Allow user to pick whether black or last frame is shown
* Fix controller css animation at app launch
---
#### Complete
* ~~Allow picking audio track that plays~~ (5/14/24)
* ~~Add ability to stick position of clipper~~ (5/14/24)
* ~~Fix loop button~~ (5/14/24)
* ~~Figure out icons for swap videos & loop.~~ (5/14/24)
* ~~Fix UI issue where controller bar is hidden due to clipper size pushing it below container bounds~~ (5/14/24)

## App
* Fix file directory opening feature
* Allow for rendering of comparison window to video file. _No idea how to do that..._ [Maybe this?](https://dev.to/yonatanbd/using-electron-to-create-videos-canvas-ffmpeg-5gdm)
* Add memory to recall on next app launch:
  * Videos from last session
  * Tool & settings used from last session
  * General settings
  * Etc.
---
#### Complete
* ~~Fix icons in Windows taskbar & window Title bar~~ (5/14/24)