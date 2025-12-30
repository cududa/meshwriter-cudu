/**
 * MeshWriter Material Creation
 * Creates StandardMaterial for text rendering
 */

import { StandardMaterial, Color3 } from './babylonImports.js';
import { weeid } from './utils.js';

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
 * @returns {StandardMaterial}
 */
export function makeMaterial(scene, letters, emissive, ambient, specular, diffuse, opac) {
    const material = new StandardMaterial("mw-matl-" + letters + "-" + weeid(), scene);
    material.diffuseColor = rgb2Color3(diffuse);
    material.specularColor = rgb2Color3(specular);
    material.ambientColor = rgb2Color3(ambient);
    material.emissiveColor = rgb2Color3(emissive);
    material.alpha = opac;
    return material;
}
