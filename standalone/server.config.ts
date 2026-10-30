import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,ssr:{noExternal:true},build:{ssr:'standalone/server.ts',outDir:'dist/standalone/server',emptyOutDir:true,target:'node24',rollupOptions:{external:[/^node:/],output:{entryFileNames:'server.mjs'}}}});
