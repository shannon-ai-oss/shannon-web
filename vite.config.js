import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(() => {
  const ssrTarget = process.env.VITE_SSR_BUILD_TARGET || 'app';
  const isSsrBuild = Boolean(process.env.VITE_SSR_ENTRY);
  const isDataBuild = isSsrBuild && ssrTarget === 'data';
  const isSsrAppBuild = isSsrBuild && ssrTarget !== 'data';
  const enableSourceMap =
    process.env.VITE_ENABLE_SOURCEMAP === 'true'
    || process.env.VITE_ENABLE_SOURCEMAP === '1';
  const outDir = isSsrBuild ? 'dist/server' : 'dist/client';
  const shouldEmptyOutDir = isSsrBuild ? ssrTarget === 'app' : true;
  const defaultSsrEntry = ssrTarget === 'data' ? 'src/ssr/dataLoader.js' : 'src/entry-server.jsx';
  const resolvedSsrEntry = isSsrBuild
    ? path.resolve(__dirname, process.env.VITE_SSR_ENTRY || defaultSsrEntry)
    : undefined;

  const alias = [
    {
      find: '@/config/backend',
      replacement: path.resolve(
        __dirname,
        isSsrBuild ? 'src/config/backend.server.js' : 'src/config/backend.client.js',
      ),
    },
    {
      find: '@/context/AuthContext',
      replacement: path.resolve(
        __dirname,
        isSsrBuild ? 'src/context/AuthContext.server.jsx' : 'src/context/AuthContext.client.jsx',
      ),
    },
    {
      find: '@/context/ChatContext',
      replacement: path.resolve(
        __dirname,
        isSsrBuild ? 'src/context/ChatContext.server.jsx' : 'src/context/ChatContext.client.jsx',
      ),
    },
    { find: '@', replacement: path.resolve(__dirname, 'src') },
  ];

  return {
    plugins: [react()],
    resolve: {
      alias,
    },
    build: {
      outDir,
      emptyOutDir: shouldEmptyOutDir,
      ssr: isSsrBuild ? resolvedSsrEntry : false,
      sourcemap: enableSourceMap,
      rollupOptions: isSsrBuild
        ? {
            input: resolvedSsrEntry,
            external: [],
            output: {
          entryFileNames: isDataBuild ? 'data-loader.mjs' : 'entry-server.mjs',
          format: 'esm',
            },
          }
        : {
            input: path.resolve(__dirname, 'index.html'),
          },
    },
    ssr: {
      noExternal: true,
    },
    define: {
      'process.env.SSR_BUILD_TARGET': JSON.stringify(ssrTarget),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.resolve(__dirname, 'src/setupTests.ts')],
    },
  };
});
