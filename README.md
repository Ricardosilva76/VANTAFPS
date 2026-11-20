# VANTAFPS
Windows desktop companion for NVIDIA GeForce users.

## Run
Requirements: Windows 10/11 and Node.js 20+.

```powershell
npm install
npm run desktop
```

## Build
```powershell
npm run dist
```

## Current implementation
- Neon React/Electron interface with Dashboard, Color & Vibrance, Resolution, Crosshair, Game Profiles, Performance and Settings.
- NVIDIA GPU/driver detection via Windows WMI.
- Windows resolution mode enumeration and validation with ChangeDisplaySettingsEx.
- Per-process watcher: applies a selected display mode when the configured process starts and requests restoration when it exits.
- Color preset controls and a visual preview; custom crosshair design preview.
- No game-file edits, injection or memory access.

## Important limitations
- Color sliders currently save/preview a VANTAFPS profile. They do not control NVIDIA Digital Vibrance, NVIDIA Freestyle or in-game post-processing yet.
- Crosshair is a visual designer preview. A proper transparent click-through always-on-top overlay is still to be built.
- Resolution restoration is attempted when the monitored process closes and on normal application shutdown. Forced termination, crash, reboot or display-driver reset can interrupt restoration; this must be hardened before public release.
- NVIDIA Freestyle/Game Filters are controlled by NVIDIA and available only to supported games. VANTAFPS will not inject into unsupported games or attempt to bypass anti-cheat.

## NVIDIA reference
NVIDIA explains that Freestyle is driver-integrated post-processing and a supported-game requirement means the current title may not be supported:
https://nvidia.custhelp.com/app/answers/detail/a_id/5349/kw/discord

## Commercial release checklist
Before selling or publicly distributing:
- Test Windows 10/11 display mode changes/restoration on different GPUs, displays, multi-monitor and mixed-refresh configurations.
- Implement a crash-safe recovery/watchdog mechanism and a user-visible failsafe.
- Validate NVIDIA control paths and any API/SDK licensing or redistribution requirements.
- Implement the actual desktop-wide Digital Vibrance control where supported, and handle unsupported driver versions gracefully.
- Build a true DPI-aware transparent crosshair overlay, hotkeys, multi-monitor controls and anti-cheat compatibility tests.
- Add automated tests, privacy policy, EULA, support process, signed installers, upgrade/uninstall tests and a security review.
- Avoid implying that VANTAFPS is endorsed by NVIDIA; it is an independent product.
