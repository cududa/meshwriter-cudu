/**
 * Global type declarations for MeshWriter UMD builds
 * Include this file if using MeshWriter via script tag
 */

import type { MeshWriterStatic } from './types';

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

export {};
