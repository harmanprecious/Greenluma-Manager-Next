# Greenluma Manager Next By Harman

Modern Tauri + React desktop manager with profile-based AppID list management, Steam Store search, onboarding, multilingual UI, managed update checks, and a private download worker flow.

## Latest Release

**Version:** `1.0.1`

**Download:** [Greenluma Manager Next By Harman latest setup](https://worker.glnbyharman.workers.dev/manager/download)

### What's New In 1.0.1

- Improved startup and network error messages.
- Separated Steam, update server, GreenLuma package, rate limit, and missing file errors.
- GreenLuma download now reports HTTP errors clearly before ZIP extraction.
- Manager downloads now use a stable `latest.exe` object behind the private worker.

## Features

- Profile create, delete, select, and rename.
- Steam Store search with AppID result loading.
- Direct AppID add.
- AppList preparation flow.
- GreenLuma health checks with repair prompts.
- Onboarding wizard with Steam auto-detect.
- Turkish, English, Chinese, and Russian UI language support.
- Carbon Lime desktop theme.
- Update prompt with skip/download flow.

## Public Repository Scope

This repository contains the public app source code.

Included:

- Tauri/React app source
- Rust backend source
- Build configuration
- Public documentation

Not included:

- Private Cloudflare Worker source
- Rate limit implementation details
- Environment files or secrets
- Built installers
- `node_modules`, `dist`, or Rust `target` output

## Development

```powershell
cd gl-manager-next
npm install
npm run tauri dev
```

For production builds:

```powershell
cd gl-manager-next
npm run tauri build
```
