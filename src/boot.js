// ImageL boot: inicializa CheerpJ, aplica patches de FS, carrega o ImageJ.
// (Extraido verbatim do script inline de index.html; console.* -> logger; imports relativos a src/.)
import { createLogger } from './logger.js';
import { splash } from './splash.js';
import { loadScript } from './lazy.js';

const log = createLogger('boot');
// Get the directory path, ensuring it ends with /
const baseUrl = location.pathname.endsWith('/')
  ? location.pathname
  : location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
function patchDownloader(){
  // Original DirectDownloader patch
  function ddlSend()
  {
      var downloader = this;
      var headers = {};
      var method = "GET";
      if(downloader.rangeHeader)
          headers["Range"] = downloader.rangeHeader;
      else if(downloader.metaDataOnly)
          headers["Range"] = "bytes=0-0";
      // Disabled redirect to imagej.net because their server doesn't support Range headers in CheerpJ 4.2
      // if(this.url.startsWith(`${baseUrl}lib/ImageJ/samples/`)){
      //     this.url = this.url.replace(`${baseUrl}lib/ImageJ/samples/`, 'https://imagej.net/images/');
      // }
      fetch(downloader.url, {"method": method, "mode": "cors", "headers" : headers})
          .then(function(response){
              ddlOnLoad(response, downloader);
          })
          .catch(function(err){
              ddlOnError(downloader, err);
          });
  }

  // Apply DirectDownloader patch
  DirectDownloader.prototype.send = ddlSend;
}

async function applyPatches(){
    patchDownloader();
    // Apply native file system patches from utils.js
    createNativeFileSystemPatches();
    // Apply local file system patches for drag-and-drop
    createLocalFileSystemPatches();
    // Apply GitHub file system patches
    createGitHubFileSystemPatches();
}

// Parse URL query parameters and get configuration
function parseURLConfig() {
    const urlParams = new URLSearchParams(window.location.search);
    const config = {
        mount: urlParams.get('mount'),
        pluginsDir: urlParams.get('plugins.dir')
    };
    return config;
}

// Parse URL query parameters and mount GitHub repos
async function parseAndMountGitHub() {
    const config = parseURLConfig();
    const mountParam = config.mount;

    if (!mountParam) {
        return;
    }

    // Parse mount parameter format: github:owner/repo@branch (branch is required now)
    if (mountParam.startsWith('github:')) {
        const repoSpec = mountParam.substring('github:'.length);
        const [repoPath, branch] = repoSpec.split('@');
        const [owner, repo] = repoPath.split('/');

        if (!owner || !repo || !branch) {
            log.error('Invalid GitHub mount format. Branch is required! Use: ?mount=github:owner/repo@branch');
            log.error('Example: ?mount=github:oeway/imagej-js-env-demo@main');
            return;
        }

        try {
            log.debug(`Mounting GitHub repository: ${owner}/${repo}@${branch}`);
            await window.githubFS.mountRepo(owner, repo, branch);
            log.debug(`Successfully mounted ${owner}/${repo}@${branch} at /github/${owner}/${repo}@${branch}`);

            // (Legacy UI note: a floating "Test ROI↔GeoJSON" button used
            // to toggle to "Test GitHub FS" here; functionality now lives
            // under Extensions → Test ROI ↔ GeoJSON.)
        } catch (err) {
            log.error('Failed to mount GitHub repository:', err);
            alert(`Failed to mount GitHub repository ${owner}/${repo}: ${err.message}`);
        }
    }
}

