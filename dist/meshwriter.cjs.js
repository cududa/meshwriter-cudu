'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var math_vector = require('@babylonjs/core/Maths/math.vector');
var math_color = require('@babylonjs/core/Maths/math.color');
var math_path = require('@babylonjs/core/Maths/math.path');
var mesh = require('@babylonjs/core/Meshes/mesh');
var polygonMesh = require('@babylonjs/core/Meshes/polygonMesh');
var standardMaterial = require('@babylonjs/core/Materials/standardMaterial');
var solidParticleSystem = require('@babylonjs/core/Particles/solidParticleSystem');
var csg = require('@babylonjs/core/Meshes/csg');
var csg2 = require('@babylonjs/core/Meshes/csg2');
var earcut = require('earcut');

/**
 * MeshWriter Utility Functions
 * Pure helper functions with no external dependencies
 */

const floor$2 = Math.floor;

// Type checking functions
function isPositiveNumber(mn) {
    return typeof mn === "number" && !isNaN(mn) ? 0 < mn : false;
}

function isNumber(mn) {
    return typeof mn === "number";
}

function isBoolean(mn) {
    return typeof mn === "boolean";
}

function isAmplitude(ma) {
    return typeof ma === "number" && !isNaN(ma) ? 0 <= ma && ma <= 1 : false;
}

function isObject(mo) {
    return mo != null && typeof mo === "object" || typeof mo === "function";
}

function isPromiseLike(mo) {
    return isObject(mo) && typeof mo.then === "function";
}

function isArray(ma) {
    return ma != null && typeof ma === "object" && ma.constructor === Array;
}

function isString(ms) {
    return typeof ms === "string" ? ms.length > 0 : false;
}

function isRelativeLength(l) {
    return l === 3 || l === 5 || l === 7;
}

// Math utilities
function round(n) {
    return floor$2(0.3 + n * 1000000) / 1000000;
}

function weeid() {
    return Math.floor(Math.random() * 1000000);
}

// Option handling
function setOption(opts, field, tst, defalt) {
    return tst(opts[field]) ? opts[field] : defalt;
}

/**
 * MeshWriter Font Compression/Decompression
 * Base-128 encoding for font data compression (~50% size reduction)
 */


const floor$1 = Math.floor;

// Encoding arrays (initialized once at module load)
let b128back;
let b128digits;

/**
 * Initialize encoding arrays for base-128 conversion
 * Called once when module loads
 */
function prepArray() {
    let pntr = -1;
    let n;
    b128back = new Uint8Array(256);
    b128digits = new Array(128);

    while (160 > pntr++) {
        if (pntr < 128) {
            n = fr128to256(pntr);
            b128digits[pntr] = String.fromCharCode(n);
            b128back[n] = pntr;
        } else {
            if (pntr === 128) {
                b128back[32] = pntr;
            } else {
                b128back[pntr + 71] = pntr;
            }
        }
    }

    function fr128to256(n) {
        if (n < 92) {
            return n < 58 ? n < 6 ? n + 33 : n + 34 : n + 35;
        } else {
            return n + 69;
        }
    }
}

// Initialize on module load
prepArray();

/**
 * Convert base-128 encoded string to number
 */
function frB128(s) {
    let result = 0;
    let i = -1;
    const l = s.length - 1;
    while (i++ < l) {
        result = result * 128 + b128back[s.charCodeAt(i)];
    }
    return result;
}

/**
 * Convert number to base-128 encoded string
 */
function toB128(i) {
    let s = b128digits[(i % 128)];
    i = floor$1(i / 128);
    while (i > 0) {
        s = b128digits[(i % 128)] + s;
        i = floor$1(i / 128);
    }
    return s;
}

/**
 * Decode a compressed command list string
 * @param {string} str - Compressed string (space-separated encoded commands)
 * @returns {Array} - Array of decoded command arrays
 */
function decodeList(str) {
    const split = str.split(" ");
    const list = [];

    split.forEach(function(cmds) {
        if (cmds.length === 12) { list.push(decode6(cmds)); }
        if (cmds.length === 8) { list.push(decode4(cmds)); }
        if (cmds.length === 4) { list.push(decode2(cmds)); }
    });

    return list;

    function decode6(s) {
        return [
            decode1(s, 0, 2), decode1(s, 2, 4), decode1(s, 4, 6),
            decode1(s, 6, 8), decode1(s, 8, 10), decode1(s, 10, 12)
        ];
    }
    function decode4(s) {
        return [decode1(s, 0, 2), decode1(s, 2, 4), decode1(s, 4, 6), decode1(s, 6, 8)];
    }
    function decode2(s) {
        return [decode1(s, 0, 2), decode1(s, 2, 4)];
    }
    function decode1(s, start, end) {
        return (frB128(s.substring(start, end)) - 4000) / 2;
    }
}

