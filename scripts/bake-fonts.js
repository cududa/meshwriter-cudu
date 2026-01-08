#!/usr/bin/env node
/**
 * Bake Variable Fonts Script
 *
 * Pre-generates FontSpec JSON files at discrete weights during build time.
 * This eliminates the need for fontkit at runtime.
 *
 * Usage:
 *   node scripts/bake-fonts.js
 *   node scripts/bake-fonts.js --weights=400,425,450 --font=./fonts/variable/my-font.ttf
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import * as fontkit from 'fontkit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Common English keyboard characters (ASCII 32-126)
const KEYBOARD_CHARSET =
    ' !"#$%&\'()*+,-./0123456789:;<=>?' +
    '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
    '`abcdefghijklmnopqrstuvwxyz{|}~';

// Default weights to generate (50-unit steps from 200 to 800)
const DEFAULT_WEIGHTS = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800];

// Default font path
const DEFAULT_FONT_PATH = join(PROJECT_ROOT, 'fonts/variable/atkinson-hyperlegible-next-variable.ttf');

// Output directory
const OUTPUT_DIR = join(PROJECT_ROOT, 'fonts/baked');

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        weights: DEFAULT_WEIGHTS,
        fontPath: DEFAULT_FONT_PATH,
        charset: KEYBOARD_CHARSET,
        outputDir: OUTPUT_DIR
    };

    for (const arg of args) {
        if (arg.startsWith('--weights=')) {
            options.weights = arg.slice('--weights='.length)
                .split(',')
                .map(w => parseInt(w.trim(), 10))
                .filter(w => !isNaN(w));
        } else if (arg.startsWith('--font=')) {
            options.fontPath = arg.slice('--font='.length);
        } else if (arg.startsWith('--output=')) {
            options.outputDir = arg.slice('--output='.length);
        } else if (arg.startsWith('--charset=')) {
            options.charset = arg.slice('--charset='.length);
        }
    }

    return options;
}

/**
 * Convert fontkit glyph to MeshWriter GlyphSpec
 */
function convertGlyphToSpec(glyph, scale = 1) {
    const path = glyph.path;

    if (!path || !path.commands || path.commands.length === 0) {
        if (glyph.advanceWidth > 0) {
            return {
                shapeCmds: [],
                holeCmds: [],
                xMin: 0,
                xMax: 0,
                yMin: 0,
                yMax: 0,
                wdth: Math.round(glyph.advanceWidth * scale)
            };
        }
        return null;
    }

    const { shapes, holes } = convertPath(path, scale);

    if (shapes.length === 0 && holes.length === 0) {
        if (glyph.advanceWidth > 0) {
            return {
                shapeCmds: [],
                holeCmds: [],
                xMin: 0,
                xMax: 0,
                yMin: 0,
                yMax: 0,
                wdth: Math.round(glyph.advanceWidth * scale)
            };
        }
        return null;
    }

    const bbox = path.bbox;
    return {
        shapeCmds: shapes,
        holeCmds: holes.map(hole => [hole]),
        xMin: Math.round((bbox.minX || 0) * scale),
        xMax: Math.round((bbox.maxX || 0) * scale),
        yMin: Math.round((bbox.minY || 0) * scale),
        yMax: Math.round((bbox.maxY || 0) * scale),
        wdth: Math.round(glyph.advanceWidth * scale)
    };
}

/**
 * Convert fontkit path commands to contours
 */
