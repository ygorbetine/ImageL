fn main() {
    // Versao do ImageL (package.json) embutida no titulo da janela
    println!("cargo:rerun-if-changed=../../package.json");
    let pkg = std::fs::read_to_string("../../package.json").unwrap_or_default();
    let ver = pkg.split("\"version\"").nth(1).and_then(|r| r.split('"').nth(1)).unwrap_or("0").to_string();
    println!("cargo:rustc-env=IMAGEL_VERSION={}", ver);
    // Comandos do app precisam de permissao explicita para paginas servidas por http://127.0.0.1 (origem "remota" no Tauri).
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["set_overlay", "set_hit_regions", "set_always_on_top"]),
        ),
    )
    .expect("falha no tauri-build");
}
