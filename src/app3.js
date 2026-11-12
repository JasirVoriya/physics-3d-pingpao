
/* ========== 教学步骤 ========== */
function vEst(x,y){ return x*Math.sqrt(G/(2*y))/100; }
function refreshButtons(){ $$('[data-run]').forEach(function(b){ b.disabled=!!run; }); var st=STEPS[S.step]; if (st.refresh) st.refresh(); }

var STEPS = [
{ key:'认识器材', title:'先认识一下实验台', goal:'知道每件器材叫什么、用来干什么。',
  vis:{ baffle:true },
  enter:function(b){
    b.innerHTML='<p>转动视角看看实验台。<b>点击场景里的器材</b>，或点下面的标签，就能看到它的名称和作用。</p><div class="chips">'+
      EQUIP.map(function(e){ return '<span class="chip'+(S.seen[e.id]?' seen':'')+'" data-id="'+e.id+'">'+e.name+'</span>'; }).join('')+
      '</div><div class="card" id="eqInfo"><h4>还没选器材</h4><div class="muted">点一个试试。</div></div><p class="muted" id="eqCount"></p>';
    $$('.chip',b).forEach(function(c){ c.addEventListener('click',function(){ STEPS[0].onPick(c.getAttribute('data-id')); }); });
    this.count();
  },
  count:function(){ var n=EQUIP.filter(function(e){return S.seen[e.id];}).length; var el=$('#eqCount'); if(el) el.textContent='已认识 '+n+' / '+EQUIP.length+' 件'+(n===EQUIP.length?'，全部认识了，进入下一步吧。':''); },
  onPick:function(id){
    var e=EQUIP.filter(function(x){return x.id===id;})[0]; if(!e) return;
    S.seen[id]=true; flash(e.obj);
    $('#eqInfo').innerHTML='<h4>'+e.name+'</h4><div>'+e.role+'</div>';
    $$('.chip').forEach(function(c){ if(S.seen[c.getAttribute('data-id')]) c.classList.add('seen'); });
    this.count();
  },
  params:[[],{}]
},
{ key:'谁先落地', title:'横着抛和直接掉，谁先落地？', goal:'看出平抛运动在竖直方向上和自由落体完全一样。',
  vis:{ ball2:true },
  enter:function(b){
    b.innerHTML='<p>银色球从槽口水平飞出；橙色球放在槽口旁边的夹子上，<b>同一时刻、同一高度</b>开始自由下落。</p>'+
      '<p>开着频闪，每隔一段时间给两个球各留一个影子，白色虚线连起同一时刻的两个影子。</p>'+
      '<div class="btns"><button class="amber" data-run id="goCmp">同时释放</button></div><div id="cmpRes"></div>'+
      '<div class="card"><h4>想一想</h4>换个释放高度（也就是换个水平速度）再试，落地时间会变吗？</div>';
    $('#goCmp').addEventListener('click', function(){
      clearLayer(); ball2.position.set(0,0,ZB+8);
      startRun({ mode:'compare', tilt:0, onDone:function(r){
        var t1=tAtY(FLOOR,r.v,0), t2=Math.sqrt(2*FLOOR/G);
        $('#cmpRes').innerHTML='<div class="card"><h4>结果</h4>平抛球落地用时 <b>'+f(t1,3)+' s</b>，自由落体球用时 <b>'+f(t2,3)+' s</b>。<br><span class="ok">两球同时落地，每个时刻都在同一高度。</span><br>说明：水平方向有没有速度，不影响竖直方向的下落——竖直方向就是自由落体。</div>';
      }});
    });
  },
  leave:function(){ ball2.position.set(0,0,ZB+8); },
  params:[['h','strobe','slow'],{}]
},
{ key:'调平槽口', title:'把槽口末端调到水平', goal:'只有槽口水平，小球飞出时的速度才是水平的。',
  vis:{},
  enter:function(b){
    if (!S.levelInit){ S.levelInit=true; S.tilt=4; setTiltMesh(4); resetBall(); }
    b.innerHTML='<p>实验台刚搬过来，槽口末端可能歪了。用下面的「槽口末端倾角」滑块调节。</p>'+
      '<div class="card"><h4>怎么检验是否水平？</h4>把小球轻轻放在槽口末端的平直段上：<br>· 小球<b>不滚动</b> → 水平；<br>· 往回滚 → 槽口上翘；往外滚 → 槽口下倾。</div>'+
      '<div class="btns"><button class="amber" id="lvTest">放球检验</button></div><p id="levelResult" class="muted"></p><p>当前状态：<span id="lvBadge"></span></p>'+
      '<p class="muted">调到水平之前不能进入下一步。</p>';
    $('#lvTest').addEventListener('click', startLevelTest);
    this.refresh();
  },
  refresh:function(){ var bd=$('#lvBadge'); if(!bd) return; bd.innerHTML = Math.abs(S.tilt)<1e-6 ? '<span class="badge good">已水平，合格</span>' : '<span class="badge bad">倾角 '+(S.tilt>0?'+':'')+f(S.tilt)+'°，不合格</span>'; },
  onParam:function(k){ if(k==='tilt') this.refresh(); },
  canNext:function(){ return Math.abs(S.tilt)<1e-6; }, lockMsg:'先把槽口调平',
  params:[['tilt'],{}]
},
{ key:'描点', title:'用挡板一点一点描出轨迹', goal:'在至少 5 个不同高度记下落点，连成平滑曲线。',
  vis:{ baffle:true },
  enter:function(b){
    b.innerHTML='<p>上下拖动场景里的<b>蓝色挡板</b>（或用滑块），然后释放小球。小球打在挡板上的位置会自动记在坐标纸上。</p>'+
      '<p class="muted">每次都从同一挡块处释放；记点期间释放高度会锁定。</p>'+
      '<div class="btns"><button class="amber" data-run id="goPt">释放小球</button><button data-run id="undoPt">撤销上一点</button><button data-run id="clrPt">清空重做</button></div>'+
      '<div class="btns"><button class="primary" id="curvePt">连成平滑曲线</button><button id="thPt">对照理论曲线</button></div>'+
      '<div id="ptTable"></div><div id="ptRes"></div>';
    var self=this;
    $('#goPt').addEventListener('click', function(){
      var bb=S.baffle;
      if (S.points.some(function(p){ return Math.abs(p.y-bb)<1.5; })){ toast('这个高度附近已经记过了，换个高度'); return; }
      startRun({ mode:'baffle', b:bb, onDone:function(r){
        if (S.pointsH===null) S.pointsH=S.h;
        S.points.push({ x:r.end.x, y:bb }); self.draw(); renderParams(['h','baffle','slow'],{ h:true });
      }});
    });
    $('#undoPt').addEventListener('click', function(){ S.points.pop(); if(!S.points.length){ S.pointsH=null; S.curveOn=false; renderParams(['h','baffle','slow'],{}); } self.draw(); });
    $('#clrPt').addEventListener('click', function(){ S.points=[]; S.pointsH=null; S.curveOn=false; S.theoryOn=false; renderParams(['h','baffle','slow'],{}); self.draw(); });
    $('#curvePt').addEventListener('click', function(){ if (S.points.length<5){ toast('至少要 5 个点才能连线'); return; } S.curveOn=true; self.draw(); });
    $('#thPt').addEventListener('click', function(){ S.theoryOn=!S.theoryOn; self.draw(); });
    this.draw();
  },
  draw:function(){
    clearLayer();
    var pts=S.points.slice().sort(function(a,b){return a.x-b.x;});
    pts.forEach(function(p){ addMark(p.x,p.y,0x1d2733); });
    var h=S.pointsH===null?S.h:S.pointsH, v=v0(h);
    if (S.curveOn && pts.length>=5) addTube([W(0,0,0.24)].concat(pts.map(function(p){return W(p.x,p.y,0.24);})), 0xd9534f);
    if (S.theoryOn) theoryCurve(h,0,0x2b6cb0,true);
    var html='';
    if (pts.length){
      html='<table><tr><th>#</th><th>x / cm</th><th>y / cm</th><th>理论 y = gx²/(2v₀²)</th><th>偏差</th></tr>';
      var maxE=0;
      pts.forEach(function(p,i){ var xr=Math.round(p.x*10)/10, yT=G*xr*xr/(2*v*v), e=Math.abs(p.y-yT)/yT*100; maxE=Math.max(maxE,e);
        html+='<tr><td>'+(i+1)+'</td><td>'+f(xr)+'</td><td>'+f(p.y)+'</td><td>'+f(yT,2)+'</td><td>'+f(e,2)+'%</td></tr>'; });
      html+='</table><p class="muted">已记 '+pts.length+' 个点（释放高度 '+f(h)+' cm，v₀ ≈ '+f(v/100,2)+' m/s）。'+(pts.length<5?'还差 '+(5-pts.length)+' 个。':'最大偏差 '+f(maxE,2)+'%。')+'</p>';
    } else html='<p class="muted">还没有点。</p>';
    $('#ptTable').innerHTML=html;
    $('#ptRes').innerHTML = S.curveOn&&pts.length>=5 ? '<div class="card"><h4>看出来了吗？</h4>这些点连成一条开口向下延伸的抛物线，满足 <span class="formula">y = g x² / (2v₀²)</span>：y 和 x² 成正比。</div>' : '';
    $('#curvePt').disabled = pts.length<5;
    $('#thPt').textContent = S.theoryOn?'隐藏理论曲线':'对照理论曲线';
    refreshNav();
  },
  leave:function(){},
  params:[['h','baffle','slow'],{}],
  paramsFn:function(){ return [['h','baffle','slow'],{ h:S.points.length>0 }]; }
},
{ key:'频闪验证', title:'频闪照片里的规律', goal:'验证水平方向匀速、竖直方向匀加速。',
  vis:{},
  enter:function(b){
    b.innerHTML='<p>频闪相机每隔相同时间 T 拍一次，小球留下一串影子。量一量相邻影子之间的距离。</p>'+
      '<div class="btns"><button class="amber" data-run id="goSt">频闪拍摄</button></div><div id="stRes"></div>';
    $('#goSt').addEventListener('click', function(){
      clearLayer();
      startRun({ mode:'strobe', tilt:0, onDone:function(r){
        var g=r.ghosts, html='<table><tr><th>#</th><th>t / s</th><th>x / cm</th><th>y / cm</th><th>Δx</th><th>Δy</th><th>相邻 Δy 之差</th></tr>', dxs=[], dds=[];
        g.forEach(function(q,i){
          var dx='', dy='', dd='';
          if (i>0){ dx=q.x-g[i-1].x; dy=q.y-g[i-1].y; dxs.push(dx); }
          if (i>1){ dd=dy-(g[i-1].y-g[i-2].y); dds.push(dd); }
          html+='<tr><td>'+i+'</td><td>'+f(q.t,2)+'</td><td>'+f(q.x)+'</td><td>'+f(q.y)+'</td><td>'+(i>0?f(dx):'')+'</td><td>'+(i>0?f(dy):'')+'</td><td>'+(i>1?f(dd,2):'')+'</td></tr>';
        });
        html+='</table>';
        var gT2=G*r.dtS*r.dtS;
        html+='<div class="card"><h4>结论</h4>· 相邻影子的水平间距 Δx 都是 <b>'+f(dxs[0]||0)+' cm</b>：水平方向<b>匀速</b>，v₀ = Δx / T = '+f((dxs[0]||0)/r.dtS/100,2)+' m/s。<br>· 竖直间距 Δy 一次比一次大，而且<b>每次多出的量都一样</b>，约 '+f(gT2,2)+' cm = gT²：竖直方向<b>匀加速</b>，加速度就是 g。</div>';
        $('#stRes').innerHTML=html;
      }});
    });
  },
  params:[['h','strobe','slow'],{}]
},
{ key:'算初速度', title:'从轨迹算出初速度', goal:'会用两种方法求 v₀，并写出计算过程。',
  vis:{},
  enter:function(b){
    var h=S.pointsH===null?S.h:S.pointsH, v=v0(h);
    var P;
    if (S.points.length){ P=S.points.slice().sort(function(a,b){return b.y-a.y;})[0]; P={ x:Math.round(P.x*10)/10, y:P.y }; }
    else { var t=tAtY(40,v,0); P={ x:Math.round(v*t*10)/10, y:40 }; }
    var dx = v>=150?15:10, ys=[1,2,3].map(function(k){ var x=dx*k; return G*x*x/(2*v*v); });
    var y1=Math.round((ys[1]-ys[0])*10)/10, y2=Math.round((ys[2]-ys[1])*10)/10;
    this.d={ h:h, v:v, P:P, dx:dx, ys:ys, y1:y1, y2:y2 };
    clearLayer();
    addMark(P.x,P.y,0xd9534f,0.9); addLabel('P ('+f(P.x)+', '+f(P.y)+')',P.x+9,-P.y+3,3);
    ['A','B','C'].forEach(function(n,i){ addMark(dx*(i+1),ys[i],0x2b6cb0,0.8); addLabel(n,dx*(i+1)-3,-ys[i]+2.5,3,{ bg:'rgba(43,108,176,.9)' }); });
    theoryCurve(h,0,0x8a9bb0,true);
    b.innerHTML='<p class="muted">本组数据对应释放高度 '+f(h)+' cm。g 取 9.8 m/s²，结果保留两位小数，误差 2% 以内算对。</p>'+
      '<div class="card"><h4>方法一：已知原点</h4>轨迹上红点 P 的坐标：x = <b>'+f(P.x)+' cm</b>，y = <b>'+f(P.y)+' cm</b>。<br>求 v₀ = <input class="num" id="m1in" inputmode="decimal" placeholder="m/s"> m/s <button id="m1go">判断</button><div id="m1res"></div></div>'+
      '<div class="card"><h4>方法二：原点不可靠时，用三个等间距点</h4>蓝点 A、B、C 水平间距都是 <b>Δx = '+f(dx)+' cm</b>；A→B 竖直下降 <b>y₁ = '+f(y1)+' cm</b>，B→C 竖直下降 <b>y₂ = '+f(y2)+' cm</b>。<br>求 v₀ = <input class="num" id="m2in" inputmode="decimal" placeholder="m/s"> m/s <button id="m2go">判断</button><div id="m2res"></div></div>';
    var d=this.d;
    $('#m1go').addEventListener('click', function(){
      var ans=parseFloat($('#m1in').value), right=vEst(d.P.x,d.P.y);
      var ok=isFinite(ans) && Math.abs(ans-right)/right<=0.02; S.m1=ok;
      $('#m1res').innerHTML=(ok?'<p class="ok">对了！</p>':'<p class="no">'+(isFinite(ans)?'不对，再看看过程：':'请先填一个数。')+'</p>')+
        '<div class="calc">竖直：y = ½gt² → t = √(2y/g) = √(2×'+f(d.P.y/100,3)+'/9.8) = '+f(Math.sqrt(2*d.P.y/G),3)+' s<br>水平：x = v₀t → v₀ = x/t = x·√(g/2y) = '+f(d.P.x/100,3)+' × √(9.8/'+f(2*d.P.y/100,3)+') ≈ <b>'+f(right,2)+' m/s</b></div>';
    });
    $('#m2go').addEventListener('click', function(){
      var ans=parseFloat($('#m2in').value), dy=(d.y2-d.y1)/100, T=Math.sqrt(dy/9.8), right=d.dx/100/T, truth=d.v/100;
      var ok=isFinite(ans) && (Math.abs(ans-right)/right<=0.02 || Math.abs(ans-truth)/truth<=0.02); S.m2=ok;
      $('#m2res').innerHTML=(ok?'<p class="ok">对了！</p>':'<p class="no">'+(isFinite(ans)?'不对，再看看过程：':'请先填一个数。')+'</p>')+
        '<div class="calc">水平间距相等 → 相邻两点的时间间隔相同，记为 T。<br>竖直方向匀加速：Δy = y₂ − y₁ = gT²<br>T = √(Δy/g) = √('+f(dy,3)+'/9.8) = '+f(T,4)+' s<br>v₀ = Δx / T = '+f(d.dx/100,2)+' / '+f(T,4)+' ≈ <b>'+f(right,2)+' m/s</b>（设定值 '+f(truth,2)+' m/s）</div>';
    });
  },
  params:[['slow'],{}]
},
{ key:'误差探究', title:'哪里做错了，v₀ 会怎么偏？', goal:'能判断常见操作失误让测出的 v₀ 偏大还是偏小。',
  vis:{ baffle:true },
  SC:[
    { id:'up', name:'槽口末端上翘 5°', tilt:5, ans:'大', why:'槽口上翘，小球出口时带着一点向上的速度，走同样的水平距离时下落得更少（y 偏小）。按 v₀ = x·√(g/2y) 计算，y 偏小 → 算出的 v₀ <b>偏大</b>。' },
    { id:'down', name:'槽口末端下倾 5°', tilt:-5, ans:'小', why:'槽口下倾，小球一出口就有向下的速度，同样水平距离内下落得更多（y 偏大），算出的 v₀ <b>偏小</b>。' },
    { id:'height', name:'每次释放高度不一样', dh:[3,-3,2,-4,1], ans:'不定', why:'释放位置忽高忽低，每次的初速度都不同，点不在同一条抛物线上，连不成光滑曲线，算出的 v₀ <b>时大时小</b>。所以每次必须从同一位置由静止释放。' },
    { id:'origin', name:'原点取在槽口边缘', shift:true, ans:'大', why:'槽口边缘在球心正下方一个半径处，原点取低了，量出的每个 y 都少了约一个半径，所以 y 偏小 → 算出的 v₀ <b>偏大</b>。正确做法是取球心位置。' }
  ],
  enter:function(b){
    var self=this;
    b.innerHTML='<p>挑一种「失误」，程序会按这种失误自动做 5 次实验并描点（橙色），蓝色虚线是正确操作时的轨迹。看完数据，判断算出的 v₀ 怎么偏。</p>'+
      '<div class="btns">'+this.SC.map(function(s){ return '<button data-run data-sc="'+s.id+'">'+s.name+(S.err[s.id]?' ✓':'')+'</button>'; }).join('')+'</div><div id="errBox"></div>';
    $$('[data-sc]',b).forEach(function(btn){ btn.addEventListener('click', function(){ self.go(btn.getAttribute('data-sc')); }); });
  },
  go:function(id){
    var sc=this.SC.filter(function(s){return s.id===id;})[0], self=this;
    clearLayer(); theoryCurve(S.h,0,0x2b6cb0,true);
    var hs=[10,20,30,40,55], res=[], i=0, vT=v0(S.h)/100;
    if (sc.shift){ var m=new THREE.Mesh(new THREE.RingGeometry(0.9,1.4,32), new THREE.MeshBasicMaterial({ color:0xf2a541, side:THREE.DoubleSide })); m.position.set(0,-R,0.2); layer.add(m); addLabel('误取的原点（槽口边缘）',14,-R-3.5,3,{ bg:'rgba(242,165,65,.95)', color:'#1d2733' }); }
    $('#errBox').innerHTML='<p class="muted">正在做实验…</p>';
    var next=function(){
      if (i>=hs.length){ setTiltMesh(S.tilt); resetBall(); self.show(sc,res,vT); return; }
      var bh=hs[i], h=S.h+(sc.dh?sc.dh[i]:0); h=Math.max(5,Math.min(30,h)); i++;
      setBaffleMesh(bh);
      startRun({ mode:'baffle', b:bh, h:h, tilt:sc.tilt||0, slow:1, onDone:function(r){
        addMark(r.end.x,bh,0xe07b22,0.8);
        var yM = sc.shift? bh-R : bh;
        res.push({ b:bh, x:r.end.x, y:yM, v:vEst(r.end.x,yM) });
        setTimeout(next,120);
      }});
    };
    next();
  },
  show:function(sc,res,vT){
    setBaffleMesh(S.baffle);
    var html='<div class="card"><h4>'+sc.name+'</h4><table><tr><th>挡板</th><th>量得 x</th><th>量得 y</th><th>算出 v₀</th></tr>';
    res.forEach(function(r){ html+='<tr><td>'+f(r.b)+'</td><td>'+f(r.x)+'</td><td>'+f(r.y)+'</td><td>'+f(r.v,2)+'</td></tr>'; });
    html+='</table><p>正确操作时 v₀ = <b>'+f(vT,2)+' m/s</b>。算出的 v₀ 会：</p><div class="btns">'+
      ['大','小','不定'].map(function(a){ return '<button data-ans="'+a+'">'+(a==='不定'?'时大时小':'偏'+a)+'</button>'; }).join('')+'</div><div id="ansRes"></div></div>';
    $('#errBox').innerHTML=html;
    $$('[data-ans]').forEach(function(btn){ btn.addEventListener('click', function(){
      var ok=btn.getAttribute('data-ans')===sc.ans; if (ok) S.err[sc.id]=true;
      $('#ansRes').innerHTML='<p class="'+(ok?'ok">判断正确！':'no">不对。')+'</p><div class="calc">'+sc.why+'</div>';
      $$('[data-sc]').forEach(function(b2){ var s2=b2.getAttribute('data-sc'); if(S.err[s2] && b2.textContent.indexOf('✓')<0) b2.textContent+=' ✓'; });
    }); });
  },
  leave:function(){ setTiltMesh(S.tilt); setBaffleMesh(S.baffle); },
  params:[['h','slow'],{}]
},
{ key:'小测验', title:'小测验', goal:'检查一下这节课的要点掌握得怎么样。',
  vis:{},
  Q:[
    { t:'c', q:'平抛运动可以看成哪两个运动的合成？', o:['水平匀加速 + 竖直匀速','水平匀速 + 竖直自由落体','水平匀速 + 竖直匀速','水平、竖直都匀加速'], a:1, e:'水平方向不受力，做匀速直线运动；竖直方向只受重力，从静止开始做自由落体运动。' },
    { t:'c', q:'每次都让小球从斜槽同一位置由静止释放，是为了：', o:['减小小球和斜槽的摩擦','让小球落得更远','保证每次离开槽口时的初速度相同','让轨迹变成直线'], a:2, e:'同一位置、由静止释放，小球每次到达槽口的速度都一样，描出的点才属于同一条轨迹。' },
    { t:'c', q:'下面哪种做法能检验斜槽末端是否水平？', o:['用重锤线对准槽口','把小球放在末端平直段上，看它是否静止','让小球滚下来看落点远近','目测'], a:1, e:'末端水平时，放在上面的小球受力平衡，不会自己滚动。重锤线是用来确定竖直方向的。' },
    { t:'c', q:'建立坐标系时，坐标原点应选在：', o:['槽口末端的边缘','坐标纸左上角','第一个落点','小球在槽口末端时球心对应的位置'], a:3, e:'小球做平抛运动的起点是球心离开槽口的位置，所以原点取球心，不是槽口边缘。' },
    { t:'n', q:'以抛出点为原点，轨迹上一点的坐标为 x = 40.0 cm、y = 20.0 cm，g 取 10 m/s²。小球的初速度为多少 m/s？', a:2.0, e:'t = √(2y/g) = √(2×0.20/10) = 0.20 s，v₀ = x/t = 0.40/0.20 = 2.0 m/s。' },
    { t:'n', q:'原点不清楚。轨迹上取水平间距都为 30 cm 的三点，相邻两点的竖直距离依次为 15 cm 和 25 cm，g 取 10 m/s²。初速度为多少 m/s？', a:3.0, e:'Δy = 0.25 − 0.15 = 0.10 m = gT²，T = 0.1 s；v₀ = Δx/T = 0.30/0.1 = 3.0 m/s。' },
    { t:'c', q:'若斜槽末端略向上翘，仍按水平抛出处理，测得的初速度会：', o:['偏小','偏大','不变','无法判断'], a:1, e:'上翘时同样的水平距离对应的下落高度变小，由 v₀ = x√(g/2y) 知结果偏大。' },
    { t:'c', q:'把原点错取在槽口边缘（比球心低一个半径），测得的初速度会：', o:['偏大','偏小','不变','时大时小'], a:0, e:'原点偏低，量出的 y 都偏小，算出的 v₀ 偏大。' }
  ],
  enter:function(b){
    var self=this;
    b.innerHTML=this.Q.map(function(q,i){
      var body = q.t==='c' ? '<div class="opts">'+q.o.map(function(o,j){ return '<label><input type="radio" name="q'+i+'" value="'+j+'"> '+String.fromCharCode(65+j)+'. '+o+'</label>'; }).join('')+'</div>'
        : '<div><input class="num" name="q'+i+'" inputmode="decimal" placeholder="填数"> m/s</div>';
      return '<div class="q" id="q'+i+'"><div><b>'+(i+1)+'.</b> '+q.q+' <span class="mark"></span></div>'+body+'<div class="exp"></div></div>';
    }).join('')+'<div class="btns"><button class="amber" id="qSubmit">交卷</button><button id="qReset">重做</button></div><div id="qScore"></div>';
    $('#qSubmit').addEventListener('click', function(){ self.grade(); });
    $('#qReset').addEventListener('click', function(){ S.quizDone=false; self.enter(b); });
  },
  grade:function(){
    var right=0, Q=this.Q;
    Q.forEach(function(q,i){
      var box=$('#q'+i), ok=false, ansText;
      if (q.t==='c'){ var c=$('input[name=q'+i+']:checked'); ok=!!c && parseInt(c.value,10)===q.a; ansText=String.fromCharCode(65+q.a)+'. '+q.o[q.a]; }
      else { var v=parseFloat($('input[name=q'+i+']').value); ok=isFinite(v) && Math.abs(v-q.a)/q.a<=0.02; ansText=f(q.a)+' m/s'; }
      if (ok) right++;
      box.classList.add('graded');
      box.querySelector('.mark').innerHTML = ok?'<span class="ok">✓</span>':'<span class="no">✗</span>';
      box.querySelector('.exp').innerHTML='正确答案：'+ansText+'。'+q.e;
    });
    var score=Math.round(right/Q.length*100); S.quizDone=true; S.quizScore=score;
    $('#qScore').innerHTML='<div class="card"><span class="score">'+score+' 分</span>　答对 '+right+' / '+Q.length+' 题。'+(score>=80?'掌握得不错！':'看看解析，再做一遍吧。')+'</div>';
    refreshNav();
  },
  params:[[],{}]
}
];

