import {build} from 'esbuild';
await build({entryPoints:['frontend/motion/entry.jsx'],bundle:true,minify:true,format:'esm',outfile:'dist/assets/aw-motion.js',define:{'process.env.NODE_ENV':'"production"'}});
