# App Design Document

## Project Goal
Build a React + TypeScript UI dashboard for Land Wargaming, incorporating structured planning tools, compact audio capture/transcription dictation, and file management mockup facilities.

## Visual Design System (Light Console Theme)
The application layout uses the light console theme:
- **Typography:**
  - Headings & Brand: **Outfit** (clean geometric sans-serif).
  - Interface Text & Labels: **Inter** (highly legible sans-serif).
- **Light Theme Color Palette & Layout (De-circularized):**
  - Global Backdrop: `#ffffff`.
  - Main Panel Background (`<main>` block): `#eef2ff` (light blue/lavender).
  - Sidebar Panel Background (`<aside>` block): `#ffffff` with `#e5e7eb` light gray borders.
  - Card Backdrops: `#ffffff` (white) with `#e5e7eb` light gray borders and clean shadows.
  - **Corner Radius:** Standardized on clean rectangular corners (`4px` border-radius) for all panels, cards, and containers (no highly circular/round corners).
  - Active Recording Outline: Solid vibrant blue outline (`3px solid #0087e0`) around the left main workspace while the recording card is open.
- **Mock title bar:**
  - Background: `#e0ecfb`.
  - Text color: `#1d4ed8`.
  - Border separator: `1px solid #cbd5e1`.

## Sidebar & OpOrder Panel
- The right sidebar renders the **Op ORDER (OPORD)** editor panel directly, starting at the top without step label/tag headers.
- Input fields remain light mode gray (`#f4f4f5`) even when active for dictation (no dark slate highlight), with a blue focus border outline showing active state.
- Default placeholders for dictateable fields (`MISSION` and `EXECUTION`) are removed.

## StepBar Navigation (Below Main Card)
- **StepBar:** Restored to the bottom of the main section, maintaining a small vertical space with the card above.
- **Shadows:** The StepBar container has a card shadow (`box-shadow`) and white backdrop with `#e5e7eb` borders.
- **De-circularized layout:** The StepBar container and its child step buttons are formatted as clean rectangular elements (`4px` border-radius, no `999px` circular pills).
- **No Button Boundaries:** Step buttons do not have outer border boundaries (`border: 1px solid transparent`) or box shadows when inactive, creating a clean list aesthetic.
- **Label Wrapping:** Step names wrap dynamically into two lines to match screenshots (e.g. `Opening Narrative /` on line 1, `General Idea` on line 2).

## Compact Waveform Recorder
- Reconnected to the live backend server endpoint `http://127.0.0.1:8000/transcribe` via POST requests carrying WebM audio payloads.
- The voice briefing card includes a compact waveform container (`80px` height) with a centered baseline and a simple blue pointer.
- **Zero Margins:** The vertical spacing between the `MainToolbar` (LAND WARGAMING logo panel) and the recorder card is reduced to zero.
- The recorder card removes all dynamic subtitle text, target name text, and status tags (like "Live recording in progress").
- **Newly Added Buttons Logic:**
  - **Recording controls:** Starts recording with `recordAudio.svg`, pauses/resumes recording with `pause.svg`, and stops with `ongoingAudio.svg` (which automatically uploads and transcribes the audio block).
  - **Playback controls:** Once recorded audio is loaded, clicking the Play/Pause toggles the audio stream, `ongoingAudio.svg` resets the play position to 0, and clicking the mic discards the current track to start a new recording.
  - **Seek controls:** Clicking `tenMinutesBehiend.svg` or `tenMinutesAhead.svg` seeks the wavesurfer timeline backward/forward by 10s during playback.

## Label Wrapping
- **MainToolbar:** Action buttons wrap dynamically into two lines (e.g. `Upload` and `Plan Audio`).

## Component Tree & Files
- [App.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/App.tsx) - Top window header controls, solid blue outlines, restored bottom StepBar with shadows, clean sharp 4px border corners, and light simulated Explorer modals.
- [IconButton.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/IconButton.tsx) & [iconButton.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/iconButton.module.css) - Action buttons designed as light gray tiles with wrapping labels.
- [MainToolbar.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/MainToolbar.tsx) & [mainToolbar.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/mainToolbar.module.css) - Toolbar grids.
- [SidePanel.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/SidePanel.tsx) & [sidePanel.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/sidePanel.module.css) - Sidebar mounting OPORD panel directly with sharp 4px corners.
- [StepBar.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/StepBar.tsx) & [stepBar.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/components/stepBar.module.css) - Breadcrumbs progress navigation with wrapped step names, shadows, and rectangular steps with no boundary.
- [RecordAudioPanel.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/features/recordAudio/RecordAudioPanel.tsx) & [RecordAudioPanel.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/features/recordAudio/RecordAudioPanel.module.css) - Shorter wave audio recording card with sharp 4px corners, SVG assets for controls, and fully functional recording/playback logic.
- [OpOrderPanel.tsx](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/features/opOrder/OpOrderPanel.tsx) & [OpOrderPanel.module.css](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/src/features/opOrder/OpOrderPanel.module.css) - Extensible scrollable database input forms with light-mode dictation targets.