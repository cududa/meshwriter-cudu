# MeshWriter ES Module Refactor Plan

## Goal
Refactor MeshWriter from AMD/webpack to ES modules with Rollup, optimized for integration with the NOA (cudu) engine fork and modern Vite-based projects.

---

## Architecture Decisions

### 1. Module Format
- **Source**: Pure ES modules (`import`/`export`)
- **Output**: Dual format via Rollup
  - `dist/meshwriter.esm.js` - ES modules for Vite/modern bundlers
  - `dist/meshwriter.cjs.js` - CommonJS for Node.js/legacy
- **Package.json**: `"type": "module"` with exports field

### 2. Babylon.js Integration
- **Pattern**: Explicit imports via centralized `src/babylonImports.js`
- **Dependency**: Peer dependency `"@babylonjs/core": "^8.0.0"`
- **Rationale**: Matches NOA's pattern, enables tree-shaking, no version conflicts

### 3. Font Handling
- **Pattern**: Explicit imports with `registerFont()` - users import only fonts they need
- **Tree-shaking**: Bundlers automatically exclude unused fonts
- **Accessibility**: Dyslexia-friendly fonts are first-class citizens
- **Extensibility**: Users can create and register custom fonts using the same format

```javascript
// Users explicitly import and register fonts they need
import { MeshWriter, registerFont } from 'meshwriter';
import helvetica from 'meshwriter/fonts/helvetica';
import openDyslexic from 'meshwriter/fonts/open-dyslexic';

registerFont('Helvetica', helvetica);
registerFont('OpenDyslexic', openDyslexic);
```

### 4. Dependencies
| Dependency | Type | Rationale |
|------------|------|-----------|
| `@babylonjs/core` | peer | Match NOA, avoid duplication |
| `earcut` | peer | Common in voxel engines, avoid duplication |

### 5. TypeScript Support
- Source remains JavaScript with JSDoc annotations
- Generate `.d.ts` files via TypeScript compiler
- Matches NOA's approach (`allowJs: true`, `checkJs: true`)

---

## New File Structure

```
meshwriter/
├── src/
│   ├── index.js              # Main entry - exports MeshWriter, registerFont
│   ├── babylonImports.js     # Centralized @babylonjs/core imports
│   ├── meshwriter.js         # Core MeshWriter class
│   ├── fontRegistry.js       # Font registration & lookup
│   ├── csg.js                # CSG/CSG2 handling & detection
│   ├── material.js           # Material creation
│   ├── sps.js                # SolidParticleSystem helpers
│   ├── letterMesh.js         # Letter mesh construction
│   ├── fontCompression.js    # Font encoding/decoding utilities
│   └── utils.js              # Type checks, math helpers
├── fonts/
│   ├── index.js              # Convenience re-exports all fonts
│   │
│   │   # Standard Fonts
│   ├── helvetica.js          # HelveticaNeue-Medium (default)
│   ├── hiruko-pro.js         # HirukoPro-Book
│   ├── comic-sans.js         # ComicSans-Normal
│   ├── jura.js               # Jura-DemiBold
│   ├── webgl-dings.js        # WebGL-Dings (symbols)
│   │
│   │   # Accessibility Fonts (Dyslexia-Friendly)
│   ├── open-dyslexic.js      # OpenDyslexic (most popular)
│   ├── atkinson.js           # Atkinson Hyperlegible
│   └── lexie-readable.js     # Lexie Readable
├── dist/
│   ├── meshwriter.esm.js     # ES module build (core only, no fonts)
│   ├── meshwriter.cjs.js     # CommonJS build (core only, no fonts)
│   └── meshwriter.d.ts       # TypeScript definitions
├── package.json
├── rollup.config.js
├── tsconfig.json
└── README.md
```

---

## Available Fonts

### Standard Fonts
| Font | Import Path | Notes |
|------|-------------|-------|
| Helvetica | `meshwriter/fonts/helvetica` | Default, clean sans-serif |
| Comic Sans | `meshwriter/fonts/comic-sans` | Casual, also dyslexia-friendly |
| Jura | `meshwriter/fonts/jura` | Modern geometric |
| Hiruko Pro | `meshwriter/fonts/hiruko-pro` | Japanese-inspired |
| WebGL Dings | `meshwriter/fonts/webgl-dings` | Symbols and icons |

### Accessibility Fonts (Dyslexia-Friendly)
| Font | Import Path | Notes |
|------|-------------|-------|
| OpenDyslexic | `meshwriter/fonts/open-dyslexic` | Most widely used dyslexia font |
| Atkinson Hyperlegible | `meshwriter/fonts/atkinson` | Designed for low vision, great for dyslexia |
| Lexie Readable | `meshwriter/fonts/lexie-readable` | Specifically designed for dyslexia |

### Font Aliases
Common aliases are supported for convenience:
```javascript
registerFont('Helvetica', helvetica);
registerFont('Arial', helvetica);        // Alias
registerFont('sans-serif', helvetica);   // Alias
```

---

## Babylon.js Imports Required

Based on analysis of `index.js`, MeshWriter uses:

```javascript
// src/babylonImports.js
export { Vector2 } from '@babylonjs/core/Maths/math.vector';
export { Vector3 } from '@babylonjs/core/Maths/math.vector';
export { Color3 } from '@babylonjs/core/Maths/math.color';
export { Path2 } from '@babylonjs/core/Maths/math.path';
export { Curve3 } from '@babylonjs/core/Maths/math.path';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
export { PolygonMeshBuilder } from '@babylonjs/core/Meshes/polygonMesh';
export { CSG2 } from '@babylonjs/core/Meshes/csg2';

// Side-effect import for CSG2 initialization
import '@babylonjs/core/Meshes/csg2';
```

---

## Public API

### Basic Usage

```javascript
import { MeshWriter, registerFont } from 'meshwriter';
import helvetica from 'meshwriter/fonts/helvetica';

// Register fonts before use
registerFont('Helvetica', helvetica);

// Async initialization (required for Babylon 8+)
const Writer = await MeshWriter.createAsync(scene, { scale: 1 });

// Create text
const text = new Writer("Hello World", {
    "font-family": "Helvetica",
    "letter-height": 20,
    "letter-thickness": 2,
    "color": "#1C3870",
    "anchor": "center",
    "position": { x: 0, y: 0, z: 0 }
});

// Instance methods
text.getMesh();
text.getSPS();
text.getMaterial();
text.dispose();

// Static methods
MeshWriter.isReady();
MeshWriter.getCSGVersion();
MeshWriter.setCSGInitializer(fn);
MeshWriter.setCSGReadyCheck(fn);
MeshWriter.onCSGReady(listener);
MeshWriter.markCSGReady();
```

### Accessibility-First Example

```javascript
import { MeshWriter, registerFont } from 'meshwriter';
import openDyslexic from 'meshwriter/fonts/open-dyslexic';
import atkinson from 'meshwriter/fonts/atkinson';

// Register accessibility fonts
registerFont('OpenDyslexic', openDyslexic);
registerFont('Atkinson', atkinson);

const Writer = await MeshWriter.createAsync(scene);

// Use dyslexia-friendly font
const accessibleText = new Writer("Welcome!", {
    "font-family": "OpenDyslexic",
    "letter-height": 24,
    "letter-thickness": 3,
    "color": "#FFFFFF"
});
```

### Import All Fonts (Convenience)

```javascript
// For prototyping or when bundle size isn't a concern
import { MeshWriter, registerFont } from 'meshwriter';
import * as fonts from 'meshwriter/fonts';

// Register all available fonts
Object.entries(fonts).forEach(([name, data]) => {
    registerFont(name, data);
});
```

---

## Rollup Configuration

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// Core library build (no fonts bundled)
const coreBuild = {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/meshwriter.esm.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/meshwriter.cjs.js',
            format: 'cjs',
            sourcemap: true
        }
    ],
    external: (id) =>
        id.startsWith('@babylonjs/core') ||
        id === 'earcut' ||
        id.startsWith('./fonts/') ||
        id.startsWith('../fonts/'),
    plugins: [
        resolve(),
        commonjs()
    ]
};

export default coreBuild;
```

---

## Package.json Updates

```json
{
    "name": "meshwriter",
    "version": "3.0.0",
    "type": "module",
    "main": "dist/meshwriter.cjs.js",
    "module": "dist/meshwriter.esm.js",
    "types": "dist/meshwriter.d.ts",
    "exports": {
        ".": {
            "import": "./dist/meshwriter.esm.js",
            "require": "./dist/meshwriter.cjs.js",
            "types": "./dist/meshwriter.d.ts"
        },
        "./fonts/helvetica": "./fonts/helvetica.js",
        "./fonts/comic-sans": "./fonts/comic-sans.js",
        "./fonts/jura": "./fonts/jura.js",
        "./fonts/hiruko-pro": "./fonts/hiruko-pro.js",
        "./fonts/webgl-dings": "./fonts/webgl-dings.js",
        "./fonts/open-dyslexic": "./fonts/open-dyslexic.js",
        "./fonts/atkinson": "./fonts/atkinson.js",
        "./fonts/lexie-readable": "./fonts/lexie-readable.js",
        "./fonts": "./fonts/index.js"
    },
    "peerDependencies": {
        "@babylonjs/core": "^8.0.0",
        "earcut": "^3.0.0"
    },
    "devDependencies": {
        "@babylonjs/core": "^8.0.0",
        "@rollup/plugin-commonjs": "^25.0.0",
        "@rollup/plugin-node-resolve": "^15.0.0",
        "earcut": "^3.0.0",
        "rollup": "^4.0.0",
        "typescript": "^5.0.0"
    },
    "scripts": {
        "build": "rollup -c && tsc",
        "dev": "rollup -c -w"
    },
    "files": [
        "dist",
        "src",
        "fonts"
    ]
}
```

---

## NOA Integration Example

```javascript
// In NOA-based game with Vite
import { Engine } from 'cudu';
import { MeshWriter, registerFont } from 'meshwriter';

// Import only the fonts you need
import helvetica from 'meshwriter/fonts/helvetica';
import openDyslexic from 'meshwriter/fonts/open-dyslexic';

