(function(){
'use strict';
/* ========== 常量与物理 ========== */
var G = 980;            // cm/s^2
var R = 1;              // 小球半径 cm
var ZB = 2.5;           // 小球运动平面离板面距离
var FLOOR = 70;         // 小球落到桌面时球心的 y（槽口下方）cm
var END_LEN = 8;        // 槽口水平段长度
var S = { h:15, tilt:0, baffle:30, strobe:0.05, slow:0.25, step:0, maxReach:0,
  seen:{}, levelInit:false, points:[], pointsH:null, curveOn:false, theoryOn:false,
  m1:null, m2:null, err:{}, quizDone:false };
function $(s,root){ return (root||document).querySelector(s); }
function $$(s,root){ return Array.prototype.slice.call((root||document).querySelectorAll(s)); }
function v0(h){ return Math.sqrt(2*G*h); }
function rad(d){ return d*Math.PI/180; }
function pos(t,v,th){ return { x: v*Math.cos(th)*t, y: -v*Math.sin(th)*t + G*t*t/2 }; }
function tAtY(y,v,th){ var a=v*Math.sin(th); return (a+Math.sqrt(a*a+2*G*y))/G; }
function f(n,d){ return Number(n).toFixed(d===undefined?1:d); }
function W(x,y,z){ return new THREE.Vector3(x,-y,z===undefined?ZB:z); }
var FONT = '-apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

/* ========== 渲染基础 ========== */
var canvas = $('#c'), stage = $('#stage');
var renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x14202e);
var camera = new THREE.PerspectiveCamera(42, 1, 1, 3000);
var controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.minDistance = 30; controls.maxDistance = 420;
var HOME = { pos:new THREE.Vector3(28,-4,185), target:new THREE.Vector3(40,-20,0) };
function resetView(){ camera.position.copy(HOME.pos); if (camera.aspect<1) camera.position.set(45,-18,175/Math.max(camera.aspect,0.45)); else if (camera.aspect<1.3) camera.position.set(35,-10,230); controls.target.copy(HOME.target); controls.update(); }
resetView();
scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x2a3644, 0.8));
var sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(50, 110, 150); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
var sc = sun.shadow.camera; sc.left=-110; sc.right=110; sc.top=110; sc.bottom=-110; sc.near=10; sc.far=500;
sun.target.position.set(40,-20,0); scene.add(sun); scene.add(sun.target);

function mat(color, o){ o=o||{}; return new THREE.MeshStandardMaterial({ color:color, roughness:o.r===undefined?0.7:o.r, metalness:o.m||0, transparent:!!o.op, opacity:o.op||1 }); }
function box(w,h,d,m){ var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.castShadow=true; b.receiveShadow=true; return b; }

/* 坐标纸（10 px = 1 cm） */
var BX0=-20, BX1=110, BY0=-40, BY1=72;   // 板面范围：x 从 -20 到 110，y（向下为正）从 -40 到 72
function paperTexture(){
  var w=(BX1-BX0)*10, h=(BY1-BY0)*10, c=document.createElement('canvas'); c.width=w; c.height=h;
  var g=c.getContext('2d');
  g.fillStyle='#fbf8ee'; g.fillRect(0,0,w,h);
  for (var i=0;i<=BX1-BX0;i++){ var k=i+BX0; g.strokeStyle= k%10===0?'#6fb3a3':(k%5===0?'#9fcfc3':'#d6eae4'); g.lineWidth= k%10===0?2:1; g.beginPath(); g.moveTo(i*10+.5,0); g.lineTo(i*10+.5,h); g.stroke(); }
  for (var j=0;j<=BY1-BY0;j++){ var q=j+BY0; g.strokeStyle= q%10===0?'#6fb3a3':(q%5===0?'#9fcfc3':'#d6eae4'); g.lineWidth= q%10===0?2:1; g.beginPath(); g.moveTo(0,j*10+.5); g.lineTo(w,j*10+.5); g.stroke(); }
  var ox=(0-BX0)*10, oy=(0-BY0)*10;
  g.strokeStyle='#3c5a7a'; g.lineWidth=3;
  g.beginPath(); g.moveTo(ox,oy); g.lineTo(w-14,oy); g.stroke();
  g.beginPath(); g.moveTo(ox,oy); g.lineTo(ox,h-14); g.stroke();
  g.fillStyle='#3c5a7a';
  g.beginPath(); g.moveTo(w-4,oy); g.lineTo(w-20,oy-7); g.lineTo(w-20,oy+7); g.fill();
  g.beginPath(); g.moveTo(ox,h-4); g.lineTo(ox-7,h-20); g.lineTo(ox+7,h-20); g.fill();
  g.font='bold 22px '+FONT; g.fillText('x / cm', w-90, oy-12); g.fillText('y / cm', ox+12, h-26);
  g.font='18px '+FONT; g.fillStyle='#46647f';
  for (var a=10;a<=100;a+=10) g.fillText(String(a), ox+a*10-10, oy+22);
  for (var b=10;b<=60;b+=10) g.fillText(String(b), ox-30, oy+b*10+6);
  g.fillText('O', ox-22, oy-6);
  var t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}
