import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
window.__ADAPTX_BOOTED__=true;
const bootBox=document.getElementById('bootError');
if(bootBox) bootBox.style.display='none';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;

const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xa8c6d5);
scene.fog=new THREE.FogExp2(0xa8c6d5,.0065);

const camera=new THREE.PerspectiveCamera(63,innerWidth/innerHeight,.1,400);

scene.add(new THREE.HemisphereLight(0xdfeeff,0x3a4d2b,2.25));
const sun=new THREE.DirectionalLight(0xfff1d2,3.5);sun.position.set(-35,70,-25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;scene.add(sun);

const terrainGeo=new THREE.PlaneGeometry(180,180,64,64);
const pos=terrainGeo.attributes.position;
for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i);
  const h=Math.sin(x*.055)*1.4+Math.cos(y*.047)*1.1+Math.sin((x+y)*.025)*.8;
  pos.setZ(i,h);
}
terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({color:0x557b4e,roughness:1}));
terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;scene.add(terrain);

const obstacles=[];
function building(x,z,w,d,h,color=0x817260){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.95}));
 body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1,.55,d+1),new THREE.MeshStandardMaterial({color:0x41494b}));
 roof.position.y=h+.3;roof.castShadow=true;g.add(roof);
 for(const side of [-1,1]){
   const win=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2,w*.18),1.5),new THREE.MeshStandardMaterial({color:0x8bc0d4,emissive:0x23444f,emissiveIntensity:.5}));
   win.position.set(side*w*.27,h*.55,d/2+.011);g.add(win)
 }
 g.position.set(x,0,z);scene.add(g);
 obstacles.push({x,z,hw:w/2+.8,hd:d/2+.8});
 return g
}
[
 [-32,-27,16,11,8],[-12,-31,13,9,7],[12,-28,18,12,9],[35,-22,14,10,8],
 [-38,2,17,13,9],[-13,2,12,10,7],[15,4,16,12,8],[39,5,18,11,8],
 [-29,30,14,10,7],[-4,31,18,12,9],[23,30,13,10,7],[42,31,15,12,8]
].forEach(v=>building(...v));

function tree(x,z,s=1){
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.45*s,.75*s,4.5*s,8),new THREE.MeshStandardMaterial({color:0x67472e}));
 trunk.position.set(x,2.2*s,z);trunk.castShadow=true;scene.add(trunk);
 const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(3.2*s,1),new THREE.MeshStandardMaterial({color:0x2d6335,roughness:1}));
 crown.position.set(x,6*s,z);crown.castShadow=true;scene.add(crown);
 obstacles.push({x,z,hw:1.5*s,hd:1.5*s});
}
[[-50,-35],[-48,-15],[-50,20],[-42,43],[-20,48],[3,49],[25,48],[51,43],[52,18],[50,-4],[50,-38],[28,-47],[2,-51],[-23,-50],[-19,17],[5,18],[32,18]].forEach((v,i)=>tree(v[0],v[1],.85+(i%3)*.12));

const roadMat=new THREE.MeshStandardMaterial({color:0x77736b,roughness:1});
const road=new THREE.Mesh(new THREE.PlaneGeometry(170,9),roadMat);road.rotation.x=-Math.PI/2;road.rotation.z=.28;road.position.y=.08;scene.add(road);
const river=new THREE.Mesh(new THREE.PlaneGeometry(170,12),new THREE.MeshPhysicalMaterial({color:0x478ba4,roughness:.3,transparent:true,opacity:.78}));
river.rotation.x=-Math.PI/2;river.rotation.z=-.18;river.position.y=.1;scene.add(river);

const zoneRing=new THREE.Mesh(new THREE.RingGeometry(54,54.8,128),new THREE.MeshBasicMaterial({color:0x1ce69b,side:THREE.DoubleSide,transparent:true,opacity:.95}));
zoneRing.rotation.x=-Math.PI/2;zoneRing.position.y=.18;scene.add(zoneRing);
const blueWall=new THREE.Mesh(new THREE.CylinderGeometry(54,54,9,96,1,true),new THREE.MeshBasicMaterial({color:0x2456ff,transparent:true,opacity:.08,side:THREE.DoubleSide}));
blueWall.position.y=4.5;scene.add(blueWall);

