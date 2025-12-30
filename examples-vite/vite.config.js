import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            // Point to the local meshwriter source
            'meshwriter': path.resolve(__dirname, '../src/index.js'),
            'meshwriter/fonts': path.resolve(__dirname, '../fonts')
        }
    },
    optimizeDeps: {
        include: ['@babylonjs/core', 'earcut']
    }
});
