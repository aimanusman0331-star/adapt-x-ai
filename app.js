import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $=id=>document.getElementById(id);
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x90b6cc);
scene.fog=new THREE.Fog(0x90b6cc,55,150);

const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,300);

scene.add(new THREE.HemisphereLight(0xddeeff,0x334422,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(30,45,20);sun.castShadow=true;scene.add(sun);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x486447,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

function box(x,z,w,d,h,color=0x6a5c4c){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));
  m.position.set(x,h/2,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;
}
const buildings=[
 box(-26,-18,15,12,8),box(8,-30,18,13,8),box(31,-8,20,15,10),box(-4,30,19,13,8),
 box(-36,14,10,10,6),box(28,28,12,10,7)
];
function tree(x,z){
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,4,8),new THREE.MeshStandardMaterial({color:0x5b3f27}));
 trunk.position.set(x,2,z);scene.add(trunk);
 const crown=new THREE.Mesh(new THREE.SphereGeometry(3.2,12,10),new THREE.MeshStandardMaterial({color:0x285a32}));
 crown.position.set(x,6,z);crown.castShadow=true;scene.add(crown)
}
[[-42,-28],[-14,-38],[20,-40],[44,-24],[-42,34],[18,42],[40,40],[0,8],[-24,6]].forEach(p=>tree(...p));

const river=new THREE.Mesh(new THREE.PlaneGeometry(120,14),new THREE.MeshStandardMaterial({color:0x397f9c,transparent:true,opacity:.78}));
river.rotation.x=-Math.PI/2;river.rotation.z=.16;river.position.y=.03;scene.add(river);

const road=new THREE.Mesh(new THREE.PlaneGeometry(120,7),new THREE.MeshStandardMaterial({color:0x77736b}));
road.rotation.x=-Math.PI/2;road.rotation.z=-.34;road.position.y=.04;scene.add(road);

function makeActor(color){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(1.05,2.2,5,10),new THREE.MeshStandardMaterial({color}));
 body.position.y=2.1;body.castShadow=true;g.add(body);
 const gun=new THREE.Mesh(new THREE.BoxGeometry(.35,.35,2.2),new THREE.MeshStandardMaterial({color:0x272727}));
 gun.position.set(.8,2.3,-.8);g.add(gun);scene.add(g);return g;
}
const player=makeActor(0x7254f2), rival=makeActor(0xef4264);

const zoneRing=new THREE.Mesh(new THREE.RingGeometry(38.5,39,96),new THREE.MeshBasicMaterial({color:0x00e49a,side:THREE.DoubleSide,transparent:true,opacity:.9}));
zoneRing.rotation.x=-Math.PI/2;zoneRing.position.y=.08;scene.add(zoneRing);

const lootDefs=[
 {type:'AR',pos:[29,-6],color:0xf2a41d},
 {type:'Sniper',pos:[9,-28],color:0xffcc38},
 {type:'Armor',pos:[-25,-17],color:0x6ea4d1},
 {type:'Med',pos:[-3,28],color:0xe9f2f5},
 {type:'Smoke',pos:[18,37],color:0xbfc4c8},
 {type:'SMG',pos:[35,-9],color:0xe8891c},
];
const lootMeshes=[];
lootDefs.forEach((l,i)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(2,1,2),new THREE.MeshStandardMaterial({color:l.color,emissive:l.color,emissiveIntensity:.18}));
 m.position.set(l.pos[0],.6,l.pos[1]);m.userData={loot:l.type,taken:false};scene.add(m);lootMeshes.push(m)
});

const W={
 Pistol:{dmg:12,range:22,acc:.55,ammo:12},
 SMG:{dmg:18,range:26,acc:.73,ammo:28},
 AR:{dmg:22,range:42,acc:.68,ammo:30},
 Sniper:{dmg:43,range:72,acc:.64,ammo:8}
};
const LAND={
 riverside:{p:[-28,0,-16],tag:'balanced'},
 ridge:{p:[8,0,-31],tag:'highground'},
 warehouse:{p:[31,0,-8],tag:'hot'},
 farm:{p:[-3,0,31],tag:'safe'}
};

