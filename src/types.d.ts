/**
 * MeshWriter Type Declarations
 * Provides type information for TypeScript users and IDE support
 */

// Babylon.js types (simplified - users should install @babylonjs/core for full types)
declare module '@babylonjs/core/Maths/math.vector' {
    export class Vector2 {
        x: number;
        y: number;
        constructor(x: number, y: number);
    }
    export class Vector3 {
        x: number;
        y: number;
        z: number;
        constructor(x: number, y: number, z: number);
    }
}

declare module '@babylonjs/core/Maths/math.color' {
    export class Color3 {
        r: number;
        g: number;
        b: number;
        constructor(r: number, g: number, b: number);
    }
}

declare module '@babylonjs/core/Maths/math.path' {
    import { Vector3 } from '@babylonjs/core/Maths/math.vector';

    export class Path2 {
        constructor(x: number, y: number);
        addLineTo(x: number, y: number): Path2;
        addQuadraticCurveTo(redX: number, redY: number, blueX: number, blueY: number): Path2;
        addCubicCurveTo(redX: number, redY: number, greenX: number, greenY: number, blueX: number, blueY: number): Path2;
        getPoints(): Array<{ x: number; y: number }>;
    }

    // Allow prototype extension
    export interface Path2 {
        addQuadraticCurveTo(redX: number, redY: number, blueX: number, blueY: number): Path2;
        addCubicCurveTo(redX: number, redY: number, greenX: number, greenY: number, blueX: number, blueY: number): Path2;
    }

    export class Curve3 {
        static CreateQuadraticBezier(origin: Vector3, control: Vector3, destination: Vector3, segments: number): Curve3;
        static CreateCubicBezier(origin: Vector3, control1: Vector3, control2: Vector3, destination: Vector3, segments: number): Curve3;
        getPoints(): Vector3[];
    }
}

declare module '@babylonjs/core/Meshes/mesh' {
    export class Mesh {
        position: { x: number; y: number; z: number };
        material: any;
        static MergeMeshes(meshes: Mesh[], disposeSource?: boolean): Mesh;
        dispose(): void;
        flipFaces(): void;
        refreshBoundingInfo(): void;
        getBoundingInfo(): any;
        rotation: { x: number; y: number; z: number };
    }
}

declare module '@babylonjs/core/Meshes/polygonMesh' {
    import { Vector2 } from '@babylonjs/core/Maths/math.vector';
    export class PolygonMeshBuilder {
        constructor(name: string, contours: Vector2[], scene: any, earcut?: any);
        build(updatable?: boolean, depth?: number): any;
    }
}

declare module '@babylonjs/core/Materials/standardMaterial' {
    import { Color3 } from '@babylonjs/core/Maths/math.color';
    export class StandardMaterial {
        constructor(name: string, scene: any);
        diffuseColor: Color3;
        specularColor: Color3;
        ambientColor: Color3;
        emissiveColor: Color3;
        alpha: number;
    }
}

declare module '@babylonjs/core/Particles/solidParticleSystem' {
    export class SolidParticleSystem {
        constructor(name: string, scene: any, options?: any);
        addShape(mesh: any, count: number, options?: any): number;
        buildMesh(): any;
        setParticles(): void;
        dispose(): void;
        particles: any[];
    }
}

declare module '@babylonjs/core/Meshes/csg' {
    export class CSG {
        static FromMesh(mesh: any): CSG;
        subtract(other: CSG): CSG;
        toMesh(name: string, material: any, scene: any): any;
    }
}

declare module '@babylonjs/core/Meshes/csg2' {
    export class CSG2 {
        static FromMesh(mesh: any): CSG2;
        subtract(other: CSG2): CSG2;
        toMesh(name: string, scene: any, options?: { centerMesh?: boolean }): any;
    }
    export function InitializeCSG2Async(): Promise<void>;
    export function IsCSG2Ready(): boolean;
}

// Earcut module
declare module 'earcut' {
    function earcut(vertices: number[], holes?: number[], dim?: number): number[];
    export default earcut;
}

// MeshWriter types
export interface MeshWriterOptions {
    position?: { x?: number; y?: number; z?: number };
    colors?: {
        diffuse?: string;
        specular?: string;
        ambient?: string;
        emissive?: string;
    };
    'font-family'?: string;
    anchor?: 'left' | 'right' | 'center';
    'letter-height'?: number;
    'letter-thickness'?: number;
    color?: string;
    alpha?: number;
}

export interface MeshWriterPreferences {
    defaultFont?: string;
    scale?: number;
    meshOrigin?: 'letterCenter' | 'fontOrigin';
    debug?: boolean;
    babylon?: any;
}

export interface MeshWriterInstance {
    getSPS(): any;
    getMesh(): any;
    getMaterial(): any;
    getOffsetX(): number;
    getLettersBoxes(): any[];
    getLettersOrigins(): any[];
    color(c?: string): string;
    alpha(a?: number): number;
    setColor(color: string): void;
    setAlpha(alpha: number): void;
    overrideAlpha(alpha: number): void;
    resetAlpha(): void;
    getLetterCenter(ix: number): any;
    dispose(): void;
    clearall(): void;
}

export interface MeshWriterConstructor {
    new (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
    (letters: string, options?: MeshWriterOptions): MeshWriterInstance;
}

export interface FontSpec {
    reverseHoles: boolean;
    reverseShapes: boolean;
    [character: string]: any;
}

export type FontFactory = (codeList: (list: any[]) => string) => FontSpec;
