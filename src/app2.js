
/* ========== 实验运行 ========== */
var run = null, levelTest = null, hudExtra = '';
function resetBall(h){
  h = h===undefined? S.h : h;
  var p=releasePos(h); ball.position.copy(p); ball.visible=true; placeStopper(h); stopper.visible=true;
}
function startRun(o){
  if (run) { toast('小球还在运动，等它停下再来'); return false; }
  levelTest = null;
  var h=o.h===undefined?S.h:o.h, tilt=o.tilt===undefined?S.tilt:o.tilt;
  var v=v0(h), th=rad(tilt), s=h*Math.SQRT2, a=G*Math.SQRT1_2;
  var tF = o.mode==='baffle' ? tAtY(o.b,v,th) : tAtY(FLOOR,v,th);
  if (o.mode==='compare') tF = Math.max(tF, Math.sqrt(2*FLOOR/G));
  setTiltMesh(tilt); resetBall(h); stopper.visible=false;
  run = { mode:o.mode, h:h, tilt:tilt, v:v, th:th, s:s, a:a, b:o.b, tRamp:Math.sqrt(2*s/a), tEnd:END_LEN/v, tF:tF, t:0,
    slow:o.slow||S.slow, dtS:o.dtS||S.strobe, n:0, ghosts:[], onDone:o.onDone, color:o.color };
  refreshButtons();
  return true;
}
function tickRun(dt){
  if (levelTest) tickLevel(dt);
  if (!run) return;
  var r=run; r.t += dt*r.slow;
  var t=r.t;
  if (t < r.tRamp){ var d=r.a*t*t/2; ball.position.set(-END_LEN-r.h+d*Math.SQRT1_2, r.h-d*Math.SQRT1_2, ZB); setHud('小球沿斜槽滚下…'); return; }
  var t2=t-r.tRamp;
  if (t2 < r.tEnd){ var rem=END_LEN-r.v*t2; ball.position.set(-rem*Math.cos(r.th), -rem*Math.sin(r.th), ZB); return; }
  var tf=t2-r.tEnd, done=false;
  if (tf>=r.tF){ tf=r.tF; done=true; }
  var p=pos(tf,r.v,r.th);
  if (p.y>FLOOR){ var tl=tAtY(FLOOR,r.v,r.th); p=pos(tl,r.v,r.th); }
  ball.position.set(p.x,-p.y,ZB);
  if (r.mode==='compare'){ var y2=Math.min(G*tf*tf/2,FLOOR); ball2.position.set(0,-y2,ZB+8); }
  if (r.mode==='strobe' || r.mode==='compare'){
    while (r.n*r.dtS <= tf+1e-9){
      var tk=r.n*r.dtS, q=pos(tk,r.v,r.th);
      if (q.y<=FLOOR){ addGhost(q.x,q.y,0x7fd1ff); r.ghosts.push({t:tk,x:q.x,y:q.y}); }
      if (r.mode==='compare'){ var yk=G*tk*tk/2; if (yk<=FLOOR){ addGhost(0,yk,0xf2a541,ZB+8); if(q.y<=FLOOR) addLine([W(0,yk,ZB+8),W(q.x,q.y,ZB)],0x2d3e52,true); } }
      r.n++;
    }
  }
  setHud('飞行时间 <b>t = '+f(tf,3)+' s</b>　慢放 '+f(r.slow,2)+'×');
  if (done){
    run=null; r.end=pos(r.tF,r.v,r.th);
    setTimeout(function(){ refreshButtons(); if (r.onDone) r.onDone(r); }, 200);
  }
}
/* 第 3 步：放球检验水平 */
function startLevelTest(){
  if (run) return;
  levelTest = { d:-END_LEN/2, vel:0, t:0, th:rad(S.tilt) };
  stopper.visible=true; setTiltMesh(S.tilt);
}
function tickLevel(dt){
  var L=levelTest; L.t+=dt;
  var acc = -G*Math.sin(L.th)*0.35; // 演示用放慢
  L.vel += acc*dt; L.d += L.vel*dt;
  var out=false;
  if (L.d < -END_LEN){ L.d=-END_LEN; L.vel=0; }
  if (L.d > -R*0.2){ L.d=-R*0.2; out=true; }
  ball.position.set(L.d*Math.cos(L.th), L.d*Math.sin(L.th), ZB);
  if (L.t>1.6 || out){
    levelTest=null;
    var msg = Math.abs(S.tilt)<1e-6 ? '小球在槽口末端静止不动：末端水平 ✓' : (S.tilt>0 ? '小球往回滚：末端向上翘了' : '小球往槽口外滚：末端向下倾了');
    toast(msg); var el=$('#levelResult'); if(el) el.innerHTML=msg;
  }
}

