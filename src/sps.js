/**
 * MeshWriter SPS (Solid Particle System) Helpers
 * Converts letter meshes into an efficient SPS
 */

import { SolidParticleSystem } from './babylonImports.js';

/** @typedef {import('@babylonjs/core/scene').Scene} Scene */
/** @typedef {import('@babylonjs/core/Materials/material').Material} Material */
/** @typedef {import('@babylonjs/core/Meshes/mesh').Mesh} Mesh */

/**
 * Create an SPS from letter meshes
 * @param {Scene} scene - Babylon scene
 * @param {Array} meshesAndBoxes - [meshes, boxes, origins] from constructLetterPolygons
 * @param {Material} material - Material to apply to SPS mesh
 * @returns {[SolidParticleSystem | undefined, Mesh | undefined]} - [sps, spsMesh]
 */
export function makeSPS(scene, meshesAndBoxes, material) {
    const meshes = meshesAndBoxes[0];
    const lettersOrigins = meshesAndBoxes[2];
    let sps, spsMesh;

    if (meshes.length) {
        sps = new SolidParticleSystem("sps" + "test", scene, {});

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
