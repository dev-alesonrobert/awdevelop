import 'dotenv/config';
import express from 'express';
import { app } from '../server/app.js';
app.use(express.static('dist/angular', { index:'index.html' }));
app.get('/{*path}',(req,res)=>res.sendFile('angular/index.html',{root:process.cwd()+'/dist'}));
app.listen(Number(process.env.PORT||3000), '0.0.0.0', () => console.log('awdevelop: http://localhost:3000 — painel: /painel/'));