// Drag and drop handler
function setupDragAndDrop() {
    const dropOverlay = document.getElementById('dropOverlay');
    const localFilesStatus = document.getElementById('localFilesStatus');
    const localFilesList = document.getElementById('localFilesList');

    let dragCounter = 0;

    // Prevent default drag behaviors
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        if (dragCounter === 1) {
            dropOverlay.classList.add('active');
        }
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.remove('active');
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dropOverlay.classList.remove('active');

        log.debug('Files dropped!');

        const items = Array.from(e.dataTransfer.items);
        const files = Array.from(e.dataTransfer.files);

        // Check if localFS is available
        if (!window.localFS) {
            log.error('localFS not initialized yet');
            alert('File system not ready. Please wait a moment and try again.');
            return;
        }

        // Clear previous files
        window.localFS.clear();

        // Process dropped items
        if (items.length > 0 && items[0].webkitGetAsEntry) {
            // Use webkitGetAsEntry for better folder support
            const entries = items.map(item => item.webkitGetAsEntry()).filter(entry => entry !== null);

            for (const entry of entries) {
                if (entry.isFile) {
                    const file = await new Promise((resolve) => entry.file(resolve));
                    await window.localFS.addFile(file, entry.name);
                } else if (entry.isDirectory) {
                    await processDirectoryEntry(entry);
                }
            }
        } else {
            // Fallback to files array
            await window.localFS.addFiles(files);
        }

        // Update UI
        updateLocalFilesUI();

        log.debug(`Loaded ${window.localFS.files.size} files to /local`);

        // Auto-open the dropped files in ImageJ if it's running
        if (IJClass && window.localFS.files.size > 0) {
            try {
                log.debug('Opening dropped files in ImageJ...');

                // Get all file paths
                const filePaths = Array.from(window.localFS.files.keys());

                // Open each file
                for (const filePath of filePaths) {
                    const fullPath = `/local/${filePath}`;
                    log.debug('Opening:', fullPath);

                    // Use ImageJ macro to open the file
                    const macro = `open("${fullPath}");`;
                    await IJClass.runMacro(macro);
                }

                log.debug(`Successfully opened ${filePaths.length} file(s)`);
            } catch (err) {
                log.error('Error opening dropped files:', err);
            }
        } else if (!IJClass) {
            log.debug('ImageJ not ready yet - files added to /local but not opened automatically');
        }
    });

    async function processDirectoryEntry(dirEntry, basePath = '') {
        const path = basePath ? `${basePath}/${dirEntry.name}` : dirEntry.name;
        window.localFS.directories.add(path);

        const reader = dirEntry.createReader();
        const entries = await new Promise((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });

        for (const entry of entries) {
            if (entry.isFile) {
                const file = await new Promise((resolve) => entry.file(resolve));
                await window.localFS.addFile(file, `${path}/${file.name}`);
            } else if (entry.isDirectory) {
                await processDirectoryEntry(entry, path);
            }
        }
    }

    let localFilesStatusTimeout = null;

    function updateLocalFilesUI() {
        if (window.localFS.isEmpty()) {
            localFilesStatus.classList.add('hidden');
        } else {
            localFilesStatus.classList.remove('hidden');
            const fileCount = window.localFS.files.size;
            const dirCount = window.localFS.directories.size;
            localFilesList.textContent = `${fileCount} file(s), ${dirCount} folder(s)`;

            // Clear any existing timeout
            if (localFilesStatusTimeout) {
                clearTimeout(localFilesStatusTimeout);
            }

            // Auto-hide after 5 seconds
            localFilesStatusTimeout = setTimeout(() => {
                localFilesStatus.classList.add('hidden');
            }, 5000);
        }
    }
}

// Global variables to store library and class references
let lib = null;
let IJClass = null;

// Register menu handlers (invoked from com.hack.menu.MenuRegistry via the
// nativeInvokeJSHandler bridge). The "Extensions" menu is installed on
// ImageJ's menu bar further down in the main boot script.
window.__menuHandlers = window.__menuHandlers || {};

window.__menuHandlers.mount = async () => {
    if (!('showDirectoryPicker' in window)) {
        alert('Mount Local Folder requires a Chromium-based browser (Chrome, Edge, Opera).');
        return;
    }
    if (window.nativeFS && typeof window.nativeFS.loadDirectory === 'function') {
        await window.nativeFS.loadDirectory();
    } else {
        log.warn('[menu:mount] nativeFS not ready');
    }
};

window.__menuHandlers['roi-test'] = () => runRoiGeoJsonTest();

window.__menuHandlers['cellpose'] = async () => {
    try {
        if (!window.cellposeIntegration) {
            await loadScript(`${baseUrl}cellpose-integration.js?v=3`);
        }
        if (window.cellposeIntegration) {
            window.cellposeIntegration.show();
        } else {
            alert('Cellpose integration not available.');
        }
    } catch (e) {
        log.error('Cellpose:', e);
        alert('Cellpose integration could not be loaded: ' + e.message);
    }
};

