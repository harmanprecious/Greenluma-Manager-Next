# GL Manager Next

Modern Tauri + React rewrite scaffold for the original profile and AppID list manager.

## Scope

This app keeps the manager features:

- profile create/delete/select
- profile JSON import-compatible storage
- AppID search through Steam Store
- list editing
- AppList export
- settings and diagnostics

The external launch/injector automation is intentionally isolated from the manager code. The UI exposes status and configuration surfaces without implementing that flow.

## Development

Rust/Cargo and Node.js are required.

```powershell
npm install
npm run tauri dev
```

Current workspace note: this Codex environment has Node.js but no `cargo`, so the project was scaffolded but not compiled here.