/**
 * Encode a command list to compressed string
 * @param {Array} list - Array of command arrays
 * @returns {string} - Compressed string
 */
function codeList(list) {
    let str = "";
    let xtra = "";

    if (isArray(list)) {
        list.forEach(function(cmds) {
            if (cmds.length === 6) { str += xtra + code6(cmds); xtra = " "; }
            if (cmds.length === 4) { str += xtra + code4(cmds); xtra = " "; }
            if (cmds.length === 2) { str += xtra + code2(cmds); xtra = " "; }
        });
    }

    return str;

    function code6(a) {
        return code1(a[0]) + code1(a[1]) + code1(a[2]) + code1(a[3]) + code1(a[4]) + code1(a[5]);
    }
    function code4(a) {
        return code1(a[0]) + code1(a[1]) + code1(a[2]) + code1(a[3]);
    }
    function code2(a) {
        return code1(a[0]) + code1(a[1]);
    }
    function code1(n) {
        return toB128((n + n) + 4000);
    }
}

/**
 * MeshWriter Font Registry
 * Manages font registration and lookup
 */


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
function registerFont(name, fontData) {
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
function registerFontAliases(targetName, ...aliases) {
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
function getFont(name) {
    return FONTS[name];
}

/**
 * Check if a font is registered
 * @param {string} name - Font name
 * @returns {boolean}
 */
function isFontRegistered(name) {
    return isObject(FONTS[name]);
}

/**
 * Get list of all registered font names
 * @returns {string[]}
 */
function getRegisteredFonts() {
    return Object.keys(FONTS);
}

/**
 * Unregister a font (mainly for testing)
 * @param {string} name - Font name to remove
 */
function unregisterFont(name) {
    delete FONTS[name];
}

/**
 * Clear all registered fonts (mainly for testing)
 */
function clearFonts() {
    Object.keys(FONTS).forEach(key => delete FONTS[key]);
}

/**
 * MeshWriter CSG Module
 * Handles CSG version detection, async initialization, and ready state management
 */


// CSG libraries - initialized from Babylon imports or external source
let CSG = csg.CSG;
let CSG2 = csg2.CSG2;
let InitializeCSG2Async = csg2.InitializeCSG2Async;
let IsCSG2Ready = csg2.IsCSG2Ready;

// State
let csgVersion = null;        // 'CSG2', 'CSG', or null
let csgReady = false;
const csgReadyListeners = [];
let externalCSGInitializer = null;
let externalCSGReadyCheck = null;

/**
 * Initialize CSG module with Babylon.js CSG classes
 * Must be called before using any CSG functionality
 * @param {Object} babylon - Object containing CSG, CSG2, InitializeCSG2Async, IsCSG2Ready
 */
function initCSGModule(babylon) {
    if (isObject(babylon)) {
        CSG = babylon.CSG || null;
        CSG2 = babylon.CSG2 || null;
        InitializeCSG2Async = babylon.InitializeCSG2Async || null;
        IsCSG2Ready = babylon.IsCSG2Ready || null;
    }
    csgVersion = detectCSGVersion();

    // Legacy CSG is immediately ready
    if (csgVersion === 'CSG') {
        markCSGInitialized();
    } else if (csgVersion === 'CSG2') {
        // Check if CSG2 is already initialized
        csgReady = false;
        if (runCSGReadyCheck()) {
            markCSGInitialized();
        }
    }
}

/**
 * Detect which CSG implementation is available
 * @returns {'CSG2'|'CSG'|null}
 */
function detectCSGVersion() {
    // Prefer CSG2 (Babylon 7.31+)
    if (isObject(CSG2) && typeof InitializeCSG2Async === 'function') {
        return 'CSG2';
    }
    // Fall back to legacy CSG
    if (isObject(CSG) && typeof CSG.FromMesh === 'function') {
        return 'CSG';
    }
    return null;
}

/**
 * Mark CSG as ready and notify all listeners
 */
function markCSGInitialized() {
    if (csgReady) {
        return;
    }
    csgReady = true;

    // Notify all waiting listeners
    if (csgReadyListeners.length) {
        csgReadyListeners.splice(0).forEach(function(listener) {
            try {
                listener();
            } catch (err) {
                console.error("MeshWriter: onCSGReady listener failed", err);
            }
        });
    }
}

/**
 * Check if CSG is ready for use
 * @returns {boolean}
 */
function isCSGReady() {
    if (csgVersion === 'CSG2') {
        refreshCSGReadyState();
        return csgReady;
    }
    return csgVersion === 'CSG';
}

/**
 * Refresh CSG2 ready state from external checks
 */
function refreshCSGReadyState() {
    if (csgVersion !== 'CSG2' || csgReady) {
        return;
    }
    if (runCSGReadyCheck()) {
        markCSGInitialized();
    }
}

/**
 * Run CSG ready check (external or native)
 */
function runCSGReadyCheck() {
    // Try external ready check first
    if (typeof externalCSGReadyCheck === "function") {
        try {
            if (externalCSGReadyCheck()) {
                return true;
            }
        } catch (err) {
            console.warn("MeshWriter: external CSG ready check failed", err);
        }
    }

    // Check native IsCSG2Ready
    if (typeof IsCSG2Ready === "function" && IsCSG2Ready()) {
        return true;
    }

    return false;
}

/**
 * Initialize CSG2 asynchronously
 * @returns {Promise<void>}
 */
async function initializeCSG2() {
    if (csgVersion !== 'CSG2') {
        return;
    }
    if (csgReady) {
        return;
    }

    const initializer = externalCSGInitializer || InitializeCSG2Async;
    if (typeof initializer !== "function") {
        throw new Error(
            "MeshWriter: No CSG2 initializer available. " +
            "Use MeshWriter.setCSGInitializer() or ensure BABYLON.InitializeCSG2Async is available."
        );
    }

    const result = initializer();
    if (isPromiseLike(result)) {
        await result;
    }
    markCSGInitialized();
}

// Public API

/**
 * Get the current CSG version being used
 * @returns {'CSG2'|'CSG'|null}
 */
function getCSGVersion() {
    return csgVersion;
}

/**
 * Set an external CSG2 initializer function
 * @param {Function} fn - Async function that initializes CSG2
 */
function setCSGInitializer(fn) {
    if (typeof fn === "function") {
        externalCSGInitializer = fn;
    }
}

/**
 * Set an external CSG2 ready check function
 * @param {Function} fn - Function that returns true when CSG2 is ready
 */
function setCSGReadyCheck(fn) {
    if (typeof fn === "function") {
        externalCSGReadyCheck = fn;
        refreshCSGReadyState();
    }
}

/**
 * Register a callback to be called when CSG is ready
 * If CSG is already ready, callback is called immediately
 * @param {Function} listener
 */
function onCSGReady(listener) {
    if (typeof listener !== "function") {
        return;
    }
    if (isCSGReady()) {
        listener();
    } else {
        csgReadyListeners.push(listener);
    }
}

/**
 * Get the CSG library to use for operations
 * @returns {Object} - CSG or CSG2 class
 */
function getCSGLib() {
    return csgVersion === 'CSG2' ? CSG2 : CSG;
}

/**
 * MeshWriter Material Creation
 * Creates StandardMaterial for text rendering
 */


const floor = Math.floor;

/**
 * Convert hex color string to Babylon Color3
 * @param {string} rgb - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {Color3}
 */
function rgb2Color3(rgb) {
    rgb = rgb.replace("#", "");
    return new math_color.Color3(
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
function makeMaterial(scene, letters, emissive, ambient, specular, diffuse, opac) {
    const material = new standardMaterial.StandardMaterial("mw-matl-" + letters + "-" + weeid(), scene);
    material.diffuseColor = rgb2Color3(diffuse);
    material.specularColor = rgb2Color3(specular);
    material.ambientColor = rgb2Color3(ambient);
    material.emissiveColor = rgb2Color3(emissive);
    material.alpha = opac;
    return material;
}

/**
 * MeshWriter SPS (Solid Particle System) Helpers
 * Converts letter meshes into an efficient SPS
 */


/**
 * Create an SPS from letter meshes
 * @param {Scene} scene - Babylon scene
 * @param {Array} meshesAndBoxes - [meshes, boxes, origins] from constructLetterPolygons
 * @param {Material} material - Material to apply to SPS mesh
 * @returns {[SolidParticleSystem, Mesh]} - [sps, spsMesh]
 */
function makeSPS(scene, meshesAndBoxes, material) {
    const meshes = meshesAndBoxes[0];
    const lettersOrigins = meshesAndBoxes[2];
    let sps, spsMesh;

    if (meshes.length) {
        sps = new solidParticleSystem.SolidParticleSystem("sps" + "test", scene, {});

        meshes.forEach(function(mesh, ix) {
            sps.addShape(mesh, 1, {
                positionFunction: makePositionParticle(lettersOrigins[ix])
            });
            mesh.dispose();
        });

        spsMesh = sps.buildMesh();
        spsMesh.material = material;
        sps.setParticles();
    }

    return [sps, spsMesh];

    function makePositionParticle(letterOrigins) {
        return function positionParticle(particle, ix, s) {
            particle.position.x = letterOrigins[0] + letterOrigins[1];
            particle.position.z = letterOrigins[2];
        };
    }
}

/**
 * MeshWriter Letter Mesh Construction
 * Builds 3D letter meshes from font specifications
 */


// Constants
const naturalLetterHeight = 1000;

/**
 * Decompress font letter on first use (lazy decompression)
 * @param {Object} fontSpec - Font specification object
 * @param {string} letter - Character to get spec for
 * @returns {Object|undefined} - Letter specification
 */
function makeLetterSpec(fontSpec, letter) {
    const letterSpec = fontSpec[letter];

    if (isObject(letterSpec)) {
        // Decompress shape commands if compressed
        if (!isArray(letterSpec.shapeCmds) && isArray(letterSpec.sC)) {
            letterSpec.shapeCmds = letterSpec.sC.map(cmds => decodeList(cmds));
            letterSpec.sC = null;
        }
        // Decompress hole commands if compressed
        if (!isArray(letterSpec.holeCmds) && isArray(letterSpec.hC)) {
            letterSpec.holeCmds = letterSpec.hC.map(cmdslists =>
                isArray(cmdslists) ? cmdslists.map(cmds => decodeList(cmds)) : cmdslists
            );
            letterSpec.hC = null;
        }
    }
    return letterSpec;
}

/**
 * Convert point to Vector2
 */
function point2Vector(point) {
    return new math_vector.Vector2(round(point.x), round(point.y));
}

/**
 * Merge array of meshes
 */
function merge(arrayOfMeshes) {
    return arrayOfMeshes.length === 1
        ? arrayOfMeshes[0]
        : mesh.Mesh.MergeMeshes(arrayOfMeshes, true);
}

/**
 * Construct meshes for all letters in a string
 * @param {string} letters - Text string
 * @param {Object} fontSpec - Font specification
 * @param {number} xOffset - X offset
 * @param {number} yOffset - Y offset (unused, kept for API compatibility)
 * @param {number} zOffset - Z offset
 * @param {number} letterScale - Scale factor for letters
 * @param {number} thickness - Letter thickness (depth)
 * @param {Material} material - Material (unused in this function)
 * @param {string} meshOrigin - "letterCenter" or "fontOrigin"
 * @param {Scene} scene - Babylon scene
 * @returns {Array} - [meshes, boxes, origins] with xWidth and count properties
 */
function constructLetterPolygons(
    letters, fontSpec, xOffset, yOffset, zOffset,
    letterScale, thickness, material, meshOrigin, scene
) {
    let letterOffsetX = 0;
    const lettersOrigins = new Array(letters.length);
    const lettersBoxes = new Array(letters.length);
    const lettersMeshes = new Array(letters.length);
    let ix = 0;

    for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const letterSpec = makeLetterSpec(fontSpec, letter);

        if (isObject(letterSpec)) {
            const lists = buildLetterMeshes(
                letter, i, letterSpec, fontSpec.reverseShapes, fontSpec.reverseHoles,
                meshOrigin, letterScale, xOffset, zOffset, letterOffsetX, thickness, scene
            );

            const shapesList = lists[0];
            const holesList = lists[1];
            const letterBox = lists[2];
            const letterOrigins = lists[3];
            const newOffsetX = lists[4];

            letterOffsetX = newOffsetX;

            const letterMeshes = punchHolesInShapes(shapesList, holesList, letter, i, scene);

            if (letterMeshes.length) {
                lettersMeshes[ix] = merge(letterMeshes);
                lettersOrigins[ix] = letterOrigins;
                lettersBoxes[ix] = letterBox;
                ix++;
            }
        }
    }

    const meshesAndBoxes = [lettersMeshes, lettersBoxes, lettersOrigins];
    meshesAndBoxes.xWidth = round(letterOffsetX);
    meshesAndBoxes.count = ix;
    return meshesAndBoxes;
}

/**
 * Build meshes for a single letter
 * @returns {Array} - [shapesList, holesList, letterBox, letterOrigins, newOffsetX]
 */
function buildLetterMeshes(
    letter, index, spec, reverseShapes, reverseHoles,
    meshOrigin, letterScale, xOffset, zOffset, letterOffsetX, thickness, scene
) {
    // Offset calculations
    const balanced = meshOrigin === "letterCenter";
    const centerX = (spec.xMin + spec.xMax) / 2;
    const centerZ = (spec.yMin + spec.yMax) / 2;
    const xFactor = isNumber(spec.xFactor) ? spec.xFactor : 1;
    const zFactor = isNumber(spec.yFactor) ? spec.yFactor : 1;
    const xShift = isNumber(spec.xShift) ? spec.xShift : 0;
    const zShift = isNumber(spec.yShift) ? spec.yShift : 0;
    const reverseShape = isBoolean(spec.reverseShape) ? spec.reverseShape : reverseShapes;
    const reverseHole = isBoolean(spec.reverseHole) ? spec.reverseHole : reverseHoles;
    const offX = xOffset - (balanced ? centerX : 0);
    const offZ = zOffset - (balanced ? centerZ : 0);
    const shapeCmdsLists = isArray(spec.shapeCmds) ? spec.shapeCmds : [];
    const holeCmdsListsArray = isArray(spec.holeCmds) ? spec.holeCmds : [];

    // Tracking for relative coordinates
    let thisX, lastX, thisZ, lastZ;

    // Scaling functions
    const adjX = makeAdjust(letterScale, xFactor, offX, 0, false, true);
    const adjZ = makeAdjust(letterScale, zFactor, offZ, 0, false, false);
    const adjXfix = makeAdjust(letterScale, xFactor, offX, xShift, false, true);
    const adjZfix = makeAdjust(letterScale, zFactor, offZ, zShift, false, false);
    const adjXrel = makeAdjust(letterScale, xFactor, offX, xShift, true, true);
    const adjZrel = makeAdjust(letterScale, zFactor, offZ, zShift, true, false);

    const letterBox = [adjX(spec.xMin), adjX(spec.xMax), adjZ(spec.yMin), adjZ(spec.yMax)];
    const letterOrigins = [round(letterOffsetX), -1 * adjX(0), -1 * adjZ(0)];

    // Update letterOffsetX for next letter
    const newOffsetX = letterOffsetX + spec.wdth * letterScale;

    const shapesList = shapeCmdsLists.map(makeCmdsToMesh(reverseShape));
    const holesList = holeCmdsListsArray.map(meshesFromCmdsListArray);

    return [shapesList, holesList, letterBox, letterOrigins, newOffsetX];

    function meshesFromCmdsListArray(cmdsListArray) {
        return cmdsListArray.map(makeCmdsToMesh(reverseHole));
    }

    function makeCmdsToMesh(reverse) {
        return function cmdsToMesh(cmdsList) {
            let cmd = getCmd(cmdsList, 0);
            const path = new math_path.Path2(adjXfix(cmd[0]), adjZfix(cmd[1]));

            // Process path commands
            for (let j = 1; j < cmdsList.length; j++) {
                cmd = getCmd(cmdsList, j);

                // Line (2 coords = absolute, 3 = relative)
                if (cmd.length === 2) {
                    path.addLineTo(adjXfix(cmd[0]), adjZfix(cmd[1]));
                }
                if (cmd.length === 3) {
                    path.addLineTo(adjXrel(cmd[1]), adjZrel(cmd[2]));
                }

                // Quadratic curve (4 = absolute, 5 = relative)
                if (cmd.length === 4) {
                    path.addQuadraticCurveTo(
                        adjXfix(cmd[0]), adjZfix(cmd[1]),
                        adjXfix(cmd[2]), adjZfix(cmd[3])
                    );
                }
                if (cmd.length === 5) {
                    path.addQuadraticCurveTo(
                        adjXrel(cmd[1]), adjZrel(cmd[2]),
                        adjXrel(cmd[3]), adjZrel(cmd[4])
                    );
                }

                // Cubic curve (6 = absolute, 7 = relative)
                if (cmd.length === 6) {
                    path.addCubicCurveTo(
                        adjXfix(cmd[0]), adjZfix(cmd[1]),
                        adjXfix(cmd[2]), adjZfix(cmd[3]),
                        adjXfix(cmd[4]), adjZfix(cmd[5])
                    );
                }
                if (cmd.length === 7) {
                    path.addCubicCurveTo(
                        adjXrel(cmd[1]), adjZrel(cmd[2]),
                        adjXrel(cmd[3]), adjZrel(cmd[4]),
                        adjXrel(cmd[5]), adjZrel(cmd[6])
                    );
                }
            }

            // Convert path to array and process
            let array = path.getPoints().map(point2Vector);

            // Remove redundant start/end points
            const first = 0;
            const last = array.length - 1;
            if (array[first].x === array[last].x && array[first].y === array[last].y) {
                array = array.slice(1);
            }
            if (reverse) {
                array.reverse();
            }

            const meshBuilder = new polygonMesh.PolygonMeshBuilder(
                "MeshWriter-" + letter + index + "-" + weeid(),
                array,
                scene,
                earcut
            );
            return meshBuilder.build(true, thickness);
        };
    }

    function getCmd(list, ix) {
        lastX = thisX;
        lastZ = thisZ;
        const cmd = list[ix];
        const len = cmd.length;
        thisX = isRelativeLength(len)
            ? round((cmd[len - 2] * xFactor) + thisX)
            : round(cmd[len - 2] * xFactor);
        thisZ = isRelativeLength(len)
            ? round((cmd[len - 1] * zFactor) + thisZ)
            : round(cmd[len - 1] * zFactor);
        return cmd;
    }

    function makeAdjust(letterScale, factor, off, shift, relative, xAxis) {
        if (relative) {
            if (xAxis) {
                return val => round(letterScale * ((val * factor) + shift + lastX + off));
            } else {
                return val => round(letterScale * ((val * factor) + shift + lastZ + off));
            }
        } else {
            return val => round(letterScale * ((val * factor) + shift + off));
        }
    }
}

/**
 * Punch holes in letter shapes using CSG operations
 * @param {Array} shapesList - Array of shape meshes
 * @param {Array} holesList - Array of arrays of hole meshes
 * @param {string} letter - Letter character (for naming)
 * @param {number} letterIndex - Index of letter (for naming)
 * @param {Scene} scene - Babylon scene
 * @returns {Array} - Array of final letter meshes
 */
function punchHolesInShapes(shapesList, holesList, letter, letterIndex, scene) {
    const csgVersion = getCSGVersion();

    // Validate CSG is available and initialized
    if (csgVersion === 'CSG2' && !isCSGReady()) {
        throw new Error(
            "MeshWriter: CSG2 not initialized. " +
            "Use 'await MeshWriter.createAsync(scene, prefs)', call " +
            "'await BABYLON.InitializeCSG2Async()', or configure " +
            "MeshWriter.setCSGInitializer before creating MeshWriter."
        );
    }
    if (csgVersion === null) {
        throw new Error(
            "MeshWriter: No CSG implementation found. " +
            "Ensure BABYLON.CSG or BABYLON.CSG2 is available."
        );
    }

    const letterMeshes = [];
    const csgLib = getCSGLib();

    for (let j = 0; j < shapesList.length; j++) {
        const shape = shapesList[j];
        const holes = holesList[j];

        if (isArray(holes) && holes.length) {
            letterMeshes.push(punchHolesInShape(shape, holes, letter, letterIndex, csgLib, csgVersion, scene));
        } else {
            if (csgVersion === 'CSG2') {
                // Flip faces to match CSG2-processed letters
                shape.flipFaces();
            }
            letterMeshes.push(shape);
        }
    }

    return letterMeshes;
}

/**
 * Punch holes in a single shape
 */
function punchHolesInShape(shape, holes, letter, letterIndex, csgLib, csgVersion, scene) {
    const meshName = "Net-" + letter + letterIndex + "-" + weeid();

    let csgShape = csgLib.FromMesh(shape);
    for (let k = 0; k < holes.length; k++) {
        csgShape = csgShape.subtract(csgLib.FromMesh(holes[k]));
    }

    const resultMesh = csgVersion === 'CSG2'
        ? csgShape.toMesh(meshName, scene, { centerMesh: false })
        : csgShape.toMesh(meshName, null, scene);

    if (csgVersion === 'CSG2') {
        // CSG2/Manifold produces opposite face winding compared to legacy CSG
        resultMesh.flipFaces();
    }

    // Cleanup
    holes.forEach(h => h.dispose());
    shape.dispose();

    return resultMesh;
}

/**
 * MeshWriter Curve Extensions
 * Optimized Path2 curve methods for better performance
 */


// Optimized segment count for curves
// Native Babylon 6+ uses 36 segments which causes slowdown
// MeshWriter uses 6 for better performance
const curveSampleSize = 6;

/**
 * Install optimized curve methods on Path2 prototype
 * Must be called after Babylon.js is loaded
 */
function installCurveExtensions() {
    if (!math_path.Path2 || !math_path.Path2.prototype) {
        return;
    }

    // Quadratic Bezier with optimized segment count
    math_path.Path2.prototype.addQuadraticCurveTo = function(redX, redY, blueX, blueY) {
        const points = this.getPoints();
        const lastPoint = points[points.length - 1];
        const origin = new math_vector.Vector3(lastPoint.x, lastPoint.y, 0);
        const control = new math_vector.Vector3(redX, redY, 0);
        const destination = new math_vector.Vector3(blueX, blueY, 0);

        const curve = math_path.Curve3.CreateQuadraticBezier(origin, control, destination, curveSampleSize);
        const curvePoints = curve.getPoints();

        for (let i = 1; i < curvePoints.length; i++) {
            this.addLineTo(curvePoints[i].x, curvePoints[i].y);
        }
        return this; // Return this for method chaining
    };

    // Cubic Bezier with optimized segment count
    math_path.Path2.prototype.addCubicCurveTo = function(redX, redY, greenX, greenY, blueX, blueY) {
        const points = this.getPoints();
        const lastPoint = points[points.length - 1];
        const origin = new math_vector.Vector3(lastPoint.x, lastPoint.y, 0);
        const control1 = new math_vector.Vector3(redX, redY, 0);
        const control2 = new math_vector.Vector3(greenX, greenY, 0);
        const destination = new math_vector.Vector3(blueX, blueY, 0);

        const nbPoints = Math.floor(0.3 + curveSampleSize * 1.5);
        const curve = math_path.Curve3.CreateCubicBezier(origin, control1, control2, destination, nbPoints);
        const curvePoints = curve.getPoints();

        for (let i = 1; i < curvePoints.length; i++) {
            this.addLineTo(curvePoints[i].x, curvePoints[i].y);
        }
        return this; // Return this for method chaining
    };
}

/**
 * MeshWriter Core Class
 * Main MeshWriter implementation for 3D text rendering in Babylon.js
 */


// Constants
const defaultColor = "#808080";
const defaultOpac = 1;

/**
 * Create a MeshWriter factory configured for a scene
 * @param {Scene} scene - Babylon.js scene
 * @param {Object} preferences - Configuration options
 * @param {string} [preferences.defaultFont] - Default font family
 * @param {number} [preferences.scale=1] - Scale factor
 * @param {string} [preferences.meshOrigin="letterCenter"] - "letterCenter" or "fontOrigin"
 * @param {boolean} [preferences.debug=false] - Enable debug logging
 * @returns {Function} - MeshWriter constructor
 */
function createMeshWriter(scene, preferences = {}) {
    // Install curve extensions for Path2
    installCurveExtensions();

    const defaultFont = isFontRegistered(preferences.defaultFont)
        ? preferences.defaultFont
        : (isFontRegistered("Helvetica") ? "Helvetica" : "HelveticaNeue-Medium");
    const meshOrigin = preferences.meshOrigin === "fontOrigin"
        ? "fontOrigin"
        : "letterCenter";
    const scale = isNumber(preferences.scale) ? preferences.scale : 1;
    isBoolean(preferences.debug) ? preferences.debug : false;

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
        const diffuse = setOption(colors, "diffuse", isString, "#F0F0F0");
        const specular = setOption(colors, "specular", isString, "#000000");
        const ambient = setOption(colors, "ambient", isString, "#F0F0F0");
        const emissive = setOption(colors, "emissive", isString, basicColor);
        const fontSpec = getFont(fontFamily);
        const letterScale = round(scale * rawheight / naturalLetterHeight);
        const thickness = round(scale * rawThickness);
        const letters = isString(lttrs) ? lttrs : "";

        // Create material
        const material = makeMaterial(scene, letters, emissive, ambient, specular, diffuse, opac);

        // Create letter meshes
        const meshesAndBoxes = constructLetterPolygons(
            letters, fontSpec, 0, 0, 0, letterScale, thickness, material, meshOrigin, scene
        );
        meshesAndBoxes[0];
        const lettersBoxes = meshesAndBoxes[1];
        const lettersOrigins = meshesAndBoxes[2];
        const xWidth = meshesAndBoxes.xWidth;

        // Convert to SPS
        const combo = makeSPS(scene, meshesAndBoxes, material);
        const sps = combo[0];
        const mesh = combo[1];

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
        this.getOffsetX = () => offsetX;
        this.getLettersBoxes = () => lettersBoxes;
        this.getLettersOrigins = () => lettersOrigins;
        this.color = c => isString(c) ? color = c : color;
        this.alpha = o => isAmplitude(o) ? opac : opac;
        this.clearall = function() {
            // Clear references for GC
        };
    }

    // Prototype methods
    MeshWriter.prototype.setColor = function(color) {
        const material = this.getMaterial();
        if (isString(color)) {
            material.emissiveColor = rgb2Color3(this.color(color));
        }
    };

    MeshWriter.prototype.setAlpha = function(alpha) {
        const material = this.getMaterial();
        if (isAmplitude(alpha)) {
            material.alpha = this.alpha(alpha);
        }
    };

    MeshWriter.prototype.overrideAlpha = function(alpha) {
        const material = this.getMaterial();
        if (isAmplitude(alpha)) {
            material.alpha = alpha;
        }
    };

    MeshWriter.prototype.resetAlpha = function() {
        const material = this.getMaterial();
        material.alpha = this.alpha();
    };

    MeshWriter.prototype.getLetterCenter = function(ix) {
        return new math_vector.Vector2(0, 0);
    };

    MeshWriter.prototype.dispose = function() {
        const sps = this.getSPS();
        if (sps) {
            sps.dispose();
        }
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
 * @param {Object} preferences - Configuration options
 * @param {Object} [preferences.babylon] - Babylon.js namespace object with CSG classes
 * @returns {Promise<Function>} - MeshWriter constructor
 */
async function createMeshWriterAsync(scene, preferences = {}) {
    // Initialize CSG module with Babylon methods
    if (preferences.babylon) {
        initCSGModule(preferences.babylon);
    } else if (typeof BABYLON !== "undefined") {
        initCSGModule(BABYLON);
    }

    // Initialize CSG2 if needed
    if (getCSGVersion() === 'CSG2' && !isCSGReady()) {
        await initializeCSG2();
    }

    return createMeshWriter(scene, preferences);
}

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


const MeshWriter = {
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
    markCSGReady: markCSGInitialized,
    initCSGModule,

    // Font methods
    registerFont,
    registerFontAliases,
    getFont,
    isFontRegistered,

    // Encoding utilities
    codeList,
    decodeList
};

exports.MeshWriter = MeshWriter;
exports.clearFonts = clearFonts;
exports.codeList = codeList;
exports.createMeshWriter = createMeshWriter;
exports.createMeshWriterAsync = createMeshWriterAsync;
exports.decodeFontData = decodeList;
exports.decodeList = decodeList;
exports.default = MeshWriter;
exports.encodeFontData = codeList;
exports.getCSGVersion = getCSGVersion;
exports.getFont = getFont;
exports.getRegisteredFonts = getRegisteredFonts;
exports.initCSGModule = initCSGModule;
exports.isCSGReady = isCSGReady;
exports.isFontRegistered = isFontRegistered;
exports.markCSGReady = markCSGInitialized;
exports.onCSGReady = onCSGReady;
exports.registerFont = registerFont;
exports.registerFontAliases = registerFontAliases;
exports.setCSGInitializer = setCSGInitializer;
exports.setCSGReadyCheck = setCSGReadyCheck;
exports.unregisterFont = unregisterFont;
//# sourceMappingURL=meshwriter.cjs.js.map
