fn main() {
    // Comandos do app precisam de permissao explicita para paginas servidas por http://127.0.0.1 (origem "remota" no Tauri).
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["set_overlay", "set_hit_regions", "set_always_on_top"]),
        ),
    )
    .expect("falha no tauri-build");
}
