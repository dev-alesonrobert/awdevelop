import 'dotenv/config';
import express from 'express';
import { app } from '../server/app.js';
app.get(['/painel','/painel/*path'],(req,res,next)=>req.path.includes('.')?next():res.sendFile('painel/index.html',{root:process.cwd()+'/dist'}));
app.use(express.static('dist', { index:'index.html' }));
app.listen(Number(process.env.PORT||3000), '0.0.0.0', () => console.log('awdevelop: http://localhost:3000 — painel: /admin/'));
