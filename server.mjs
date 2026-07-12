import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = process.cwd();
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.webm':'video/webm','.otf':'font/otf','.png':'image/png','.jpg':'image/jpeg'};
http.createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]);
    if(p==='/') p='/index.html';
    const file = normalize(join(root,p));
    if(!file.startsWith(root)){res.writeHead(403);return res.end('403');}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
    res.end(data);
  }catch(e){res.writeHead(404);res.end('404 Not Found');}
}).listen(8080,()=>console.log('Serving http://localhost:8080'));
