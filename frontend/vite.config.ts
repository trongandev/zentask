import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, '.') },
        {
          find: /^@xenova\/transformers\/dist\/(.*)$/,
          replacement:
            path.resolve(__dirname, 'node_modules/@xenova/transformers/dist') +
            '/$1',
        },
        {
          find: /^@xenova\/transformers$/,
          replacement: path.resolve(
            __dirname,
            'node_modules/@xenova/transformers/dist/transformers.min.js',
          ),
        },
        {
          find: 'onnxruntime-web',
          replacement: path.resolve(
            __dirname,
            'node_modules/onnxruntime-web/dist/ort-web.es6.min.js',
          ),
        },
        {
          find: 'onnxruntime-common',
          replacement: path.resolve(
            __dirname,
            'node_modules/onnxruntime-common/dist/lib/index.js',
          ),
        },
      ],
      fs: {
        allow: ['..'],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    optimizeDeps: {
      exclude: [
        '@xenova/transformers',
        '@ffmpeg/ffmpeg',
        '@ffmpeg/util',
        '@ffmpeg/core',
        'onnxruntime-web',
        'onnxruntime-common',
      ],
    }
  };
});
