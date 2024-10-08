import { defineConfig } from 'vite'
import topLevelAwait from "vite-plugin-top-level-await";
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  
build: {
         outDir: '../html'      },

plugins: [react(), topLevelAwait({
    // The export name of top-level await promise for each chunk module
    promiseExportName: "__tla",
    // The function to generate import names of top-level await promise in each chunk module
    promiseImportName: i => `__tla_${i}`
  })],
})
