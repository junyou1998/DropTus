use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Manager, Runtime,
};
use tauri_plugin_positioner::{Position, WindowExt};

pub fn init_tray<R: Runtime>(app: &App<R>) -> Result<(), tauri::Error> {
    let show_i = MenuItem::with_id(app, "show", "顯示主視窗", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "結束程式", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&show_i)
        .separator()
        .item(&quit_i)
        .build()?;

    #[cfg(target_os = "macos")]
    let icon_bytes = include_bytes!("../icons/white_logo.png");
    #[cfg(not(target_os = "macos"))]
    let icon_bytes = include_bytes!("../icons/32x32.png");

    let icon = Image::from_bytes(icon_bytes)?;

    let _tray = TrayIconBuilder::with_id("main_tray")
        .icon(icon)
        .icon_as_template(cfg!(target_os = "macos"))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app_handle.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                let app_handle = tray.app_handle();
                if let Some(window) = app_handle.get_webview_window("tray") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.move_window(Position::TrayCenter);
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
