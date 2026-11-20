# VANTAFPS
A Windows desktop utility for NVIDIA GeForce users.

## Run from source
Requirements: Windows 10/11, Node.js 20+ and npm.

```powershell
npm install
npm run desktop
```

## Build installer and portable package
```powershell
npm run dist
```

## Current first-build contents
- Neon React/Electron UI with Dashboard, Color & Vibrance, Resolution, Crosshair, Game Profiles, Performance and Settings.
- NVIDIA adapter/driver detection through Windows WMI.
- Windows display mode enumeration, test and change via ChangeDisplaySettingsEx.
- Game process watcher to switch a selected display mode on process start and restore the captured mode on process exit.
- Saved local color presets and crosshair designer settings.
- No game file edits, DLL injection or game memory access.

## Known limitations — not ready for commercial distribution
- Color sliders and presets are currently UI/profile previews only. They do not yet control NVIDIA Digital Vibrance, desktop gamma ramps or NVIDIA Freestyle filters.
- The crosshair is currently a designer preview, not a separate click-through, always-on-top desktop overlay.
- Resolution restore is attempted after process exit and normal application shutdown. Forced termination, OS crash, reboot, GPU-driver reset or display hotplug may interrupt it. A companion recovery watchdog and failsafe need to be implemented and tested.
- NVIDIA Freestyle/Game Filters are controlled by NVIDIA and only work with compatible titles. VANTAFPS will not inject into unsupported games or bypass anti-cheat.

## NVIDIA compatibility reference
NVIDIA describes Freestyle as a driver-integrated post-processing feature for supported games. Its support article explains that the “supported game required” message generally means the game is not on its supported list:
https://nvidia.custhelp.com/app/answers/detail/a_id/5349/kw/discord

## Commercialization checklist
Before taking payments or distributing publicly:
- Add crash-safe restoration/watchdog service and visible emergency restore.
- Test display mode enumeration/change/rollback on Windows 10/11, NVIDIA driver versions, multiple monitors and mixed refresh rates.
- Implement real Digital Vibrance/color control through a supported and legally usable method; do not imply local sliders affect the GPU until they do.
- Check NVIDIA SDK/API licences, trademarks, redistribution terms and support boundaries.
- Implement a DPI-aware crosshair overlay, click-through behavior, monitor selection, hotkeys and anti-cheat compatibility tests.
- Add automated tests, code signing, installer upgrade/uninstall tests, privacy policy, EULA, licence notices and a customer support path.
- Market VANTAFPS as an independent product, not an official NVIDIA product.