function convertPath(path, scale) {
    const contours = [];
    let currentContour = [];
    let startX = 0, startY = 0;

    for (const cmd of path.commands) {
        switch (cmd.command) {
            case 'moveTo': {
                if (currentContour.length > 0) {
                    contours.push(currentContour);
                }
                currentContour = [];
                startX = cmd.args[0] * scale;
                startY = cmd.args[1] * scale;
                currentContour.push([startX, startY]);
                break;
            }
            case 'lineTo': {
                currentContour.push([cmd.args[0] * scale, cmd.args[1] * scale]);
                break;
            }
            case 'quadraticCurveTo': {
                currentContour.push([
                    cmd.args[0] * scale, cmd.args[1] * scale,
                    cmd.args[2] * scale, cmd.args[3] * scale
                ]);
                break;
            }
            case 'bezierCurveTo': {
                currentContour.push([
                    cmd.args[0] * scale, cmd.args[1] * scale,
                    cmd.args[2] * scale, cmd.args[3] * scale,
                    cmd.args[4] * scale, cmd.args[5] * scale
                ]);
                break;
            }
            case 'closePath': {
                if (currentContour.length > 0) {
                    const last = currentContour[currentContour.length - 1];
                    const lastX = last.length === 2 ? last[0] : last[last.length - 2];
                    const lastY = last.length === 2 ? last[1] : last[last.length - 1];
                    if (Math.abs(lastX - startX) > 0.01 || Math.abs(lastY - startY) > 0.01) {
                        currentContour.push([startX, startY]);
                    }
                    contours.push(currentContour);
                }
                currentContour = [];
                break;
            }
        }
    }

    if (currentContour.length > 0) {
        contours.push(currentContour);
    }

    const shapes = [];
    const holes = [];

    for (const contour of contours) {
        if (contour.length < 2) continue;
        const winding = calculateWinding(contour);
        if (winding < 0) {
            shapes.push(contour);
        } else {
            holes.push(contour);
        }
    }

    return { shapes, holes };
}

/**
 * Calculate winding direction
 */
function calculateWinding(contour) {
    let area = 0;
    let prevX = 0, prevY = 0;

    for (let i = 0; i < contour.length; i++) {
        const cmd = contour[i];
        let x, y;

        if (cmd.length === 2) {
            [x, y] = cmd;
        } else if (cmd.length === 4) {
            x = cmd[2];
            y = cmd[3];
        } else if (cmd.length === 6) {
            x = cmd[4];
            y = cmd[5];
        } else {
            continue;
        }

        if (i > 0) {
            area += (x - prevX) * (y + prevY);
        }
        prevX = x;
        prevY = y;
    }

    const first = contour[0];
    if (first && first.length >= 2) {
        area += (first[0] - prevX) * (first[1] + prevY);
    }

    return area;
}

/**
 * Extract kerning pairs from font
 */
function extractKerningPairs(font, charset) {
    const kerningPairs = {};
    const chars = [...charset];

    // Build glyph cache
    const glyphCache = new Map();
    for (const char of chars) {
        const codePoint = char.codePointAt(0);
        const glyph = font.glyphForCodePoint(codePoint);
        if (glyph && glyph.id !== 0) {
            glyphCache.set(char, glyph);
        }
    }

    // Extract kerning for all pairs
    let pairCount = 0;
    const totalPairs = glyphCache.size * glyphCache.size;

    for (const char1 of glyphCache.keys()) {
        for (const char2 of glyphCache.keys()) {
            pairCount++;
            try {
                const run = font.layout(char1 + char2);
                if (run.positions && run.positions.length >= 2) {
                    const glyph1 = glyphCache.get(char1);
                    const pos1 = run.positions[0];
                    const kernValue = pos1.xAdvance - glyph1.advanceWidth;

                    if (Math.abs(kernValue) > 0.5) {
                        kerningPairs[`${char1},${char2}`] = Math.round(kernValue);
                    }
                }
            } catch (e) {
                // Skip problematic pairs
            }
        }
    }

    return kerningPairs;
}

/**
 * Generate FontSpec for a specific weight
 */
