# MeshWriter

Generate 3D text in Babylon.js meshes.

## Installation

```bash
npm install meshwriter
```

MeshWriter requires `@babylonjs/core` and `earcut` as peer dependencies:

```bash
npm install @babylonjs/core earcut
```

## Quick Start (ES Modules)

```javascript
import { MeshWriter, registerFont } from 'meshwriter';
import helvetica from 'meshwriter/fonts/helvetica.js';

// Register fonts before use
registerFont('Helvetica', helvetica);

// Create MeshWriter (async for Babylon 8+)
const Writer = await MeshWriter.createAsync(scene, { scale: 1 });

// Create 3D text
const text = new Writer("Hello World", {
    "font-family": "Helvetica",
    "letter-height": 50,
    "letter-thickness": 2,
    "color": "#1C3870",
    "anchor": "center",
    "position": { x: 0, y: 0, z: 0 }
});

// Get the mesh for manipulation
const mesh = text.getMesh();
```

## UMD Bundle (Script Tag)

For script-tag usage with fonts bundled:

```html
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://unpkg.com/earcut@3.0.2/dist/earcut.min.js"></script>
<script src="path/to/meshwriter.min.js"></script>
<script>
    const Writer = await BABYLON.MeshWriter.createAsync(scene, { scale: 1 });
    const text = new Writer("Hello", { "letter-height": 50 });
</script>
```

## Babylon.js Version Compatibility

| Babylon Version | API | Notes |
|-----------------|-----|-------|
| < 7.31 | `MeshWriter.create(scene, prefs)` | Sync, uses legacy CSG |
| 7.31+ / 8.0+ | `await MeshWriter.createAsync(scene, prefs)` | Async, uses CSG2 |

## API Reference

### Font Registration

```javascript
import { registerFont } from 'meshwriter';
import helvetica from 'meshwriter/fonts/helvetica.js';
import comicSans from 'meshwriter/fonts/comic-sans.js';

registerFont('Helvetica', helvetica);
registerFont('Arial', helvetica);  // Alias
registerFont('ComicSans', comicSans);
```

### Available Fonts

| Font | Import Path |
|------|-------------|
| Helvetica | `meshwriter/fonts/helvetica.js` |
| Comic Sans | `meshwriter/fonts/comic-sans.js` |
| Jura | `meshwriter/fonts/jura.js` |
| Hiruko Pro | `meshwriter/fonts/hiruko-pro.js` |
| WebGL Dings | `meshwriter/fonts/webgl-dings.js` |

### Creating Text

```javascript
const text = new Writer("Your text here", {
    "font-family": "Helvetica",     // Registered font name
    "anchor": "center",              // "left", "center", or "right"
    "letter-height": 100,            // Height in world units
    "letter-thickness": 1,           // Depth/thickness
    "color": "#808080",              // Emissive color (hex)
    "alpha": 1,                      // Transparency (0-1)
    "position": { x: 0, y: 0, z: 0 },
    "colors": {                      // Optional: full material control
        "diffuse": "#F0F0F0",
        "specular": "#000000",
        "ambient": "#F0F0F0",
        "emissive": "#808080"
    }
});
```

### Instance Methods

```javascript
text.getMesh();           // Returns the Babylon.js mesh
text.getSPS();            // Returns the SolidParticleSystem
text.getMaterial();       // Returns the StandardMaterial
text.getOffsetX();        // Returns X offset based on anchor
text.getLettersBoxes();   // Returns bounding boxes per letter
text.getLettersOrigins(); // Returns origin positions per letter
text.color("#FF0000");    // Get/set emissive color
text.alpha(0.5);          // Get/set alpha
text.setColor("#FF0000"); // Update color and material
text.setAlpha(0.5);       // Update alpha and material
text.dispose();           // Clean up all resources
```

### Static Methods

```javascript
MeshWriter.isReady();                    // Check if CSG is initialized
MeshWriter.getCSGVersion();              // Returns 'CSG2', 'CSG', or null
MeshWriter.setCSGInitializer(fn);        // Custom CSG2 initializer
MeshWriter.setCSGReadyCheck(fn);         // Custom readiness check
MeshWriter.onCSGReady(callback);         // Run code when CSG is ready
MeshWriter.markCSGReady();               // Manually flag CSG ready
```

## Advanced: Custom CSG Initialization

For bundled environments where globals are tree-shaken:

```javascript
import { MeshWriter, registerFont } from 'meshwriter';
import { InitializeCSG2Async, IsCSG2Ready } from "@babylonjs/core/Meshes/csg2";
import helvetica from 'meshwriter/fonts/helvetica.js';

registerFont('Helvetica', helvetica);

// Configure custom CSG handling
MeshWriter.setCSGInitializer(() => InitializeCSG2Async());
MeshWriter.setCSGReadyCheck(() => IsCSG2Ready());

const Writer = await MeshWriter.createAsync(scene, { scale: 1 });
```

## Tree-Shaking

Import only the fonts you need for optimal bundle size:

```javascript
// Only Helvetica is bundled
import helvetica from 'meshwriter/fonts/helvetica.js';
registerFont('Helvetica', helvetica);

// For all fonts (not recommended for production)
import * as fonts from 'meshwriter/fonts';
Object.entries(fonts).forEach(([name, data]) => registerFont(name, data));
```

## Migration from v2.x

### Breaking Changes in v3.0.0

1. **Peer dependencies required**: Install `@babylonjs/core` and `earcut` separately
2. **Fonts must be explicitly imported and registered**:

   ```javascript
   // Old (v2) - fonts bundled automatically
   const Writer = BABYLON.MeshWriter(scene);
   new Writer("Text", { "font-family": "Helvetica" });

   // New (v3) - explicit font registration
   import { MeshWriter, registerFont } from 'meshwriter';
   import helvetica from 'meshwriter/fonts/helvetica.js';
   registerFont('Helvetica', helvetica);
   const Writer = await MeshWriter.createAsync(scene);
   ```

3. **Removed `methods` option**: No longer needed with ES module imports

## Font Characters

### Helvetica (Default)
Full support for Latin characters, diacritics, numbers, and common symbols.

### Comic Sans
Full support for Latin characters, diacritics, numbers, and common symbols.

### Jura
Basic Latin characters, numbers, and common symbols.

### Hiruko Pro
Basic Latin characters, numbers, and common symbols.

## License

MIT - See LICENSE file for details.

This is a fork of [briantbutton/meshwriter](https://github.com/briantbutton/meshwriter) with ES module support and Babylon.js 8 compatibility.