const fallbackActor=(color)=>{
 const g=new THREE.Group();
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,6,10),new THREE.MeshStandardMaterial({color}));
 torso.position.y=1.55;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),new THREE.MeshStandardMaterial({color:0xd8ae8d}));head.position.y=2.85;g.add(head);
 const gun=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,1.6),new THREE.MeshStandardMaterial({color:0x252525}));gun.position.set(.48,1.7,-.7);g.add(gun);
 return g
};

let soldierTemplate=null,soldierClips=[];
const loader=new GLTFLoader();
loader.load('https://threejs.org/examples/models/gltf/Soldier.glb',gltf=>{
 soldierTemplate=gltf.scene;soldierClips=gltf.animations;
 soldierTemplate.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 replaceActor(playerActor,0x4b64d1,true);enemyActors.forEach((a,i)=>replaceActor(a,i===0?0xa12d3f:0x555555,false));
},()=>{},(err)=>{
 console.warn('Soldier model failed to load; procedural survivor fallback remains active.',err);
});

function makeActor(color){const root=new THREE.Group();const vis=fallbackActor(color);root.add(vis);root.userData.visual=vis;root.userData.mixer=null;root.userData.action=null;scene.add(root);return root}
function replaceActor(root,color,isPlayer){
 if(!soldierTemplate)return;
 root.clear();
 const m=SkeletonUtils.clone(soldierTemplate);m.scale.setScalar(1.05);m.rotation.y=Math.PI;
 m.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();if(color){o.material.color?.multiply(new THREE.Color(color))}}});
 root.add(m);root.userData.visual=m;
 const mixer=new THREE.AnimationMixer(m);root.userData.mixer=mixer;
 const run=soldierClips.find(c=>/run/i.test(c.name))||soldierClips[1]||soldierClips[0];
 if(run){root.userData.action=mixer.clipAction(run);root.userData.action.play();root.userData.action.paused=true}
}

const playerActor=makeActor(0x576fe8);
const rivalActor=makeActor(0xd64758);
const enemyActors=[rivalActor,makeActor(0x6c6f73),makeActor(0x676d64),makeActor(0x606b72)];
const enemyData=enemyActors.map((actor,i)=>({actor,hp:i===0?120:75,armor:i===0?35:15,alive:true,rival:i===0,cooldown:1+Math.random(),wander:new THREE.Vector3()}));

const LOOT_TYPES={
 AR:{color:0xb88935,label:'AR',weapon:true,mag:30,reserve:90,damage:22,range:52,acc:.72},
 SMG:{color:0x9d7c42,label:'SMG',weapon:true,mag:32,reserve:96,damage:17,range:31,acc:.78},
 SNIPER:{color:0xd0b15c,label:'DMR',weapon:true,mag:10,reserve:40,damage:44,range:88,acc:.70},
 ARMOR:{color:0x6c91a8,label:'VEST'}, MED:{color:0xe9ecef,label:'MED'}, SMOKE:{color:0xb7bcc0,label:'SMOKE'}
};
const loot=[];
function addLoot(type,x,z){
 const def=LOOT_TYPES[type];const g=new THREE.Group();
 const crate=new THREE.Mesh(new THREE.BoxGeometry(1.3,.55,1.1),new THREE.MeshStandardMaterial({color:def.color,emissive:def.color,emissiveIntensity:.13}));
 crate.position.y=.38;crate.castShadow=true;g.add(crate);
 g.position.set(x,0,z);g.userData.type=type;g.userData.taken=false;scene.add(g);loot.push(g)
}
[
 ['AR',-27,-23],['ARMOR',-34,-30],['SMG',13,-24],['MED',8,-31],['SNIPER',38,-18],
 ['SMOKE',34,-25],['AR',-10,5],['ARMOR',17,8],['MED',-28,32],['SMG',-2,28],['SNIPER',25,34],['SMOKE',40,29]
].forEach(v=>addLoot(...v));