async function runRoiGeoJsonTest() {
    try {
        if (!IJClass) {
            alert('IJ class not loaded yet. Please wait for ImageJ to start.');
            return;
        }
        log.debug('🧪 Testing ROI ↔ GeoJSON conversion...');
        await IJClass.log('========================================');
        await IJClass.log('🧪 TEST: ROI ↔ GeoJSON Round-trip');
        await IJClass.log('========================================');

        let hasCurrentRoi = false;
        try {
            const imp = await IJClass.getImage();
            if (imp) {
                const currentRoi = await imp.getRoi();
                if (currentRoi) {
                    hasCurrentRoi = true;
                    await IJClass.log('✓ Found current ROI on active image');
                    const roiType = await currentRoi.getTypeAsString();
                    const roiName = await currentRoi.getName();
                    await IJClass.log(`  Type: ${roiType}`);
                    await IJClass.log(`  Name: ${roiName || 'Unnamed'}`);
                } else { await IJClass.log('No ROI selected on active image'); }
            } else { await IJClass.log('No active image'); }
        } catch (e) { await IJClass.log('No active image with ROI'); }

        let roiManagerCount = 0;
        try {
            const RoiManager = await window.lib.ij.plugin.frame.RoiManager;
            const rm = await RoiManager.getInstance();
            if (rm) {
                roiManagerCount = await rm.getCount();
                await IJClass.log(`✓ ROI Manager open with ${roiManagerCount} ROI(s)`);
            } else { await IJClass.log('ROI Manager not open'); }
        } catch (e) { await IJClass.log('ROI Manager not available'); }

        const { roiToGeoJson, geoJsonToRoi } = await import('../hypha-imagej-service.js');

        if (hasCurrentRoi || roiManagerCount > 0) {
            await IJClass.log('');
            await IJClass.log('PART 1: Converting ROIs → GeoJSON');
            await IJClass.log('─────────────────────────────────────');
            const features = [];
            if (hasCurrentRoi) {
                const imp = await IJClass.getImage();
                const currentRoi = await imp.getRoi();
                const feature = await roiToGeoJson(currentRoi, 'Current Selection', true);
                if (feature) { features.push(feature); await IJClass.log('✓ Converted current ROI'); }
            }
            if (roiManagerCount > 0) {
                const RoiManager = await window.lib.ij.plugin.frame.RoiManager;
                const rm = await RoiManager.getInstance();
                for (let i = 0; i < roiManagerCount; i++) {
                    const roi = await rm.getRoi(i);
                    const roiName = await roi.getName() || `ROI ${i + 1}`;
                    const feature = await roiToGeoJson(roi, roiName, true);
                    if (feature) {
                        feature.properties.index = i;
                        feature.properties.source = 'ROI Manager';
                        features.push(feature);
                    }
                }
                await IJClass.log(`✓ Converted ${roiManagerCount} ROI(s) from ROI Manager`);
            }
            const geojson = { type: "FeatureCollection", features: features };
            log.debug('GeoJSON Result:');
            log.debug(JSON.stringify(geojson, null, 2));
            await IJClass.log('');
            await IJClass.log(`✓ Exported ${features.length} ROI(s) to GeoJSON`);
            await IJClass.log('📋 GeoJSON printed to browser console (F12)');
            await IJClass.log('');
            await IJClass.log('PART 2: Converting GeoJSON → ROI');
            await IJClass.log('─────────────────────────────────────');
            await IJClass.log('Converting GeoJSON back to ROIs...');
            try {
                const RoiManager = await window.lib.ij.plugin.frame.RoiManager;
                let rm = await RoiManager.getInstance();
                if (!rm) { rm = await new RoiManager(); await IJClass.log('Created new ROI Manager'); }
                const count = await rm.getCount();
                if (count > 0) { await rm.runCommand('Delete'); await IJClass.log(`Cleared ${count} existing ROI(s)`); }
                let convertedCount = 0;
                for (const feature of geojson.features) {
                    try {
                        const roi = await geoJsonToRoi(feature);
                        if (roi) {
                            const originalName = await roi.getName();
                            await roi.setName(`[GeoJSON] ${originalName}`);
                            await rm.addRoi(roi);
                            convertedCount++;
                            await IJClass.log(`  ✓ Imported: ${originalName}`);
                        }
                    } catch (convError) { await IJClass.log(`  ✗ Failed to convert feature: ${convError.message}`); }
                }
                await IJClass.log('');
                await IJClass.log(`✓ Imported ${convertedCount} ROI(s) back from GeoJSON`);
                await IJClass.log('Check ROI Manager to see the round-trip results!');
            } catch (rmError) { await IJClass.log(`⚠️  Error with ROI Manager: ${rmError.message}`); }
        } else {
            await IJClass.log('');
            await IJClass.log('⚠️  No ROIs found!');
            await IJClass.log('To test: open an image, draw an ROI, then run this again.');
        }
        await IJClass.log('========================================');
    } catch (err) {
        log.error('Test error:', err);
        if (IJClass) await IJClass.log('✗ Error: ' + err.message);
        alert('Error: ' + (err.message || err.toString()));
    }
}

