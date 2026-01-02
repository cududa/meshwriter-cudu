import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

// ES Module build (tree-shakeable, for Vite/modern bundlers)
const esmBuild = {
    input: 'src/index.js',
    output: {
        file: 'dist/meshwriter.esm.js',
        format: 'esm',
        sourcemap: true
    },
    external: [
        /^@babylonjs\/core/,
        'earcut'
    ],
    plugins: [
        resolve(),
        commonjs()
    ]
};

// CommonJS build (for Node.js)
const cjsBuild = {
    input: 'src/index.js',
    output: {
        file: 'dist/meshwriter.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
    },
    external: [
        /^@babylonjs\/core/,
        'earcut'
    ],
    plugins: [
        resolve(),
        commonjs()
    ]
};

// Map all @babylonjs/core subpaths to the BABYLON global
const babylonGlobals = {
    '@babylonjs/core': 'BABYLON',
    '@babylonjs/core/Maths/math.vector': 'BABYLON',
    '@babylonjs/core/Maths/math.color': 'BABYLON',
    '@babylonjs/core/Maths/math.path': 'BABYLON',
    '@babylonjs/core/Meshes/mesh': 'BABYLON',
    '@babylonjs/core/Meshes/mesh.vertexData': 'BABYLON',
    '@babylonjs/core/Meshes/polygonMesh': 'BABYLON',
    '@babylonjs/core/Materials/standardMaterial': 'BABYLON',
    '@babylonjs/core/Materials/materialPluginBase': 'BABYLON',
    '@babylonjs/core/Particles/solidParticleSystem': 'BABYLON',
    '@babylonjs/core/Meshes/csg': 'BABYLON',
    '@babylonjs/core/Meshes/csg2': 'BABYLON',
    'earcut': 'earcut'
};

// UMD build (for script tags, backward compatibility)
// Fonts are bundled in, attaches to window.MeshWriter and BABYLON.MeshWriter
const umdBuild = {
    input: 'src/umd-entry.js',
    output: [
        {
            file: 'dist/meshwriter.umd.js',
            format: 'umd',
            name: 'MeshWriter',
            sourcemap: true,
            globals: babylonGlobals
        },
        {
            file: 'dist/meshwriter.min.js',
            format: 'umd',
            name: 'MeshWriter',
            sourcemap: true,
            globals: babylonGlobals,
            plugins: [terser()]
        }
    ],
    external: [
        /^@babylonjs\/core/,
        'earcut'
    ],
    plugins: [
        resolve(),
        commonjs()
    ]
};

export default [esmBuild, cjsBuild, umdBuild];
