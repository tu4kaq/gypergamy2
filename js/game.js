/* ============================================================
   ГИПЕРГАМИЯ · game.js — физика, рендер, процедурный мир
   ============================================================ */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const mod=(a,n)=>((a%n)+n)%n;
const rnd=(a=1,b=0)=>b+Math.random()*(a-b);
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function glow(ctx,x,y,r,c,a=.5){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c.replace(')',`,${a})`).replace('rgb','rgba'));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}

/* --------- частицы --------- */
function makeParts(){return[]}
function part(arr,o){arr.push(Object.assign({x:0,y:0,vx:0,vy:0,g:0,drag:1,size:2,color:'#fff',alpha:1,fade:1,life:1,maxLife:1,type:'circle'},o))}
function dust(arr,x,y,n){for(let i=0;i<n;i++)part(arr,{x:x+rnd(8,-8),y:y+rnd(2,-2),vx:rnd(30,-30),vy:rnd(-10,-40),g:60,drag:.92,size:rnd(3,1.5),color:'rgba(180,190,255,.6)',life:rnd(.6,.3)})}
function burst(arr,x,y,col,n){for(let i=0;i<n;i++){const a=rnd(TAU);part(arr,{x,y,vx:Math.cos(a)*rnd(120,40),vy:Math.sin(a)*rnd(120,40)-40,g:120,drag:.94,size:rnd(4,2),color:col,life:rnd(.8,.4)})}}
function trail(arr,x,y,col){part(arr,{x,y,vx:rnd(10,-10),vy:rnd(10,-10),g:0,drag:.9,size:rnd(3,1),color:col,life:.3,alpha:.6})}
function updateParts(arr,dt){for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.life-=dt;if(p.life<=0){arr.splice(i,1);continue}p.vy+=p.g*dt;p.vx*=Math.pow(p.drag,dt*60);p.vy*=Math.pow(p.drag,dt*60);p.x+=p.vx*dt;p.y+=p.vy*dt;p.alpha=p.fade?p.life/p.maxLife:1}}
function drawParts(arr,ctx,additive){ctx.globalCompositeOperation=additive?'lighter':'source-over';for(const p of arr){ctx.globalAlpha=p.alpha*.8;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}

/* --------- генерация мира --------- */
function buildIsland(ctx,p,seed){
  const R=mulberry(seed);
  const verts=[];const steps=12;
  for(let i=0;i<=steps;i++){verts.push({x:i/steps*p.w,y:(R()*8-4)*(i===0||i===steps?.2:1)})}
  const bot=[];const depth=40+p.h*R();
  for(let i=0;i<=steps;i++){const t=i/steps;bot.push({x:t*p.w,y:depth*Math.sin(t*Math.PI)*(.6+R()*.4)})}
  const off=ctx.canvas.__off||(ctx.canvas.__off=document.createElement('canvas'));
  off.width=p.w+40;off.height=p.h+depth+40;
  const oc=off.getContext('2d');oc.translate(20,20);
  oc.beginPath();oc.moveTo(0,0);
  for(const v of verts)oc.lineTo(v.x,v.y);
  for(let i=bot.length-1;i>=0;i--)oc.lineTo(bot[i].x,bot[i].y);
  oc.closePath();
  const grad=oc.createLinearGradient(0,-10,0,p.h+depth);
  grad.addColorStop(0,'#2a2550');grad.addColorStop(.3,'#1e1b3a');grad.addColorStop(1,'#0a0818');
  oc.fillStyle=grad;oc.fill();
  oc.strokeStyle='rgba(124,92,255,.4)';oc.lineWidth=2;oc.stroke();
  oc.save();oc.clip();
  oc.fillStyle='#3ddc97';oc.fillRect(0,0,p.w,6);
  oc.fillStyle='rgba(61,220,151,.3)';for(let i=0;i<p.w;i+=4)oc.fillRect(i,6,2,R()*4);
  oc.restore();
  return{sprite:off,w:p.w,h:p.h,d:depth};
}

/* --------- рисование объектов --------- */
function drawRobot(ctx,st,t){
  const{x,y,vx,grounded,facing,runPhase,sx,sy,blink,happy}=st;
  ctx.save();ctx.translate(x,y);ctx.scale(facing*sx,sy);
  if(happy>0){ctx.rotate(Math.sin(t*20)*.1*happy)}
  const bob=grounded?Math.sin(runPhase)*2:0;
  const squash=grounded?1:1.1;
  ctx.scale(1,squash);
  // legs
  ctx.fillStyle='#4cc9f0';
  const legOff=grounded?Math.sin(runPhase)*6:4;
  rr(ctx,-8-legOff*.5,-4,6,10,3);ctx.fill();
  rr(ctx,2+legOff*.5,-4,6,10,3);ctx.fill();
  // body
  ctx.shadowBlur=15;ctx.shadowColor='#7c5cff';
  rr(ctx,-12,-24,24,22,8);ctx.fillStyle='#f0f4ff';ctx.fill();
  ctx.shadowBlur=0;
  // visor
  rr(ctx,-8,-20,16,10,4);ctx.fillStyle='#14112e';ctx.fill();
  // eyes
  ctx.fillStyle=happy>0?'#ffd166':'#4cc9f0';
  const eh=blink*4;
  ctx.fillRect(-5,-18+ (4-eh)/2, 3, eh);
  ctx.fillRect(2,-18+ (4-eh)/2, 3, eh);
  // antenna
  ctx.strokeStyle='#ccc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(0,-30);ctx.stroke();
  ctx.fillStyle='#ff8fd3';ctx.beginPath();ctx.arc(0,-32,3,0,TAU);ctx.fill();
  ctx.restore();
}
function drawStar(ctx,s,t,i){
  const sc=1+Math.sin(t*3+i)*.1;
  ctx.save();ctx.translate(s.x,s.y);ctx.scale(sc,sc);ctx.rotate(t*.5);
  ctx.shadowBlur=10;ctx.shadowColor='#ffd166';
  ctx.fillStyle='#ffd166';
  ctx.beginPath();
  for(let j=0;j<5;j++){ctx.lineTo(Math.cos((18+j*72)/180*Math.PI)*10,Math.sin((18+j*72)/180*Math.PI)*10);ctx.lineTo(Math.cos((54+j*72)/180*Math.PI)*4,Math.sin((54+j*72)/180*Math.PI)*4)}
  ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawPortal(ctx,x,y,t,winProg){
  ctx.save();ctx.translate(x,y);
  const s=1+winProg*.5;ctx.scale(s,s);
  ctx.globalCompositeOperation='lighter';
  glow(ctx,0,0,60,'#7c5cff',.4+winProg*.4);
  ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle=`rgba(255,255,255,${.6+Math.sin(t*5)*.2})`;ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(0,0,30,50,0,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(76,201,240,.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,20,40,0,0,TAU);ctx.stroke();
  ctx.restore();
}
function drawHazard(ctx,h,t){
  ctx.save();ctx.translate(h.x,h.y);
  ctx.fillStyle='#ff2d55';ctx.shadowBlur=10;ctx.shadowColor='#ff2d55';
  ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(10,10);ctx.lineTo(-10,10);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawIsland(ctx,isl,t){
  ctx.drawImage(isl.sprite,isl.p.x-20,isl.p.y-20);
}

/* --------- основной класс игры --------- */
class Game{
constructor(canvas,cb){
  this.cv=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  this.cb=cb;this.running=false;this.reduceMotion=false;this.touchMode=false;
  this.viewW=800;this.viewH=450;this.scale=1;
  this.cam=0;this.shake=0;this.flash=0;this.winT=0;this.happy=0;
  this.blinkPh=0;this.blinkT=2;
  this.parts=[];this.hints=[];
  this.levelLen=4000;
  this.totalStars=12;
  this.generateLevel();
  this.resetPlayer();
}
generateLevel(){
  const R=mulberry(Date.now()%10000);
  this.islands=[];this.stars=[];this.hazards=[];
  let x=0;let y=300;
  // Start island
  this.islands.push({p:{x:0,y:300,w:300,h:40},s:null});
  x=300;
  for(let i=0;i<15;i++){
    const gap=R()*150+100;
    const dy=(R()-0.5)*100;
    const newY=clamp(y+dy,150,350);
    const w=R()*150+100;
    this.islands.push({p:{x:x+gap,y:newY,w:w,h:40},s:null});
    // Stars above gaps or islands
    if(R()>0.4)this.stars.push({x:x+gap+w/2,y:newY-60,got:false});
    // Hazards sometimes
    if(R()>0.7&&w>100)this.hazards.push({x:x+gap+w/2,y:newY-10,w:w,h:40});
    x=x+gap+w;y=newY;
  }
  // Final platform
  this.islands.push({p:{x:x+100,y:300,w:400,h:40},s:null});
  this.portal={x:x+250,y:250};
  this.levelEnd=x+500;
  // Pre-render sprites
  for(const isl of this.islands)isl.s=buildIsland(this.ctx,isl.p,Date.now()+isl.p.x);
}
resetPlayer(){
  this.player={x:100,y:250,vx:0,vy:0,w:20,h:30,grounded:true,facing:1,runPhase:0,sx:1,sy:1,lives:3,invuln:0,spin:0};
  this.input={left:false,right:false,jumpHeld:false,jumpPressed:false};
  this.timer=0;this.collected=0;this.runState='idle';
}
resize(w,h,dpr){
  this.cv.width=w*dpr;this.cv.height=h*dpr;
  this.viewW=w;this.viewH=h;this.dpr=dpr;
  this.scale=Math.min(w/800,h/450);
  this.vignette=this.ctx.createRadialGradient(w/2,h/2,h/3,w/2,h/2,h);
  this.vignette.addColorStop(0,'rgba(0,0,0,0)');this.vignette.addColorStop(1,'rgba(0,0,0,.6)');
}
startRun(){this.resetPlayer();this.runState='intro';this.parts=[];this.hints=[];}
setLive(){this.runState='playing';this.cb.onProgress(0);}
pressJump(){if(this.runState==='playing'){this.input.jumpPressed=true;this.input.jumpHeld=true}}
releaseJump(){this.input.jumpHeld=false}
update(dt){
  if(this.runState==='playing'||this.runState==='winning'){
    this.timer+=dt;
    const pl=this.player;
    // Input
    const acc=pl.grounded?2000:800;
    if(this.input.left)pl.vx-=acc*dt;
    if(this.input.right)pl.vx+=acc*dt;
    if(!this.input.left&&!this.input.right)pl.vx*=Math.pow(0.85,dt*60);
    pl.vx=clamp(pl.vx,-300,300);
    if(pl.vx!==0)pl.facing=pl.vx>0?1:-1;
    // Jump Logic (Coyote Time & Buffer)
    if(pl.grounded)pl.coyote=0.1;else pl.coyote-=dt;
    if(this.input.jumpPressed){pl.jumpBuf=0.1;this.input.jumpPressed=false}else pl.jumpBuf-=dt;
    if(pl.jumpBuf>0&&pl.coyote>0){
      pl.vy=-600;pl.grounded=false;pl.coyote=0;pl.jumpBuf=0;
      pl.sy=1.2;pl.sx=0.8;dust(this.parts,pl.x,pl.y+15,5);
      this.cb.onJump();
    }
    // Variable jump height
    if(!this.input.jumpHeld&&pl.vy<-200)pl.vy=-200;
    // Physics
    pl.vy+=1800*dt;
    pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;
    // Collision with Islands (Simple AABB floor check)
    pl.grounded=false;
    for(const isl of this.islands){
      const ix=isl.p.x,iy=isl.p.y,iw=isl.p.w;
      if(pl.x+10>ix&&pl.x-10<ix+iw){
        if(pl.y+15>iy&&pl.y+15<iy+40&&pl.vy>=0){
          pl.y=iy-15;pl.vy=0;pl.grounded=true;
          if(Math.abs(pl.vx)>50)pl.runPhase+=dt*15;
          if(!pl.wasGrounded){pl.sy=0.8;pl.sx=1.2;dust(this.parts,pl.x,pl.y+15,3);this.cb.onLand()}
          pl.wasGrounded=true;
        } else pl.wasGrounded=false;
      }
    }
    // Fall death
    if(pl.y>this.viewH+100)this.takeDamage(true);
    // Hazard collision
    for(const h of this.hazards){
      if(pl.invuln<=0&&Math.abs(pl.x-h.x)<15&&Math.abs(pl.y-(h.y-10))<20){
        this.takeDamage(false);break;
      }
    }
    // Star collection
    for(const s of this.stars){
      if(!s.got&&Math.hypot(pl.x-s.x,pl.y-s.y)<25){
        s.got=true;this.collected++;burst(this.parts,s.x,s.y,'#ffd166',10);
        this.cb.onStar(this.collected,this.totalStars);
      }
    }
    // Portal win
    if(this.runState==='playing'&&Math.hypot(pl.x-this.portal.x,pl.y-this.portal.y)<40){
      this.runState='winning';this.winT=0;pl.vx=0;pl.vy=0;
      burst(this.parts,pl.x,pl.y,'#fff',20);
      setTimeout(()=>this.cb.onWin({stars:this.collected,time:this.timer,total:this.totalStars}),1500);
    }
    // Camera follow
    const targetCam=pl.x-this.viewW/3;
    this.cam+=(targetCam-this.cam)*dt*5;
    this.cam=clamp(this.cam,0,this.levelEnd-this.viewW);
    // Timers
    if(pl.invuln>0)pl.invuln-=dt;
    if(this.shake>0)this.shake-=dt*2;
    if(this.flash>0)this.flash-=dt*2;
    if(this.happy>0)this.happy-=dt;
    // Blink logic
    this.blinkT-=dt;
    if(this.blinkT<=0){this.blinkPh=0.1;this.blinkT=2+Math.random()*3}
    if(this.blinkPh>0)this.blinkPh-=dt;
    pl.blink=this.blinkPh>0?clamp(Math.abs(this.blinkPh-0.05)/0.05,0.1,1):1;
    // Squash stretch recovery
    pl.sx+=(1-pl.sx)*dt*10;pl.sy+=(1-pl.sy)*dt*10;
    updateParts(this.parts,dt);
  } else if(this.runState==='winning'){
    this.winT+=dt;updateParts(this.parts,dt);
  }
}
takeDamage(fell){
  const pl=this.player;
  if(pl.invuln>0)return;
  pl.lives--;this.shake=1;this.flash=1;
  burst(this.parts,pl.x,pl.y,'#ff2d55',15);
  this.cb.onLife(pl.lives);
  if(pl.lives<=0){
    this.runState='over';
    setTimeout(()=>this.cb.onLose(),1000);
  } else {
    pl.invuln=2;
    // Respawn logic: find nearest safe island behind player
    let safe=null;
    for(let i=this.islands.length-1;i>=0;i--){
      if(this.islands[i].p.x<pl.x){safe=this.islands[i];break}
    }
    if(safe){pl.x=safe.p.x+safe.p.w/2;pl.y=safe.p.y-20;pl.vx=0;pl.vy=0}
    else{pl.x=100;pl.y=250;pl.vx=0;pl.vy=0}
    this.cb.onRespawn();
  }
}
render(){
  const ctx=this.ctx,w=this.viewW,h=this.viewH,sc=this.scale;
  ctx.setTransform(sc,0,0,sc,0,0);
  ctx.fillStyle='#050614';ctx.fillRect(0,0,w/sc,h/sc); // Sky base
  
  // Parallax Background elements (Clouds/Sun)
  ctx.save();
  ctx.translate(-this.cam*0.2,0);
  // Sun/Moon
  glow(ctx,200,100,100,'#4b2fd8',0.3);
  // Clouds
  ctx.fillStyle='rgba(255,255,255,0.05)';
  for(let i=0;i<5;i++){
    const cx=i*400+mod(this.timer*10+i*100,2000);
    ctx.beginPath();ctx.arc(cx,150+i*20,40,0,TAU);ctx.fill();
  }
  ctx.restore();
  
  // World Space Rendering
  ctx.save();
  // Apply Shake
  const shx=(Math.random()-0.5)*this.shake*10;
  const shy=(Math.random()-0.5)*this.shake*10;
  ctx.translate(-this.cam+shx,shy);
  
  // Draw Islands
  for(const isl of this.islands){
    if(isl.p.x+isl.p.w<this.cam-100||isl.p.x>this.cam+w/sc+100)continue;
    drawIsland(ctx,isl,this.timer);
  }
  // Draw Hazards
  for(const hz of this.hazards)drawHazard(ctx,hz,this.timer);
  // Draw Stars
  for(let i=0;i<this.stars.length;i++)if(!this.stars[i].got)drawStar(ctx,this.stars[i],this.timer,i);
  // Draw Portal
  drawPortal(ctx,this.portal.x,this.portal.y,this.timer,this.runState==='winning'?clamp(this.winT,0,1):0);
  // Draw Particles
  drawParts(this.parts,ctx,false);
  // Draw Player
  if(this.runState!=='over'){
    const pl=this.player;
    // Shadow
    if(pl.grounded){ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(pl.x,pl.y+15,12,4,0,0,TAU);ctx.fill()}
    // Invulnerability flicker
    if(pl.invuln>0&&Math.floor(Date.now()/100)%2===0){}else{
      drawRobot(ctx,pl,this.timer);
    }
  }
  drawParts(this.parts,ctx,true);
  ctx.restore();
  
  // Post Processing (Vignette/Flash)
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle=this.vignette||'rgba(0,0,0,0)';ctx.fillRect(0,0,this.cv.width,this.cv.height);
  if(this.flash>0){ctx.fillStyle=`rgba(255,45,85,${this.flash*0.3})`;ctx.fillRect(0,0,this.cv.width,this.cv.height)}
  if(this.runState==='winning'&&this.winT>0.8){
     ctx.fillStyle=`rgba(255,255,255,${clamp((this.winT-0.8)/0.5,0,1)})`;ctx.fillRect(0,0,this.cv.width,this.cv.height);
  }
}
}

window.HyperGame={Game,createBackdrop,createAttract};
})();