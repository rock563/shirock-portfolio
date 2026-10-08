"use strict";
const $=(s,root=document)=>root.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function chapterOffset(){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chapter-offset'))||112;}
const fine=matchMedia('(pointer: fine)').matches;
const chapters=[
 {id:'mountains',name:'山与途中',order:[30,21,22,20,26,6,3,4],blocks:[['feature',[30]],['spread spread-pair',[21,22]],['single',[20]],['spread portrait-pair',[26,6]],['spread spread-asymmetric',[3,4]]]},
 {id:'frames',name:'窗与空间',order:[29,19,24,14,13,15,25,5,1,11,10],blocks:[['feature',[29]],['spread spread-pair',[19,24]],['spread spread-pair',[14,13]],['single',[15]],['spread spread-asymmetric',[25,5]],['spread spread-three',[1,11,10]]]},
 {id:'light',name:'夜与微光',order:[27,28,0,8],blocks:[['feature',[27]],['night',[28,0,8]]]},
 {id:'life',name:'日常与生命',order:[12,18,17,23,2,16,9,7],blocks:[['spread spread-asymmetric',[12,18]],['spread spread-pair',[17,23]],['details-spread',[2,16,9,7]]]}
];
let photos=JSON.parse(document.querySelector('#photo-data')?.textContent||'[]'),viewerList=[],viewerIndex=0;
const viewer=$('#viewer'),viewImage=$('#viewer-image'),canvas=$('#viewer-canvas');
const imageVersion='images-2';
// 首页自带预览，清晰插画就绪后替换，下载失败时保持已有画面。
const heroArt=$('#hero-art');
if(heroArt){const hero=new Image();hero.decoding='async';hero.fetchPriority='high';hero.onload=()=>heroArt.setAttribute('href',hero.src);hero.src=assetUrl(innerWidth>1600?'hero-illustration.webp':innerWidth<=600?'hero-800.webp':'hero-1600.webp');}
function assetUrl(file){return 'assets/'+file+'?v='+imageVersion;}
function src(photo,thumb=false){return assetUrl(thumb?photo.thumb:photo.file);}
// 先取轻量预览，清晰图就绪后再替换；限制并发，避免慢网络互相争抢。
const imageJobs=[],imageRequests=new Map();let activeImages=0;
function loadImage(url,priority=1){
 if(imageRequests.has(url))return imageRequests.get(url);
 const request=new Promise((resolve,reject)=>{imageJobs.push({url,priority,resolve,reject});imageJobs.sort((a,b)=>a.priority-b.priority);pumpImages();});
 imageRequests.set(url,request);request.catch(()=>imageRequests.delete(url));return request;
}
function pumpImages(){
 while(activeImages<3&&imageJobs.length){
  const job=imageJobs.shift();activeImages++;
  let attempt=0;
  function run(){
   const image=new Image();image.decoding='async';image.fetchPriority=job.priority===0?'high':'low';let settled=false;
   const timeout=setTimeout(()=>finish(false),20000);
   function finish(ok){
    if(settled)return;settled=true;clearTimeout(timeout);image.onload=image.onerror=null;
    if(!ok){image.removeAttribute('src');if(attempt++<2){setTimeout(run,900*attempt);return;}}
    activeImages--;ok?job.resolve(job.url):job.reject(Error('图片暂时未能加载'));pumpImages();
   }
   image.onload=()=>finish(image.naturalWidth>0);image.onerror=()=>finish(false);image.src=job.url;
  }
  run();
 }
}
const progressivePhotos=new WeakMap();
const previewObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){previewObserver.unobserve(e.target);progressivePhotos.get(e.target)?.preview();}}),{rootMargin:'700px 0px'});
const detailObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){detailObserver.unobserve(e.target);progressivePhotos.get(e.target)?.detail();}}),{rootMargin:'150px 0px'});
const artObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('art-ready');artObserver.unobserve(e.target);}}),{rootMargin:'300px 0px'});
function pad(n){return String(n).padStart(2,'0');}
function photoLabel(p){return p.group+' · 摄影 '+pad(p.id+1);}
function syncDialogBody(){document.body.classList.toggle('dialog-open',!!document.querySelector('dialog[open]'));}
function showDialog(d){if(!d.open)d.showModal();syncDialogBody();}
function closeDialog(d){d.close();syncDialogBody();}
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',syncDialogBody);d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);});});
$('#index-open').addEventListener('click',()=>showDialog($('#index-dialog')));
$('#index-close').addEventListener('click',()=>closeDialog($('#index-dialog')));
$('#about-open').addEventListener('click',()=>showDialog($('#about-dialog')));
$('#about-close').addEventListener('click',()=>closeDialog($('#about-dialog')));
const contactSignal=$('#contact-signal'),contactSecret=$('#contact-secret');
contactSignal.addEventListener('click',()=>{
 const reveal=contactSecret.hidden;contactSecret.hidden=!reveal;
 contactSignal.setAttribute('aria-expanded',String(reveal));
});
$('#about-dialog').addEventListener('close',()=>{
 contactSecret.hidden=true;contactSignal.setAttribute('aria-expanded','false');
});
function listFor(chapter){return chapter.order.map(id=>photos.find(p=>p.id===id));}
function photoButton(p,list,desktop='40vw',mobile='45vw',existing=null){
 if(existing){const im=existing.querySelector('.photo-preview');if(im?.complete&&im.naturalWidth)existing.classList.add('preview-ready');}
 const b=existing||document.createElement('button');if(!existing)b.className='photo reveal';b.style.setProperty('--ratio',p.width/p.height);b.dataset.photo=p.id;b.dataset.favorite=String(p.favorite);b.setAttribute('aria-label','查看 '+photoLabel(p));
 const im=existing?.querySelector('.photo-preview')||new Image();im.className='photo-preview';im.decoding='async';im.alt=photoLabel(p);im.width=p.width;im.height=p.height;im.draggable=false;
 const detail=existing?.querySelector('.photo-detail')||new Image();detail.className='photo-detail';detail.decoding='async';detail.alt='';detail.draggable=false;detail.setAttribute('aria-hidden','true');
 const message=existing?.querySelector('.photo-message')||document.createElement('span');message.className='photo-message';message.textContent='图片未加载，点击重试';message.hidden=true;b.append(im,detail,message);
 let previewPromise=null,ready=im.complete&&im.naturalWidth>0,wantsDetail=false,detailStarted=false;
 function preview(){
  if(previewPromise)return previewPromise;message.hidden=true;if(im.complete&&im.naturalWidth){ready=true;b.classList.add('preview-ready');if(wantsDetail)upgrade();return Promise.resolve(im.src);}
  previewPromise=loadImage(src(p,true),0).then(url=>{im.src=url;ready=true;b.classList.add('preview-ready');if(wantsDetail)upgrade();}).catch(()=>{previewPromise=null;message.hidden=true;return loadImage(assetUrl(p.medium),0).then(url=>{im.src=url;ready=true;b.classList.add('preview-ready');}).catch(()=>{message.hidden=false;});});
  return previewPromise;
 }
 function upgrade(){
  wantsDetail=true;if(!ready){preview();return;}if(detailStarted)return;detailStarted=true;
  loadImage(assetUrl(p.medium)).then(url=>{detail.onload=()=>b.classList.add('detail-ready');detail.src=url;if(detail.complete&&detail.naturalWidth)b.classList.add('detail-ready');}).catch(()=>{detailStarted=false;});
 }
 progressivePhotos.set(b,{preview,detail:upgrade});previewObserver.observe(b);detailObserver.observe(b);
 b.addEventListener('click',()=>{if(!ready&&!message.hidden){previewPromise=null;preview();return;}openPhoto(p.id,list);});return b;
}
function renderChapters(){
 const existing=[...document.querySelectorAll('#chapters .photo')];
 if(existing.length===photos.length){
  chapters.forEach(ch=>{const list=listFor(ch);ch.order.forEach(id=>photoButton(photos.find(p=>p.id===id),list,'40vw','45vw',existing.find(b=>Number(b.dataset.photo)===id)));});
 }else $('#chapters').replaceChildren(...chapters.map((ch,i)=>{
  const section=document.createElement('section');section.id=ch.id;section.className='chapter chapter-'+ch.id;section.setAttribute('aria-labelledby',ch.id+'-title');
  const backdrop=document.createElement('div');backdrop.className='chapter-backdrop';backdrop.setAttribute('aria-hidden','true');const atmosphere=document.createElement('div');atmosphere.className='chapter-atmosphere';backdrop.append(atmosphere);section.append(backdrop);
  const head=document.createElement('div');head.className='chapter-head';
  const no=document.createElement('span');no.className='chapter-no';no.textContent=pad(i+1);
  const title=document.createElement('h2');title.id=ch.id+'-title';title.textContent=ch.name;
  const count=document.createElement('span');count.className='chapter-count';count.textContent=pad(ch.order.length);head.append(no,title,count);section.append(head);
  const list=listFor(ch);
  ch.blocks.forEach(([type,ids])=>{
   const block=document.createElement('div');block.className=type;
   if(type==='night'){
    block.className='night-spread';const main=photoButton(photos.find(p=>p.id===ids[0]),list,'40vw','48vw');main.classList.add('night-main');
    const side=document.createElement('div');side.className='night-side';ids.slice(1).forEach(id=>side.append(photoButton(photos.find(p=>p.id===id),list,'25vw','32vw')));block.append(main,side);
   }else{const wide=type==='feature'||type==='single',three=type.includes('three')||type==='details-spread';ids.forEach(id=>block.append(photoButton(photos.find(p=>p.id===id),list,wide?'80vw':three?'30vw':'40vw',wide?'90vw':type.includes('three')?'28vw':'45vw')));}
   section.append(block);
  });return section;
 }));
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}});},{threshold:.06,rootMargin:'0px 0px 35px 0px'});
 document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));document.querySelectorAll('.chapter').forEach(el=>artObserver.observe(el));document.body.classList.add('js-ready');initChapterPixels();updateReading();
}
function renderIndex(){
 $('#index-list').replaceChildren(...chapters.map(ch=>{
  const group=document.createElement('section');group.className='index-group';group.dataset.chapter=ch.id;const h=document.createElement('h3');h.textContent=ch.name;const grid=document.createElement('div');grid.className='index-thumbs';const list=listFor(ch);
  list.forEach((p,i)=>{const b=document.createElement('button');b.className='index-photo';b.setAttribute('aria-label','查看 '+photoLabel(p));const im=new Image();im.decoding='async';im.alt='';im.width=p.thumbWidth;im.height=Math.round(p.thumbWidth*p.height/p.width);const no=document.createElement('span');no.textContent=pad(i+1);b.append(im,no);
   const preview=()=>{b.classList.remove('index-unavailable');return loadImage(src(p,true),0).catch(()=>loadImage(assetUrl(p.medium),0)).then(url=>{im.src=url;}).catch(()=>{b.classList.add('index-unavailable');});};
   progressivePhotos.set(b,{preview});previewObserver.observe(b);b.addEventListener('click',()=>{if(b.classList.contains('index-unavailable'))preview();closeDialog($('#index-dialog'));openPhoto(p.id,list);});grid.append(b);});group.append(h,grid);return group;
 }));
}
let readingFrame=0;
function updateReading(){
 readingFrame=0;$('.site-header').classList.toggle('solid',scrollY>innerHeight*.55);
 const sections=[...document.querySelectorAll('.chapter')];let active=sections[0]?.id;
 sections.forEach(el=>{if(el.getBoundingClientRect().top<innerHeight*.4)active=el.id;});
 document.querySelectorAll('.chapter-nav a').forEach(a=>{const chosen=a.hash==='#'+active;a.classList.toggle('active',chosen);if(chosen)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
 const first=sections[0],last=sections.at(-1);if(first&&first.getBoundingClientRect().top<=chapterOffset())document.body.dataset.chapter=active;else delete document.body.dataset.chapter;
 if(first&&last){const start=first.offsetTop,end=last.offsetTop+last.offsetHeight-innerHeight;const fraction=Math.min(1,Math.max(0,(scrollY-start)/(end-start)));$('.reading-line').style.transform='scaleX('+fraction+')';}
}
addEventListener('scroll',()=>{if(!readingFrame)readingFrame=requestAnimationFrame(updateReading);},{passive:true});addEventListener('resize',updateReading);
let travelFrame=0,stopTravel=null;
function travelTo(target){
 if(stopTravel)stopTravel();const from=scrollY,to=target.id==='home'?0:Math.max(0,target.getBoundingClientRect().top+scrollY-chapterOffset());
 if(reduced){scrollTo({top:to,behavior:'instant'});return;}
 const start=performance.now(),duration=target.id==='home'?1300:1600;
 function stop(){cancelAnimationFrame(travelFrame);removeEventListener('wheel',stop);removeEventListener('touchstart',stop);removeEventListener('keydown',stop);if(stopTravel===stop)stopTravel=null;}
 stopTravel=stop;addEventListener('wheel',stop,{passive:true});addEventListener('touchstart',stop,{passive:true});addEventListener('keydown',stop);
 function tick(now){const t=Math.min(1,(now-start)/duration),e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;scrollTo({top:from+(to-from)*e,behavior:'instant'});if(t<1)travelFrame=requestAnimationFrame(tick);else stop();}travelFrame=requestAnimationFrame(tick);
}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.hash);if(target){e.preventDefault();travelTo(target);}}));
const scene=$('#hero-scene');
if(fine&&!reduced){
 const spot=$('#fade-spot');let titleBounds=$('#name-solid').getBBox();const measureTitle=()=>{titleBounds=$('#name-solid').getBBox();};document.fonts.ready.then(measureTitle);addEventListener('resize',measureTitle);
 const reveal={x:1200,y:450,tx:1200,ty:450,alpha:0,target:0,frame:0,ready:false};
 function animateTransparency(){
  const dx=reveal.tx-reveal.x,dy=reveal.ty-reveal.y;
  reveal.x+=dx*.2;reveal.y+=dy*.2;reveal.alpha+=(reveal.target-reveal.alpha)*.13;
  spot.setAttribute('cx',reveal.x);spot.setAttribute('cy',reveal.y);spot.setAttribute('opacity',reveal.alpha);
  if(Math.hypot(dx,dy)>.3||Math.abs(reveal.target-reveal.alpha)>.002)reveal.frame=requestAnimationFrame(animateTransparency);
  else{reveal.frame=0;spot.setAttribute('opacity',reveal.target);}
 }
 function moveTransparency(x,y,active){
  reveal.tx=x;reveal.ty=y;reveal.target=active?1:0;
  if(!reveal.ready&&active){reveal.x=x;reveal.y=y;reveal.ready=true;}
  if(!reveal.frame&&(active||reveal.alpha>.002))reveal.frame=requestAnimationFrame(animateTransparency);
 }
 scene.addEventListener('pointermove',e=>{
  const r=scene.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*2400,y=(e.clientY-r.top)/r.height*1600;
  const bounds=titleBounds;moveTransparency(x,y,x>bounds.x-70&&x<bounds.x+bounds.width+70&&y>bounds.y-70&&y<bounds.y+bounds.height+70&&e.clientY>64);
 },{passive:true});
 scene.addEventListener('pointerleave',()=>moveTransparency(reveal.x,reveal.y,false));
 addEventListener('scroll',()=>moveTransparency(reveal.x,reveal.y,false),{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>moveTransparency(reveal.x,reveal.y,false));
}
function openPhoto(id,list=photos){
  viewerList=list;viewerIndex=viewerList.findIndex(p=>p.id===id);if(viewerIndex<0)return;updateViewer();showDialog(viewer);
}
let viewerLoad=0;
const viewerStatus=$('#viewer-status'),viewerRetry=$('#viewer-retry');
function updateViewer(){
  const p=viewerList[viewerIndex];if(!p)return;
  viewer.dataset.chapter=chapters.find(ch=>ch.name===p.group)?.id||'mountains';
  const token=++viewerLoad;let quality=0;viewImage.removeAttribute('src');viewImage.style.opacity='0';viewImage.alt=photoLabel(p);viewerStatus.hidden=false;viewerStatus.textContent='正在加载作品…';viewerRetry.hidden=true;
  const show=(url,level)=>{if(token!==viewerLoad||level<quality)return;quality=level;viewImage.src=url;viewImage.style.opacity='1';viewerStatus.hidden=true;};
  const ratio=p.width/p.height,dpr=Math.min(devicePixelRatio||1,2);
  const needed=Math.min(innerWidth*.92,(innerHeight-160)*ratio)*dpr;
  const full=needed>p.mediumWidth*1.1?src(p):assetUrl(p.medium);
  loadImage(src(p,true),0).then(url=>show(url,1)).catch(()=>{});
  loadImage(full,0).then(url=>show(url,3)).catch(()=>{
   if(token!==viewerLoad)return;
   if(full!==assetUrl(p.medium))loadImage(assetUrl(p.medium),0).then(url=>show(url,2)).catch(()=>failed());else failed();
  });
  function failed(){if(token!==viewerLoad)return;viewerStatus.hidden=false;viewerStatus.textContent='清晰图暂时未能加载';viewerRetry.hidden=false;}
  $('#viewer-title').textContent=p.group;$('#viewer-counter').textContent=pad(viewerIndex+1)+' / '+pad(viewerList.length);
  $('#viewer-hint').textContent='左右方向键切换 · Esc 关闭';
  $('#viewer-prev').disabled=viewerList.length<2;$('#viewer-next').disabled=viewerList.length<2;
}
function stepViewer(dir){viewerIndex=(viewerIndex+dir+viewerList.length)%viewerList.length;updateViewer();}
$('#viewer-close').addEventListener('click',()=>closeDialog(viewer));
$('#viewer-prev').addEventListener('click',()=>stepViewer(-1));$('#viewer-next').addEventListener('click',()=>stepViewer(1));
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();stepViewer(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepViewer(-1);}});
viewImage.addEventListener('load',()=>{viewImage.style.opacity='1';});
viewImage.addEventListener('dragstart',e=>e.preventDefault());
viewerRetry.addEventListener('click',updateViewer);
viewer.addEventListener('close',()=>{viewerLoad++;});

