/**
 * MeshWriter Core Class
 * Main MeshWriter implementation for 3D text rendering in Babylon.js
 */

import { Vector2 } from './babylonImports.js';
import { getFont, isFontRegistered } from './fontRegistry.js';
import {
    initCSGModule, isCSGReady, getCSGVersion, initializeCSG2,
    setCSGInitializer, setCSGReadyCheck, onCSGReady, markCSGInitialized
} from './csg.js';
import { makeMaterial, makeFaceMaterial, rgb2Color3 } from './material.js';
import { makeSPS } from './sps.js';
import { constructLetterPolygons, naturalLetterHeight } from './letterMesh.js';
import { installCurveExtensions } from './curves.js';
import {
    isObject, isNumber, isBoolean, isString, isAmplitude,
    isPositiveNumber, round, setOption
} from './utils.js';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */

/**
 * @typedef {Object} MeshWriterPreferences
 * @property {string} [defaultFont] - Default font family
 * @property {number} [scale=1] - Scale factor
 * @property {string} [meshOrigin="letterCenter"] - "letterCenter" or "fontOrigin"
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {Object} [babylon] - Babylon.js namespace object with CSG classes (for ES module builds)
 */

// Constants
const defaultColor = "#808080";
const defaultOpac = 1;

/**
 * Create a MeshWriter factory configured for a scene
 * @param {Scene} scene - Babylon.js scene
 * @param {MeshWriterPreferences} [preferences={}] - Configuration options
 * @returns {Function} - MeshWriter constructor
 */
