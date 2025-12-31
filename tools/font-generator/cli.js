#!/usr/bin/env node

/**
 * MeshWriter Font Generator CLI
 * Converts TTF/OTF fonts to MeshWriter ES module format
 */

import { program } from 'commander';
import { convertFontToModule, DEFAULT_CHARSET } from './converter.js';
import { existsSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const DEFAULT_SOURCE_DIR = join(__dirname, 'source-fonts');
const DEFAULT_OUTPUT_DIR = join(__dirname, '..', '..', 'fonts');

program
    .name('meshwriter-font-gen')
    .description('Convert TTF/OTF fonts to MeshWriter ES module format')
    .version('1.0.0');

program
    .command('convert')
    .description('Convert a single font file')
    .argument('<input>', 'Input TTF/OTF file path')
    .option('-o, --output <path>', 'Output JS file path')
    .option('-n, --name <name>', 'Font name for the module')
    .option('-c, --charset <chars>', 'Character set to include')
    .action(async (input, options) => {
        try {
            if (!existsSync(input)) {
                console.error(`Error: Input file not found: ${input}`);
                process.exit(1);
            }

            const inputBasename = basename(input, extname(input));
            const outputPath = options.output || join(DEFAULT_OUTPUT_DIR, `${inputBasename.toLowerCase()}.js`);
            const fontName = options.name || inputBasename;

            console.log(`\nConverting: ${input}`);

            await convertFontToModule(input, outputPath, {
                name: fontName,
                charset: options.charset || DEFAULT_CHARSET
            });

            console.log('\nDone!');
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

program
    .command('batch')
    .description('Convert all fonts in source-fonts directory')
    .option('-s, --source <dir>', 'Source directory with TTF/OTF files', DEFAULT_SOURCE_DIR)
    .option('-o, --output <dir>', 'Output directory for JS files', DEFAULT_OUTPUT_DIR)
    .option('-c, --charset <chars>', 'Character set to include')
    .action(async (options) => {
        try {
            const sourceDir = options.source;
            const outputDir = options.output;

            if (!existsSync(sourceDir)) {
                console.error(`Error: Source directory not found: ${sourceDir}`);
                console.log(`\nCreate the directory and add TTF/OTF font files:`);
                console.log(`  mkdir -p "${sourceDir}"`);
                process.exit(1);
            }

            const fontFiles = readdirSync(sourceDir)
                .filter(f => /\.(ttf|otf)$/i.test(f));

            if (fontFiles.length === 0) {
                console.log(`No TTF/OTF files found in: ${sourceDir}`);
                process.exit(0);
            }

            console.log(`\nFound ${fontFiles.length} font file(s) in ${sourceDir}\n`);

            for (const fontFile of fontFiles) {
                const inputPath = join(sourceDir, fontFile);
                const outputName = basename(fontFile, extname(fontFile)).toLowerCase();
                const outputPath = join(outputDir, `${outputName}.js`);
                const fontName = basename(fontFile, extname(fontFile))
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());

                console.log(`Converting: ${fontFile}`);

                await convertFontToModule(inputPath, outputPath, {
                    name: fontName,
                    charset: options.charset || DEFAULT_CHARSET
                });

                console.log('');
            }

            console.log('All fonts converted!');
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

program
    .command('info')
    .description('Show information about a font file')
    .argument('<input>', 'Input TTF/OTF file path')
    .action(async (input) => {
        try {
            if (!existsSync(input)) {
                console.error(`Error: Input file not found: ${input}`);
                process.exit(1);
            }

            const opentype = await import('opentype.js');
            const { readFileSync } = await import('fs');

            const fontBuffer = readFileSync(input);
            const font = opentype.default.parse(fontBuffer.buffer);

            console.log(`\nFont Information: ${input}\n`);
            console.log(`  Full Name: ${font.names.fullName?.en || 'N/A'}`);
            console.log(`  Family: ${font.names.fontFamily?.en || 'N/A'}`);
            console.log(`  Subfamily: ${font.names.fontSubfamily?.en || 'N/A'}`);
            console.log(`  Version: ${font.names.version?.en || 'N/A'}`);
            console.log(`  Designer: ${font.names.designer?.en || 'N/A'}`);
            console.log(`  License: ${font.names.license?.en || 'N/A'}`);
            console.log(`\n  Units per EM: ${font.unitsPerEm}`);
            console.log(`  Outline Format: ${font.outlinesFormat}`);
            console.log(`  Number of Glyphs: ${font.glyphs.length}`);

            // Count glyphs that match default charset
            let matchCount = 0;
            for (const char of DEFAULT_CHARSET) {
                const glyph = font.charToGlyph(char);
                if (glyph && glyph.index !== 0) {
                    matchCount++;
                }
            }
            console.log(`  Default Charset Coverage: ${matchCount}/${DEFAULT_CHARSET.length}`);

        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

program.parse();
