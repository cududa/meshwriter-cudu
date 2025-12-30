/**
 * MeshWriter Font Registry
 * Manages font registration and lookup
 */

import { isObject } from './utils.js';
import { codeList, decodeList } from './fontCompression.js';

// Private font storage
const FONTS = {};

/**
 * Register a font for use with MeshWriter
 * @param {string} name - Font name (case-sensitive, used in "font-family" option)
 * @param {Function|Object} fontData - Font factory function or pre-initialized font object
 *
 * @example
 * // Register a font factory (receives codeList for encoding)
 * import helvetica from 'meshwriter/fonts/helvetica';
 * registerFont('Helvetica', helvetica);
 *
 * // Register with aliases
 * registerFont('Arial', helvetica);
 * registerFont('sans-serif', helvetica);
 */
export function registerFont(name, fontData) {
    if (typeof fontData === 'function') {
        // Font is a factory function expecting codeList
        FONTS[name] = fontData(codeList);
    } else if (isObject(fontData)) {
        // Font is already initialized
        FONTS[name] = fontData;
    } else {
        throw new Error(`MeshWriter: Invalid font data for "${name}"`);
    }
}

/**
 * Register multiple font aliases pointing to the same font
 * @param {string} targetName - Name of already-registered font
 * @param {...string} aliases - Alias names to register
 *
 * @example
 * registerFont('Helvetica', helveticaData);
 * registerFontAliases('Helvetica', 'Arial', 'sans-serif');
 */
export function registerFontAliases(targetName, ...aliases) {
    if (!FONTS[targetName]) {
        throw new Error(`MeshWriter: Cannot create aliases: font "${targetName}" not registered`);
    }
    aliases.forEach(alias => {
        FONTS[alias] = FONTS[targetName];
    });
}

/**
 * Get a registered font by name
 * @param {string} name - Font name
 * @returns {Object|undefined} - Font object or undefined if not found
 */
export function getFont(name) {
    return FONTS[name];
}

/**
 * Check if a font is registered
 * @param {string} name - Font name
 * @returns {boolean}
 */
export function isFontRegistered(name) {
    return isObject(FONTS[name]);
}

/**
 * Get list of all registered font names
 * @returns {string[]}
 */
export function getRegisteredFonts() {
    return Object.keys(FONTS);
}

/**
 * Unregister a font (mainly for testing)
 * @param {string} name - Font name to remove
 */
export function unregisterFont(name) {
    delete FONTS[name];
}

/**
 * Clear all registered fonts (mainly for testing)
 */
export function clearFonts() {
    Object.keys(FONTS).forEach(key => delete FONTS[key]);
}

// Re-export compression utilities for font authors
export { codeList, decodeList };