const LAND={town:new THREE.Vector3(-20,0,-38),ridge:new THREE.Vector3(36,0,-36),farm:new THREE.Vector3(-25,0,39),harbor:new THREE.Vector3(38,0,38)};

let s={
 match:1,hp:100,armor:0,weapon:'PISTOL',mag:12,reserve:36,damage:12,range:30,acc:.57,
 meds:1,smokes:0,zone:100,zoneRadius:54,landed:false,ended:false,ads:false,crouched:false,
 alive:12,zoneElapsed:0,matchElapsed:0,lastShotDistance:0,reloading:false
};

let profile=JSON.parse(localStorage.getItem('ax9Profile')||JSON.stringify({
 landing:{hot:0,safe:0,high:0,medium:0},range:{close:0,mid:0,long:0},rotation:{early:0,late:0},
 aggression:{push:0,hold:0},ads:{yes:0,no:0},heal:{early:0,late:0},crouch:{yes:0,no:0},
 observations:0,secondOrder:0
}));
let baseline=JSON.parse(localStorage.getItem('ax9Baseline')||'null');
let recent=JSON.parse(localStorage.getItem('ax9Recent')||'[]');

function saveAI(){localStorage.setItem('ax9Profile',JSON.stringify(profile));localStorage.setItem('ax9Baseline',JSON.stringify(baseline));localStorage.setItem('ax9Recent',JSON.stringify(recent))}
function dominant(o){return Object.entries(o).sort((a,b)=>b[1]-a[1])[0][0]}
function snap(){return{range:dominant(profile.range),rotation:dominant(profile.rotation),aggression:dominant(profile.aggression),ads:dominant(profile.ads)}}
function recentPush(t){recent.push(t);if(recent.length>18)recent.shift()}
function record(t){
 profile.observations++;recentPush(t);
 if(t.startsWith('land:'))profile.landing[t.split(':')[1]]++;
 if(t.startsWith('range:'))profile.range[t.split(':')[1]]++;
 if(t.startsWith('rotation:'))profile.rotation[t.split(':')[1]]++;
 if(t==='push'||t==='hold')profile.aggression[t]++;
 if(t==='ads:yes')profile.ads.yes++;if(t==='ads:no')profile.ads.no++;
 if(t==='heal:early')profile.heal.early++;if(t==='heal:late')profile.heal.late++;
 if(t==='crouch:yes')profile.crouch.yes++;if(t==='crouch:no')profile.crouch.no++;
 if(!baseline&&profile.observations>=16){baseline=snap();toast('Rival built a counter-model from your play.')}
 if(baseline&&!profile.secondOrder){
   const cur=snap();let changed=0;
   if(cur.range!==baseline.range&&recent.filter(x=>x==='range:'+cur.range).length>=4)changed++;
   if(cur.rotation!==baseline.rotation&&recent.filter(x=>x==='rotation:'+cur.rotation).length>=2)changed++;
   const ag=recent.filter(x=>x==='push'||x==='hold');if(cur.aggression!==baseline.aggression&&ag.length>=5)changed++;
   if(changed>=1){profile.secondOrder=1;toast('SECOND-ORDER SHIFT: rival detected your strategy change.')}
 }
 saveAI();updateAIUI()
}
function updateAIUI(){
 if(!baseline){$('aiBanner').innerHTML='Rival AI: <strong>observing your battle behavior</strong>'}
 else if(profile.secondOrder){$('aiBanner').innerHTML='<strong>SECOND-ORDER AI ACTIVE</strong> · your recent strategy changed'}
 else{$('aiBanner').innerHTML=`Rival learned: <strong>${baseline.range.toUpperCase()} RANGE · ${baseline.rotation.toUpperCase()} ROTATE · ${baseline.aggression.toUpperCase()}</strong>`}
 const cur=snap();
 $('brainRows').innerHTML=[
  ['Combat range',cur.range],['Rotation timing',cur.rotation],['Aggression',cur.aggression],['ADS use',cur.ads],
  ['Observations',profile.observations]
 ].map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('');
 const hy=[];
 const rt=profile.range.close+profile.range.mid+profile.range.long;if(rt>=4){let k=dominant(profile.range);hy.push(`${k}-range preference · ${Math.round(profile.range[k]/rt*100)}%`)}
 const rr=profile.rotation.early+profile.rotation.late;if(rr>=2){let k=dominant(profile.rotation);hy.push(`${k} zone rotation · ${Math.round(profile.rotation[k]/rr*100)}%`)}
 $('hypotheses').innerHTML=hy.map(h=>`<div class="hypo"><b>${h}</b><span>Contextual evidence accumulated across matches</span></div>`).join('');
 if(!baseline){$('brainTitle').textContent='Building player model';$('brainText').textContent=`${profile.observations}/16 meaningful observations before the first counter model.`;$('counterText').textContent='No player-specific counter yet.'}
 else if(profile.secondOrder){$('brainTitle').textContent='Second-order adaptation active';$('brainText').textContent=`Original baseline: ${baseline.range} range / ${baseline.rotation} rotate / ${baseline.aggression}. Recent behavior diverged.`;$('counterText').textContent='The Rival is revising its old counter rather than blindly repeating it.'}
 else{$('brainTitle').textContent='Player-specific counter active';$('brainText').textContent=`Baseline: ${baseline.range} range / ${baseline.rotation} rotate / ${baseline.aggression}.`;$('counterText').textContent=counterPlan()}
}
function counterPlan(){
 if(!baseline)return '';
 const a=[];
 if(baseline.range==='close')a.push('kite backward and force a longer duel');
 if(baseline.range==='long')a.push('use buildings to close distance');
 if(baseline.range==='mid')a.push('break sightlines and change angle');
 if(baseline.rotation==='late')a.push('move to zone edge early and intercept');
 if(baseline.rotation==='early')a.push('contest central cover before you settle');
 if(baseline.aggression==='push')a.push('punish overextension');
 if(baseline.aggression==='hold')a.push('flank static cover');
 return 'Current Rival counter: '+a.join('; ')+'.'
}

