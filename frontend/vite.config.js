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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
