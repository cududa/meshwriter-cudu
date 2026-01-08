/**
 * MeshWriter - 3D Text Rendering for Babylon.js
 *
 * @example
 * // ES Module usage
 * import { MeshWriter, registerFont } from 'meshwriter';
 * import helvetica from 'meshwriter/fonts/helvetica';
 *
 * registerFont('Helvetica', helvetica);
 * const Writer = await MeshWriter.createAsync(scene);
 * const text = new Writer("Hello World", { "letter-height": 20 });
 */

// Core MeshWriter factory functions
export {
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

// Font registry
export {
    registerFont,
    registerFontAliases,
    getFont,
    isFontRegistered,
    getRegisteredFonts,
    unregisterFont,
    clearFonts,
    codeList,
    decodeList
} from './fontRegistry.js';

// Baked font loader (lightweight, no dependencies)
export {
    loadBakedFont,
    loadBakedFontsFromManifest,
    findNearestWeight,
    getBakedFontManifest
} from './bakedFontLoader.js';

// Utility exports (for advanced usage / font creation)
export { codeList as encodeFontData, decodeList as decodeFontData } from './fontCompression.js';

// Material plugins (for advanced usage)
export { TextFogPlugin } from './fogPlugin.js';

// Color contrast utilities (for accessibility)
export {
    deriveEdgeColors,
    adjustForContrast,
    relativeLuminance,
    contrastRatio,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    CONTRAST_LEVELS
} from './colorContrast.js';

/**
 * MeshWriter namespace object (for convenience and backward compatibility patterns)
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
    isFontRegistered
} from './fontRegistry.js';

import { codeList, decodeList } from './fontCompression.js';

import {
    loadBakedFont,
    loadBakedFontsFromManifest,
    findNearestWeight,
    getBakedFontManifest
} from './bakedFontLoader.js';

export const MeshWriter = {
    /**
     * Create MeshWriter async (recommended for Babylon 8+)
     */
    createAsync: createMeshWriterAsync,

    /**
     * Create MeshWriter sync (for Babylon < 8 or when CSG2 is pre-initialized)
     */
    create: createMeshWriter,

    // Static CSG methods
    isReady: isCSGReady,
    getCSGVersion,
    setCSGInitializer,
    setCSGReadyCheck,
    onCSGReady,
    markCSGReady,
    initCSGModule,

    // Font methods
    registerFont,
    registerFontAliases,
    getFont,
    isFontRegistered,

    // Encoding utilities
    codeList,
    decodeList,

    // Baked font methods (lightweight alternative to variable fonts)
    loadBakedFont,
    loadBakedFontsFromManifest,
    findNearestWeight,
    getBakedFontManifest
};

// Default export
export default MeshWriter;