let yaw=0,pitch=-.18,joyX=0,joyY=0,lookId=null,lookLast={x:0,y:0};
function collides(x,z){
 return obstacles.some(o=>Math.abs(x-o.x)<o.hw&&Math.abs(z-o.z)<o.hd)
}
function movePlayer(dt){
 if(!s.landed||s.ended)return;
 const speed=(s.crouched?4.2:7.8);
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const wish=forward.multiplyScalar(-joyY).add(right.multiplyScalar(joyX));
 if(wish.lengthSq()>.02){
   wish.normalize().multiplyScalar(speed*dt);
   const nx=clamp(playerActor.position.x+wish.x,-63,63),nz=clamp(playerActor.position.z+wish.z,-63,63);
   if(!collides(nx,nz)){playerActor.position.x=nx;playerActor.position.z=nz}
   playerActor.rotation.y=yaw;
   if(playerActor.userData.action)playerActor.userData.action.paused=false;
   if(Math.random()<.012)record(distanceToNearestEnemy()<18?'push':'hold');
 } else if(playerActor.userData.action)playerActor.userData.action.paused=true;
}
function shoulderCamera(){
 const shoulder=s.ads?.58:1.35,dist=s.ads?4.1:7.2,height=s.crouched?2.6:3.5;
 const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const target=playerActor.position.clone().add(new THREE.Vector3(0,s.crouched?1.5:1.95,0)).add(fwd.clone().multiplyScalar(5));
 target.y+=Math.sin(pitch)*3.3;
 const desired=playerActor.position.clone().add(new THREE.Vector3(0,height,0)).add(fwd.clone().multiplyScalar(-dist)).add(right.multiplyScalar(shoulder));
 camera.position.lerp(desired,.22);camera.lookAt(target);camera.fov=lerp(camera.fov,s.ads?43:63,.18);camera.updateProjectionMatrix()
}
function distanceToNearestEnemy(){
 let d=999;enemyData.forEach(e=>{if(e.alive)d=Math.min(d,e.actor.position.distanceTo(playerActor.position))});return d
}
function nearestEnemy(){
 return enemyData.filter(e=>e.alive).sort((a,b)=>a.actor.position.distanceTo(playerActor.position)-b.actor.position.distanceTo(playerActor.position))[0]
}
function rayShoot(){
 if(!s.landed||s.ended||s.reloading)return;
 if(s.mag<=0){reload();return}
 s.mag--;const e=nearestEnemy();if(!e){hud();return}
 const dist=e.actor.position.distanceTo(playerActor.position);s.lastShotDistance=dist;
 record('range:'+(dist<18?'close':dist>38?'long':'mid'));record(s.ads?'ads:yes':'ads:no');
 const base=s.acc+(s.ads?.15:0)-(s.crouched?-.07:0);let chance=base;if(dist>s.range)chance*=.28;
 if(Math.random()<chance){
   let dmg=s.damage*(.88+Math.random()*.25);let absorb=Math.min(e.armor,dmg*.42);e.armor-=absorb;e.hp-=dmg-absorb;hitmarker();msg(`Hit ${e.rival?'Rival':'enemy'} for ${Math.round(dmg-absorb)}.`);
   if(e.hp<=0){e.alive=false;e.actor.visible=false;s.alive--;msg(e.rival?'Adaptive Rival eliminated.':'Enemy eliminated.');if(s.alive<=8&&!enemyData.some(x=>x.rival&&x.alive)){}}
 }else msg('Miss.');
 hud()
}
function reload(){
 if(s.reloading||s.reserve<=0||s.mag>=currentWeapon().mag)return;
 s.reloading=true;msg('Reloading…');setTimeout(()=>{const need=currentWeapon().mag-s.mag,take=Math.min(need,s.reserve);s.mag+=take;s.reserve-=take;s.reloading=false;hud();msg('Reloaded.')},900)
}
function currentWeapon(){
 if(s.weapon==='AR')return LOOT_TYPES.AR;if(s.weapon==='SMG')return LOOT_TYPES.SMG;if(s.weapon==='DMR')return LOOT_TYPES.SNIPER;
 return {mag:12}
}
function lootNearby(){
 if(!s.landed||s.ended)return;
 const near=loot.filter(l=>!l.userData.taken).sort((a,b)=>a.position.distanceTo(playerActor.position)-b.position.distanceTo(playerActor.position))[0];
 if(!near||near.position.distanceTo(playerActor.position)>4.8){msg('Move closer to ground loot.');return}
 near.userData.taken=true;near.visible=false;const t=near.userData.type,d=LOOT_TYPES[t];
 if(d.weapon){s.weapon=d.label;s.mag=d.mag;s.reserve=d.reserve;s.damage=d.damage;s.range=d.range;s.acc=d.acc;toast('Picked up '+d.label)}
 else if(t==='ARMOR'){s.armor=Math.min(75,s.armor+50);toast('Level vest equipped')}
 else if(t==='MED'){s.meds++;toast('+1 Medkit')}
 else if(t==='SMOKE'){s.smokes++;toast('+1 Smoke')}
 hud()
}
function heal(){
 if(s.meds<=0){msg('No medkits.');return}if(s.hp>=95){msg('Health already full.');return}
 record(s.hp>50?'heal:early':'heal:late');s.meds--;s.hp=Math.min(100,s.hp+42);msg('Medkit used.');hud()
}
function smoke(){if(s.smokes<=0){msg('No smoke grenade.');return}s.smokes--;record('hold');msg('Smoke deployed. Rival accuracy reduced.');s.smokedUntil=performance.now()+4500;hud()}
function jump(){if(!s.landed||s.crouched)return;playerActor.position.y=.8;setTimeout(()=>playerActor.position.y=0,280)}
function crouch(){s.crouched=!s.crouched;record(s.crouched?'crouch:yes':'crouch:no');$('crouch').textContent=s.crouched?'STAND':'CROUCH'}