let s={match:1,hp:100,armor:0,aHp:100,aArmor:25,weapon:'Pistol',ammo:12,meds:1,smokes:0,zone:100,phase:'DROP',landed:false,ended:false,smoked:false,turn:0};
let profile=JSON.parse(localStorage.getItem('ax8Profile')||'{"landing":{"hot":0,"safe":0,"highground":0,"balanced":0},"weapon":{"close":0,"mid":0,"long":0},"rotation":{"early":0,"late":0},"aggression":{"push":0,"hold":0},"lowhp":{"fight":0,"disengage":0},"actions":0,"secondOrder":0}');
let baseline=JSON.parse(localStorage.getItem('ax8Baseline')||'null');
let recent=JSON.parse(localStorage.getItem('ax8Recent')||'[]');

const keys={forward:false,back:false,left:false,right:false};
let yaw=0,moveSpeed=9.5,last=performance.now(),aiCooldown=0,zoneTimer=0;

function save(){localStorage.setItem('ax8Profile',JSON.stringify(profile));localStorage.setItem('ax8Baseline',JSON.stringify(baseline));localStorage.setItem('ax8Recent',JSON.stringify(recent))}
function dom(o){return Object.entries(o).sort((a,b)=>b[1]-a[1])[0][0]}
function snapshot(){return{weapon:dom(profile.weapon),rotation:dom(profile.rotation),aggression:dom(profile.aggression),landing:dom(profile.landing)}}
function addRecent(t){recent.push(t);if(recent.length>12)recent.shift()}
function wclass(w){return w==='Sniper'?'long':w==='SMG'?'close':'mid'}
function record(t){
 profile.actions++;addRecent(t);
 if(t.startsWith('landing:'))profile.landing[t.split(':')[1]]++;
 if(t.startsWith('weapon:'))profile.weapon[t.split(':')[1]]++;
 if(t.startsWith('rotation:'))profile.rotation[t.split(':')[1]]++;
 if(t==='push')profile.aggression.push++;
 if(t==='hold')profile.aggression.hold++;
 if(t==='lowhp:fight')profile.lowhp.fight++;
 if(t==='lowhp:disengage')profile.lowhp.disengage++;
 if(!baseline&&profile.actions>=10){baseline=snapshot();msg('⚠ Rival has built a player-specific counter model.')}
 if(baseline&&!profile.secondOrder){
   const cur=snapshot(), ag=recent.filter(x=>x==='push'||x==='hold');
   const changed=(recent.filter(x=>x==='weapon:'+cur.weapon).length>=3&&cur.weapon!==baseline.weapon)||
                 (recent.filter(x=>x==='rotation:'+cur.rotation).length>=2&&cur.rotation!==baseline.rotation)||
                 (ag.length>=4&&cur.aggression!==baseline.aggression);
   if(changed){profile.secondOrder=1;msg('⚠ SECOND-ORDER SHIFT: rival detected your strategy change.')}
 }
 save();updateBrain()
}
function msg(t){$('message').textContent=t}
function updateHUD(){
 $('hp').textContent=Math.max(0,Math.round(s.hp));$('armor').textContent=Math.max(0,Math.round(s.armor));$('weapon').textContent=s.weapon;$('zone').textContent=Math.round(s.zone)+'%';$('phase').textContent=s.phase;
 if(!baseline){$('aiStatus').innerHTML='Rival status: <strong>building your contextual player model</strong>'}
 else if(profile.secondOrder){$('aiStatus').innerHTML='<strong>SECOND-ORDER AI ACTIVE</strong> · strategy shift detected'}
 else{$('aiStatus').innerHTML=`Rival learned: <strong>${baseline.weapon.toUpperCase()} / ${baseline.rotation.toUpperCase()} / ${baseline.aggression.toUpperCase()}</strong>`}
}
function updateBrain(){
 const snap=snapshot();
 $('brainRows').innerHTML=[
  ['Landing',snap.landing],['Weapon range',snap.weapon],['Rotation',snap.rotation],['Aggression',snap.aggression],['Observations',profile.actions]
 ].map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('');
 if(!baseline){$('brainTitle').textContent='Building your player model';$('brainText').textContent=`${profile.actions}/10 meaningful observations collected.`;$('counterText').textContent='No player-specific counter active yet.'}
 else if(profile.secondOrder){$('brainTitle').textContent='Second-order adaptation active';$('brainText').textContent=`Original model: ${baseline.weapon} range, ${baseline.rotation} rotate, ${baseline.aggression}. Recent behavior changed.`;$('counterText').textContent='The rival is revising its original counter instead of blindly repeating it.'}
 else{$('brainTitle').textContent='Player-specific counter active';$('brainText').textContent=`Baseline: ${baseline.weapon} range, ${baseline.rotation} rotate, ${baseline.aggression}.`;$('counterText').textContent=counterText()}
}
function counterText(){
 if(!baseline)return'';
 const x=[];
 if(baseline.weapon==='long')x.push('close distance and use cover against your long-range preference');
 if(baseline.weapon==='close')x.push('kite backward and force longer engagements');
 if(baseline.weapon==='mid')x.push('break line-of-sight and vary approach angle');
 if(baseline.rotation==='late')x.push('hold zone edge to intercept your late rotation');
 if(baseline.rotation==='early')x.push('contest central cover before you settle');
 if(baseline.aggression==='push')x.push('punish overextension');
 if(baseline.aggression==='hold')x.push('flank your static position');
 return 'Counter plan: '+x.join('; ')+'.'
}
function applyDamage(isPlayer,raw){
 const ak=isPlayer?'armor':'aArmor',hk=isPlayer?'hp':'aHp';const absorb=Math.min(s[ak],raw*.45);s[ak]-=absorb;s[hk]-=(raw-absorb);if(s[hk]<=0)end(!isPlayer)
}
function end(win){
 if(s.ended)return;s.ended=true;$('end').style.display='grid';$('endTitle').textContent=win?'🏆 CHICKEN DINNER':'☠ ELIMINATED';
 $('endText').textContent=profile.secondOrder?'The rival had already detected that you changed strategy after its first counter.':'Your battle-royale decisions were added to the persistent player model.'
}
function resetMatch(){
 s={match:s.match+1,hp:100,armor:0,aHp:100,aArmor:25,weapon:'Pistol',ammo:12,meds:1,smokes:0,zone:100,phase:'DROP',landed:false,ended:false,smoked:false,turn:0};
 $('end').style.display='none';$('drop').style.display='grid';player.position.set(-28,0,-16);rival.position.set(30,0,25);lootMeshes.forEach(m=>{m.visible=true;m.userData.taken=false});zoneRing.scale.set(1,1,1);updateHUD();msg('Choose your landing point.')
}
function rotateZone(){
 if(s.zone<=42)return;s.zone-=8;const scale=s.zone/100;zoneRing.scale.set(scale,scale,scale);s.phase=s.zone>76?'LOOT':s.zone>52?'ROTATE':'FIGHT';
 const dist=Math.hypot(player.position.x,player.position.z);record('rotation:'+(s.zone>68?'early':'late'));
 if(dist>39*scale){s.hp-=7;msg('Blue zone damage! Rotate toward the center.')}
}
function shoot(){
 if(!s.landed||s.ended||s.ammo<=0)return;s.ammo--;record('weapon:'+wclass(s.weapon));record('push');if(s.hp<45)record('lowhp:fight');
 const dist=player.position.distanceTo(rival.position),w=W[s.weapon];let chance=w.acc;if(dist>w.range)chance*=.25;if(s.smoked)chance*=.75;
 if(Math.random()<chance){applyDamage(false,w.dmg+Math.random()*6);msg(`${s.weapon} hit the rival at ${Math.round(dist)}m.`)}else msg(`${s.weapon} shot missed.`);
 updateHUD()
}
function loot(){
 if(!s.landed||s.ended)return;
 let near=lootMeshes.filter(m=>m.visible).sort((a,b)=>player.position.distanceTo(a.position)-player.position.distanceTo(b.position))[0];
 if(!near||player.position.distanceTo(near.position)>6){msg('Move closer to a loot crate.');return}
 near.visible=false;const t=near.userData.loot;
 if(W[t]){s.weapon=t;s.ammo=W[t].ammo;record('weapon:'+wclass(t))}
 else if(t==='Armor')s.armor=Math.min(75,s.armor+50);
 else if(t==='Med')s.meds++;
 else if(t==='Smoke')s.smokes++;
 msg('Looted '+t+'.');updateHUD()
}
function heal(){
 if(s.meds<=0||s.hp>94){msg(s.meds?'Health is already high.':'No medkits.');return}
 s.meds--;s.hp=Math.min(100,s.hp+38);record('hold');if(s.hp<55)record('lowhp:disengage');msg('Medkit used.');updateHUD()
}
function smoke(){
 if(s.smokes<=0){msg('No smoke grenades.');return}s.smokes--;s.smoked=true;record('hold');msg('Smoke deployed — rival accuracy reduced briefly.');
 setTimeout(()=>s.smoked=false,3500);updateHUD()
}
function aiThink(dt){
 if(!s.landed||s.ended)return;aiCooldown-=dt;if(aiCooldown>0)return;aiCooldown=1.05;
 const dist=rival.position.distanceTo(player.position);
 let target=player.position.clone();
 if(baseline){
   if(baseline.weapon==='close'&&dist<24){const away=rival.position.clone().sub(player.position).normalize();target=rival.position.clone().add(away.multiplyScalar(8))}
   else if(baseline.weapon==='long'){target=player.position.clone()}
   else if(baseline.aggression==='hold'){target=player.position.clone().add(new THREE.Vector3(8,0,5))}
 }
 const dir=target.clone().sub(rival.position);dir.y=0;if(dir.length()>3){dir.normalize();rival.position.addScaledVector(dir,baseline?.weapon==='long'?3.5:2.8)}
 const nd=rival.position.distanceTo(player.position);
 if(nd<38){
   let hit=.45;if(s.smoked)hit-=.25;if(baseline?.aggression==='push')hit+=.08;
   if(Math.random()<hit){applyDamage(true,15+Math.random()*7);msg(baseline?'Rival hit using a player-specific counter.':'Rival hit you.')}
 }
}
function cameraFollow(){
 const back=new THREE.Vector3(Math.sin(yaw)*-10,6,Math.cos(yaw)*10);
 const desired=player.position.clone().add(back);camera.position.lerp(desired,.12);
 const look=player.position.clone().add(new THREE.Vector3(0,2.2,0));camera.lookAt(look)
}
function movePlayer(dt){
 if(!s.landed||s.ended)return;
 let turn=0;if(keys.left)turn+=1;if(keys.right)turn-=1;yaw+=turn*dt*2.4;
 let f=0;if(keys.forward)f+=1;if(keys.back)f-=1;
 if(f!==0){
   const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(f*moveSpeed*dt);
   const before=player.position.distanceTo(rival.position);player.position.add(dir);player.position.x=Math.max(-48,Math.min(48,player.position.x));player.position.z=Math.max(-48,Math.min(48,player.position.z));
   const after=player.position.distanceTo(rival.position);if(Math.random()<.08)record(after<before?'push':'hold')
 }
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

document.querySelectorAll('[data-key]').forEach(b=>{
 const k=b.dataset.key;const on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)
});
document.querySelectorAll('[data-land]').forEach(b=>b.onclick=()=>{
 const l=LAND[b.dataset.land];player.position.set(...l.p);const opts=Object.values(LAND).filter(x=>x!==l);const r=opts[Math.floor(Math.random()*opts.length)];rival.position.set(r.p[0],0,r.p[2]);
 record('landing:'+l.tag);s.landed=true;s.phase='LOOT';$('drop').style.display='none';msg('Landed. Move toward loot, gear up, then survive the zone.');updateHUD()
});
$('fire').onclick=shoot;$('loot').onclick=loot;$('heal').onclick=heal;$('smoke').onclick=smoke;
$('brainBtn').onclick=()=>{$('brain').style.display='grid';updateBrain()};$('closeBrain').onclick=()=>$('brain').style.display='none';$('next').onclick=resetMatch;

function animate(now){
 const dt=Math.min(.04,(now-last)/1000);last=now;movePlayer(dt);aiThink(dt);cameraFollow();zoneTimer+=dt;if(zoneTimer>9&&s.landed&&!s.ended){zoneTimer=0;rotateZone();updateHUD()}
 renderer.render(scene,camera);requestAnimationFrame(animate)
}
camera.position.set(-8,8,12);updateHUD();updateBrain();requestAnimationFrame(animate);
