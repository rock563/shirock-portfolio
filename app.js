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
let photos=[],viewerList=[],viewerIndex=0;
const viewer=$('#viewer'),viewImage=$('#viewer-image'),canvas=$('#viewer-canvas');
function src(photo,thumb=false){return 'assets/'+(thumb?photo.thumb:photo.file);}
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
function photoButton(p,list,desktop='40vw',mobile='45vw'){
 const b=document.createElement('button');b.className='photo reveal';b.style.setProperty('--ratio',p.width/p.height);b.dataset.photo=p.id;b.dataset.favorite=String(p.favorite);b.setAttribute('aria-label','查看 '+photoLabel(p));
 const im=new Image();im.loading='lazy';im.decoding='async';im.srcset=`${src(p,true)} ${p.thumbWidth}w, assets/${p.medium} ${p.mediumWidth}w, ${src(p)} ${p.displayWidth}w`;im.sizes=`(max-width:600px) ${mobile}, ${desktop}`;im.src=src(p);im.alt=photoLabel(p);im.width=p.width;im.height=p.height;im.loading='lazy';im.decoding='async';im.draggable=false;b.append(im);
 b.addEventListener('click',()=>openPhoto(p.id,list));return b;
}
function renderChapters(){
 $('#chapters').replaceChildren(...chapters.map((ch,i)=>{
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
 document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));document.body.classList.add('js-ready');initChapterPixels();updateReading();
}
function renderIndex(){
 $('#index-list').replaceChildren(...chapters.map(ch=>{
  const group=document.createElement('section');group.className='index-group';group.dataset.chapter=ch.id;const h=document.createElement('h3');h.textContent=ch.name;const grid=document.createElement('div');grid.className='index-thumbs';const list=listFor(ch);
  list.forEach((p,i)=>{const b=document.createElement('button');b.className='index-photo';b.setAttribute('aria-label','查看 '+photoLabel(p));const im=new Image();im.loading='lazy';im.decoding='async';im.src=src(p,true);im.alt='';im.width=p.thumbWidth;im.height=Math.round(p.thumbWidth*p.height/p.width);im.loading='lazy';im.decoding='async';const no=document.createElement('span');no.textContent=pad(i+1);b.append(im,no);b.addEventListener('click',()=>{closeDialog($('#index-dialog'));openPhoto(p.id,list);});grid.append(b);});group.append(h,grid);return group;
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
function updateViewer(){
  const p=viewerList[viewerIndex];if(!p)return;
  viewer.dataset.chapter=chapters.find(ch=>ch.name===p.group)?.id||'mountains';
  viewImage.style.opacity='0';viewImage.src=src(p);viewImage.alt=photoLabel(p);if(viewImage.complete&&viewImage.naturalWidth)viewImage.style.opacity='1';
  $('#viewer-title').textContent=p.group;$('#viewer-counter').textContent=pad(viewerIndex+1)+' / '+pad(viewerList.length);
  $('#viewer-hint').textContent='左右方向键切换 · Esc 关闭';
  $('#viewer-prev').disabled=viewerList.length<2;$('#viewer-next').disabled=viewerList.length<2;
  const next=new Image();next.src=src(viewerList[(viewerIndex+1)%viewerList.length]);
}
function stepViewer(dir){viewerIndex=(viewerIndex+dir+viewerList.length)%viewerList.length;updateViewer();}
$('#viewer-close').addEventListener('click',()=>closeDialog(viewer));
$('#viewer-prev').addEventListener('click',()=>stepViewer(-1));$('#viewer-next').addEventListener('click',()=>stepViewer(1));
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();stepViewer(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepViewer(-1);}});
viewImage.addEventListener('load',()=>{viewImage.style.opacity='1';});
viewImage.addEventListener('dragstart',e=>e.preventDefault());

fetch('photos.json').then(r=>{if(!r.ok)throw Error('照片目录加载失败');return r.json();}).then(data=>{photos=data;renderChapters();renderIndex();}).catch(()=>{$('#load-message').hidden=false;});

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

// 小范围的蓝色水面：常驻的柔和水光与随移动衰减的细碎波纹。
{
 const dialog=$('#about-dialog'),water=$('#contact-water'),ctx=water.getContext('2d');
 let waves=[],frame=0,width=0,height=0,point=null,lastEmit=0;
 function resize(){const r=dialog.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;water.width=Math.round(width*dpr);water.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 new ResizeObserver(()=>{if(dialog.open)resize();}).observe(dialog);
 function wake(now){
  ctx.clearRect(0,0,width,height);waves=waves.filter(w=>now-w.start<750);
  waves.forEach(w=>{const t=(now-w.start)/750,r=5+t*12;ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.angle);ctx.strokeStyle=`rgba(26,88,145,${(1-t)*.26})`;ctx.lineWidth=.7;
   // 开放且不规则的弧线，保留水面方向感，避免同心圆扩散。
   for(let side=0;side<2;side++){ctx.beginPath();for(let k=0;k<=16;k++){const a=(side?Math.PI:0)+.4+k/16*1.8;const rr=r+Math.sin(a*3+w.phase+t*5)*1.1;const x=Math.cos(a)*rr,y=Math.sin(a)*rr*.52;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.restore();
  });
  if(point){const r=11+Math.sin(now*.003)*.8,g=ctx.createRadialGradient(point.x-2,point.y-2,1,point.x,point.y,r);g.addColorStop(0,'rgba(77,157,211,.18)');g.addColorStop(.5,'rgba(33,104,168,.10)');g.addColorStop(1,'rgba(33,104,168,0)');ctx.fillStyle=g;ctx.fillRect(point.x-r,point.y-r,r*2,r*2);
   ctx.beginPath();ctx.ellipse(point.x,point.y,8,5,-.2,.3,2.6);ctx.strokeStyle='rgba(31,96,155,.45)';ctx.lineWidth=.85;ctx.stroke();ctx.beginPath();ctx.ellipse(point.x-1,point.y-1,6,3,-.2,3.3,5.4);ctx.strokeStyle='rgba(255,255,255,.75)';ctx.stroke();
  }
  frame=dialog.open&&(point||waves.length)&&!reduced?requestAnimationFrame(wake):0;
 }
 function move(e){if(!fine||e.pointerType==='touch'||!dialog.open)return;const r=dialog.getBoundingClientRect(),next={x:e.clientX-r.left,y:e.clientY-r.top},now=performance.now();if(next.x<0||next.y<0||next.x>r.width||next.y>r.height)return;
  if(!width)resize();if(point&&!reduced&&now-lastEmit>45&&Math.hypot(next.x-point.x,next.y-point.y)>2){waves.push({x:point.x,y:point.y,start:now,angle:Math.atan2(next.y-point.y,next.x-point.x),phase:Math.random()*Math.PI});waves=waves.slice(-12);lastEmit=now;}point=next;if(!frame){if(reduced)wake(now);else frame=requestAnimationFrame(wake);}
 }
 dialog.addEventListener('pointermove',move);dialog.addEventListener('pointerenter',move);dialog.addEventListener('pointerdown',move);
 dialog.addEventListener('pointerleave',()=>{point=null;if(reduced)ctx.clearRect(0,0,width,height);});
 function clear(){cancelAnimationFrame(frame);frame=0;waves=[];point=null;ctx.clearRect(0,0,width,height);}
 dialog.addEventListener('close',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
}