var BW=BX1-BX0, BH=BY1-BY0, BCX=(BX0+BX1)/2, BCY=-(BY0+BY1)/2;
var paper = new THREE.Mesh(new THREE.PlaneGeometry(BW,BH), new THREE.MeshStandardMaterial({ map:paperTexture(), roughness:0.95 }));
paper.position.set(BCX,BCY,0.05); paper.receiveShadow=true; scene.add(paper);
var board = box(BW+5, BH+5, 2, mat(0x9a7350)); board.position.set(BCX,BCY,-1.05); scene.add(board);
var table = box(240, 4, 70, mat(0x34475b,{r:.85})); table.position.set(45, -FLOOR-R-2, 18); scene.add(table);
var boardFoot = box(BW+5, 3, 10, mat(0x7b5b3e)); boardFoot.position.set(BCX, -FLOOR-R+1.5, -2); scene.add(boardFoot);

/* 斜槽 */
var troughMat = mat(0x3d6f9e,{r:.45,m:.2});
function channel(L){
  var g=new THREE.Group();
  var bottom=box(L,0.6,3.4,troughMat); bottom.position.set(L/2,-R-0.3,0); g.add(bottom);
  var w1=box(L,2.2,0.4,troughMat); w1.position.set(L/2,-R+0.8,1.9); g.add(w1);
  var w2=box(L,2.2,0.4,troughMat); w2.position.set(L/2,-R+0.8,-1.9); g.add(w2);
  return g;
}
var trough = new THREE.Group(); scene.add(trough);
var RAMP_H = 34, RAMP_L = RAMP_H*Math.SQRT2;
var ramp = channel(RAMP_L); ramp.position.set(-END_LEN-RAMP_H, RAMP_H, ZB); ramp.rotation.z = -Math.PI/4; trough.add(ramp);
var endPivot = new THREE.Group(); endPivot.position.set(0,0,ZB); trough.add(endPivot);
var endSeg = channel(END_LEN); endSeg.position.set(-END_LEN,0,0); endPivot.add(endSeg);
var postMat = mat(0x6d7c8c,{r:.5,m:.4});
var post1H = FLOOR-0.6; var post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,post1H,16),postMat); post1.position.set(-END_LEN+0.8, -(R+0.6)-post1H/2, ZB); post1.castShadow=true; trough.add(post1);
var post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,RAMP_H+FLOOR-2,16),postMat); post2.position.set(-END_LEN-RAMP_H+2, -FLOOR-R+(RAMP_H+FLOOR-2)/2, ZB); trough.add(post2);
function setTiltMesh(d){ endPivot.rotation.z = rad(d); }

/* 释放挡块 */
var stopper = box(0.8,2.6,3.4, mat(0xd9534f,{r:.5}));
stopper.rotation.z = -Math.PI/4; scene.add(stopper);
function releasePos(h){ return new THREE.Vector3(-END_LEN-h, h, ZB); }
function placeStopper(h){ var p=releasePos(h); stopper.position.set(p.x+(R+0.4)*Math.SQRT1_2, p.y-(R+0.4)*Math.SQRT1_2+0.6, ZB); }

/* 小球 */
var ballMat = new THREE.MeshStandardMaterial({ color:0xdfe4ea, metalness:0.55, roughness:0.25 });
var ball = new THREE.Mesh(new THREE.SphereGeometry(R,32,20), ballMat); ball.castShadow=true; scene.add(ball);
var ball2 = new THREE.Mesh(new THREE.SphereGeometry(R,32,20), new THREE.MeshStandardMaterial({ color:0xf2a541, metalness:.3, roughness:.35 })); ball2.castShadow=true; scene.add(ball2);
var holder = new THREE.Group(); var hbar=box(1,1,7,postMat); hbar.position.set(0,R+0.6,ZB+4.5); holder.add(hbar); var hclip=box(2.6,0.5,2.6,mat(0xf2a541)); hclip.position.set(0,R+0.3,ZB+8); holder.add(hclip); scene.add(holder);

/* 水平挡板 */
var baffle = new THREE.Group(); scene.add(baffle);
var baffleBoard = box(BW, 0.8, 8, mat(0x4f7fa6,{r:.55})); baffleBoard.position.set(BCX, 0, 4); baffle.add(baffleBoard);
var baffleGrip = box(4, 2.4, 3, mat(0xf2a541)); baffleGrip.position.set(BX1-3, 1.2, 7.5); baffle.add(baffleGrip);
var bafflePaper = box(BW,0.12,7.6,mat(0xffffff,{r:1})); bafflePaper.position.set(BCX,0.46,4); baffle.add(bafflePaper);
function setBaffleMesh(b){ baffle.position.set(0, -(b+R)-0.52, 0); }

