/**
 * MeshWriter Type Declarations
 * Provides TypeScript types for MeshWriter library
 *
 * Requires: @babylonjs/core (peer dependency)
 */

import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
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
    /** Dispose of all meshes and materials */
    dispose(): void;
}

/** Constructor function returned by MeshWriter factory */
export interface MeshWriterConstructor {
    new (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
    (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
}

// ============ Font Types ============

/** Font specification object containing glyph data */
export interface FontSpec {
    /** Whether to reverse hole winding */
    reverseHoles: boolean;
    /** Whether to reverse shape winding */
    reverseShapes: boolean;
    /** Character glyph data - indexed by character */
    [character: string]: any;
}

/** Function that creates font spec from codeList encoder */
export type FontFactory = (codeList: (list: number[][]) => string) => FontSpec;

/** Font data - either a FontSpec or FontFactory */
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

// ============ UMD Global Declarations ============

declare global {
    /** Global MeshWriter (UMD bundle) */
    var MeshWriter: MeshWriterStatic | undefined;
    /** Legacy name for MeshWriter (UMD bundle) */
    var TYPE: MeshWriterStatic | undefined;

    namespace BABYLON {
        /** MeshWriter attached to BABYLON namespace (UMD bundle) */
        var MeshWriter: MeshWriterStatic | undefined;
    }
}
