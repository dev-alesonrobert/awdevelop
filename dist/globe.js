(() => {
  const canvas = document.querySelector('#aw-globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const toggle = document.querySelector('#globe-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, visible = false, frame = 0, last = 0, angle = .65, size = 0;
  const rad = Math.PI / 180;
  // Simplified continent silhouettes, used only for this decorative globe.
  const continents = [
    [[-168,71],[-143,70],[-124,60],[-130,50],[-124,40],[-116,30],[-106,23],[-98,17],[-88,16],[-82,9],[-77,8],[-82,24],[-80,32],[-68,45],[-56,52],[-63,61],[-80,63],[-92,72],[-114,74],[-135,69]],
    [[-81,12],[-70,12],[-60,7],[-50,1],[-35,-6],[-39,-18],[-48,-28],[-54,-36],[-66,-55],[-74,-48],[-75,-30],[-81,-6]],
    [[-53,59],[-43,60],[-22,70],[-28,81],[-45,84],[-62,76]],
    [[-17,37],[0,37],[11,33],[25,32],[33,30],[43,12],[51,11],[43,0],[40,-13],[31,-29],[19,-35],[12,-24],[10,-6],[0,5],[-14,10],[-17,21]],
    [[-10,36],[-9,44],[-2,49],[-5,57],[8,59],[12,71],[25,71],[31,61],[45,66],[65,72],[100,76],[140,72],[179,66],[174,53],[156,51],[142,44],[133,34],[121,23],[109,19],[105,1],[98,7],[99,20],[90,22],[80,7],[72,21],[60,25],[50,14],[43,12],[34,30],[25,36],[20,40],[13,45],[6,43]],
    [[112,-22],[114,-34],[128,-35],[137,-38],[151,-28],[153,-20],[142,-11],[132,-12],[123,-17]],
    [[47,-13],[50,-16],[47,-25],[44,-25],[43,-19]],
    [[130,31],[140,36],[145,44],[141,43],[135,34]],
    [[-8,50],[-5,59],[0,58],[1,51]],
    [[95,5],[106,-6],[114,-8],[120,-5],[113,0],[105,1]],
    [[166,-34],[178,-38],[173,-47],[167,-46],[171,-40]],
    [[-180,-72],[-120,-73],[-60,-68],[0,-72],[60,-69],[120,-73],[180,-72],[180,-87],[-180,-87]]
  ];
  function contains(x,y,poly) { let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++) {const a=poly[i],b=poly[j];if(((a[1]>y)!=(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside; }
  function vector(lon,lat) {const a=lon*rad,b=lat*rad;return [Math.cos(b)*Math.sin(a),-Math.sin(b),Math.cos(b)*Math.cos(a)];}
  const dots=[];
  for(let lat=-80;lat<83;lat+=2.2) {const step=2.2/Math.max(.2,Math.cos(lat*rad));for(let lon=-180;lon<180;lon+=step)if(continents.some(p=>contains(lon,lat,p)))dots.push(vector(lon,lat));}
  const hubs=[[-46.6,-23.5],[-74,40.7],[-.1,51.5],[13.4,52.5],[103.8,1.3],[139.7,35.7]].map(p=>vector(...p));
  const routes=[[0,1],[0,2],[1,2],[2,4],[3,5],[4,5]].map(([a,b])=>{const points=[];const v=hubs[a],w=hubs[b],omega=Math.acos(Math.max(-1,Math.min(1,v.reduce((s,n,i)=>s+n*w[i],0))));for(let i=0;i<=64;i++){const t=i/64,A=Math.sin((1-t)*omega)/Math.sin(omega),B=Math.sin(t*omega)/Math.sin(omega),lift=1+.18*Math.sin(Math.PI*t);points.push(v.map((n,j)=>(n*A+w[j]*B)*lift));}return points;});
  function project(v) {const x=v[0]*Math.cos(angle)+v[2]*Math.sin(angle),z=-v[0]*Math.sin(angle)+v[2]*Math.cos(angle);const tilt=-.19;return [size/2+(x*Math.cos(tilt)-v[1]*Math.sin(tilt))*size*.39,size/2+(x*Math.sin(tilt)+v[1]*Math.cos(tilt))*size*.39,z];}
  function line(points,color,width=1) {ctx.beginPath();let drawing=false;for(const v of points){const p=project(v);if(p[2]<0){drawing=false;continue;}if(drawing)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);drawing=true;}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function draw() {
    ctx.clearRect(0,0,size,size);
    const glow=ctx.createRadialGradient(size*.48,size*.43,0,size/2,size/2,size*.42);glow.addColorStop(0,'#211732');glow.addColorStop(.8,'#151725');glow.addColorStop(1,'#12162200');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(size/2,size/2,size*.39,0,Math.PI*2);ctx.fill();
    for(let lat=-60;lat<=60;lat+=30)line(Array.from({length:181},(_,i)=>vector(i*2-180,lat)),'#9970dc18');
    for(let lon=0;lon<360;lon+=30)line(Array.from({length:91},(_,i)=>vector(lon,i*2-90)),'#9970dc18');
    for(const v of dots){const p=project(v);const front=p[2]>0;ctx.fillStyle=front?`rgba(174,120,255,${.32+.65*p[2]})`:'rgba(126,77,206,.09)';ctx.beginPath();ctx.arc(p[0],p[1],Math.max(.55,size*(front?.00165:.001)),0,Math.PI*2);ctx.fill();}
    for(let i=0;i<routes.length;i++){line(routes[i],'#b98aff65',.8);const p=project(routes[i][Math.floor((angle*22+i*11)%64)]);if(p[2]>0){ctx.fillStyle='#e7d5ff';ctx.shadowColor='#b28aff';ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p[0],p[1],2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}
    for(const v of hubs){const p=project(v);if(p[2]<0)continue;ctx.strokeStyle='#b28aff';ctx.lineWidth=1;ctx.fillStyle='#a574f8';ctx.beginPath();ctx.arc(p[0],p[1],6,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(p[0],p[1],2.5,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#a776ed2b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(size/2,size/2,size*.39,0,Math.PI*2);ctx.stroke();
  }
  function animate(time) {frame=0;if(paused||!visible||document.hidden)return; if(last)angle+=Math.min(time-last,50)*.00012;last=time;draw();frame=requestAnimationFrame(animate);}
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Iniciar rotação do globo':'Pausar rotação do globo');toggle.innerHTML=paused?'Reproduzir rotação <span aria-hidden="true">▷</span>':'Pausar rotação <span aria-hidden="true">Ⅱ</span>';draw();if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(animate);}
  toggle.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',e=>{paused=e.matches;sync();});
  document.addEventListener('visibilitychange',sync);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05}).observe(canvas);
  new ResizeObserver(()=>{size=canvas.clientWidth;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);sync();}).observe(canvas);
})();
