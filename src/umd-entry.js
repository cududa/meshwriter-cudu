/**
 * MeshWriter UMD Entry Point
 * Bundles fonts and attaches to window.MeshWriter and BABYLON.MeshWriter
 */

import {
    createMeshWriter,
    createMeshWriterAsync,
    isCSGReady,
    getCSGVersion,
    setCSGInitializer,
    setCSGReadyCheck,
    onCSGReady,
    markCSGReady,
    initCSGModule
} from './meshwriter.js';

import {
    registerFont,
    registerFontAliases,
    getFont,
    isFontRegistered,
    codeList,
    decodeList
} from './fontRegistry.js';

// Import all fonts for UMD bundle
import helvetica from '../fonts/helvetica.js';
import comicSans from '../fonts/comic-sans.js';
import jura from '../fonts/jura.js';
import hirukoPro from '../fonts/hiruko-pro.js';
import webglDings from '../fonts/webgl-dings.js';

// Register fonts with standard names
registerFont('HelveticaNeue-Medium', helvetica);
registerFont('Helvetica', helvetica);
registerFont('Arial', helvetica);
registerFont('sans-serif', helvetica);
registerFont('HirukoPro-Book', hirukoPro);
registerFont('Comic', comicSans);
registerFont('comic', comicSans);
registerFont('ComicSans', comicSans);
registerFont('Jura', jura);
registerFont('jura', jura);
registerFont('WebGL-Dings', webglDings);
registerFont('Web-dings', webglDings);

/**
 * Get the BABYLON global if available
 * @returns {any}
 */
function getBabylonGlobal() {
    if (typeof globalThis !== 'undefined' && globalThis.BABYLON) {
        return globalThis.BABYLON;
    }
    return undefined;
}

/**
 * Legacy MeshWriter factory function
 * Matches the old API: var Writer = BABYLON.MeshWriter(scene, prefs)
 * @param {any} scene
 * @param {any} preferences
 */
function MeshWriterFactory(scene, preferences) {
    // Initialize CSG from BABYLON global
    const babylon = getBabylonGlobal();
    if (babylon) {
        initCSGModule(babylon);
    }
    return createMeshWriter(scene, preferences);
}

// Attach static methods to factory
/** @type {any} */
const factory = MeshWriterFactory;

factory.createAsync = async function(scene, preferences = {}) {
    // Initialize CSG from BABYLON global
    const babylon = getBabylonGlobal();
    if (babylon) {
        initCSGModule(babylon);
    }
    return createMeshWriterAsync(scene, preferences);
};

// Sync create method (alias for backwards compatibility)
factory.create = function(scene, preferences = {}) {
    const babylon = getBabylonGlobal();
    if (babylon) {
        initCSGModule(babylon);
    }
    return createMeshWriter(scene, preferences);
};

factory.isReady = isCSGReady;
factory.getCSGVersion = getCSGVersion;
factory.setCSGInitializer = setCSGInitializer;
factory.setCSGReadyCheck = setCSGReadyCheck;
factory.onCSGReady = onCSGReady;
factory.markCSGReady = markCSGReady;
factory.registerFont = registerFont;
factory.getFont = getFont;
factory.isFontRegistered = isFontRegistered;
factory.codeList = codeList;
factory.decodeList = decodeList;

// Attach to globals for browser usage
if (typeof window !== 'undefined') {
    /** @type {any} */
    const win = window;
    win.MeshWriter = factory;
    win.TYPE = factory; // Legacy name
}

if (typeof globalThis !== 'undefined') {
    /** @type {any} */
    const gt = globalThis;
    if (gt.global) {
        gt.global.MeshWriter = factory;
    }
}

// Attach to BABYLON namespace if available
const babylon = getBabylonGlobal();
if (babylon) {
    babylon.MeshWriter = factory;
}

export default factory;