function generateFontSpec(baseFont, weight, charset) {
    console.log(`  Generating weight ${weight}...`);

    // Get font at specified weight
    const font = baseFont.getVariation({ wght: weight });

    // Determine winding direction
    const isCFF = baseFont.CFF || baseFont.CFF2;

    const fontSpec = {
        reverseHoles: !!isCFF,
        reverseShapes: !isCFF,
        kern: {},
        _bakedWeight: weight,
        _bakedAt: new Date().toISOString()
    };

    // Convert glyphs
    let glyphCount = 0;
    for (const char of charset) {
        const codePoint = char.codePointAt(0);
        const glyph = font.glyphForCodePoint(codePoint);

        if (glyph && glyph.id !== 0) {
            const spec = convertGlyphToSpec(glyph);
            if (spec) {
                fontSpec[char] = spec;
                glyphCount++;
            }
        }
    }

    // Extract kerning
    console.log(`    Extracting kerning pairs...`);
    fontSpec.kern = extractKerningPairs(font, charset);

    console.log(`    ${glyphCount} glyphs, ${Object.keys(fontSpec.kern).length} kerning pairs`);

    return fontSpec;
}

/**
 * Main bake function
 */
async function bake() {
    const options = parseArgs();

    console.log('=== MeshWriter Font Baking ===\n');
    console.log(`Font: ${options.fontPath}`);
    console.log(`Weights: ${options.weights.join(', ')}`);
    console.log(`Charset: ${options.charset.length} characters`);
    console.log(`Output: ${options.outputDir}\n`);

    // Load font
    if (!existsSync(options.fontPath)) {
        console.error(`Error: Font file not found: ${options.fontPath}`);
        process.exit(1);
    }

    const fontBuffer = readFileSync(options.fontPath);
    const font = fontkit.create(fontBuffer);

    if (!font) {
        console.error('Error: Failed to parse font file');
        process.exit(1);
    }

    console.log(`Font name: ${font.fullName}`);

    // Check if variable font
    const variationAxes = font.variationAxes || {};
    if (!variationAxes.wght) {
        console.error('Error: Font does not have a weight (wght) axis');
        process.exit(1);
    }

    const { min, max } = variationAxes.wght;
    console.log(`Weight range: ${min} - ${max}\n`);

    // Validate weights
    const validWeights = options.weights.filter(w => w >= min && w <= max);
    if (validWeights.length !== options.weights.length) {
        const invalid = options.weights.filter(w => w < min || w > max);
        console.warn(`Warning: Skipping out-of-range weights: ${invalid.join(', ')}`);
    }

    // Create output directory
    if (!existsSync(options.outputDir)) {
        mkdirSync(options.outputDir, { recursive: true });
    }

    // Generate FontSpec for each weight
    const fontBaseName = basename(options.fontPath, '.ttf').replace(/-variable$/i, '');
    const results = [];

    for (const weight of validWeights) {
        const fontSpec = generateFontSpec(font, weight, options.charset);

        const outputPath = join(options.outputDir, `${fontBaseName}-${weight}.json`);
        writeFileSync(outputPath, JSON.stringify(fontSpec));

        const stats = {
            weight,
            file: basename(outputPath),
            size: Math.round(JSON.stringify(fontSpec).length / 1024) + ' KB',
            glyphs: Object.keys(fontSpec).filter(k => !k.startsWith('_') && k !== 'kern' && k !== 'reverseHoles' && k !== 'reverseShapes').length,
            kerningPairs: Object.keys(fontSpec.kern).length
        };
        results.push(stats);
    }

    // Write manifest
    const manifest = {
        fontName: font.fullName,
        baseName: fontBaseName,
        charset: options.charset,
        charsetLength: options.charset.length,
        weightRange: { min, max },
        weights: results.map(r => r.weight),
        files: results.map(r => r.file),
        generatedAt: new Date().toISOString()
    };

    writeFileSync(join(options.outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Summary
    console.log('\n=== Baking Complete ===\n');
    console.log('Generated files:');
    for (const r of results) {
        console.log(`  ${r.file}: ${r.size} (${r.glyphs} glyphs, ${r.kerningPairs} kerning pairs)`);
    }
    console.log(`  manifest.json`);
    console.log(`\nTotal: ${results.length} weight files + manifest`);
}

bake().catch(err => {
    console.error('Baking failed:', err);
    process.exit(1);
});
