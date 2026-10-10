import {spawn} from 'node:child_process';
const api=spawn(process.execPath,['scripts/dev.js'],{stdio:'inherit',env:{...process.env,PORT:'3001',BETTER_AUTH_URL:'http://localhost:4200'}});
const web=spawn(process.execPath,['node_modules/@angular/cli/bin/ng.js','serve','--port','4200','--host','0.0.0.0'],{stdio:'inherit'});
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;api.kill('SIGTERM');web.kill('SIGTERM');process.exitCode=code;}
for(const child of [api,web]){child.on('error',()=>stop(1));child.on('exit',code=>stop(code||0));}process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
