/**
 * MeshWriter Type Declarations
 * Provides TypeScript types for MeshWriter library
 *
 * Requires: @babylonjs/core (peer dependency)
 */

import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
import type { Vector2 } from '@babylonjs/core/Maths/math.vector';

// ============ Options & Configuration Types ============

/** Position configuration for text placement */
export interface MeshWriterPosition {
    x?: number;
    y?: number;
    z?: number;
}

/** Color configuration for material properties */
export interface MeshWriterColors {
    diffuse?: string;
    specular?: string;
    ambient?: string;
    emissive?: string;
}

/** Options for creating text with MeshWriter */
export interface MeshWriterOptions {
    /** Position of the text in 3D space */
    position?: MeshWriterPosition;
    /** Material color properties */
    colors?: MeshWriterColors;
    /** Font family name (must be registered first) */
    'font-family'?: string;
    /** Text anchor point */
    anchor?: 'left' | 'right' | 'center';
    /** Height of letters in world units */
    'letter-height'?: number;
    /** Thickness (depth) of letters in world units */
    'letter-thickness'?: number;
    /** Emissive color as hex string (e.g., "#FF0000") */
    color?: string;
    /** Material alpha/transparency (0-1) */
    alpha?: number;
    /** If true, disables lighting (only emissive color shows) - gives self-lit appearance */
    'emissive-only'?: boolean;
    /** If true, the material is affected by scene fog (default: true) */
    'fog-enabled'?: boolean;
}

/** Babylon namespace subset used for CSG injection */
export interface BabylonCSGNamespace {
    CSG?: unknown;
    CSG2?: unknown;
    InitializeCSG2Async?: () => void | Promise<void>;
    IsCSG2Ready?: () => boolean;
}

/** Preferences for initializing MeshWriter */
export interface MeshWriterPreferences {
    /** Default font family name */
    defaultFont?: string;
    /** Scale factor for all text */
    scale?: number;
    /** Origin point for mesh positioning */
    meshOrigin?: 'letterCenter' | 'fontOrigin';
    /** Enable debug logging */
    debug?: boolean;
    /** Babylon namespace providing CSG helpers (used for ES module builds) */
    babylon?: BabylonCSGNamespace;
}

// ============ Instance Types ============

/** A text instance created by MeshWriter */
export interface MeshWriterInstance {
    /** Get the SolidParticleSystem containing letter meshes */
    getSPS(): SolidParticleSystem | undefined;
    /** Get the combined mesh containing all letters */
    getMesh(): Mesh | undefined;
    /** Get the material applied to the text */
    getMaterial(): StandardMaterial;
    /** Get the X offset for anchoring */
    getOffsetX(): number;
    /** Get bounding boxes for each letter */
    getLettersBoxes(): number[][];
    /** Get origin positions for each letter */
    getLettersOrigins(): number[][];
    /** Get or set the emissive color */
    color(c?: string): string;
    /** Get or set the alpha value */
    alpha(a?: number): number;
    /** Update the emissive color */
    setColor(color: string): void;
    /** Update the alpha value */
    setAlpha(alpha: number): void;
    /** Temporarily override alpha */
    overrideAlpha(alpha: number): void;
    /** Reset alpha to original value */
    resetAlpha(): void;
    /** Get the center position of a letter by index */
    getLetterCenter(ix: number): Vector2;
    /** Check if this instance has been disposed */
    isDisposed(): boolean;
    /** Dispose of all meshes and materials */
    dispose(): void;
}

