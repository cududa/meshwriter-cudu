# meshwriter-cudu

Modern 3D text rendering for Babylon.js 8+ with ES modules, variable font weights, and accessibility features.

[![npm version](https://img.shields.io/npm/v/meshwriter-cudu.svg)](https://www.npmjs.com/package/meshwriter-cudu)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Babylon.js 6-8+ support** with async/sync APIs for CSG2 compatibility
- **ES modules** with full tree-shaking support
- **Variable font weights** via build-time baking for personalized typography
- **Dyslexia-friendly fonts** including Atkinson Hyperlegible Next with kerning
- **TypeScript declarations** included
- **WCAG color contrast utilities** for accessible text rendering
- **Fog support** for emissive text via custom material plugin

## Installation

```bash
npm install meshwriter-cudu
```

**Peer dependencies:**
```bash
npm install @babylonjs/core earcut
```

## Quick Start

```javascript
import { MeshWriter, registerFont } from 'meshwriter-cudu';
import helvetica from 'meshwriter-cudu/fonts/helvetica';

// Register a font
registerFont('Helvetica', helvetica);

// Create writer (async for Babylon 8+)
const Writer = await MeshWriter.createAsync(scene);

// Create 3D text
const text = new Writer("Hello World", {
    'font-family': 'Helvetica',
    'letter-height': 50,
    'letter-thickness': 5,
    color: '#1C3870'
});

// Get the mesh for manipulation
const mesh = text.getMesh();
```

## Babylon.js Version Compatibility

| Babylon Version | API | Notes |
|-----------------|-----|-------|
| 6.x - 7.30 | `MeshWriter.create(scene, prefs)` | Sync, uses legacy CSG |
| 7.31+ / 8.x | `await MeshWriter.createAsync(scene, prefs)` | Async, uses CSG2 |

**Recommendation:** Use `createAsync` for all new projects. It handles CSG initialization automatically and works across all supported Babylon versions.

## API Reference

### Font Registration

```javascript
import { registerFont, registerFontAliases, isFontRegistered, getRegisteredFonts } from 'meshwriter-cudu';

// Register font
registerFont('MyFont', fontSpec);

// Create aliases for the same font
registerFontAliases('MyFont', 'myfont', 'my-font');

// Check registration
isFontRegistered('MyFont'); // true
getRegisteredFonts();       // ['MyFont', 'myfont', 'my-font', ...]
```

### Text Creation Options

```javascript
new Writer("Text", {
    // Positioning
    position: { x: 0, y: 0, z: 0 },
    anchor: 'left' | 'center' | 'right',

    // Sizing
    'letter-height': 50,      // Height in world units
    'letter-thickness': 5,    // Depth/extrusion

    // Appearance
    color: '#FF0000',         // Emissive color (hex)
    alpha: 1.0,               // Transparency (0-1)
    'emissive-only': false,   // Disable lighting (self-lit)
    'fog-enabled': true,      // Affected by scene fog

    // Material colors (advanced)
    colors: {
        diffuse: '#FFFFFF',
        specular: '#FFFFFF',
        ambient: '#000000',
        emissive: '#FF0000'
    },

    // Font
    'font-family': 'Helvetica'
});
```

### Instance Methods

```javascript
const text = new Writer("Hello");

// Get meshes
text.getMesh();           // Combined mesh
text.getSPS();            // SolidParticleSystem
text.getMaterial();       // StandardMaterial

// Appearance
text.setColor('#00FF00'); // Change color
text.setAlpha(0.5);       // Change transparency
text.color('#00FF00');    // Get/set color
text.alpha(0.5);          // Get/set alpha

// Layout info
text.getLetterCenter(0);  // Center of first letter
text.getLettersBoxes();   // Bounding boxes
text.getLettersOrigins(); // Origin positions per letter
text.getOffsetX();        // Anchor offset

// Cleanup
text.dispose();
text.isDisposed();
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

## Available Fonts

| Font | Import Path | Notes |
|------|-------------|-------|
| Helvetica | `meshwriter-cudu/fonts/helvetica` | Classic sans-serif |
| Comic Sans | `meshwriter-cudu/fonts/comic-sans` | Display font |
| Jura | `meshwriter-cudu/fonts/jura` | Modern geometric |
| Hiruko Pro | `meshwriter-cudu/fonts/hiruko-pro` | Japanese-compatible |
| WebGL Dings | `meshwriter-cudu/fonts/webgl-dings` | Symbols |
| Atkinson Hyperlegible | `meshwriter-cudu/fonts/atkinson-hyperlegible` | Dyslexia-friendly |
| Atkinson Hyperlegible Next | `meshwriter-cudu/fonts/atkinson-hyperlegible-next` | Enhanced with kerning |

```javascript
import helvetica from 'meshwriter-cudu/fonts/helvetica';
import atkinson from 'meshwriter-cudu/fonts/atkinson-hyperlegible-next';

registerFont('Helvetica', helvetica);
registerFont('Atkinson', atkinson);
```

## Variable Font Weights

MeshWriter supports variable font weights for accessibility applications, allowing users to select their preferred font weight for improved readability.

### Pre-baked Weights (Recommended)

Generate FontSpec JSON files at build time for zero runtime overhead:

#### 1. Bake fonts during build

```bash
# Default: weights 200-800 in steps of 50, ASCII keyboard characters
npm run bake:fonts

# Custom weights
npm run bake:fonts -- --weights=350,400,425,450,500

# Custom charset (smaller files)
npm run bake:fonts -- --charset="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .!?"

# Different font
npm run bake:fonts -- --font=./path/to/variable-font.ttf
```

#### 2. Load at runtime

```javascript
import { loadBakedFont, findNearestWeight, registerFont, MeshWriter } from 'meshwriter-cudu';

// Available weights from your bake step
const availableWeights = [350, 400, 425, 450, 500];

// Find nearest to user's preferred weight
const userWeight = 415; // e.g., from user profile
const nearest = findNearestWeight(userWeight, availableWeights);

// Load just the one weight file (~45KB)
const fontSpec = await loadBakedFont(`/fonts/baked/atkinson-hyperlegible-next-${nearest}.json`);
registerFont('Atkinson', fontSpec);

// Create text
const Writer = await MeshWriter.createAsync(scene);
const text = new Writer("Hello!", {
    'font-family': 'Atkinson',
    'letter-height': 50
});
```

### Bake Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `--font=PATH` | Variable font file (.ttf) | `./fonts/variable/atkinson-hyperlegible-next-variable.ttf` |
| `--weights=N,N,N` | Comma-separated weights | `200,250,300,...,800` (13 weights) |
| `--charset=CHARS` | Characters to include | ASCII 32-126 (95 chars) |
| `--output=DIR` | Output directory | `./fonts/baked` |

### Using the Manifest

```javascript
import { loadBakedFontsFromManifest, getBakedFontManifest } from 'meshwriter-cudu';

// Get available weights without loading fonts
const manifest = await getBakedFontManifest('/fonts/baked/manifest.json');
console.log(manifest.weights); // [200, 250, 300, ...]

// Load specific weights
const fonts = await loadBakedFontsFromManifest('/fonts/baked/manifest.json', [400, 450]);
const fontSpec = fonts.get(400);
```

## Advanced Features

### Color Contrast Utilities

WCAG 2.1 compliant color utilities for accessible text:

```javascript
import { deriveEdgeColors, adjustForContrast, CONTRAST_LEVELS } from 'meshwriter-cudu';

// Auto-generate high-contrast edge colors
const colors = deriveEdgeColors('#FF6600', CONTRAST_LEVELS.AA_NORMAL);
// { diffuse: '...', ambient: '...', emissive: '...' }

// Adjust existing colors to meet contrast requirements
const adjusted = adjustForContrast(
    { emissive: '#FF6600', diffuse: '#333333' },
    { targetContrast: 4.5 }
);
```

### Custom CSG Initialization

For bundled environments where globals may be tree-shaken:

```javascript
import { MeshWriter, registerFont } from 'meshwriter-cudu';
import { InitializeCSG2Async, IsCSG2Ready } from "@babylonjs/core/Meshes/csg2";
import helvetica from 'meshwriter-cudu/fonts/helvetica';

registerFont('Helvetica', helvetica);

// Configure custom CSG handling
MeshWriter.setCSGInitializer(() => InitializeCSG2Async());
MeshWriter.setCSGReadyCheck(() => IsCSG2Ready());

const Writer = await MeshWriter.createAsync(scene, { scale: 1 });
```

### Fog Support for Emissive Text

By default, Babylon.js fog doesn't affect emissive materials. MeshWriter includes a material plugin to fix this:

```javascript
const text = new Writer("Foggy Text", {
    'font-family': 'Helvetica',
    'letter-height': 50,
    'emissive-only': true,  // Self-lit text
    'fog-enabled': true     // Respects scene fog
});
```

## UMD Bundle (Script Tag)

For non-bundler environments:

```html
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://unpkg.com/earcut@3.0.2/dist/earcut.min.js"></script>
<script src="path/to/meshwriter.min.js"></script>
<script>
    const Writer = await BABYLON.MeshWriter.createAsync(scene, { scale: 1 });
    const text = new Writer("Hello", { "letter-height": 50 });
</script>
```

## Building from Source

```bash
# Install dependencies
npm install

# Build all formats (ESM, CJS, UMD)
npm run build

# Build and watch
npm run dev

# Bake variable font weights
npm run bake:fonts

# Type check
npm run typecheck
```

### Output Formats

- `dist/meshwriter.esm.js` - ES modules (tree-shakeable)
- `dist/meshwriter.cjs.js` - CommonJS (Node.js)
- `dist/meshwriter.umd.js` - UMD (script tags)
- `dist/meshwriter.min.js` - Minified UMD

## Acknowledgments

This project is a fork of [meshwriter](https://github.com/briantbutton/meshwriter) by **Brian T Button**. The original library pioneered 3D text rendering in Babylon.js and remains the foundation of this work.

**What this fork adds:**
- ES module support with tree-shaking
- Babylon.js 8+ compatibility with async CSG2 initialization
- Variable font weight support via build-time baking
- Dyslexia-friendly fonts (Atkinson Hyperlegible Next) with kerning
- TypeScript declarations
- WCAG color contrast utilities
- Fog plugin for emissive text
- Improved hole rendering for characters like 8, B, etc.

Thank you to Brian T Button for creating and maintaining the original meshwriter library.

## License

MIT - See [LICENSE](LICENSE) file for details.