/* ========== 导航 ========== */
function canPass(i){ var st=STEPS[i]; return !st.canNext || st.canNext(); }
function reachable(i){ if (i>S.maxReach) return false; for (var j=0;j<i;j++) if(!canPass(j)) return false; return true; }
function renderSteps(){
  $('#steps').innerHTML=STEPS.map(function(st,i){
    var cls = i===S.step?'cur':(i<S.maxReach || (i===S.maxReach && i<S.step)?'done':''); if(!reachable(i) && i!==S.step) cls+=' lock';
    return '<li class="'+cls+'" data-i="'+i+'"><i>'+(cls.indexOf('done')>=0?'✓':(i+1))+'</i><span>'+st.key+'</span></li>';
  }).join('');
  $$('#steps li').forEach(function(li){ li.addEventListener('click', function(){ var i=+li.getAttribute('data-i'); if (reachable(i)) go(i); else toast(canPass(2)?'先完成前面的步骤':'先在第 3 步把槽口调平'); }); });
}
function refreshNav(){
  var st=STEPS[S.step], last=S.step===STEPS.length-1;
  $('#prev').disabled = S.step===0;
  var ok=canPass(S.step);
  $('#next').disabled = last || !ok;
  $('#next').textContent = last?'已是最后一步':'下一步 ›';
  $('#navInfo').textContent = (!ok && st.lockMsg)? st.lockMsg : ('第 '+(S.step+1)+' / '+STEPS.length+' 步');
  renderSteps();
}
function go(i){
  if (i<0 || i>=STEPS.length) return;
  var old=STEPS[S.step]; if (old.leave) old.leave();
  run=null; levelTest=null; clearLayer();
  S.step=i; S.maxReach=Math.max(S.maxReach,i);
  var st=STEPS[i], vis=st.vis||{};
  baffle.visible=!!vis.baffle; ball2.visible=!!vis.ball2; holder.visible=!!vis.ball2;
  ball2.position.set(0,0,ZB+8);
  setTiltMesh(S.tilt); setBaffleMesh(S.baffle); resetBall();
  $('#stepHead').innerHTML='<div class="k">第 '+(i+1)+' 步 · '+st.key+'</div><h2>'+st.title+'</h2><div class="goal">本步目标：'+st.goal+'</div>';
  var body=$('#stepBody'); body.scrollTop=0;
  var pc = st.paramsFn? st.paramsFn() : st.params;
  renderParams(pc[0],pc[1]);
  st.enter.call(st, body);
  setHud(''); refreshNav();
}
$('#prev').addEventListener('click', function(){ go(S.step-1); });
$('#next').addEventListener('click', function(){ if (canPass(S.step)) go(S.step+1); });

/* ========== 主循环 ========== */
var viewSet=false;
function resize(){ var w=stage.clientWidth, h=stage.clientHeight; if(!w||!h) return; renderer.setSize(w,h,false); var wasWide=camera.aspect>=1; camera.aspect=w/h; camera.updateProjectionMatrix(); if(!viewSet || wasWide!==(camera.aspect>=1)){ viewSet=true; resetView(); } }
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); window.addEventListener('resize', resize);
var last=performance.now();
function loop(now){
  var dt=Math.min(0.05,(now-last)/1000); last=now;
  tickRun(dt); tickFlash(dt); controls.update(); renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
resize(); go(0); requestAnimationFrame(loop);
window.__lab = { S:S, go:go, setParam:setParam, busy:function(){ return !!run || !!levelTest; }, STEPS:STEPS };
})();
