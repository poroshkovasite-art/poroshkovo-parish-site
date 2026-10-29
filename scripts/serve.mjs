import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 const target=path.resolve(root,'.'+pathname),safe=target===root||target.startsWith(root+path.sep);
 if(!safe){res.writeHead(403);return res.end();}
 let file=target;
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const found=fs.existsSync(file)&&fs.statSync(file).isFile();
 if(!found)file=path.join(root,'404.html');
 res.writeHead(found?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 fs.createReadStream(file).pipe(res);
}).listen(4173,'127.0.0.1',()=>{
 console.log('Local: http://localhost:4173/uk/');
 console.log('Press Ctrl+C to stop the local preview.');
 if(process.argv.includes('--open')&&process.platform==='win32')spawn('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://localhost:4173/uk/'"],{windowsHide:true,stdio:'ignore'});
});