/* ========== HUD / 提示 ========== */
function setHud(extra){ hudExtra = extra||''; drawHud(); }
function drawHud(){
  var v=v0(S.h)/100;
  $('#hud').innerHTML = '初速度 v₀ = √(2gh) ≈ <b>'+f(v,2)+' m/s</b>（h = '+f(S.h)+' cm，g = 9.8 m/s²）'+(hudExtra?'<br>'+hudExtra:'');
}
var toastTimer=null;
function toast(msg){ var t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.classList.remove('on'); },2600); }

/* ========== 参数面板 ========== */
var PARAMS = {
  h:{ label:'释放高度（相对槽口）', min:5, max:30, step:0.5, unit:' cm', d:1 },
  tilt:{ label:'槽口末端倾角', min:-10, max:10, step:0.5, unit:'°', d:1 },
  baffle:{ label:'挡板高度（槽口下方）', min:5, max:60, step:0.5, unit:' cm', d:1 },
  strobe:{ label:'频闪间隔', min:0.02, max:0.1, step:0.01, unit:' s', d:2 },
  slow:{ label:'慢放倍率', min:0.1, max:1, step:0.05, unit:'×', d:2 }
};
var paramCfg = { show:[], lock:{} };
function renderParams(show, lock){
  paramCfg = { show:show||[], lock:lock||{} };
  var html='';
  paramCfg.show.forEach(function(k){
    var p=PARAMS[k], off=!!paramCfg.lock[k];
    html+='<div class="row'+(off?' off':'')+'" data-k="'+k+'"><label>'+p.label+'</label><input type="range" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+S[k]+'"'+(off?' disabled':'')+'><span class="val">'+(k==='tilt'&&S[k]>0?'+':'')+f(S[k],p.d)+p.unit+'</span></div>';
  });
  html+='<div class="note">g = 9.8 m/s²（固定）。初速度按 v₀ = √(2gh) 估算，为理想化模型：忽略摩擦和小球滚动。</div>';
  $('#params').innerHTML=html;
  $$('#params input').forEach(function(inp){
    inp.addEventListener('input', function(){ setParam(inp.parentNode.getAttribute('data-k'), parseFloat(inp.value)); });
  });
}
function syncParamUI(k){
  var row=$('#params .row[data-k="'+k+'"]'); if(!row) return;
  var p=PARAMS[k]; row.querySelector('input').value=S[k];
  row.querySelector('.val').textContent=(k==='tilt'&&S[k]>0?'+':'')+f(S[k],p.d)+p.unit;
}
function setParam(k,v){
  if (paramCfg.lock[k]) return;
  var p=PARAMS[k]; v=Math.max(p.min,Math.min(p.max,Math.round(v/p.step)*p.step)); v=parseFloat(v.toFixed(3));
  S[k]=v; syncParamUI(k);
  if (k==='h'){ if(!run) resetBall(); drawHud(); }
  if (k==='tilt'){ setTiltMesh(v); if(!run && !levelTest) resetBall(); }
  if (k==='baffle') setBaffleMesh(v);
  var st=STEPS[S.step]; if (st.onParam) st.onParam(k);
  refreshNav();
}

