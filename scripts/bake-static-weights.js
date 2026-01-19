#!/usr/bin/env node
/**
 * Bake Static Font Weights
 *
 * Uses the existing converter.js (opentype.js) to generate font files
 * from static weight TTF files. This produces the same format as the
 * working atkinson-hyperlegible-next.js font.
 *
 * Usage:
 *   node scripts/bake-static-weights.js
 */

import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { convertFont, generateFontModule } from '../tools/font-generator/converter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Static font files and their weight mappings
// Using OTF files (CFF format) to match the original working font's winding
const FONT_DIR = join(PROJECT_ROOT, 'Atkinson-Hyperlegible-Next');
const OUTPUT_DIR = join(PROJECT_ROOT, 'fonts/baked');

// Map static font files to weight values
// OTF files use CFF format which produces reverseHoles: true, reverseShapes: false
const WEIGHT_MAP = {
    'AtkinsonHyperlegibleNext-ExtraLight.otf': 200,
    'AtkinsonHyperlegibleNext-Light.otf': 300,
    'AtkinsonHyperlegibleNext-Regular.otf': 400,
    'AtkinsonHyperlegibleNext-Medium.otf': 500,
    'AtkinsonHyperlegibleNext-SemiBold.otf': 600,
    'AtkinsonHyperlegibleNext-Bold.otf': 700,
    'AtkinsonHyperlegibleNext-ExtraBold.otf': 800,
};

// Character set - ASCII printable characters
const CHARSET =
    ' !"#$%&\'()*+,-./0123456789:;<=>?' +
    '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
    '`abcdefghijklmnopqrstuvwxyz{|}~';

async function bakeAll() {
    console.log('=== Baking Static Font Weights ===\n');
    console.log(`Font directory: ${FONT_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log(`Character set: ${CHARSET.length} characters\n`);

    // Create output directory
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const results = [];

    for (const [filename, weight] of Object.entries(WEIGHT_MAP)) {
        const fontPath = join(FONT_DIR, filename);

        if (!existsSync(fontPath)) {
            console.log(`  Skipping ${filename} (not found)`);
            continue;
        }

        console.log(`Processing ${filename} (weight ${weight})...`);

        try {
            const fontSpec = await convertFont(fontPath, {
                charset: CHARSET,
                scale: 1,
                name: `Atkinson Hyperlegible Next ${weight}`
            });

            // Output as JS module (same format as working font)
            const jsPath = join(OUTPUT_DIR, `atkinson-hyperlegible-next-${weight}.js`);
            const moduleSource = generateFontModule(fontSpec, `Atkinson Hyperlegible Next ${weight}`);
            writeFileSync(jsPath, moduleSource, 'utf-8');

            // Also output as JSON for FontLoader compatibility
            const jsonPath = join(OUTPUT_DIR, `atkinson-hyperlegible-next-${weight}.json`);
            writeFileSync(jsonPath, JSON.stringify(fontSpec));

            const glyphCount = Object.keys(fontSpec).filter(k =>
                k !== 'reverseHoles' && k !== 'reverseShapes' && k !== 'kern'
            ).length;

            results.push({
                weight,
                file: basename(jsPath),
                glyphs: glyphCount,
                kerning: Object.keys(fontSpec.kern || {}).length
            });

            console.log(`  -> ${basename(jsPath)} (${glyphCount} glyphs)\n`);

        } catch (err) {
            console.error(`  Error processing ${filename}:`, err.message);
        }
    }

    // Write manifest
    const manifest = {
        fontName: 'Atkinson Hyperlegible Next',
        weights: results.map(r => r.weight),
        files: results.map(r => r.file),
        generatedAt: new Date().toISOString(),
        generator: 'bake-static-weights.js (opentype.js)'
    };
    writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log('=== Baking Complete ===\n');
    console.log('Generated:');
    for (const r of results) {
        console.log(`  ${r.file}: ${r.glyphs} glyphs, ${r.kerning} kerning pairs`);
    }
    console.log(`  manifest.json`);
}

bakeAll().catch(err => {
    console.error('Baking failed:', err);
    process.exit(1);
});
