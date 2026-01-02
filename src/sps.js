/**
 * MeshWriter SPS (Solid Particle System) Helpers
 * Converts letter meshes into an efficient SPS
 */

import { SolidParticleSystem } from './babylonImports.js';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */
/** @typedef {import('@babylonjs/core/Materials/material').Material} Material */
/** @typedef {import('@babylonjs/core/Meshes/mesh').Mesh} Mesh */
/** @typedef {(any[] & { faceMeshes?: Mesh[] })} MeshCollection */
/**
 * @typedef {[SolidParticleSystem | undefined, Mesh | undefined] & {
 *   face: [SolidParticleSystem | undefined, Mesh | undefined];
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
    const face = buildSystem("sps_face", faceMeshes, lettersOrigins, scene);

    /** @type {SPSCombo} */
    const combo = /** @type {any} */ ([rim.sps, rim.mesh]);
    combo.face = [face.sps, face.mesh];
    return combo;
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
