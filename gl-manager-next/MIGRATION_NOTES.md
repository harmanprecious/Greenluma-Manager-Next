# Migration Notes

## Python to Tauri Mapping

| Original | New location | Notes |
| --- | --- | --- |
| `Game` | `src-tauri/src/manager.rs::AppEntry` and `src/main.tsx::AppEntry` | Serialized with the same `id`, `name`, `type` shape. |
| `Profile` | `src-tauri/src/manager.rs::Profile` | Keeps the original JSON structure. |
| `ProfileManager.load_profiles` | `list_profiles` command | Creates storage and `default` profile when missing. |
| `ProfileManager.create_profile` | `create_profile` command | Adds duplicate and empty-name validation. |
| `ProfileManager.remove_profile` | `delete_profile` command | Keeps `default` protected. |
| `Config` | `Settings` | Keeps compatible fields and adds modern defaults. |
| `queryGames` | `search_apps` command | Searches Steam Store and appends DLC results when available. |
| `createFiles` | `export_app_list` command | Recreates `AppList` and writes numbered AppID files. |
| `Qt/logic.py` profile UI | `src/main.tsx` | React state and Tauri commands. |
| `Qt/logic.py` settings UI | `src/main.tsx` modal | Manual path input for now; file picker can be added with Tauri dialog plugin. |

## Intentionally Isolated

External launch automation is not implemented in this scaffold. If a local-only integration is needed later, keep it behind a separate command/module so the manager remains testable and the profile/export logic stays independent.

## Next Work

- Add Tauri dialog plugin for folder picking.
- Add import/export backup UI.
- Add profile rename and duplicate-profile actions.
- Add a Rust unit-test target once Cargo is available.
- Add Windows installer metadata and icons.
