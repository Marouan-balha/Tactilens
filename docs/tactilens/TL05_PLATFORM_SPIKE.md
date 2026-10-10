# TL-05 platform spike: Fire TV / Vega feasibility

Status: BLOCKED (hardware unavailable; browser-first proof only)

## Objective

Establish whether the current repo can be treated as a Fire OS target, while being explicit that the actual hardware proof is currently blocked.

This spike documents the current evidence, the testing that can be performed without hardware, and the exact validation that remains pending when a Fire TV Stick 4K is available.

## Current evidence from the repo

### 1) The app is still a Vite + React web project

- `package.json` uses `vite`, `react`, `react-dom`, and standard web tooling.
- The app runs locally via `npm run dev` and `npm run build`.
- There are no Amazon runtime packages such as `@amazon-devices/*`, `kepler-*`, or `vega-*` in the dependency list.

### 2) There is no native Fire OS / Vega scaffolding

The repo does not contain the standard project indicators for a native Amazon target:

- no root `manifest.toml`
- no `build.gradle`
- no `app/src/main/AndroidManifest.xml`
- no native Amazon TV project structure

This means the repo is not currently a validated Fire OS Android app or a native Vega app.

### 3) The repo is intentionally framed as Fire TV, but not proven as such

The product docs describe the project as Fire TV-oriented, including:

- `README.md` saying it is “Designed for Amazon Fire TV”
- `index.html` metadata naming it as “Fire TV Opposition Intelligence”
- `docs/tactilens/ARCHITECTURE.md` explicitly stating the target is unproven and that browser execution is not TV compatibility evidence

This is a product intention, not a validated platform result.

## Current status: blocked but actionable

Because the Fire TV Stick 4K is not available, we cannot complete the acceptance gate for native Fire OS validation.

The valid status is:

- web app is validated and working locally
- TV feasibility is partially assessed via browser-first and remote-style reasoning
- actual Fire OS/device verification is still pending

We should not mark TL-05 as complete without hardware or an approved emulator/device runner.

## What can be validated now without hardware

### Browser-first TV proxy checks

- layout is readable at a distance in a wide-screen browser view
- text and controls are large enough for a living-room remote experience
- focus hierarchy is logically ordered
- no hover-only interactions exist
- tabs/buttons/cards are still usable without a mouse

### Remote-style interaction checks

- tab navigation is predictable
- focus can move through major controls in sequence
- the app can be used with keyboard-like navigation
- no major focus trap is present in the current flow

### Evidence to record

- screenshots of the app in a TV-like presentation
- notes on readability, focus order, and remote usability
- explicit statement that this is not native Fire OS proof

## What remains blocked

The following items remain unverified until Fire OS hardware is available:

1. app launch on Fire OS device
2. actual remote control behavior on the device
3. Fire TV navigation semantics for SELECT / BACK / focus
4. ten-foot readability on a real Fire TV display
5. video/player seek behavior on device hardware
6. packaging path / app install path for Fire OS

## Recommended next action

Use the current repo as a best-effort TV feasibility checkpoint, but treat the real Fire OS validation as pending until the Fire TV Stick 4K is available.

When hardware is available, run this exact validation sequence:

- connect to the same network as the dev machine
- enable ADB / developer options on the device
- install the app or launch the local build
- confirm app launch
- confirm focus traversal with the remote
- confirm text readability from a distance
- confirm evidence playback controls and seek
- record pass/fail results before moving on to TL-09

## Decision

The correct decision for now is: TL-05 is blocked by missing hardware, not failed. The platform remains unproven until device validation occurs.

This is the honest, plan-compliant status.
