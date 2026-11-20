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
- Neon React/Electron interface: Dashboard, Color & Vibrance, Resolution, Crosshair, Game Profiles, Performance and Settings.
- NVIDIA GPU/driver detection via Windows WMI.
- Windows display mode enumeration and validation with ChangeDisplaySettingsEx.
- Per-process game watcher: applies a display mode when a configured process starts and requests restoration when it exits.
- Color preset UI and crosshair design preview.
- No game file editing, injection or memory access.

## Important limitations
- Color sliders currently save and preview a VANTAFPS profile; they do not change NVIDIA Digital Vibrance or Freestyle/Game Filters.
- Crosshair is currently a designer preview, not a separate always-on-top click-through overlay.
- Resolution restoration is attempted on process exit and normal app close; forced termination, crash, power loss or reboot can interrupt restoration. Add a recovery watchdog and safe rollback before public release.
- NVIDIA Freestyle/Game Filters are controlled by NVIDIA and only available in supported games. VANTAFPS does not force unsupported titles.

## NVIDIA reference
NVIDIA's support page explains that Freestyle is integrated into the driver and only works in supported games:
https://nvidia.custhelp.com/app/answers/detail/a_id/5349/kw/discord

## Commercial release checklist
Before selling:
- Test display-mode changes/restoration on Windows 10/11, multiple GPUs, monitors, resolutions and mixed refresh.
- Implement a crash-safe recovery watchdog and emergency restore path.
- Validate supported NVIDIA control methods and SDK/API licensing/redistribution conditions.
- Implement actual desktop Digital Vibrance control where supported; fail gracefully elsewhere.
- Implement a true DPI-aware, click-through crosshair overlay and test compatibility/anti-cheat requirements.
- Add unit/integration tests, privacy policy, EULA, license and third-party notices, support process, signed installer, upgrades and uninstaller tests.
- Do not imply NVIDIA endorsement; VANTAFPS is an independent product.