export function createMeshWriter(scene, preferences = {}) {
    // Install curve extensions for Path2
    installCurveExtensions();

    const defaultFont = isFontRegistered(preferences.defaultFont)
        ? preferences.defaultFont
        : (isFontRegistered("Helvetica") ? "Helvetica" : "HelveticaNeue-Medium");
    const meshOrigin = preferences.meshOrigin === "fontOrigin"
        ? "fontOrigin"
        : "letterCenter";
    const scale = isNumber(preferences.scale) ? preferences.scale : 1;
    const debug = isBoolean(preferences.debug) ? preferences.debug : false;

    /**
     * MeshWriter constructor - creates 3D text
     * @param {string} lttrs - Text to render
     * @param {Object} opt - Options
     */
    function MeshWriter(lttrs, opt) {
        const options = isObject(opt) ? opt : {};
        const position = setOption(options, "position", isObject, {});
        const colors = setOption(options, "colors", isObject, {});
        const fontFamily = setOption(options, "font-family", isSupportedFont, defaultFont);
        const anchor = setOption(options, "anchor", isSupportedAnchor, "left");
        const rawheight = setOption(options, "letter-height", isPositiveNumber, 100);
        const rawThickness = setOption(options, "letter-thickness", isPositiveNumber, 1);
        const basicColor = setOption(options, "color", isString, defaultColor);
        const opac = setOption(options, "alpha", isAmplitude, defaultOpac);
        const y = setOption(position, "y", isNumber, 0);
        const x = setOption(position, "x", isNumber, 0);
        const z = setOption(position, "z", isNumber, 0);
        const diffuse = setOption(colors, "diffuse", isString, "#404040");    // Dark gray - lets emissive show
        const specular = setOption(colors, "specular", isString, "#000000");
        const ambient = setOption(colors, "ambient", isString, "#202020");    // Very dark - minimal ambient response
        const emissive = setOption(colors, "emissive", isString, basicColor);
        const emissiveOnly = setOption(options, "emissive-only", isBoolean, false);
        const fogEnabled = setOption(options, "fog-enabled", isBoolean, true);
        const fontSpec = getFont(fontFamily);
        const letterScale = round(scale * rawheight / naturalLetterHeight);
        const thickness = round(scale * rawThickness);
        const letters = isString(lttrs) ? lttrs : "";

        // Create material
        const material = makeMaterial(scene, letters, emissive, ambient, specular, diffuse, opac, emissiveOnly, fogEnabled);

        // Create letter meshes
        const meshesAndBoxes = constructLetterPolygons(
            letters, fontSpec, 0, 0, 0, letterScale, thickness, material, meshOrigin, scene
        );
        const meshes = meshesAndBoxes[0];
        const lettersBoxes = meshesAndBoxes[1];
        const lettersOrigins = meshesAndBoxes[2];
        const xWidth = meshesAndBoxes.xWidth;

        // Convert to SPS
        const combo = makeSPS(scene, meshesAndBoxes, material);
        const sps = combo[0];
        const mesh = combo[1];
        const faceCombo = combo.face || [];
        const faceSps = faceCombo[0];
        const faceMesh = faceCombo[1];
        let faceMaterial;

        if (faceMesh) {
            faceMaterial = makeFaceMaterial(scene, letters, emissive, opac, fogEnabled);
            faceMesh.material = faceMaterial;
            if (mesh) {
                faceMesh.parent = mesh;
                faceMesh.layerMask = mesh.layerMask;
                faceMesh.renderingGroupId = mesh.renderingGroupId;
            }
            // Tiny offset to prevent z-fighting without leaving a visible gap
            // rotation.x=-PI/2 maps: +Y → -Z (toward camera), -Y → +Z (away)
            // We want face IN FRONT of rim, so use POSITIVE Y
            faceMesh.position.y = 0.001;
            faceMesh.isPickable = false;
        }

        // Position mesh based on anchor
        const offsetX = anchor === "right"
            ? (0 - xWidth)
            : (anchor === "center" ? (0 - xWidth / 2) : 0);

        if (mesh) {
            mesh.position.x = scale * x + offsetX;
            mesh.position.y = scale * y;
            mesh.position.z = scale * z;
        }

        // Instance methods
        let color = basicColor;
        this.getSPS = () => sps;
        this.getMesh = () => mesh;
        this.getMaterial = () => material;
        this.getFaceMesh = () => faceMesh;
        this.getFaceMaterial = () => faceMaterial;
        this.getFaceSPS = () => faceSps;
        this.getOffsetX = () => offsetX;
        this.getLettersBoxes = () => lettersBoxes;
        this.getLettersOrigins = () => lettersOrigins;
        this.color = c => isString(c) ? color = c : color;
        this.alpha = o => isAmplitude(o) ? opac : opac;
        // Track disposed state to prevent double-disposal
        let _disposed = false;

        this.clearall = function() {
            // Mark as disposed - getters will return null after this
            _disposed = true;
        };

        this.isDisposed = function() {
            return _disposed;
        };
    }

    // Prototype methods
    MeshWriter.prototype.setColor = function(color) {
        const material = this.getMaterial();
        if (material && isString(color)) {
            const next = rgb2Color3(this.color(color));
            material.emissiveColor = next;
            const faceMaterial = this.getFaceMaterial && this.getFaceMaterial();
            if (faceMaterial) {
                faceMaterial.emissiveColor = next;
            }
        }
    };

    MeshWriter.prototype.setAlpha = function(alpha) {
        const material = this.getMaterial();
        if (material && isAmplitude(alpha)) {
            const next = this.alpha(alpha);
            material.alpha = next;
            const faceMaterial = this.getFaceMaterial && this.getFaceMaterial();
            if (faceMaterial) {
                faceMaterial.alpha = next;
            }
        }
    };

    MeshWriter.prototype.overrideAlpha = function(alpha) {
        const material = this.getMaterial();
        if (material && isAmplitude(alpha)) {
            material.alpha = alpha;
            const faceMaterial = this.getFaceMaterial && this.getFaceMaterial();
            if (faceMaterial) {
                faceMaterial.alpha = alpha;
            }
        }
    };

    MeshWriter.prototype.resetAlpha = function() {
        const material = this.getMaterial();
        const alpha = this.alpha();
        if (material) {
            material.alpha = alpha;
        }
        const faceMaterial = this.getFaceMaterial && this.getFaceMaterial();
        if (faceMaterial) {
            faceMaterial.alpha = alpha;
        }
    };

    MeshWriter.prototype.getLetterCenter = function(ix) {
        return new Vector2(0, 0);
    };

    MeshWriter.prototype.dispose = function() {
        // Prevent double-disposal
        if (this.isDisposed && this.isDisposed()) {
            return;
        }

        // Dispose TextFogPlugin before materials to break circular references
        const material = this.getMaterial();
        if (material) {
            if (material._textFogPlugin && typeof material._textFogPlugin.dispose === 'function') {
                material._textFogPlugin.dispose();
            }
            material.dispose();
        }

        const faceMaterial = this.getFaceMaterial && this.getFaceMaterial();
        if (faceMaterial) {
            if (faceMaterial._textFogPlugin && typeof faceMaterial._textFogPlugin.dispose === 'function') {
                faceMaterial._textFogPlugin.dispose();
            }
            faceMaterial.dispose();
        }

        // Dispose SolidParticleSystem (which also disposes its mesh)
        const sps = this.getSPS();
        if (sps) {
            sps.dispose();
        }

        // Dispose face mesh (merged mesh, not SPS-based)
        const faceMesh = this.getFaceMesh && this.getFaceMesh();
        if (faceMesh && typeof faceMesh.dispose === 'function') {
            faceMesh.dispose();
        }

        // Mark as disposed
        this.clearall();
    };

    return MeshWriter;

    // Helper functions
    function isSupportedFont(ff) {
        return isFontRegistered(ff);
    }

    function isSupportedAnchor(a) {
        return a === "left" || a === "right" || a === "center";
    }
}

/**
 * Async factory for Babylon 8+ with CSG2
 * Handles CSG2 initialization automatically
 * @param {Scene} scene - Babylon.js scene
 * @param {MeshWriterPreferences} [preferences={}] - Configuration options
 * @returns {Promise<Function>} - MeshWriter constructor
 */
export async function createMeshWriterAsync(scene, preferences = {}) {
    // Initialize CSG module with Babylon methods
    if (preferences.babylon) {
        initCSGModule(preferences.babylon);
    } else {
        // Check for BABYLON global (UMD bundle usage)
        /** @type {any} */
        const globalBabylon = typeof globalThis !== 'undefined' ? globalThis.BABYLON : undefined;
        if (globalBabylon) {
            initCSGModule(globalBabylon);
        }
    }

    // Initialize CSG2 if needed
    if (getCSGVersion() === 'CSG2' && !isCSGReady()) {
        await initializeCSG2();
    }

    return createMeshWriter(scene, preferences);
}

// Re-export CSG control functions for static API
export {
    isCSGReady,
    getCSGVersion,
    setCSGInitializer,
    setCSGReadyCheck,
    onCSGReady,
    markCSGInitialized as markCSGReady,
    initCSGModule
};
