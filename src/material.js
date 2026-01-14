/**
 * MeshWriter Material Creation
 * Creates StandardMaterial for text rendering
 */

import { StandardMaterial, Color3 } from './babylonImports.js';
import { weeid } from './utils.js';
import { TextFogPlugin } from './fogPlugin.js';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */

const floor = Math.floor;

/**
 * Convert hex color string to Babylon Color3
 * @param {string} rgb - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {Color3}
 */
export function rgb2Color3(rgb) {
    rgb = rgb.replace("#", "");
    return new Color3(
        convert(rgb.substring(0, 2)),
        convert(rgb.substring(2, 4)),
        convert(rgb.substring(4, 6))
    );

    function convert(x) {
        const parsed = parseInt(x, 16);
        const val = isNaN(parsed) ? 0 : parsed;
        return floor(1000 * Math.max(0, Math.min(val / 255, 1))) / 1000;
    }
}

/**
 * Create a StandardMaterial for text
 * @param {Scene} scene - Babylon scene
 * @param {string} letters - Text string (used for material naming)
 * @param {string} emissive - Hex color for emissive
 * @param {string} ambient - Hex color for ambient
 * @param {string} specular - Hex color for specular
 * @param {string} diffuse - Hex color for diffuse
 * @param {number} opac - Opacity (0-1)
 * @param {boolean} [emissiveOnly=false] - If true, disables lighting (only emissive color shows)
 * @param {boolean} [fogEnabled=true] - If true, the material is affected by scene fog
 * @returns {StandardMaterial}
 */
export function makeMaterial(scene, letters, emissive, ambient, specular, diffuse, opac, emissiveOnly = false, fogEnabled = true) {
    const material = new StandardMaterial("mw-matl-" + letters + "-" + weeid(), scene);
    material.diffuseColor = rgb2Color3(diffuse);
    material.specularColor = rgb2Color3(specular);
    material.ambientColor = rgb2Color3(ambient);
    material.emissiveColor = rgb2Color3(emissive);
    material.alpha = opac;

    // When emissiveOnly is true, disable lighting so only emissive color shows
    // This gives a "self-lit" appearance that ignores scene lights
    if (emissiveOnly) {
        material.disableLighting = true;
    }

    // Emissive-only materials should be self-lit and not affected by fog
    if (emissiveOnly) {
        material.fogEnabled = false;
    } else if (fogEnabled) {
        // IMPORTANT: Disable Babylon's built-in fog when using TextFogPlugin.
        // Built-in fog only affects diffuse/ambient, not emissive.
        // If we left fogEnabled=true, diffuse would be fogged twice (once by Babylon,
        // once by the plugin), while emissive would only be fogged once by the plugin.
        // By disabling built-in fog and handling ALL fog in the plugin, we get uniform
        // fog application to the entire fragment (matching terrain behavior).
        material.fogEnabled = false;
        material._textFogPlugin = new TextFogPlugin(material);
    } else {
        material.fogEnabled = false;
    }

    return material;
}

/**
 * Create a dedicated emissive material for front faces.
 * This keeps the face self-lit while still respecting fog settings.
 * @param {Scene} scene
 * @param {string} letters
 * @param {string} emissive
 * @param {number} opac
 * @param {boolean} fogEnabled
 * @returns {StandardMaterial}
 */
export function makeFaceMaterial(scene, letters, emissive, opac, fogEnabled = true) {
    const material = new StandardMaterial("mw-face-matl-" + letters + "-" + weeid(), scene);
    const black = rgb2Color3("#000000");
    material.diffuseColor = black;
    material.specularColor = black;
    material.ambientColor = black;
    material.emissiveColor = rgb2Color3(emissive);
    material.disableLighting = true;
    material.alpha = opac;
    material.backFaceCulling = false;
    // Disable Babylon's built-in fog - TextFogPlugin handles all fog uniformly
    material.fogEnabled = false;
    if (fogEnabled) {
        material._textFogPlugin = new TextFogPlugin(material);
    }
    return material;
}