function enemyThink(e,dt){
 if(!e.alive||!s.landed||s.ended)return;
 e.cooldown-=dt;const p=playerActor.position,a=e.actor.position,dist=a.distanceTo(p);
 if(e.cooldown<=0){
   e.cooldown=e.rival?.75+Math.random()*.45:1.15+Math.random()*.8;
   let desired=p.clone();
   if(e.rival&&baseline){
     if(baseline.range==='close'&&dist<25){desired=a.clone().add(a.clone().sub(p).normalize().multiplyScalar(10))}
     else if(baseline.range==='long'){desired=p.clone()}
     if(baseline.aggression==='hold')desired=p.clone().add(new THREE.Vector3(7,0,5))
   } else if(!e.rival&&Math.random()<.35)desired=p.clone().add(new THREE.Vector3((Math.random()-.5)*12,0,(Math.random()-.5)*12));
   const dir=desired.sub(a);dir.y=0;if(dir.length()>4){dir.normalize();const nx=a.x+dir.x*(e.rival?2.7:2.1),nz=a.z+dir.z*(e.rival?2.7:2.1);if(!collides(nx,nz)){a.x=nx;a.z=nz}}
   e.actor.lookAt(p.x,a.y,p.z);
   if(dist<(e.rival?48:38)){
     let chance=e.rival?.47:.34;if(performance.now()<(s.smokedUntil||0))chance-=.22;if(e.rival&&baseline?.aggression==='push')chance+=.09;
     if(Math.random()<chance){let raw=e.rival?16+Math.random()*8:10+Math.random()*7;let absorb=Math.min(s.armor,raw*.42);s.armor-=absorb;s.hp-=raw-absorb;msg(e.rival&&baseline?'Rival hit using your learned counter.':'Enemy hit you.');if(s.hp<=0)end(false)}
   }
 }
}
function updateZone(dt){
 if(!s.landed||s.ended)return;s.zoneElapsed+=dt;s.matchElapsed+=dt;
 if(s.zoneElapsed>13&&s.zoneRadius>19){s.zoneElapsed=0;s.zoneRadius-=7;s.zone=Math.round(s.zoneRadius/54*100);const sc=s.zoneRadius/54;zoneRing.scale.set(sc,sc,sc);blueWall.scale.set(sc,1,sc);record('rotation:'+(s.matchElapsed<40?'early':'late'))}
 const dist=Math.hypot(playerActor.position.x,playerActor.position.z);
 if(dist>s.zoneRadius&&Math.floor(s.matchElapsed*2)%5===0){s.hp-=.12;if(s.hp<=0)end(false)}
}
function minimap(){
 const px=50+playerActor.position.x/130*100,pz=50+playerActor.position.z/130*100;$('mapPlayer').style.left=px+'%';$('mapPlayer').style.top=pz+'%';
 $('mapPlayer').style.transform=`translate(-50%,-50%) rotate(${-yaw}rad)`;
 $('mapZone').style.width=$('mapZone').style.height=(s.zoneRadius/54*82)+'%';
 const r=enemyData[0];if(r.alive&&r.actor.position.distanceTo(playerActor.position)<23){$('mapRival').style.display='block';$('mapRival').style.left=(50+r.actor.position.x/130*100)+'%';$('mapRival').style.top=(50+r.actor.position.z/130*100)+'%'}else $('mapRival').style.display='none'
}
function hud(){$('hp').textContent=Math.max(0,Math.round(s.hp));$('armor').textContent=Math.max(0,Math.round(s.armor));$('zone').textContent=s.zone+'%';$('weaponName').textContent=s.weapon;$('mag').textContent=s.mag;$('reserve').textContent=s.reserve;$('alive').textContent=s.alive+' ALIVE'}
function msg(t){$('message').textContent=t}
function toast(t){msg(t)}
function hitmarker(){$('hitmarker').classList.remove('hitmarkerOn');void $('hitmarker').offsetWidth;$('hitmarker').classList.add('hitmarkerOn')}
function end(win){if(s.ended)return;s.ended=true;$('endOverlay').style.display='grid';$('endTitle').textContent=win?'🏆 WINNER WINNER':'☠ ELIMINATED';$('endText').textContent=profile.secondOrder?'The Adaptive Rival had already detected a change in your strategy and was counter-adapting.':'Your match decisions were saved into the persistent player model.'}