async function loadPhotos(){
 if(photos.length){renderChapters();renderIndex();$('#load-message').hidden=true;return;}
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch('photos.json?v='+imageVersion,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('照片目录加载失败');photos=await r.json();renderChapters();renderIndex();$('#load-message').hidden=true;return;}
  catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
 }
 $('#load-message').hidden=false;
}
loadPhotos();

// 像素尾迹在照片上方绘制；弹窗拥有自己的顶层画布。
function initChapterPixels(){
 if(!fine||reduced)return;
 const themes={mountains:{color:'#d8892b',size:[3,6]},frames:{color:'#637c35',size:[2,3]},light:{color:'#f1d64c',size:[3,5],glow:true},life:{color:'#af3d30',size:[3,5]}};
 const fields=[...document.querySelectorAll('.pointer-pixels')].map(canvas=>({canvas,context:canvas.getContext('2d'),particles:[],width:0,height:0}));
 let frame=0,previous=0,lastField=null,lastPoint=null,lastEmit=0;
 function resize(){const dpr=Math.min(devicePixelRatio||1,2);fields.forEach(f=>{const r=f.canvas.getBoundingClientRect();f.width=r.width;f.height=r.height;f.canvas.width=Math.round(r.width*dpr);f.canvas.height=Math.round(r.height*dpr);f.context.setTransform(dpr,0,0,dpr,0,0);});}
 addEventListener('resize',resize);document.querySelectorAll('dialog').forEach(d=>d.addEventListener('pointerenter',resize));resize();
 function draw(now){const dt=Math.min(40,now-previous||16);previous=now;let alive=false;
  fields.forEach(f=>{const c=f.context;c.clearRect(0,0,f.width,f.height);f.particles=f.particles.filter(p=>now-p.start<p.life);f.particles.forEach(p=>{const t=(now-p.start)/p.life;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.987,dt/16);p.vy+=.00006*dt;c.globalAlpha=Math.pow(1-t,1.5)*(.7+.16*Math.sin(t*12+p.phase));c.fillStyle=p.theme.color;c.shadowColor=p.theme.color;c.shadowBlur=p.theme.glow?7:0;c.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);});c.globalAlpha=1;c.shadowBlur=0;if(f.particles.length)alive=true;});
  frame=alive?requestAnimationFrame(draw):0;
 }
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const dialog=e.target.closest('dialog');if(dialog?.id==='about-dialog'){lastField=null;lastPoint=null;return;}
  const f=fields.find(f=>f.canvas.parentElement===(dialog||document.body));if(!f)return;
  const key=dialog?.id==='viewer'?dialog.dataset.chapter:e.target.closest('.index-group')?.dataset.chapter||e.target.closest('.chapter')?.id||document.body.dataset.chapter||'mountains';
  const theme=themes[key]||themes.mountains,now=performance.now(),r=f.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(!f.width)resize();if(lastField!==f){lastPoint={x,y};lastField=f;}
  const dx=x-lastPoint.x,dy=y-lastPoint.y;if(now-lastEmit<25||Math.hypot(dx,dy)<3)return;
  lastEmit=now;lastPoint={x,y};const bounds=theme.size;
  for(let i=0;i<3;i++)f.particles.push({x:x+(Math.random()-.5)*12,y:y+(Math.random()-.5)*12,vx:Math.max(-.18,Math.min(.18,dx*.009))+(Math.random()-.5)*.065,vy:Math.max(-.14,Math.min(.14,dy*.009))+(Math.random()-.5)*.05,size:Math.round(bounds[0]+Math.random()*(bounds[1]-bounds[0])),start:now,life:850+Math.random()*750,phase:Math.random()*Math.PI,theme});
  f.particles=f.particles.slice(-100);if(!frame){previous=now;frame=requestAnimationFrame(draw);}
 },{passive:true});
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{fields.filter(f=>f.canvas.parentElement===d).forEach(f=>{f.particles=[];f.context.clearRect(0,0,f.width,f.height);});lastField=null;lastPoint=null;}));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;fields.forEach(f=>{f.particles=[];f.context.clearRect(0,0,f.width,f.height);});}});
}