// Register fonts
registerFont('Helvetica', helvetica);
registerFont('OpenDyslexic', openDyslexic);

const noa = new Engine({ /* config */ });

// Initialize MeshWriter with NOA's scene
const Writer = await MeshWriter.createAsync(noa.rendering.scene, {
    scale: 1
});

// Create 3D text in the voxel world
const label = new Writer("Player Base", {
    "font-family": "Helvetica",
    "letter-height": 2,
    "letter-thickness": 0.3,
    "color": "#FFFFFF",
    "anchor": "center"
});

// Position in world
const mesh = label.getMesh();
mesh.position.set(100, 50, 100);

// Accessibility option - let users choose dyslexia-friendly font
function createLabel(text, useDyslexiaFont = false) {
    return new Writer(text, {
        "font-family": useDyslexiaFont ? "OpenDyslexic" : "Helvetica",
        "letter-height": 2,
        "letter-thickness": 0.3,
        "color": "#FFFFFF"
    });
}
```

---

## Migration Checklist

### Phase 1: Setup
- [ ] Create new file structure
- [ ] Set up Rollup config
- [ ] Set up TypeScript config for declarations
- [ ] Update package.json with exports field

### Phase 2: Core Refactor
- [ ] Create `babylonImports.js` with explicit imports
- [ ] Create `fontRegistry.js` with `registerFont()` function
- [ ] Extract font compression utilities to `fontCompression.js`
- [ ] Extract type checking utilities to `utils.js`
- [ ] Extract CSG handling to `csg.js`
- [ ] Extract material creation to `material.js`
- [ ] Extract SPS logic to `sps.js`
- [ ] Extract letter mesh building to `letterMesh.js`
- [ ] Create main `meshwriter.js` class
- [ ] Create `index.js` entry point with exports

### Phase 3: Fonts
- [ ] Convert existing fonts to ES module format
  - [ ] helvetica.js (from helveticaneue-medium.js)
  - [ ] comic-sans.js (from comicsans-normal.js)
  - [ ] jura.js (from jura-demibold.js)
  - [ ] hiruko-pro.js (from hirukopro-book.js)
  - [ ] webgl-dings.js
- [ ] Add accessibility fonts
  - [ ] Convert OpenDyslexic TTF to MeshWriter format
  - [ ] Convert Atkinson Hyperlegible TTF to MeshWriter format
  - [ ] Convert Lexie Readable TTF to MeshWriter format
- [ ] Create `fonts/index.js` convenience re-export

### Phase 4: Testing
- [ ] Test ESM import in Vite project
- [ ] Test CJS require in Node
- [ ] Test with NOA engine
- [ ] Verify CSG2 async initialization works
- [ ] Verify all standard fonts render correctly
- [ ] Verify accessibility fonts render correctly
- [ ] Test tree-shaking (bundle size analysis)
- [ ] Test single font import (verify others excluded)

### Phase 5: Documentation
- [ ] Update README with new import syntax
- [ ] Document peer dependency requirements
- [ ] Document all available fonts
- [ ] Add accessibility font usage guide
- [ ] Add migration guide for v2 -> v3
- [ ] Document custom font creation process

---

## Breaking Changes (v3.0.0)

1. **Peer dependencies required**: Users must install `@babylonjs/core` and `earcut`

2. **Fonts must be explicitly imported and registered**:
   ```javascript
   // Old (v2) - fonts bundled automatically
   const Writer = BABYLON.MeshWriter(scene);
   new Writer("Text", { "font-family": "Helvetica" });

   // New (v3) - explicit font registration
   import { MeshWriter, registerFont } from 'meshwriter';
   import helvetica from 'meshwriter/fonts/helvetica';
   registerFont('Helvetica', helvetica);
   const Writer = await MeshWriter.createAsync(scene);
   ```

3. **Removed `methods` option**: No longer needed with explicit imports

4. **Import syntax changed**:
   ```javascript
   // Old (v2)
   <script src="meshwriter.min.js"></script>
   const Writer = BABYLON.MeshWriter(scene);

   // New (v3)
   import { MeshWriter, registerFont } from 'meshwriter';
   const Writer = await MeshWriter.createAsync(scene);
   ```

---

## Custom Font Creation

Users can create custom fonts by following the MeshWriter font format:

```javascript
// my-custom-font.js
export default {
    // Font metadata
    reverseShapes: false,
    reverseHoles: true,

    // Character definitions
    'A': {
        sC: ["..."],  // Compressed shape commands
        hC: [["..."]], // Compressed hole commands
        xMin: 0,
        xMax: 800,
        yMin: 0,
        yMax: 1000,
        wdth: 850     // Character width
    },
    'B': { /* ... */ },
    // ... more characters
};
```

Tools for converting TTF/OTF to MeshWriter format will be documented separately.

---

## Notes

- The `centerMesh: false` fix for CSG2 must be preserved
- `flipFaces()` calls for CSG2 compatibility must be preserved
- Curve sampling optimization (curveSampleSize=6) must be preserved for performance
- Font compression format (sC/hC) reduces file size by ~50%
- Accessibility fonts should be tested with actual users when possible
