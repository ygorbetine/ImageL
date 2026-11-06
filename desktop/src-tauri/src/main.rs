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
    /// posicao/tamanho/maximizada da janela antes do "Sem fundo", para restaurar ao sair
    saved: Mutex<Option<(tauri::PhysicalPosition<i32>, tauri::PhysicalSize<u32>, bool)>>,
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
    let was_on = state.on.swap(on, Ordering::SeqCst);
    if on && !was_on {
        // "Sem fundo": a janela transparente cobre o monitor inteiro, para barras e janelas irem a qualquer ponto da tela
        let max = window.is_maximized().unwrap_or(false);
        if max { let _ = window.unmaximize(); }
        if let (Ok(p), Ok(s)) = (window.outer_position(), window.outer_size()) {
            if let Ok(mut g) = state.saved.lock() { *g = Some((p, s, max)); }
        }
    }
    window.set_decorations(!on).map_err(err)?;
    // sem sombra = sem a borda fina que o Windows 11 desenha em volta da janela sem moldura
    let _ = window.set_shadow(!on);
    window.set_always_on_top(on).map_err(err)?;
    if on && !was_on {
        // cobre a area de TODOS os monitores (caixa envolvente): janelas internas podem passar de um monitor ao outro
        if let Ok(mons) = window.available_monitors() {
            if !mons.is_empty() {
                let x0 = mons.iter().map(|m| m.position().x).min().unwrap_or(0);
                let y0 = mons.iter().map(|m| m.position().y).min().unwrap_or(0);
                let x1 = mons.iter().map(|m| m.position().x + m.size().width as i32).max().unwrap_or(0);
                let y1 = mons.iter().map(|m| m.position().y + m.size().height as i32).max().unwrap_or(0);
                let _ = window.set_position(tauri::PhysicalPosition::new(x0, y0));
                let _ = window.set_size(tauri::PhysicalSize::new((x1 - x0) as u32, (y1 - y0) as u32));
            }
        }
    }
    if !on {
        window.set_ignore_cursor_events(false).map_err(err)?;
        if was_on {
            let saved = state.saved.lock().ok().and_then(|mut g| g.take());
            if let Some((p, s, max)) = saved {
                let _ = window.set_size(s);
                let _ = window.set_position(p);
                if max { let _ = window.maximize(); }
            }
        }
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


/// Servidor HTTP local (127.0.0.1, porta aleatoria) que serve os assets embutidos COM suporte a Range: o CheerpJ le
/// os JARs por requisicoes parciais, o que o protocolo de assets do Tauri nao atende. Continua sendo um arquivo so.
fn parse_range(h: &str, len: usize) -> Option<(usize, usize)> {
    let r = h.trim().strip_prefix("bytes=")?;
    let (a, b) = r.split_once('-')?;
    if a.is_empty() {
        let n: usize = b.parse().ok()?;
        return Some((len.saturating_sub(n), len.saturating_sub(1)));
    }
    let start: usize = a.parse().ok()?;
    let end: usize = if b.is_empty() { len.saturating_sub(1) } else { b.parse::<usize>().ok()?.min(len.saturating_sub(1)) };
    if start > end || start >= len { None } else { Some((start, end)) }
}

/// Leitor de uma fatia de um buffer compartilhado (sem copiar arquivos grandes a cada requisicao).
struct Slice { data: Arc<Vec<u8>>, pos: usize, end: usize }
impl std::io::Read for Slice {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let n = buf.len().min(self.end - self.pos);
        buf[..n].copy_from_slice(&self.data[self.pos..self.pos + n]);
        self.pos += n;
        Ok(n)
    }
}

type AssetCache = Mutex<std::collections::HashMap<String, (Arc<Vec<u8>>, String)>>;

fn handle(app: &tauri::AppHandle, cache: &AssetCache, req: tiny_http::Request) {
    let raw = req.url().split(['?', '#']).next().unwrap_or("/").to_string();
    let mut path = raw.trim_start_matches('/').to_string();
    if path.is_empty() || path.ends_with('/') { path.push_str("index.html"); }
    let hit = cache.lock().ok().and_then(|c| c.get(&path).cloned());
    let found = hit.or_else(|| {
        let a = app.asset_resolver().get(path.clone())?;
        let v = (Arc::new(a.bytes), a.mime_type);
        if let Ok(mut c) = cache.lock() { c.insert(path.clone(), v.clone()); }
        Some(v)
    });
    let hdr = |k: &str, v: &str| tiny_http::Header::from_bytes(k.as_bytes(), v.as_bytes()).unwrap();
    let Some((bytes, mime)) = found else {
        let _ = req.respond(tiny_http::Response::from_string("404").with_status_code(404));
        return;
    };
    let len = bytes.len();
    let range = req.headers().iter().find(|h| h.field.equiv("Range")).and_then(|h| parse_range(h.value.as_str(), len));
    let (status, s, e) = match range { Some((s, e)) => (206u16, s, e), None => (200u16, 0, len.saturating_sub(1)) };
    let size = if len == 0 { 0 } else { e - s + 1 };
    let mut headers = vec![hdr("Content-Type", &mime), hdr("Accept-Ranges", "bytes"), hdr("Cache-Control", "no-cache")];
    if status == 206 { headers.push(hdr("Content-Range", &format!("bytes {}-{}/{}", s, e, len))); }
    let reader = Slice { data: bytes, pos: s, end: s + size };
    let _ = req.respond(tiny_http::Response::new(tiny_http::StatusCode(status), headers, reader, Some(size), None));
}

fn serve_assets(app: tauri::AppHandle) -> Result<u16, String> {
    let server = Arc::new(tiny_http::Server::http("127.0.0.1:0").map_err(err)?);
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("sem porta")?;
    let cache: Arc<AssetCache> = Arc::new(Mutex::new(Default::default()));
    for _ in 0..8 {
        let (server, cache, app) = (server.clone(), cache.clone(), app.clone());
        std::thread::spawn(move || {
            while let Ok(req) = server.recv() { handle(&app, &cache, req); }
        });
    }
    Ok(port)
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Overlay::default()))
        .invoke_handler(tauri::generate_handler![set_overlay, set_hit_regions, set_always_on_top])
        .setup(|app| {
            let overlay = app.state::<Arc<Overlay>>().inner().clone();
            let win = app.get_webview_window("main").expect("janela main");
            let _ = win.set_title(&format!("ImageL {}", env!("IMAGEL_VERSION")));
            let port = serve_assets(app.handle().clone())?;
            let url: tauri::Url = format!("http://127.0.0.1:{}/index.html?ui=new&nosw=1", port).parse().map_err(err)?;
            eprintln!("ImageL assets em {}", url);
            win.navigate(url).map_err(err)?;
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
