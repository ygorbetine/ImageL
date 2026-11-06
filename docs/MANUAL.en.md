# ImageL Manual (English) · [Português](MANUAL.pt.md)

ImageL is ImageJ in the browser/desktop with a modern interface. **All original ImageJ functions remain available.**

## 1. Installation
- **Desktop (Windows):** run `ImageL-<version>.exe` (single file, ~56 MB). Requires WebView2 (included in Windows 11) and internet on first use (downloads the CheerpJ runtime).
- **Browser:** open the site with `?ui=new` for the modern interface.

## 2. Main screen
- **Top bar:** menus (File, Edit, Image, Process…; `»` shows the rest), command search, window modes, quick buttons.
- **Toolbar:** large ImageJ tool icons. Icons with a small triangle group variants. `»` opens extra tools (ImageJ macros); the list opens next to the button.
- **Status bar:** CheerpJ state and memory use.

### Top bar buttons
| Button | Function |
|---|---|
| Search commands (Ctrl+K) | Run any ImageJ command by name. `Tab` on an empty area also opens it. |
| With background / No background | Normal or overlay mode (section 5). |
| Curves icon (Gap) | Gap distance (scratch assay). Click = one image; **Shift+click** = batch folder. |
| AI | Autonomous AI tool panel. |
| Window icon | Switch to classic ImageJ. |
| Lightning | Lite mode (fewer effects, for weak PCs). |
| Pin (No background only) | Toggle "always on top". |
| PT/EN | Language. |
| Moon/Sun | Dark/light theme. |

The toolbar also has a button to switch between **horizontal** (below the menus) and **vertical**; double-click returns to automatic.

## 3. Windows and zoom
- Image windows are floating and draggable. When you **resize a window**, the image zoom follows the new size.
- Java dialogs (fields, dropdowns, Open/Save) follow the dark/light theme.

## 4. Gap distance (scratch / wound-healing assay)
Automates the manual workflow: two smooth contours (top and bottom) hugging the cell groups, plus straight lines measuring the distance between them.
1. Open the image and click the **Gap** button (or menu ImageL → *Gap distance…*).
2. Set in the dialog: number of measurement lines, texture radius, edge margin, **high-pass filter** (px; 0 = off; helps faint cells), curve smoothing, orientation (**auto** detects horizontal/vertical), draw contours and lines, and send measurements to the **Results** table (like Ctrl+M, one row per measurement).
3. Loose cells inside the gap are ignored; narrow "inlets" and spikes are removed.
4. Output: white contours, yellow lines, and a table with mean, SD, min, max and gap area.
- **Batch:** Shift+click the button (or *Gap distance (batch folder)…*) processes every image in a folder.

## 5. "No background" mode (desktop)
Bars and windows float over the desktop with no window frame; clicks pass through to apps behind wherever there is no interface.
- The window spans **all monitors**: bars and windows can be moved between monitors.
- Always-on-top is on by default; use the pin to turn it off.
- The status bar lives inside the top panel.
- Each mode **remembers positions** of bars and windows and restores them when you come back.
- Shortcuts: **Ctrl+Shift+B** toggles With/No background; **Ctrl+Shift+P** pins on top (outside No background).

## 6. AI tool
Open the **AI** panel, describe the task in plain language (e.g. "segment nuclei and count") and ImageL generates and runs ImageJ macros. Review the result; you can undo with ImageJ's Ctrl+Z.

## 7. Shortcuts
| Shortcut | Action |
|---|---|
| Ctrl+K | Command palette |
| Tab (empty area) | Command palette |
| Esc | Close menus/palette |
| Ctrl+Shift+B | With ↔ No background (desktop) |
| Ctrl+Shift+P | Always on top (desktop) |
| Ctrl+M / Ctrl+D | Measure / add to ROI Manager (ImageJ) |

## 8. Troubleshooting
- **Empty screen on start:** wait for "CheerpJ ready" in the status bar; the first load downloads the runtime.
- **Slow:** enable lite mode and close unused images.
- **A new button is missing:** you are on an old build; use the latest version.

## 9. Versions
See `CHANGELOG.md` and `ROADMAP.md`.