// 彩蛋页：最右侧的渔船成为指针，船尾留下沿航行方向散开的尾流。
{
 const dialog=$('#about-dialog'),water=$('#contact-water'),ctx=water.getContext('2d');
 let waves=[],frame=0,width=0,height=0,point=null,lastEmit=0,boatSprite=null,boatLoading=false,boatFacing=1,wakeDistance=0;
 function resize(){
  const r=dialog.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;water.width=Math.round(width*dpr);water.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  // 背景为 2400×1600，居中靠底 contain；灯固定在船尾桅杆顶端。
  const scale=Math.min(width/2400,height/1600);
  contactSignal.style.left=((width-2400*scale)/2+1290*scale)+'px';
  contactSignal.style.top=(height-1600*scale+925*scale)+'px';
  if(point)drawBoat();
 }
 new ResizeObserver(()=>{if(dialog.open)resize();}).observe(dialog);
 $('#about-open').addEventListener('click',()=>{resize();if(fine)prepareBoat();});
 function prepareBoat(){
  if(boatSprite||boatLoading)return;boatLoading=true;
  const art=new Image();art.onload=()=>{
   const sprite=document.createElement('canvas');sprite.width=137;sprite.height=126;
   const ink=sprite.getContext('2d',{willReadFrequently:true});ink.drawImage(art,1192,916,137,126,0,0,137,126);
   const pixels=ink.getImageData(0,0,137,126);
   // 只取最右边这一艘船，保留原图的蓝色油墨和斑驳笔触。
   for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];pixels.data[i+3]=b>g+7?Math.min(255,Math.max(0,(b-r-18)*5)):0;}
   ink.putImageData(pixels,0,0);boatSprite=sprite;boatLoading=false;
   if(point&&dialog.open){dialog.classList.add('sailing');if(!frame)wake(performance.now());}
  };
  art.onerror=()=>{boatLoading=false;};art.src=assetUrl('contact-illustration.webp');
 }
 function drawBoat(){
  if(!point||!boatSprite)return;ctx.save();ctx.translate(point.x,point.y);ctx.scale(boatFacing,1);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(boatSprite,-18,-17,36,126/137*36);ctx.restore();
 }
 function wake(now){
  ctx.clearRect(0,0,width,height);waves=waves.filter(w=>now-w.start<680);
  waves.forEach(w=>{const t=(now-w.start)/680,back=t*6,spread=3+t*7;ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.angle);ctx.strokeStyle=`rgba(22,67,110,${Math.pow(1-t,1.5)*.38})`;ctx.lineWidth=.75;ctx.lineCap='round';
   // 船尾两侧向后外展的短水纹，沿移动轨迹形成逐渐散开的航迹。
   for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-back,side*spread);ctx.quadraticCurveTo(-back-6,side*(spread+1),-back-14,side*(spread+3));ctx.stroke();}
   ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(-back-3,0);ctx.lineTo(-back-7,0);ctx.stroke();ctx.restore();
  });
  drawBoat();frame=dialog.open&&waves.length&&!reduced?requestAnimationFrame(wake):0;
 }
 function move(e){if(!fine||e.pointerType==='touch'||!dialog.open)return;const r=dialog.getBoundingClientRect(),next={x:e.clientX-r.left,y:e.clientY-r.top},now=performance.now();if(next.x<0||next.y<0||next.x>r.width||next.y>r.height){clear();return;}
  if(!width)resize();
  if(point){const dx=next.x-point.x,dy=next.y-point.y,distance=Math.hypot(dx,dy);if(Math.abs(dx)>.5)boatFacing=dx>0?-1:1;wakeDistance+=distance;
   if(!reduced&&distance>.1&&now-lastEmit>40&&wakeDistance>7){const ux=dx/distance,uy=dy/distance;waves.push({x:next.x-ux*18,y:next.y+10-uy*18,start:now,angle:Math.atan2(dy,dx)});waves=waves.slice(-16);lastEmit=now;wakeDistance=0;}
  }
  point=next;if(boatSprite)dialog.classList.add('sailing');if(!frame)wake(now);
 }
 dialog.addEventListener('pointermove',move);dialog.addEventListener('pointerenter',move);dialog.addEventListener('pointerdown',move);
 dialog.addEventListener('pointerleave',()=>{point=null;wakeDistance=0;dialog.classList.remove('sailing');if(!frame)wake(performance.now());});
 function clear(){cancelAnimationFrame(frame);frame=0;waves=[];point=null;lastEmit=0;wakeDistance=0;boatFacing=1;dialog.classList.remove('sailing');ctx.clearRect(0,0,width,height);}
 dialog.addEventListener('close',clear);addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
}
