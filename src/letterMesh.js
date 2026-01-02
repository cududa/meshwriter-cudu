/**
 * MeshWriter Letter Mesh Construction
 * Builds 3D letter meshes from font specifications
 */

import { Path2, Vector2, Mesh, PolygonMeshBuilder } from './babylonImports.js';
import { splitMeshByFaceNormals } from './meshSplitter.js';
import { getCSGLib, getCSGVersion, isCSGReady } from './csg.js';
import { decodeList } from './fontCompression.js';
import {
    isObject, isArray, isNumber, isBoolean,
    isRelativeLength, round, weeid
} from './utils.js';
import earcutModule from 'earcut';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */
/** @typedef {import('@babylonjs/core/Materials/material').Material} Material */

// Handle both CJS default export and ESM module export
const earcut = earcutModule.default || earcutModule;

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
    return new Vector2(round(point.x), round(point.y));
}

/**
 * Merge array of meshes
 */
function merge(arrayOfMeshes) {
    return arrayOfMeshes.length === 1
        ? arrayOfMeshes[0]
        : Mesh.MergeMeshes(arrayOfMeshes, true);
}

/**
 * @typedef {Object} LetterPolygonsResult
 * @property {number} xWidth - Total width of all letters
 * @property {number} count - Number of valid letter meshes
 */
/**
 * @typedef {(any[] & LetterPolygonsResult) & { faceMeshes: Mesh[] }} LetterPolygonsCollection
 */

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
 * @returns {any[] & LetterPolygonsResult} - [meshes, boxes, origins] with xWidth and count properties
 */
export function constructLetterPolygons(
    letters, fontSpec, xOffset, yOffset, zOffset,
    letterScale, thickness, material, meshOrigin, scene
) {
    let letterOffsetX = 0;
    const lettersOrigins = new Array(letters.length);
    const lettersBoxes = new Array(letters.length);
    const lettersMeshes = new Array(letters.length);
    const faceMeshes = new Array(letters.length);
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
                const merged = merge(letterMeshes);
                const split = splitMeshByFaceNormals(merged, scene);
                lettersMeshes[ix] = split.rimMesh;
                faceMeshes[ix] = split.faceMesh;
                lettersOrigins[ix] = letterOrigins;
                lettersBoxes[ix] = letterBox;
                ix++;
            }
        }
    }

    /** @type {LetterPolygonsCollection} */
    const meshesAndBoxes = /** @type {any} */ ([lettersMeshes, lettersBoxes, lettersOrigins]);
    meshesAndBoxes.faceMeshes = faceMeshes;
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
            /** @type {any} */
            const path = new Path2(adjXfix(cmd[0]), adjZfix(cmd[1]));

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

            const meshBuilder = new PolygonMeshBuilder(
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
            // For CSG2, PolygonMeshBuilder creates meshes with normals that need flipping
            // to match the expected orientation (same as CSG-processed letters)
            if (csgVersion === 'CSG2' && shape) {
                shape.flipFaces(true);
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
        ? csgShape.toMesh(meshName, scene, { centerMesh: false, rebuildNormals: true })
        : csgShape.toMesh(meshName, null, scene);

    if (csgVersion === 'CSG2' && resultMesh) {
        // CSG2/Manifold returns flipped winding relative to Babylon's PolygonMeshBuilder
        // Flip faces AND normals so lighting responds consistently with non-CSG extrusions
        resultMesh.flipFaces(true);
    }

    // Cleanup
    holes.forEach(h => h.dispose());
    shape.dispose();

    return resultMesh;
}

export { naturalLetterHeight };
