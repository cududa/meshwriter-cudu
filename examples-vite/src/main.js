/**
 * MeshWriter ES Module Example
 * Demonstrates the new import pattern with explicit font registration
 */

// Babylon.js imports
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';

// Side effects required for Babylon.js
import '@babylonjs/core/Meshes/meshBuilder';

// MeshWriter imports (ES module style)
import { MeshWriter, registerFont } from 'meshwriter';

// Import only the fonts you need (tree-shakeable)
import helvetica from 'meshwriter/fonts/helvetica.js';
import comicSans from 'meshwriter/fonts/comic-sans.js';

const statusEl = document.getElementById('status');

function log(msg) {
    console.log(msg);
    statusEl.innerHTML += msg + '<br>';
}

async function main() {
    const canvas = document.getElementById('renderCanvas');
    const engine = new Engine(canvas, true);

    // Create scene
    const scene = new Scene(engine);
    scene.clearColor = new Color3(0.2, 0.2, 0.3);

    // Camera
    const camera = new ArcRotateCamera(
        'camera',
        -Math.PI / 2,
        Math.PI / 2,
        150,
        new Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    statusEl.innerHTML = '';
    log('Babylon.js loaded');

    // Register fonts before use
    log('Registering fonts...');
    registerFont('Helvetica', helvetica);
    registerFont('Arial', helvetica); // Alias
    registerFont('ComicSans', comicSans);
    log('Fonts registered: Helvetica, Arial, ComicSans');

    // Initialize MeshWriter (async for Babylon 8+)
    log('Initializing MeshWriter...');
    let Writer;
    try {
        Writer = await MeshWriter.createAsync(scene, { scale: 1 });
        log('MeshWriter initialized');
        log('CSG Version: ' + MeshWriter.getCSGVersion());
        log('CSG Ready: ' + MeshWriter.isReady());
    } catch (e) {
        log('ERROR: ' + e.message);
        throw e;
    }

    // Create text with Helvetica
    log('Creating text...');
    const text1 = new Writer('Hello World', {
        'anchor': 'center',
        'letter-height': 20,
        'letter-thickness': 2,
        'color': '#1C3870',
        'font-family': 'Helvetica',
        'position': { x: 0, y: 20, z: 0 }
    });

    // Create text with Comic Sans
    const text2 = new Writer('ES Modules!', {
        'anchor': 'center',
        'letter-height': 15,
        'letter-thickness': 1.5,
        'color': '#FF6B6B',
        'font-family': 'ComicSans',
        'position': { x: 0, y: -10, z: 0 }
    });

    // Test letters with holes (CSG verification)
    const text3 = new Writer('B O 8 % @', {
        'anchor': 'center',
        'letter-height': 12,
        'letter-thickness': 1,
        'color': '#4ECDC4',
        'font-family': 'Helvetica',
        'position': { x: 0, y: -35, z: 0 }
    });

    log('Text created successfully!');
    log('---');
    log('If you see text with proper holes in B, O, 8, %, @ - CSG is working!');

    // Rotate text to face camera
    [text1, text2, text3].forEach(text => {
        const mesh = text.getMesh();
        if (mesh) {
            mesh.rotation.x = -Math.PI / 2;
        }
    });

    // Render loop
    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());
}

main().catch(e => {
    log('Fatal error: ' + e.message);
    console.error(e);
});