/* 重锤线 */
var plumb = new THREE.Group(); scene.add(plumb);
var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,46,6), mat(0x222222)); pl.position.set(0,-25,0.7); plumb.add(pl);
var bob = new THREE.Mesh(new THREE.ConeGeometry(1.1,3,20), mat(0x8b8f96,{m:.6,r:.3})); bob.rotation.x=Math.PI; bob.position.set(0,-49.5,0.7); plumb.add(bob);
var nail = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,1.2,10), mat(0x555555)); nail.rotation.x=Math.PI/2; nail.position.set(0,-2,0.7); plumb.add(nail);

/* 刻度尺（放在桌面上） */
function rulerTex(){
  var c=document.createElement('canvas'); c.width=2000; c.height=80; var g=c.getContext('2d');
  g.fillStyle='#f4e7c4'; g.fillRect(0,0,2000,80); g.strokeStyle='#333'; g.fillStyle='#333'; g.font='18px '+FONT;
  for (var i=0;i<=1000;i++){ var x=i*2; var L= i%100===0?40:(i%50===0?28:(i%10===0?18:0)); if(!L) continue; g.lineWidth=1; g.beginPath(); g.moveTo(x+.5,0); g.lineTo(x+.5,L); g.stroke(); if(i%100===0&&i<1000) g.fillText(String(i/10),x+3,60); }
  for (var k=0;k<=1000;k+=1){ if(k%10) { g.beginPath(); g.moveTo(k*2+.5,0); g.lineTo(k*2+.5,10); g.stroke(); } }
  var t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}
var rmats=[mat(0xe8d9b0),mat(0xe8d9b0),new THREE.MeshStandardMaterial({map:rulerTex(),roughness:.8}),mat(0xe8d9b0),mat(0xe8d9b0),mat(0xe8d9b0)];
var ruler = new THREE.Mesh(new THREE.BoxGeometry(100,0.5,4), rmats); ruler.position.set(50, -FLOOR-R+0.25, 30); ruler.castShadow=true; scene.add(ruler);

/* 原点标记 */
var originMark = new THREE.Mesh(new THREE.RingGeometry(0.9,1.4,32), new THREE.MeshBasicMaterial({ color:0xd9534f, side:THREE.DoubleSide })); originMark.position.set(0,0,0.15); scene.add(originMark);
var originHit = new THREE.Mesh(new THREE.CircleGeometry(3,16), new THREE.MeshBasicMaterial({ visible:false })); originHit.position.set(0,0,0.2); scene.add(originHit);

/* 动态图层 */
var layer = new THREE.Group(); scene.add(layer);
function clearLayer(){ while(layer.children.length){ var o=layer.children.pop(); o.traverse(function(n){ if(n.geometry) n.geometry.dispose(); if(n.material){ if(n.material.map) n.material.map.dispose(); n.material.dispose(); } }); } }
function addMark(x,y,color,r){ var m=new THREE.Mesh(new THREE.CircleGeometry(r||0.7,24), new THREE.MeshBasicMaterial({ color:color||0x1d2733 })); m.position.set(x,-y,0.18); layer.add(m); return m; }
function addGhost(x,y,color,z){ var m=new THREE.Mesh(new THREE.SphereGeometry(R,20,12), new THREE.MeshStandardMaterial({ color:color||0x7fd1ff, transparent:true, opacity:.55 })); m.position.set(x,-y,z===undefined?ZB:z); layer.add(m); return m; }
function addLine(pts,color,dashed){
  var g=new THREE.BufferGeometry().setFromPoints(pts);
  var m= dashed? new THREE.LineDashedMaterial({ color:color, dashSize:1.5, gapSize:1 }) : new THREE.LineBasicMaterial({ color:color });
  var l=new THREE.Line(g,m); if(dashed) l.computeLineDistances(); layer.add(l); return l;
}
function addTube(pts,color){ var curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'); var t=new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.28, 8, false), new THREE.MeshBasicMaterial({ color:color })); layer.add(t); return t; }
function addLabel(text,x,y,z,o){
  o=o||{}; var size=30, c=document.createElement('canvas'), g=c.getContext('2d'); g.font='600 '+size+'px '+FONT;
  var w=Math.ceil(g.measureText(text).width)+22, h=size+16; c.width=w; c.height=h;
  g.font='600 '+size+'px '+FONT; g.fillStyle=o.bg||'rgba(15,27,42,.86)';
  var r=10; g.beginPath(); g.moveTo(r,0); g.arcTo(w,0,w,h,r); g.arcTo(w,h,0,h,r); g.arcTo(0,h,0,0,r); g.arcTo(0,0,w,0,r); g.fill();
  g.fillStyle=o.color||'#fff'; g.textBaseline='middle'; g.fillText(text,11,h/2+1);
  var t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding;
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:t, depthTest:false, transparent:true }));
  var H=o.h||3.4; sp.scale.set(w/h*H,H,1); sp.position.set(x,y,z||4); sp.renderOrder=10; layer.add(sp); return sp;
}
function theoryCurve(h,tilt,color,dashed){
  var v=v0(h), th=rad(tilt||0), T=tAtY(FLOOR,v,th), pts=[];
  for (var i=0;i<=80;i++){ var p=pos(T*i/80,v,th); pts.push(W(p.x,p.y,0.25)); }
  return addLine(pts,color||0x2b6cb0,dashed!==false);
}