// Event listeners for the remaining UI wiring (drag-and-drop, etc.)
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    if (!('showDirectoryPicker' in window)) {
        log.warn('File System Access API not supported — Mount Local Folder menu item will alert.');
    }
});

// (The Extensions → "Test ROI↔GeoJSON" menu item calls runRoiGeoJsonTest()
// defined further above.)

// Get URL configuration
const urlConfig = parseURLConfig();

// Determine plugins directory
const pluginsDir = urlConfig.pluginsDir || `/app${baseUrl}lib/ImageJ/plugins`;
if (urlConfig.pluginsDir) {
    log.debug('Using custom plugins.dir from URL:', pluginsDir);
} else {
    log.debug('Using default plugins.dir:', pluginsDir);
}

splash.step('load.runtime', 10);
await cheerpjInit({
    clipboardMode: "java", // "permission" | "system" | "java"
    javaProperties: [
      "user.dir=/files",
      `plugins.dir=${pluginsDir}`,
      "useJFileChooser=true"
    ],
});

splash.step('load.runtime', 35);
await applyPatches();

// Parse and mount GitHub repos from URL parameters
await parseAndMountGitHub();

if (window.__shellReady) await window.__shellReady; // nova UI: monta as barras antes de medir o container
cheerpjCreateDisplay(-1, -1, document.getElementById("container"));
splash.step('load.ij', 50);

// Patch cheerpjDisplay to prevent click redirects on blank area only
function patchCheerpjDisplay() {
  const cheerpjDisplay = document.getElementById('cheerpjDisplay');
  
  if (cheerpjDisplay) {
    log.debug('Patching cheerpjDisplay to disable click redirects on blank area...');
    
    // Only block clicks when clicking DIRECTLY on the cheerpjDisplay div
    // This prevents CheerpJ's promotional redirect when clicking blank areas
    // but allows clicks on ImageJ windows and UI elements to work normally
    cheerpjDisplay.addEventListener('click', (e) => {
      // Only block if the click target is exactly the cheerpjDisplay div itself
      // (not on its children, which are the ImageJ windows)
      if (e.target === cheerpjDisplay) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        log.debug('Blocked click on blank area of cheerpjDisplay');
        return false;
      }
      // Let all other clicks through (ImageJ windows, buttons, menus, etc.)
    }, true); // Use capture phase to intercept before CheerpJ's handlers

    // Prevent the browser from scrolling the page when the user wheels over
    // an ImageJ image (the wheel event is consumed by the AWT bridge for
    // zoom/pan). Without this, the page scrolls behind the zoom, making
    // Google-Maps-style wheel interaction feel fight-y.
    cheerpjDisplay.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false, capture: true });

    // Safety net for a CheerpJ bug: during a window-border resize drag
    // CheerpJ creates a .cjResizerBorder overlay and registers its cleanup
    // on the resize handle's pointerup (`{once: true}`). When the pointer
    // is released outside the handle — which happens when the user shrinks
    // the window so far the handle moves under the cursor — that pointerup
    // sometimes doesn't fire (browser pointer-capture quirks), leaving the
    // border orphaned and the window un-shrinkable on subsequent tries.
    // Any time ANY pointerup or mouseup occurs anywhere, if the original
    // cleanup hasn't run, remove the orphan so the next resize works.
    const sweepOrphanResizerBorders = () => {
      // Defer so CheerpJ's own pointerup (if it's going to fire) runs first.
      setTimeout(() => {
        document.querySelectorAll('.cjResizerBorder').forEach(b => b.remove());
      }, 50);
    };
    window.addEventListener('pointerup', sweepOrphanResizerBorders, true);
    window.addEventListener('mouseup',   sweepOrphanResizerBorders, true);
    window.addEventListener('pointercancel', sweepOrphanResizerBorders, true);
    
    log.debug('✓ Patched cheerpjDisplay - only blank area clicks will be blocked');
    return true;
  }
  
  return false;
}

