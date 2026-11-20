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

## Implemented foundation
- Neon React/Electron desktop interface.
- NVIDIA GPU/driver detection using Windows WMI.
- Windows resolution enumeration and validation with ChangeDisplaySettingsEx.
- Per-process game profile watcher: applies a display mode on process start and restores the recorded mode when it exits.
- Color preset UI and crosshair design preview.
- No game file editing, injection or memory access.

## Important status
- Color sliders currently save and preview a local VANTAFPS profile; they do not yet change NVIDIA Digital Vibrance or Freestyle filters.
- Crosshair is currently a UI preview, not a separate always-on-top overlay window.
- Resolution restore is attempted on normal shutdown; a power loss or forced termination cannot be guaranteed to restore it.
- NVIDIA Freestyle/Game Filters are NVIDIA-controlled and only available in supported games. VANTAFPS will not force unsupported titles.

## NVIDIA notes
NVIDIA's official support page explains that Freestyle is driver-integrated post-processing for supported games and the supported-game requirement message generally indicates that the title is not supported:
https://nvidia.custhelp.com/app/answers/detail/a_id/5349/kw/discord

## Commercial release checklist
Before selling: validate display-mode restore on Windows 10/11 and multi-monitor systems; add crash-safe recovery; validate NVIDIA API/SDK licensing; implement true crosshair overlay and DPI handling; add tests, privacy policy, EULA, support, signed installer and uninstaller tests; avoid implying NVIDIA endorsement.