function spawnMatch(landKey){
 const p=LAND[landKey];playerActor.position.copy(p);
 const tags={town:'hot',ridge:'high',farm:'safe',harbor:'medium'};record('land:'+tags[landKey]);
 const spawns=[new THREE.Vector3(35,0,-12),new THREE.Vector3(-38,0,8),new THREE.Vector3(12,0,39),new THREE.Vector3(-4,0,-8)];
 enemyData.forEach((e,i)=>{e.actor.visible=true;e.hp=e.rival?120:75;e.armor=e.rival?35:15;e.alive=true;e.actor.position.copy(spawns[i]);e.cooldown=.7+i*.3});
 s.landed=true;s.ended=false;s.alive=12;$('dropOverlay').classList.add('hidden');msg('Landed. Find a weapon, armor and survive.');hud()
}
function resetMatch(){
 s.match++;s.hp=100;s.armor=0;s.weapon='PISTOL';s.mag=12;s.reserve=36;s.damage=12;s.range=30;s.acc=.57;s.meds=1;s.smokes=0;s.zone=100;s.zoneRadius=54;s.landed=false;s.ended=false;s.ads=false;s.crouched=false;s.alive=12;s.zoneElapsed=0;s.matchElapsed=0;
 loot.forEach(l=>{l.visible=true;l.userData.taken=false});zoneRing.scale.set(1,1,1);blueWall.scale.set(1,1,1);$('endOverlay').style.display='none';$('dropOverlay').classList.remove('hidden');hud()
}

