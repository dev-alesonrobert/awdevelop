import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function createGateway({token,upstream='http://searxng:8080',fetcher=fetch}) {
  if(!token||token.length<32)throw new Error('Configure SEARXNG_TOKEN com pelo menos 32 caracteres.');
  const expected=Buffer.from(`Bearer ${token}`);
  return http.createServer(async(req,res)=>{
    const supplied=Buffer.from(req.headers.authorization||'');
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(401);return res.end();}
    const request=new URL(req.url,'http://gateway');
    if(req.method!=='GET'||request.pathname!=='/search'){res.writeHead(404);return res.end();}
    const q=request.searchParams.get('q')||'';
    if(!q||q.length>500){res.writeHead(400);return res.end();}
    const url=new URL('/search',upstream);
    url.search=new URLSearchParams({q,format:'json',language:'pt-BR',safesearch:'1'}).toString();
    try {
      const response=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
      if(!response.ok){res.writeHead(502);return res.end();}
      const data=await response.json();
      const content=JSON.stringify({results:Array.isArray(data.results)?data.results.slice(0,50):[]});
      if(Buffer.byteLength(content)>2000000){res.writeHead(502);return res.end();}
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(content);
    }catch{res.writeHead(502);res.end();}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  createGateway({token:process.env.SEARXNG_TOKEN,upstream:process.env.SEARXNG_INTERNAL_URL}).listen(8088,'0.0.0.0');
}
