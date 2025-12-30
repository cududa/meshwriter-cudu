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
 * Legacy MeshWriter factory function
 * Matches the old API: var Writer = BABYLON.MeshWriter(scene, prefs)
 */
function MeshWriterFactory(scene, preferences) {
    // Initialize CSG from BABYLON global
    if (typeof BABYLON !== 'undefined') {
        initCSGModule(BABYLON);
    }
    return createMeshWriter(scene, preferences);
}

// Attach static methods to factory
MeshWriterFactory.createAsync = async function(scene, preferences = {}) {
    // Initialize CSG from BABYLON global
    if (typeof BABYLON !== 'undefined') {
        initCSGModule(BABYLON);
    }
    return createMeshWriterAsync(scene, preferences);
};

MeshWriterFactory.isReady = isCSGReady;
MeshWriterFactory.getCSGVersion = getCSGVersion;
MeshWriterFactory.setCSGInitializer = setCSGInitializer;
MeshWriterFactory.setCSGReadyCheck = setCSGReadyCheck;
MeshWriterFactory.onCSGReady = onCSGReady;
MeshWriterFactory.markCSGReady = markCSGReady;
MeshWriterFactory.registerFont = registerFont;
MeshWriterFactory.getFont = getFont;
MeshWriterFactory.isFontRegistered = isFontRegistered;
MeshWriterFactory.codeList = codeList;
MeshWriterFactory.decodeList = decodeList;

// Attach to globals for browser usage
if (typeof window !== 'undefined') {
    window.MeshWriter = MeshWriterFactory;
    window.TYPE = MeshWriterFactory; // Legacy name
}

if (typeof global !== 'undefined') {
    global.MeshWriter = MeshWriterFactory;
}

// Attach to BABYLON namespace if available
if (typeof BABYLON !== 'undefined') {
    BABYLON.MeshWriter = MeshWriterFactory;
}

export default MeshWriterFactory;
