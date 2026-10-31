import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function fixLightweightChartsNullPlugin() {
  return {
    name: 'fix-lightweight-charts-null',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('lightweight-charts')) {
        let modified = code;
        // Guard all series types in production bundle against null findBar return
        modified = modified.replaceAll('u(t(n,s))', '(t(n,s)||{Wt:[0,0,0,0]})');
        // Guard development bundle
        modified = modified.replaceAll(
          'const currentBar = ensureNotNull(findBar(barIndex, precomputedBars));',
          'const currentBar = findBar(barIndex, precomputedBars) || { _internal_value: [0,0,0,0] };'
        );
        return modified;
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [fixLightweightChartsNullPlugin(), react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lightweight-charts')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
