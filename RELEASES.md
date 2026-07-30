# Releases and Downloads

This repository contains the public source code for Greenluma Manager Next.

Release binaries and download routing are handled outside the public repository. The download proxy/worker configuration is intentionally kept private so rate limiting and storage details are not exposed in the open-source tree.

## Manager Updates

The app checks a public update manifest endpoint. A release manifest should include:

```json
{
  "version": "1.0.1",
  "url": "https://worker.glnbyharman.workers.dev/manager/download",
  "notes": "Release notes"
}
```

For future updates, publish the newest installer as the stable download object used by the private worker, then update the manifest version and notes.

## GreenLuma Package

The GreenLuma package is also served through the private download worker. Keep the package object name stable when possible so worker code does not need to change for every package refresh.

## Public Repository Scope

The public repository should include:

- Tauri/React app source
- Rust backend source
- Build configuration
- Documentation

The public repository should not include:

- Worker source or rate limit rules
- Cloudflare local state
- Environment files or secrets
- Built installers
- `node_modules`, `dist`, or Rust `target` output
