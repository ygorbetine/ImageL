// ImageL desktop (Tauri v2). Modo "Sem fundo": janela transparente sem moldura, sempre no topo, com click-through.
//
// Click-through com regioes ativas: o Tauri nao tem "forward" de mouse, entao o front-end reporta os retangulos
// interativos (janelas, barras, paleta) via `set_hit_regions` e uma thread consulta a posicao do cursor
// (~30 ms) ligando/desligando `set_ignore_cursor_events`. Fora dos retangulos o clique atravessa para o app abaixo.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Manager, State, WebviewWindow};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Default)]
struct Overlay {
    on: AtomicBool,
    rects: Mutex<Vec<Rect>>,
}

/// `(x, y)` em px CSS relativos a area cliente da janela. Borda inclusiva no lado esquerdo/topo.
pub fn hit(rects: &[Rect], x: f64, y: f64) -> bool {
    rects.iter().any(|r| x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
}

fn err<E: ToString>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
fn set_overlay(window: WebviewWindow, state: State<'_, Arc<Overlay>>, on: bool) -> Result<(), String> {
    state.on.store(on, Ordering::SeqCst);
    window.set_decorations(!on).map_err(err)?;
    window.set_always_on_top(on).map_err(err)?;
    if !on {
        window.set_ignore_cursor_events(false).map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
fn set_hit_regions(state: State<'_, Arc<Overlay>>, rects: Vec<Rect>) {
    if let Ok(mut g) = state.rects.lock() {
        *g = rects;
    }
}

#[tauri::command]
fn set_always_on_top(window: WebviewWindow, on: bool) -> Result<(), String> {
    window.set_always_on_top(on).map_err(err)
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Overlay::default()))
        .invoke_handler(tauri::generate_handler![set_overlay, set_hit_regions, set_always_on_top])
        .setup(|app| {
            let overlay = app.state::<Arc<Overlay>>().inner().clone();
            let win = app.get_webview_window("main").expect("janela main");
            std::thread::spawn(move || {
                let mut last_ignore: Option<bool> = None;
                loop {
                    std::thread::sleep(Duration::from_millis(30));
                    if !overlay.on.load(Ordering::SeqCst) {
                        last_ignore = None;
                        continue;
                    }
                    let (Ok(cur), Ok(pos), Ok(scale)) = (win.cursor_position(), win.inner_position(), win.scale_factor()) else {
                        continue;
                    };
                    let x = (cur.x - pos.x as f64) / scale;
                    let y = (cur.y - pos.y as f64) / scale;
                    let inside = overlay.rects.lock().map(|g| hit(&g, x, y)).unwrap_or(true);
                    let ignore = !inside;
                    if last_ignore != Some(ignore) {
                        let _ = win.set_ignore_cursor_events(ignore);
                        last_ignore = Some(ignore);
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o ImageL desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(x: f64, y: f64, w: f64, h: f64) -> Rect {
        Rect { x, y, w, h }
    }

    #[test]
    fn dentro_e_fora() {
        let rects = [r(10.0, 10.0, 100.0, 50.0), r(300.0, 300.0, 20.0, 20.0)];
        assert!(hit(&rects, 10.0, 10.0));
        assert!(hit(&rects, 109.9, 59.9));
        assert!(!hit(&rects, 110.0, 30.0)); // borda direita exclusiva
        assert!(!hit(&rects, 5.0, 5.0));
        assert!(hit(&rects, 310.0, 310.0));
    }

    #[test]
    fn sem_regioes_tudo_atravessa() {
        assert!(!hit(&[], 1.0, 1.0));
    }
}
