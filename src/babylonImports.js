/**
 * MeshWriter Babylon.js Imports
 * Centralized imports from @babylonjs/core for tree-shaking
 */

// Core math types
export { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
export { Color3 } from '@babylonjs/core/Maths/math.color';
export { Path2, Curve3 } from '@babylonjs/core/Maths/math.path';

// Mesh types
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
export { PolygonMeshBuilder } from '@babylonjs/core/Meshes/polygonMesh';

// Materials
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';

// Particle system
export { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';

// CSG - legacy (Babylon < 7.31)
export { CSG } from '@babylonjs/core/Meshes/csg';

// CSG2 - modern (Babylon 7.31+)
// Import directly - will be available in Babylon 7.31+
// For older versions, these will be undefined but that's handled in csg.js
export { CSG2, InitializeCSG2Async, IsCSG2Ready } from '@babylonjs/core/Meshes/csg2';
