// apps/desktop/src/lib.rs
#[cfg(desktop)]
use tauri_plugin_shell::process::CommandChild;
#[cfg(desktop)]
use tauri::Manager;
#[cfg(desktop)]
use tauri_plugin_shell::ShellExt;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::GlobalShortcutExt;
#[cfg(desktop)]
use std::sync::Mutex;
use keyring::Entry;

#[cfg(desktop)]
struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

// --- 钥匙串/系统操作 ---

#[tauri::command]
fn store_token(token: String) -> Result<(), String> {
    let entry = Entry::new("cc.xloudmax.blog", "auth_token").map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_token() -> Result<Option<String>, String> {
    let entry = Entry::new("cc.xloudmax.blog", "auth_token").map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_token() -> Result<(), String> {
    let entry = Entry::new("cc.xloudmax.blog", "auth_token").map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// --- 应用运行入口 ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();
    
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            store_token, 
            get_token, 
            delete_token
        ])
        .setup(|_app| {
            #[cfg(desktop)]
            {
                let app = _app;
                // 1. 初始化系统托盘菜单 (仅桌面)
                let show_i = tauri::menu::MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
                let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "彻底退出", true, None::<&str>)?;
                let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

                let _tray = tauri::tray::TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                if let Some(state) = app.try_state::<SidecarState>() {
                                    if let Ok(mut child_lock) = state.child.lock() {
                                        if let Some(child) = child_lock.take() {
                                            let _ = child.kill();
                                        }
                                    }
                                }
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let tauri::tray::TrayIconEvent::Click { .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                // 2. 注册全局快捷键 (Cmd + Shift + B) (仅桌面)
                let shortcut = tauri_plugin_global_shortcut::Shortcut::new(Some(tauri_plugin_global_shortcut::Modifiers::SUPER | tauri_plugin_global_shortcut::Modifiers::SHIFT), tauri_plugin_global_shortcut::Code::KeyB);
                
                app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, _event| {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })?;

                // 3. 启动 Go Sidecar (仅桌面)
                println!("TAURI: Attempting to spawn sidecar 'c404-backend'...");
                
                // 使用编译时的清单目录解析 workspace/apps 根目录，避免依赖启动 cwd
                let desktop_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
                let workspace_root = desktop_dir.parent().unwrap_or(desktop_dir.as_path()).to_path_buf();

                // 动态解析数据库和上传路径
                let (db_path, uploads_path) = if cfg!(dev) {
                    // 开发环境下：指向项目根目录以便同步数据
                    (
                        workspace_root.join("backend/blog_platform.db"),
                        workspace_root.join("backend/uploads")
                    )
                } else {
                    // 生产环境下：使用系统的应用数据目录
                    let app_dir = app.path().app_data_dir().unwrap_or_default();
                    if !app_dir.exists() {
                        let _ = std::fs::create_dir_all(&app_dir);
                    }
                    (
                        app_dir.join("blog.db"),
                        app_dir.join("uploads")
                    )
                };

                // 尝试从 .env 读取 JWT_SECRET
                let jwt_secret = if cfg!(dev) {
                    let env_path = workspace_root.join("backend/.env");
                    std::fs::read_to_string(env_path).ok()
                        .and_then(|content| {
                            content.lines()
                                .find(|line| line.starts_with("JWT_SECRET="))
                                .map(|line| line.replace("JWT_SECRET=", ""))
                        })
                        .unwrap_or_else(|| "dev_unsafe_secret_do_not_use_in_prod".to_string())
                } else {
                    let app_dir = app.path().app_data_dir().unwrap_or_default();
                    let secret_path = app_dir.join("jwt.secret");
                    if let Ok(secret) = std::fs::read_to_string(&secret_path) {
                        secret
                    } else {
                        let new_secret = format!("{:x}{:x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos(), std::process::id());
                        let _ = std::fs::write(&secret_path, &new_secret);
                        new_secret
                    }
                };

                let sidecar_command = app.shell()
                    .sidecar("c404-backend")
                    .unwrap()
                    .env("PORT", "11451")
                    .env("DATABASE_URL", db_path.to_str().unwrap_or_default())
                    .env("BASE_PATH", uploads_path.to_str().unwrap_or_default())
                    .env("JWT_SECRET", jwt_secret);

                match sidecar_command.spawn() {
                    Ok((mut rx, child)) => {
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                        println!("SIDECAR | STDOUT: {}", String::from_utf8_lossy(&line));
                                    }
                                    tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                        eprintln!("SIDECAR | STDERR: {}", String::from_utf8_lossy(&line));
                                    }
                                    _ => {}
                                }
                            }
                        });

                        app.manage(SidecarState {
                            child: Mutex::new(Some(child)),
                        });
                    }
                    Err(e) => {
                        eprintln!("CRITICAL: Failed to spawn sidecar: {}", e);
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|_window, _event| {
            #[cfg(desktop)]
            {
                let window = _window;
                let event = _event;
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
