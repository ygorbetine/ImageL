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
        if let (Ok(p), Ok(s)) = (window.outer_position(), window.inner_size()) {
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

/// true se o asset devolvido e o proprio index.html (fallback do resolver para caminhos inexistentes).
fn is_spa_fallback(app: &tauri::AppHandle, mime: &str, bytes: &[u8]) -> bool {
    mime.starts_with("text/html") && app.asset_resolver().get("index.html".to_string()).map_or(false, |i| i.bytes == bytes)
}

/// Decodifica %XX (UTF-8) de um parametro de URL.
fn pct_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..(i + 3).min(b.len())]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Nome de arquivo seguro (sem caminho nem caracteres invalidos no Windows).
pub fn safe_name(name: &str) -> String {
    let last = name.rsplit(['/', '\\']).next().unwrap_or("");
    let clean: String = last.chars().filter(|c| !c.is_control() && !"<>:\"|?*".contains(*c)).collect();
    let clean = clean.trim().trim_matches('.').to_string();
    if clean.is_empty() { "imagel-arquivo".into() } else { clean }
}

/// Salvar do ImageJ no desktop: grava direto na pasta Downloads (sem o download do WebView, que pede permissao para
/// "baixar varios arquivos"). Nao sobrescreve: "nome (1).ext", como o navegador faria.
fn save_download(app: &tauri::AppHandle, name: &str, data: &[u8]) -> Result<String, String> {
    let dir = app.path().download_dir().map_err(err)?;
    std::fs::create_dir_all(&dir).map_err(err)?;
    let name = safe_name(name);
    let (stem, ext) = match name.rfind('.') { Some(i) if i > 0 => (&name[..i], &name[i..]), _ => (name.as_str(), "") };
    // Salvar de novo com o mesmo nome sobrescreve o arquivo que ESTA sessao criou (como o ImageJ); arquivos que ja
    // existiam na pasta nunca sao sobrescritos.
    static MINE: Mutex<Option<std::collections::HashMap<String, std::path::PathBuf>>> = Mutex::new(None);
    let mut guard = MINE.lock().map_err(err)?;
    let mine = guard.get_or_insert_with(Default::default);
    let path = match mine.get(&name) {
        Some(p) => p.clone(),
        None => {
            let mut path = dir.join(&name);
            let mut n = 1;
            while path.exists() {
                path = dir.join(format!("{} ({}){}", stem, n, ext));
                n += 1;
            }
            path
        }
    };
    std::fs::write(&path, data).map_err(err)?;
    mine.insert(name.clone(), path.clone());
    Ok(path.to_string_lossy().into_owned())
}