// Try to patch immediately, and retry with MutationObserver if element doesn't exist yet
if (!patchCheerpjDisplay()) {
  log.debug('cheerpjDisplay not found yet, waiting for it to be created...');
  
  // Use MutationObserver to detect when cheerpjDisplay is added
  const observer = new MutationObserver((mutations) => {
    if (patchCheerpjDisplay()) {
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also try again after a short delay as a fallback
  setTimeout(() => {
    if (patchCheerpjDisplay()) {
      observer.disconnect();
    }
  }, 1000);
}

// Load ImageJ as a library for JavaScript interop
try {
    log.debug('Loading ImageJ as library...');
    splash.step('load.ij', 60);
    lib = await cheerpjRunLibrary(`/app${baseUrl}lib/ImageJ/ij.jar`);

    log.debug('Accessing ImageJ and IJ classes...');
    // Access the ImageJ class (ij.ImageJ has the main method)
    const ImageJClass = await lib.ij.ImageJ;

    // Access the IJ class (ij.IJ has utility methods like runMacro, log, etc.)
    IJClass = await lib.ij.IJ;

    log.debug('Classes loaded successfully!');

    // Call ImageJ's main method with empty arguments
    log.debug('Starting ImageJ...');
    splash.step('load.plugins', 80);
    await ImageJClass.main([]);

    // Set ImageJ preferences directly via Prefs class AFTER starting
    // Note: Directory properties (user.dir, plugins.dir) are set via cheerpjInit's javaProperties
    // and read by ImageJ during initialization, so we don't set them here
    log.debug('Setting ImageJ preferences...');
    const Prefs = await lib.ij.Prefs;

    // Set useJFileChooser preference (public static field)
    Prefs.useJFileChooser = true;

    log.debug('ImageJ preferences set!');

    log.debug('ImageJ started successfully!');
    window.IJ = IJClass; // Expose IJ globally for debugging
    window.IJClass = IJClass; // Also expose as IJClass for Hypha service
    window.lib = lib; // Expose library globally for debugging

    // Install the "Extensions" top-level menu now that ImageJ's frame exists.
    // Each item dispatches to a JS handler registered in window.__menuHandlers
    // via the com.hack.menu.MenuRegistry → nativeInvokeJSHandler bridge.
    try {
        const MenuRegistry = await lib.com.hack.menu.MenuRegistry;
        // Mount Local Folder has been folded into the File > Open dialog
        // (click "Mount folder…" in that dialog). The Extensions menu now
        // carries only the features that don't belong under stock File.
        await MenuRegistry.addMenu(
            "Extensions",
            ["Connect to Hypha MCP...", "-", "Test ROI ↔ GeoJSON", "-", "Cellpose…"],
            ["mcp",                     "-", "roi-test",          "-", "cellpose"]
        );
        log.debug('Installed "Extensions" menu');
        window.dispatchEvent(new Event('imagel:ready'));
        splash.done();
    } catch (e) {
        log.warn('Failed to install Extensions menu:', e);
        window.dispatchEvent(new Event('imagel:ready'));
        splash.done();
    }
} catch (err) {
    log.error('Failed to load ImageJ:', err);
    splash.fail(err);
}