/** Constructor function returned by MeshWriter factory */
export interface MeshWriterConstructor {
    new (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
    (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
}

// ============ Font Types ============

/** Individual glyph specification */
export interface GlyphSpec {
    /** Compressed shape command strings (pre-decompression) */
    sC?: string[];
    /** Compressed hole command strings - array of holes, each hole is array of command strings */
    hC?: string[][];
    /** Decompressed shape commands (post-decompression, internal use) */
    shapeCmds?: number[][][];
    /** Decompressed hole commands (post-decompression, internal use) */
    holeCmds?: number[][][][];
    /** Minimum X coordinate of bounding box */
    xMin: number;
    /** Maximum X coordinate of bounding box */
    xMax: number;
    /** Minimum Y coordinate of bounding box */
    yMin: number;
    /** Maximum Y coordinate of bounding box */
    yMax: number;
    /** Character advance width */
    wdth: number;
    /** X coordinate scale factor (optional) */
    xFactor?: number;
    /** Y coordinate scale factor (optional) */
    yFactor?: number;
    /** X coordinate shift (optional) */
    xShift?: number;
    /** Y coordinate shift (optional) */
    yShift?: number;
    /** Per-glyph reverse shape override (optional) */
    reverseShape?: boolean;
    /** Per-glyph reverse hole override (optional) */
    reverseHole?: boolean;
}

/** Font specification object containing glyph data */
export interface FontSpec {
    /** Whether to reverse hole winding (default for all glyphs) */
    reverseHoles: boolean;
    /** Whether to reverse shape winding (default for all glyphs) */
    reverseShapes: boolean;
    /** Character glyph data - indexed by character */
    [character: string]: GlyphSpec | boolean;
}

/**
 * Function that creates font spec from codeList encoder
 * @deprecated Use FontSpec directly instead of FontFactory
 */
export type FontFactory = (codeList: (list: number[][]) => string) => FontSpec;

/** Font data - either a FontSpec object or a FontFactory function (legacy) */
export type FontData = FontSpec | FontFactory;

// ============ Main API Types ============

/** CSG version used for boolean operations */
export type CSGVersion = 'CSG' | 'CSG2' | null;

/** MeshWriter static API */
export interface MeshWriterStatic {
    /**
     * Create a MeshWriter constructor asynchronously (required for Babylon 8+)
     * Initializes CSG2 before returning
     */
    createAsync(scene: Scene, preferences?: MeshWriterPreferences): Promise<MeshWriterConstructor>;

    /**
     * Create a MeshWriter constructor synchronously (legacy, Babylon < 7.31)
     * @deprecated Use createAsync for Babylon 8+
     */
    create(scene: Scene, preferences?: MeshWriterPreferences): MeshWriterConstructor;

    /** Check if CSG is initialized and ready */
    isReady(): boolean;

    /** Get the CSG version being used */
    getCSGVersion(): CSGVersion;

    /** Set a custom CSG2 initializer function */
    setCSGInitializer(init: () => void | Promise<void>): void;

    /** Set a custom CSG ready check function */
    setCSGReadyCheck(check: () => boolean): void;

    /** Register a callback to run when CSG is ready */
    onCSGReady(callback: () => void): void;

    /** Manually mark CSG as ready */
    markCSGReady(): void;
    /** Initialize the internal CSG module with Babylon helpers */
    initCSGModule(babylon: BabylonCSGNamespace): void;

    /** Register a font for use with MeshWriter */
    registerFont(name: string, fontData: FontData): void;

    /** Register multiple font aliases pointing to the same font */
    registerFontAliases(targetName: string, ...aliases: string[]): void;

    /** Get a registered font by name */
    getFont(name: string): FontSpec | undefined;

    /** Check if a font is registered */
    isFontRegistered(name: string): boolean;

    /** Encode font coordinates to compressed string */
    codeList(list: number[][]): string;

    /** Decode compressed string to font coordinates */
    decodeList(encoded: string): number[][];
}

// ============ Exports ============

/** Main MeshWriter object with all static methods */
export const MeshWriter: MeshWriterStatic;

/** Create a MeshWriter constructor asynchronously */
export function createMeshWriterAsync(scene: Scene, preferences?: MeshWriterPreferences): Promise<MeshWriterConstructor>;

/** Create a MeshWriter constructor synchronously (legacy) */
export function createMeshWriter(scene: Scene, preferences?: MeshWriterPreferences): MeshWriterConstructor;

/** Check if CSG is initialized and ready */
export function isCSGReady(): boolean;

/** Get the CSG version being used */
export function getCSGVersion(): CSGVersion;

/** Set a custom CSG2 initializer function */
export function setCSGInitializer(init: () => void | Promise<void>): void;

/** Set a custom CSG ready check function */
export function setCSGReadyCheck(check: () => boolean): void;

/** Register a callback to run when CSG is ready */
export function onCSGReady(callback: () => void): void;

/** Manually mark CSG as ready */
export function markCSGReady(): void;

/** Register a font for use with MeshWriter */
export function registerFont(name: string, fontData: FontData): void;

/** Register multiple font aliases */
export function registerFontAliases(targetName: string, ...aliases: string[]): void;

/** Get a registered font by name */
export function getFont(name: string): FontSpec | undefined;

/** Check if a font is registered */
export function isFontRegistered(name: string): boolean;

/** Encode font coordinates to compressed string */
export function codeList(list: number[][]): string;

/** Decode compressed string to font coordinates */
export function decodeList(encoded: string): number[][];

/** Get list of registered font names */
export function getRegisteredFonts(): string[];

/** Unregister a font (primarily for testing) */
export function unregisterFont(name: string): void;

/** Clear all registered fonts (primarily for testing) */
export function clearFonts(): void;

/** Encode font coordinates (alias of codeList) */
export function encodeFontData(list: number[][]): string;

/** Decode font coordinates (alias of decodeList) */
export function decodeFontData(encoded: string): number[][];

/** Initialize the internal CSG module with Babylon helpers */
export function initCSGModule(babylon: BabylonCSGNamespace): void;

// ============ Material Plugins ============

/**
 * TextFogPlugin - MaterialPluginBase that applies fog to emissive color
 *
 * Babylon's standard fog only affects diffuse/ambient channels.
 * This plugin recalculates fog blending for the final color output,
 * ensuring emissive text fades properly with distance fog.
 *
 * @example
 * // Automatically attached when fog-enabled is true
 * const text = new Writer("Hello", { 'fog-enabled': true });
 *
 * // Or manually attach to any StandardMaterial
 * import { TextFogPlugin } from 'meshwriter';
 * new TextFogPlugin(myMaterial);
 */
export class TextFogPlugin extends MaterialPluginBase {
    constructor(material: Material);
    prepareDefines(defines: Record<string, boolean>, scene: Scene, mesh: Mesh): void;
    getClassName(): string;
    getUniforms(): { ubo: Array<{ name: string; size?: number; type?: string; arraySize?: number }> };
    getCustomCode(shaderType: string): Record<string, string> | null;
    dispose(): void;
}

// ============ Color Contrast Types ============

/** RGB color object with values in 0-1 range */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
}

/** HSL color object with h in degrees (0-360), s and l in 0-1 range */
export interface HSLColor {
    h: number;
    s: number;
    l: number;
}

/** Colors for contrast adjustment */
export interface ContrastColors {
    emissive: string;
    diffuse: string;
    ambient?: string;
}

/** Options for adjustForContrast function */
export interface AdjustContrastOptions {
    /** Target WCAG contrast ratio (default: 4.5) */
    targetContrast?: number;
    /** Max edge color modification range 0-1 (default: 0.4) */
    edgeRange?: number;
    /** Max face color modification range 0-1 (default: 0.1) */
    faceRange?: number;
    /** Allow hue modifications for maximum contrast (default: true) */
    allowHueShift?: boolean;
}

/** Result of contrast adjustment */
export interface ContrastResult {
    emissive: string;
    diffuse: string;
    ambient: string;
    /** Achieved contrast ratio */
    achieved: number;
}

/** WCAG contrast level constants */
export const CONTRAST_LEVELS: {
    /** WCAG AA for normal text: 4.5:1 */
    AA_NORMAL: 4.5;
    /** WCAG AA for large text: 3:1 */
    AA_LARGE: 3.0;
    /** WCAG AAA for normal text: 7:1 */
    AAA_NORMAL: 7.0;
    /** WCAG AAA for large text: 4.5:1 */
    AAA_LARGE: 4.5;
};

/**
 * Convert hex color string to RGB object
 * @param hex - Hex color string (e.g., "#FF0000" or "FF0000")
 */
export function hexToRgb(hex: string): RGBColor;

/**
 * Convert RGB object to hex color string
 * @param rgb - RGB color with values in 0-1 range
 */
export function rgbToHex(rgb: RGBColor): string;

/**
 * Convert RGB to HSL
 * @param r - Red (0-1)
 * @param g - Green (0-1)
 * @param b - Blue (0-1)
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor;

/**
 * Convert HSL to RGB
 * @param h - Hue in degrees (0-360)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor;

/**
 * Calculate relative luminance per WCAG 2.1
 * @param r - Red (0-1)
 * @param g - Green (0-1)
 * @param b - Blue (0-1)
 * @returns Relative luminance (0-1)
 */
export function relativeLuminance(r: number, g: number, b: number): number;

/**
 * Calculate WCAG contrast ratio between two luminance values
 * @param L1 - Luminance of first color (0-1)
 * @param L2 - Luminance of second color (0-1)
 * @returns Contrast ratio (1-21)
 */
export function contrastRatio(L1: number, L2: number): number;

/**
 * Auto-derive edge colors (diffuse/ambient) from emissive color
 * Creates high-contrast edges for text legibility
 * Uses inverted approach: bright diffuse for lit surfaces, dark emissive for base
 *
 * @param emissiveHex - Hex color string for desired face color
 * @param targetContrast - Target WCAG contrast ratio (default: 4.5)
 * @returns Object with diffuse, ambient, and emissive hex colors
 */
export function deriveEdgeColors(emissiveHex: string, targetContrast?: number): { diffuse: string; ambient: string; emissive: string };

/**
 * Adjust colors to achieve WCAG contrast while preserving user intent
 * Priority: prefer edge modifications over face modifications
 *
 * @param colors - User-provided colors
 * @param options - Adjustment options
 * @returns Adjusted colors with achieved contrast ratio
 */
export function adjustForContrast(colors: ContrastColors, options?: AdjustContrastOptions): ContrastResult;

// ============ Module Augmentation ============

// Extend StandardMaterial to include fog plugin reference
declare module '@babylonjs/core/Materials/standardMaterial' {
    interface StandardMaterial {
        /** @internal TextFogPlugin instance attached by MeshWriter */
        _textFogPlugin?: TextFogPlugin;
    }
}