fn handle(app: &tauri::AppHandle, cache: &AssetCache, mut req: tiny_http::Request, cors: bool, tok: &str) {
    let full = req.url().to_string();
    let raw = full.split(['?', '#']).next().unwrap_or("/").to_string();
    if raw == "/__save" {
        // So a propria pagina do app conhece o token (cabecalho proprio: outra origem nao consegue enviar sem preflight).
        let ok = !cors && *req.method() == tiny_http::Method::Post && req.headers().iter().any(|h| h.field.equiv("X-ImageL-Token") && h.value.as_str() == tok);
        let name = full.split('?').nth(1).and_then(|q| q.split('&').find_map(|kv| kv.strip_prefix("name="))).map(pct_decode).unwrap_or_default();
        let res = if ok {
            let mut data = Vec::new();
            match std::io::Read::read_to_end(req.as_reader(), &mut data) { Ok(_) => save_download(app, &name, &data), Err(e) => Err(e.to_string()) }
        } else { Err("nao autorizado".into()) };
        let (code, body) = match res { Ok(p) => (200, p), Err(e) => (if ok { 500 } else { 403 }, e) };
        let _ = req.respond(tiny_http::Response::from_string(body).with_status_code(code));
        return;
    }
    let mut path = raw.trim_start_matches('/').to_string();
    // O CDN do CheerpJ usa o status 231 para "isto e um diretorio" (a listagem esta em <dir>/index.list); o CheerpJ depende
    // disso para enumerar fontes e bibliotecas (sem isso o texto de varias janelas Java nao aparece).
    // Vale tambem para as pastas do app (/app/lib/ImageJ/plugins, macros...): sem isso o ImageJ nao enxerga os plugins.
    let has_list = !path.is_empty() && path.ends_with('/') && app.asset_resolver().get(format!("{}index.list", path)).map_or(false, |a| !is_spa_fallback(app, &a.mime_type, &a.bytes));
    if path.ends_with('/') && (has_list || path.starts_with("cheerpj/")) {
        let hdr = |k: &str, v: &str| tiny_http::Header::from_bytes(k.as_bytes(), v.as_bytes()).unwrap();
        let mut r = tiny_http::Response::from_string("").with_status_code(if has_list { 231 } else { 204 });
        if cors { r = r.with_header(hdr("Access-Control-Allow-Origin", "*")); }
        let _ = req.respond(r);
        return;
    }
    if path.is_empty() || path.ends_with('/') { path.push_str("index.html"); }
    let hit = cache.lock().ok().and_then(|c| c.get(&path).cloned());
    let found = hit.or_else(|| {
        let a = app.asset_resolver().get(path.clone())?;
        // O resolver do Tauri devolve o index.html para caminhos inexistentes (fallback de SPA): isso entregava HTML no lugar de
        // fontes/arquivos do CheerpJ. Se nao pediram uma pagina .html e veio HTML, o arquivo nao existe.
        if !path.ends_with(".html") && is_spa_fallback(app, &a.mime_type, &a.bytes) { return None; }
        let v = (Arc::new(a.bytes), a.mime_type);
        if let Ok(mut c) = cache.lock() { c.insert(path.clone(), v.clone()); }
        Some(v)
    });
    let hdr = |k: &str, v: &str| tiny_http::Header::from_bytes(k.as_bytes(), v.as_bytes()).unwrap();
    let Some((bytes, mime)) = found else {
        // diretorio sem "/" final: o CDN redireciona (301) para a versao com "/"
        if app.asset_resolver().get(format!("{}/index.list", path)).map_or(false, |a| !is_spa_fallback(app, &a.mime_type, &a.bytes)) {
            let mut r = tiny_http::Response::from_string("").with_status_code(301).with_header(hdr("Location", &format!("/{}/", path)));
            if cors { r = r.with_header(hdr("Access-Control-Allow-Origin", "*")); }
            let _ = req.respond(r);
            return;
        }
        // O CDN do CheerpJ responde 204 (e nao 404) para arquivos que nao existem; um arquivo "vazio" com 200 (ex.: fonte
        // Lucida de 0 bytes) quebra o desenho de texto no AWT.
        let code = if path.starts_with("cheerpj/") { 204 } else { 404 };
        let mut r = tiny_http::Response::from_string(if code == 204 { "" } else { "404" }).with_status_code(code);
        if cors { r = r.with_header(hdr("Access-Control-Allow-Origin", "*")); }
        let _ = req.respond(r);
        return;
    };
    let len = bytes.len();
    let range = req.headers().iter().find(|h| h.field.equiv("Range")).and_then(|h| parse_range(h.value.as_str(), len));
    let (status, s, e) = match range { Some((s, e)) => (206u16, s, e), None => (200u16, 0, len.saturating_sub(1)) };
    let size = if len == 0 { 0 } else { e - s + 1 };
    let mut headers = vec![hdr("Content-Type", &mime), hdr("Accept-Ranges", "bytes"), hdr("Cache-Control", "no-cache")];
    if cors {
        headers.push(hdr("Access-Control-Allow-Origin", "*"));
        headers.push(hdr("Access-Control-Expose-Headers", "content-length,content-range"));
        headers.push(hdr("Cross-Origin-Resource-Policy", "cross-origin"));
    }
    if status == 206 { headers.push(hdr("Content-Range", &format!("bytes {}-{}/{}", s, e, len))); }
    let reader = Slice { data: bytes, pos: s, end: s + size };
    let _ = req.respond(tiny_http::Response::new(tiny_http::StatusCode(status), headers, reader, Some(size), None));
}

/// Dois servidores locais em portas diferentes: o app (origem A) e o runtime CheerpJ embutido (origem B, com CORS).
/// O CheerpJ online roda em outra origem (cjrtnc.leaningtech.com); manter essa separacao no modo offline evita
/// diferencas de comportamento (texto em branco nas janelas Java quando tudo vinha da mesma origem).
fn serve_assets(app: tauri::AppHandle, tok: String) -> Result<(u16, u16), String> {
    let cache: Arc<AssetCache> = Arc::new(Mutex::new(Default::default()));
    let mut ports = Vec::new();
    for cors in [false, true] {
        let server = Arc::new(tiny_http::Server::http("127.0.0.1:0").map_err(err)?);
        ports.push(server.server_addr().to_ip().map(|a| a.port()).ok_or("sem porta")?);
        for _ in 0..8 {
            let (server, cache, app, tok) = (server.clone(), cache.clone(), app.clone(), tok.clone());
            std::thread::spawn(move || {
                while let Ok(req) = server.recv() { handle(&app, &cache, req, cors, &tok); }
            });
        }
    }
    Ok((ports[0], ports[1]))
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Overlay::default()))
        .invoke_handler(tauri::generate_handler![set_overlay, set_hit_regions, set_always_on_top])
        .setup(|app| {
            let overlay = app.state::<Arc<Overlay>>().inner().clone();
            let win = app.get_webview_window("main").expect("janela main");
            let _ = win.set_title(&format!("ImageL {}", env!("IMAGEL_VERSION")));
            // token por execucao para o endpoint de salvar (so a pagina do app o recebe)
            let tok = {
                use std::hash::{BuildHasher, Hasher};
                let mut h = std::collections::hash_map::RandomState::new().build_hasher();
                h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
                let a = h.finish();
                let mut h2 = std::collections::hash_map::RandomState::new().build_hasher();
                h2.write_u64(a);
                format!("{:016x}{:016x}", a, h2.finish())
            };
            let (port, cj_port) = serve_assets(app.handle().clone(), tok.clone())?;
            let offline = app.asset_resolver().get("cheerpj/4.2/loader.js".to_string()).map_or(false, |a| !is_spa_fallback(app.handle(), &a.mime_type, &a.bytes));
            let cj = if offline { format!("&cjbase=http://127.0.0.1:{}/cheerpj/4.2/", cj_port) } else { String::new() };
            let url: tauri::Url = format!("http://127.0.0.1:{}/index.html?ui=new&nosw=1&tok={}{}", port, tok, cj).parse().map_err(err)?;
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