/* ========== 拖动挡板 / 点选器材 ========== */
var ray=new THREE.Raycaster(), mouse=new THREE.Vector2(), dragging=false, downXY=null;
var dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1), -4);
function setMouse(e){ var r=canvas.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1; ray.setFromCamera(mouse,camera); }
canvas.addEventListener('pointerdown', function(e){
  downXY=[e.clientX,e.clientY]; setMouse(e);
  if (baffle.visible && paramCfg.show.indexOf('baffle')>=0 && !paramCfg.lock.baffle && !run){
    if (ray.intersectObjects(baffle.children,true).length){ dragging=true; controls.enabled=false; canvas.setPointerCapture(e.pointerId); }
  }
});
canvas.addEventListener('pointermove', function(e){
  if (!dragging) return; setMouse(e); var hit=new THREE.Vector3();
  if (ray.ray.intersectPlane(dragPlane,hit)) setParam('baffle', -hit.y-R-0.5);
});
canvas.addEventListener('pointerup', function(e){
  if (dragging){ dragging=false; controls.enabled=true; return; }
  if (!downXY || Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])>6) return;
  setMouse(e); var st=STEPS[S.step]; if (!st.onPick) return;
  var hits=ray.intersectObjects(PICKABLE.map(function(p){return p.obj;}),true);
  if (!hits.length) return;
  var o=hits[0].object;
  for (var i=0;i<PICKABLE.length;i++){ var found=false; PICKABLE[i].obj.traverse(function(n){ if(n===o) found=true; }); if (found){ st.onPick(PICKABLE[i].id); return; } }
});
$('#resetView').addEventListener('click', resetView);

/* 器材说明（原创文案） */
var EQUIP = [
  { id:'board', name:'竖直木板 + 坐标纸', role:'记录小球飞过的位置。木板必须竖直放置，坐标纸要贴平，否则描出的点会变形。', obj:paper },
  { id:'trough', name:'斜槽', role:'让小球滚下后获得一个水平方向的初速度。它的末端（槽口）必须调成水平。', obj:trough },
  { id:'stopper', name:'释放挡块', role:'固定每次释放小球的位置。每次都从这里由静止释放，小球离开槽口时的速度才会相同。', obj:stopper },
  { id:'ball', name:'小钢球', role:'研究对象。钢球体积小、质量相对大，空气阻力的影响可以忽略。', obj:ball },
  { id:'baffle', name:'水平挡板', role:'拦住飞出的小球，在坐标纸上留下一个落点。把挡板调到不同高度，就能得到轨迹上的不同点。', obj:baffle },
  { id:'plumb', name:'重锤线', role:'给出竖直方向。用它检查木板是否竖直，并沿它画出 y 轴。', obj:plumb },
  { id:'ruler', name:'刻度尺', role:'测量各落点到原点的水平距离 x 和竖直距离 y。', obj:ruler },
  { id:'origin', name:'坐标原点 O', role:'取小球静止在槽口末端时「球心」所对的位置，不是槽口的边缘。x 轴水平向右，y 轴竖直向下。', obj:originHit }
];
var PICKABLE = EQUIP;
var flashList=[];
function flash(obj){
  obj.traverse(function(n){ if (n.material && n.material.emissive){ flashList.push({ m:n.material, t:0 }); } });
  if (obj===originHit){ originMark.scale.set(2,2,2); setTimeout(function(){ originMark.scale.set(1,1,1); },900); }
}
function tickFlash(dt){
  for (var i=flashList.length-1;i>=0;i--){ var it=flashList[i]; it.t+=dt; var k=Math.max(0,1-it.t/1.2); it.m.emissive.setRGB(0.55*k,0.35*k,0); if (k<=0) flashList.splice(i,1); }
}
