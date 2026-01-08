# MeshWriter

3D text rendering for Babylon.js with variable font weight support.

## Installation

```bash
npm install meshwriter
```

**Peer dependencies:**
- `@babylonjs/core` >= 6.0.0
- `earcut` >= 2.0.0

## Quick Start

```javascript
import { MeshWriter, registerFont } from 'meshwriter';
import helvetica from 'meshwriter/fonts/helvetica';

// Register a font
registerFont('Helvetica', helvetica);

// Create writer (async for Babylon 8+)
const Writer = await MeshWriter.createAsync(scene);

// Create 3D text
const text = new Writer("Hello World", {
    'font-family': 'Helvetica',
    'letter-height': 50,
    'letter-thickness': 5,
    color: '#FF0000'
});
```

## Variable Weight Fonts

MeshWriter supports variable weight fonts for accessibility applications (e.g., dyslexia-friendly text with personalized font weights).

### Recommended: Pre-baked Weights

Pre-generate FontSpec JSON files at build time. Zero runtime overhead, no additional dependencies.

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

#### 2. Use at runtime

```javascript
import { loadBakedFont, findNearestWeight, registerFont, MeshWriter } from 'meshwriter';

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
| `--weights=N,N,N` | Comma-separated weights | `200,250,300,350,400,450,500,550,600,650,700,750,800` |
| `--charset=CHARS` | Characters to include | ASCII 32-126 (95 keyboard chars) |
| `--output=DIR` | Output directory | `./fonts/baked` |

### Output

The bake script generates:
- One JSON file per weight (~45KB each for 95 characters)
- A `manifest.json` with metadata

```
fonts/baked/
├── atkinson-hyperlegible-next-400.json
├── atkinson-hyperlegible-next-425.json
├── atkinson-hyperlegible-next-450.json
└── manifest.json
```

### Using the Manifest

```javascript
import { loadBakedFontsFromManifest, getBakedFontManifest } from 'meshwriter';

// Get available weights without loading fonts
const manifest = await getBakedFontManifest('/fonts/baked/manifest.json');
console.log(manifest.weights); // [400, 425, 450, ...]

// Load specific weights
const fonts = await loadBakedFontsFromManifest('/fonts/baked/manifest.json', [400, 450]);
const fontSpec = fonts.get(400);
```

## API Reference

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

// Appearance
text.setColor('#00FF00'); // Change color
text.setAlpha(0.5);       // Change transparency
text.color('#00FF00');    // Get/set color
text.alpha(0.5);          // Get/set alpha

// Layout info
text.getLetterCenter(0);  // Center of first letter
text.getLettersBoxes();   // Bounding boxes
text.getOffsetX();        // Anchor offset

// Cleanup
text.dispose();
text.isDisposed();
```

### Font Registration

```javascript
import { registerFont, registerFontAliases, isFontRegistered, getRegisteredFonts } from 'meshwriter';

// Register font
registerFont('MyFont', fontSpec);

// Create aliases
registerFontAliases('MyFont', 'myfont', 'my-font', 'MyFontRegular');

// Check registration
isFontRegistered('MyFont'); // true
getRegisteredFonts();       // ['MyFont', 'myfont', 'my-font', ...]
```

## Bundled Fonts

MeshWriter includes pre-compiled fonts:

```javascript
import helvetica from 'meshwriter/fonts/helvetica';
import comicSans from 'meshwriter/fonts/comic-sans';
// ... see fonts/ directory
```

## Color Contrast Utilities

For accessibility, MeshWriter includes WCAG-compliant color contrast utilities:

```javascript
import { deriveEdgeColors, adjustForContrast, CONTRAST_LEVELS } from 'meshwriter';

// Auto-generate high-contrast edge colors
const colors = deriveEdgeColors('#FF6600', CONTRAST_LEVELS.AA_NORMAL);
// { diffuse: '...', ambient: '...', emissive: '...' }

// Adjust existing colors to meet contrast requirements
const adjusted = adjustForContrast(
    { emissive: '#FF6600', diffuse: '#333333' },
    { targetContrast: 4.5 }
);
```

## CSG Initialization (Babylon 8+)

MeshWriter uses CSG2 for boolean operations. For Babylon 8+, use the async factory:

```javascript
// Recommended for Babylon 8+
const Writer = await MeshWriter.createAsync(scene);

// If you need to initialize CSG2 manually
import { InitializeCSG2Async } from '@babylonjs/core/Meshes/csg2';
await InitializeCSG2Async();
const Writer = MeshWriter.create(scene);
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
```

## Output Formats

- `dist/meshwriter.esm.js` - ES modules (tree-shakeable)
- `dist/meshwriter.cjs.js` - CommonJS (Node.js)
- `dist/meshwriter.umd.js` - UMD (script tags)
- `dist/meshwriter.min.js` - Minified UMD

## License

MIT