const jb=$('joyBase'),jk=$('joyKnob');let joyId=null;
function joySet(e){
 const r=jb.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,rr=r.width*.34,len=Math.hypot(dx,dy);if(len>rr){dx=dx/len*rr;dy=dy/len*rr}
 joyX=dx/rr;joyY=dy/rr;jk.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`
}
jb.addEventListener('pointerdown',e=>{joyId=e.pointerId;jb.setPointerCapture(e.pointerId);joySet(e)});
jb.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joySet(e)});
function joyEnd(e){if(e.pointerId===joyId){joyId=null;joyX=joyY=0;jk.style.transform='translate(-50%,-50%)'}}
jb.addEventListener('pointerup',joyEnd);jb.addEventListener('pointercancel',joyEnd);

const look=$('lookZone');
look.addEventListener('pointerdown',e=>{lookId=e.pointerId;lookLast={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId)});
look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lookLast.x,dy=e.clientY-lookLast.y;lookLast={x:e.clientX,y:e.clientY};yaw-=dx*.0065;pitch=clamp(pitch-dy*.004,-.7,.28)});
look.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null});
look.addEventListener('pointercancel',e=>{if(e.pointerId===lookId)lookId=null});

$('fire').addEventListener('pointerdown',rayShoot);$('reload').onclick=reload;$('loot').onclick=lootNearby;$('heal').onclick=heal;$('smoke').onclick=smoke;$('jump').onclick=jump;$('crouch').onclick=crouch;
$('ads').onclick=()=>{s.ads=!s.ads;$('ads').style.background=s.ads?'#35536add':'#102033dc';$('crosshair').classList.toggle('ads',s.ads);record(s.ads?'ads:yes':'ads:no')};
document.querySelectorAll('[data-land]').forEach(b=>b.addEventListener('click',()=>{
 msg('Deploying to '+b.textContent.trim().split('\n')[0]+'…');
 spawnMatch(b.dataset.land);
}));
$('brainBtn').onclick=()=>{$('brainOverlay').classList.remove('hidden');updateAIUI()};$('closeBrain').onclick=()=>$('brainOverlay').classList.add('hidden');$('nextMatch').onclick=resetMatch;

let last=performance.now();
function loop(now){
 const dt=Math.min(.035,(now-last)/1000);last=now;
 movePlayer(dt);enemyData.forEach(e=>enemyThink(e,dt));updateZone(dt);shoulderCamera();minimap();
 if(playerActor.userData.mixer)playerActor.userData.mixer.update(dt);enemyActors.forEach(a=>a.userData.mixer?.update(dt));
 renderer.render(scene,camera);hud();requestAnimationFrame(loop)
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();camera.position.set(-20,5,-30);updateAIUI();hud();requestAnimationFrame(loop);
