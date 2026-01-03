/**
 * MeshWriter SPS (Solid Particle System) Helpers
 * Converts letter meshes into an efficient SPS
 */

import { SolidParticleSystem, Mesh } from './babylonImports.js';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */
/** @typedef {import('@babylonjs/core/Materials/material').Material} Material */
/** @typedef {import('@babylonjs/core/Meshes/mesh').Mesh} BabylonMesh */
/** @typedef {(any[] & { faceMeshes?: BabylonMesh[] })} MeshCollection */
/**
 * @typedef {[SolidParticleSystem | undefined, BabylonMesh | undefined] & {
 *   face: [SolidParticleSystem | undefined, BabylonMesh | undefined];
 * }} SPSCombo
 */

/**
 * Create an SPS from letter meshes
 * @param {Scene} scene - Babylon scene
 * @param {MeshCollection} meshesAndBoxes - [meshes, boxes, origins] with optional face geometry
 * @param {Material} material - Material to apply to SPS mesh
 * @returns {SPSCombo} - Combined SPS + emissive face SPS
 */
export function makeSPS(scene, meshesAndBoxes, material) {
    const rimMeshes = meshesAndBoxes[0] || [];
    const faceMeshes = meshesAndBoxes.faceMeshes || [];
    const lettersOrigins = meshesAndBoxes[2] || [];

    const rim = buildSystem("sps_rim", rimMeshes, lettersOrigins, scene, material);

    // Use Mesh.MergeMeshes for face instead of SPS - SPS has issues with face geometry
    const face = buildFaceMesh("sps_face", faceMeshes, lettersOrigins, scene);

    /** @type {SPSCombo} */
    const combo = /** @type {any} */ ([rim.sps, rim.mesh]);
    combo.face = [undefined, face.mesh]; // No SPS for face, just merged mesh
    return combo;
}

/**
 * Build face mesh using Mesh.MergeMeshes instead of SPS
 * @param {string} name - Mesh name
 * @param {BabylonMesh[]} meshes - Face meshes to merge
 * @param {Array} lettersOrigins - Letter origin positions
 * @param {Scene} scene - Babylon scene
 * @returns {{ mesh: BabylonMesh | undefined }}
 */
function buildFaceMesh(name, meshes, lettersOrigins, scene) {
    const validMeshes = meshes.filter(m => m != null);
    if (!validMeshes.length) {
        return { mesh: undefined };
    }

    // Position each mesh according to letter origins before merging
    validMeshes.forEach((mesh, ix) => {
        if (lettersOrigins[ix]) {
            mesh.position.x = lettersOrigins[ix][0] + lettersOrigins[ix][1];
            mesh.position.z = lettersOrigins[ix][2];
        }
    });

    // Merge all face meshes into one
    const merged = Mesh.MergeMeshes(validMeshes, true, true, undefined, false, true);
    if (merged) {
        merged.name = name;
    }

    return { mesh: merged };
}

function buildSystem(name, meshes, lettersOrigins, scene, material) {
    if (!meshes.length) {
        return { sps: undefined, mesh: undefined };
    }

    const sps = new SolidParticleSystem(name, scene, {});
    meshes.forEach(function(mesh, ix) {
        if (!mesh) return;
        sps.addShape(mesh, 1, {
            positionFunction: makePositionParticle(lettersOrigins[ix])
        });
        mesh.dispose();
    });

    const spsMesh = sps.buildMesh();

    if (spsMesh && material) {
        spsMesh.material = material;
    }
    sps.setParticles();

    return { sps, mesh: spsMesh };
}

function makePositionParticle(letterOrigins) {
    return function positionParticle(particle) {
        if (!letterOrigins) return;
        particle.position.x = letterOrigins[0] + letterOrigins[1];
        particle.position.z = letterOrigins[2];
    };
}
