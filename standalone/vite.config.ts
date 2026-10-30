import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),publicDir:'../public',plugins:[react()],define:{'import.meta.env.VITE_SELF_HOSTED':'true'},build:{outDir:'../dist/standalone/client',emptyOutDir:true,target:'es2022'}});
