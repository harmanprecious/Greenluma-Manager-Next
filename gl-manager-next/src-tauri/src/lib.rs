mod manager;

use manager::{
    check_app_update, check_greenluma_health, create_profile, delete_profile, detect_steam_path,
    download_and_install_app_update, download_app_update, export_app_list, get_settings,
    install_greenluma_zip, install_managed_greenluma, list_profiles, localize_initial_profile,
    prepare_runtime, rename_profile, repair_managed_greenluma, reset_app_data, save_settings,
    search_apps, update_profile_games, validate_greenluma_path, validate_steam_path,
};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            list_profiles,
            create_profile,
            delete_profile,
            rename_profile,
            localize_initial_profile,
            update_profile_games,
            search_apps,
            export_app_list,
            prepare_runtime,
            detect_steam_path,
            validate_steam_path,
            validate_greenluma_path,
            check_greenluma_health,
            install_greenluma_zip,
            install_managed_greenluma,
            repair_managed_greenluma,
            reset_app_data,
            check_app_update,
            download_app_update,
            download_and_install_app_update
        ])
        .run(tauri::generate_context!())
        .expect("failed to run application");
}
