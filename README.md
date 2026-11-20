# VANTAFPS

**Visual Control Suite for NVIDIA GeForce on Windows**

VANTAFPS is a Windows desktop companion for visual tuning, crosshair overlays, per-game display profiles and resolution automation. It is designed to leave game files untouched.

## Current project status

This repository contains the initial UI and Windows desktop foundation. Important distinctions:

- The neon React interface and local presets are implemented.
- Windows resolution enumeration, validated mode switching and game-process monitoring are implemented in the Electron main process using Windows display APIs.
- Display tuning controls in the first UI build are currently profile/preview controls. They do **not** yet write NVIDIA Digital Vibrance, Freestyle/Game Filter or driver values.
- A real crosshair overlay and robust crash/reboot recovery need additional Windows implementation and validation before release.
- NVIDIA Freestyle/Game Filters are NVIDIA-controlled and only available in supported games. VANTAFPS will not inject into games or bypass anti-cheat to force unsupported filters.

## Development

Requirements: Windows 10/11, Node.js 20+ and npm.

```powershell
npm install
npm run desktop
```

Build the Windows installer and portable package:

```powershell
npm run dist
```

## NVIDIA visual tuning roadmap

1. Detect NVIDIA GPU and driver capabilities.
2. Integrate only documented/supported NVIDIA control paths for desktop Digital Vibrance and display color settings where available.
3. Provide a Freestyle/Game Filters compatibility and setup helper for supported games, without pretending third-party controls can alter NVIDIA's private filter stack.
4. Store per-game VANTAFPS profiles and restore previous settings reliably.

## Safety principles

- No DLL injection, process memory editing, game file changes or game configuration edits.
- Validate display modes before applying them.
- Preserve the previous display mode and provide a restore action.
- Never promise a mode or filter that the driver/display/game does not support.

## Commercial release checklist

Before selling or distributing builds, add automated tests for mode change/restore, GPU and driver detection, app crash recovery, code signing, privacy policy, license and third-party notices. Review Electron dependencies and obtain any required NVIDIA SDK/API permissions. Do not use NVIDIA branding in a way that suggests VANTAFPS is an official NVIDIA product.
