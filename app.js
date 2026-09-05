import * as THREE from 'three';
import { clamp, pointCollides, safeSpawn, segmentBlocked, resolveCameraT, emptyProfile, dominant, snapshot, recordBehavior, classifyRange, applyDamage, reloadAmmo, shrinkZone } from './core.mjs?v=11';

const $=id=>document.getElementById(id);
window.__ADAPTX_BOOTED__=true;
const bootBox=document.getElementById('bootError');
if(bootBox) bootBox.style.display='none';
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


function rock(x,z,s=1){
 const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1.25*s,0),new THREE.MeshStandardMaterial({color:0x777a72,roughness:1}));
 m.position.set(x,.75*s,z);m.scale.y=.65;m.rotation.y=(x+z)*.13;m.castShadow=true;scene.add(m);
 obstacles.push({x,z,hw:1.1*s,hd:1.1*s});
}
function bush(x,z,s=1){
 const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1*s,1),new THREE.MeshStandardMaterial({color:0x356d39,roughness:1}));
 m.position.set(x,.8*s,z);m.scale.y=.72;scene.add(m);
}
function crate(x,z){
 const m=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.25,1.5),new THREE.MeshStandardMaterial({color:0x6d5237,roughness:.95}));
 m.position.set(x,.63,z);m.castShadow=true;scene.add(m);obstacles.push({x,z,hw:.85,hd:.85});
}
[[-44,-6],[-24,-10],[3,-12],[26,-6],[45,14],[-43,24],[-16,40],[14,42],[34,40]].forEach(v=>rock(v[0],v[1],.8));
[[-46,-24],[-22,-20],[-2,-20],[22,-17],[45,-15],[-42,14],[-20,20],[2,23],[27,21],[46,27],[-17,-43],[18,-44]].forEach(v=>bush(v[0],v[1],1));
[[-22,-34],[-4,-34],[24,-31],[32,-14],[-20,9],[8,13],[31,10],[-35,35],[8,36],[35,35]].forEach(v=>crate(v[0],v[1]));

const roadMat=new THREE.MeshStandardMaterial({color:0x77736b,roughness:1});
const road=new THREE.Mesh(new THREE.PlaneGeometry(170,9),roadMat);road.rotation.x=-Math.PI/2;road.rotation.z=.28;road.position.y=.08;scene.add(road);
const river=new THREE.Mesh(new THREE.PlaneGeometry(170,12),new THREE.MeshPhysicalMaterial({color:0x478ba4,roughness:.3,transparent:true,opacity:.78}));
river.rotation.x=-Math.PI/2;river.rotation.z=-.18;river.position.y=.1;scene.add(river);

const zoneRing=new THREE.Mesh(new THREE.RingGeometry(54,54.8,128),new THREE.MeshBasicMaterial({color:0x1ce69b,side:THREE.DoubleSide,transparent:true,opacity:.95}));
zoneRing.rotation.x=-Math.PI/2;zoneRing.position.y=.18;scene.add(zoneRing);
const blueWall=new THREE.Mesh(new THREE.CylinderGeometry(54,54,9,96,1,true),new THREE.MeshBasicMaterial({color:0x2456ff,transparent:true,opacity:.08,side:THREE.DoubleSide}));
blueWall.position.y=4.5;scene.add(blueWall);

const parachute=new THREE.Group();
const canopy=new THREE.Mesh(new THREE.SphereGeometry(3.3,24,10,0,Math.PI*2,0,Math.PI*.48),new THREE.MeshStandardMaterial({color:0x394d6a,side:THREE.DoubleSide,roughness:.8}));
canopy.scale.y=.45;canopy.position.y=4.4;parachute.add(canopy);
for(const sx of [-1,1])for(const sz of [-1,1]){
 const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx*2.3,4,sz*.8),new THREE.Vector3(sx*.45,.8,sz*.25)]);
 parachute.add(new THREE.Line(geom,new THREE.LineBasicMaterial({color:0xd9dde2,transparent:true,opacity:.75})));
}
parachute.visible=false;scene.add(parachute);
let recoilKick=0;
let audioCtx=null;
function ensureAudio(){try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch{}}
function noiseBurst(duration=.06,gain=.08){if(!audioCtx)return;const len=Math.max(1,Math.floor(audioCtx.sampleRate*duration));const b=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=audioCtx.createBufferSource(),g=audioCtx.createGain();src.buffer=b;g.gain.value=gain;src.connect(g).connect(audioCtx.destination);src.start()}
function shotSound(){ensureAudio();noiseBurst(.075,.13);try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='square';o.frequency.setValueAtTime(110,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(52,audioCtx.currentTime+.08);g.gain.setValueAtTime(.06,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.09);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.1)}catch{}}
function reloadSound(){ensureAudio();try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=520;g.gain.value=.025;o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.055)}catch{}}
function damageFlash(){const el=$('damageFlash');el.classList.remove('damageOn');void el.offsetWidth;el.classList.add('damageOn');navigator.vibrate?.(35)}
function muzzleFlash(){const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const m=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),new THREE.MeshBasicMaterial({color:0xffd36a}));m.position.copy(playerActor.position).add(new THREE.Vector3(0,1.85,0)).add(fwd.multiplyScalar(1.55));scene.add(m);const light=new THREE.PointLight(0xffb84c,2.6,5);light.position.copy(m.position);scene.add(light);setTimeout(()=>{scene.remove(m);scene.remove(light);m.geometry.dispose();m.material.dispose()},55)}
function feed(text){const el=document.createElement('div');el.className='kill';el.textContent=text;$('killFeed').prepend(el);setTimeout(()=>el.remove(),4700)}
function zonePulse(){const el=$('zoneWarn');el.classList.remove('zoneOn');void el.offsetWidth;el.classList.add('zoneOn')}


const fallbackActor=(color)=>{
 const g=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color,roughness:.78});
 const dark=new THREE.MeshStandardMaterial({color:0x252a31,roughness:.72});
 const skin=new THREE.MeshStandardMaterial({color:0xc99b78,roughness:.9});
 const torso=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.45,.62),mat);torso.position.y=1.95;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.34,14,12),skin);head.position.y=2.92;head.castShadow=true;g.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.39,14,8,0,Math.PI*2,0,Math.PI*.58),dark);helmet.position.y=3.02;g.add(helmet);
 const backpack=new THREE.Mesh(new THREE.BoxGeometry(.78,.92,.35),dark);backpack.position.set(0,1.9,.48);g.add(backpack);
 const hip=new THREE.Mesh(new THREE.BoxGeometry(.9,.42,.5),dark);hip.position.y=1.18;g.add(hip);
 const mkLimb=(x,y,h,rot=0)=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(.16,h,4,8),mat);m.position.set(x,y,0);m.rotation.z=rot;m.castShadow=true;g.add(m);return m};
 const la=mkLimb(-.68,2.0,.82,-.16),ra=mkLimb(.68,2.0,.82,.16),ll=mkLimb(-.27,.62,.9,0),rl=mkLimb(.27,.62,.9,0);
 const gun=new THREE.Mesh(new THREE.BoxGeometry(.17,.19,1.75),dark);gun.position.set(.48,1.9,-.68);gun.rotation.x=-.12;g.add(gun);
 g.userData.limbs={la,ra,ll,rl};g.userData.gun=gun;
 return g
};

let soldierTemplate=null,soldierClips=[];
let GLTFLoaderClass=null,SkeletonUtilsNS=null;
async function tryLoadHighDetailSoldier(){
  try{
    const [{GLTFLoader},SkeletonUtils]=await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]);
    GLTFLoaderClass=GLTFLoader;SkeletonUtilsNS=SkeletonUtils;
    const loader=new GLTFLoaderClass();
    loader.load('https://threejs.org/examples/models/gltf/Soldier.glb',gltf=>{
      soldierTemplate=gltf.scene;soldierClips=gltf.animations;
      soldierTemplate.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      replaceActor(playerActor,0x566de8,true);
      enemyActors.forEach((a,i)=>replaceActor(a,i===0?0xa12d3f:0x5e6469,false));
    },()=>{},()=>{});
  }catch(err){console.warn('High-detail survivor unavailable; robust procedural survivor remains active.',err)}
}
function makeActor(color){const root=new THREE.Group();const vis=fallbackActor(color);root.add(vis);root.userData.visual=vis;root.userData.mixer=null;root.userData.action=null;scene.add(root);return root}
function replaceActor(root,color,isPlayer){
 if(!soldierTemplate)return;
 root.clear();
 const m=SkeletonUtilsNS.clone(soldierTemplate);m.scale.setScalar(1.05);m.rotation.y=Math.PI;
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

const rivalBeacon=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.8,8),new THREE.MeshBasicMaterial({color:0xff4b66}));
scene.add(rivalBeacon);

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

const LAND={
 town:new THREE.Vector3(-22,0,-43),
 ridge:new THREE.Vector3(46,0,-35),
 farm:new THREE.Vector3(-36,0,43),
 harbor:new THREE.Vector3(47,0,43)
};

let s={
 match:1,hp:100,armor:0,weapon:'PISTOL',mag:12,reserve:36,damage:12,range:30,acc:.57,
 meds:1,smokes:0,zone:100,zoneRadius:54,landed:false,ended:false,ads:false,crouched:false,
 alive:12,zoneElapsed:0,matchElapsed:0,lastShotDistance:0,reloading:false,zoneDamageTimer:0,graceUntil:0,dropping:false,dropElapsed:0,dropDuration:2.8,dropTarget:null
};

let profile=JSON.parse(localStorage.getItem('ax11Profile')||JSON.stringify(emptyProfile()));
let baseline=JSON.parse(localStorage.getItem('ax11Baseline')||'null');
let recent=JSON.parse(localStorage.getItem('ax11Recent')||'[]');

function saveAI(){localStorage.setItem('ax11Profile',JSON.stringify(profile));localStorage.setItem('ax11Baseline',JSON.stringify(baseline));localStorage.setItem('ax11Recent',JSON.stringify(recent))}
function snap(){return snapshot(profile)}
function record(t){
  const r=recordBehavior(profile,baseline,recent,t);
  profile=r.profile;baseline=r.baseline;recent=r.recent;
  if(r.built) toast('Rival built a counter-model from your play.');
  if(r.shifted) toast('SECOND-ORDER SHIFT: rival detected your strategy change.');
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
async function enterImmersive(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.({navigationUI:'hide'})}catch{}try{await screen.orientation?.lock?.('landscape')}catch{}ensureAudio()}
function finishLanding(landKey){const target=s.dropTarget;playerActor.position.set(target.x,0,target.z);parachute.visible=false;s.dropping=false;s.landed=true;s.ended=false;s.alive=12;s.graceUntil=performance.now()+3500;const tags={town:'hot',ridge:'high',farm:'safe',harbor:'medium'};record('land:'+tags[landKey]);const baseSpawns=[{x:45,z:-10},{x:-48,z:13},{x:13,z:48},{x:-5,z:-10}];enemyData.forEach((e,i)=>{const sp=safeSpawn(baseSpawns[i],obstacles,2);e.actor.visible=true;e.hp=e.rival?120:75;e.armor=e.rival?35:15;e.alive=true;e.actor.position.set(sp.x,0,sp.z);e.cooldown=1.2+i*.35});$('dropStatus').style.display='none';msg('Landed. 3-second safe window — loot, orient and move.');feed('You entered the combat zone');hud()}
function beginDrop(landKey){enterImmersive();const raw=LAND[landKey]||LAND.farm;const safe=safeSpawn({x:raw.x,z:raw.z},obstacles,2);s.dropTarget={x:safe.x,z:safe.z,landKey};s.dropping=true;s.landed=false;s.dropElapsed=0;playerActor.position.set(safe.x+5,22,safe.z+5);parachute.visible=true;parachute.position.copy(playerActor.position);$('dropOverlay').classList.add('hidden');$('dropStatus').style.display='block';msg('Parachuting into '+landKey.toUpperCase()+'…')}
function updateDrop(dt){if(!s.dropping)return;s.dropElapsed+=dt;const p=clamp(s.dropElapsed/s.dropDuration,0,1),ease=1-Math.pow(1-p,2);const t=s.dropTarget;playerActor.position.x=lerp(t.x+5,t.x,ease);playerActor.position.z=lerp(t.z+5,t.z,ease);playerActor.position.y=lerp(22,.2,ease);parachute.position.copy(playerActor.position);parachute.position.y+=.3;playerActor.rotation.y=yaw;if(p>=1)finishLanding(t.landKey)}

function collides(x,z){return pointCollides(x,z,obstacles,.35)}
function movePlayer(dt){
 if(!s.landed||s.ended||s.dropping)return;
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
   const limbs=playerActor.userData.visual?.userData?.limbs;
   if(limbs){const t=performance.now()*.012;limbs.la.rotation.x=Math.sin(t)*.65;limbs.ra.rotation.x=-Math.sin(t)*.65;limbs.ll.rotation.x=-Math.sin(t)*.55;limbs.rl.rotation.x=Math.sin(t)*.55;}
   if(Math.random()<.012)record(distanceToNearestEnemy()<18?'push':'hold');
 } else if(playerActor.userData.action)playerActor.userData.action.paused=true;
}
function setActorOpacity(root,opacity){
 root.traverse(o=>{if(o.isMesh&&o.material){o.material.transparent=opacity<1;o.material.opacity=opacity}})
}
function shoulderCamera(){
 if(s.dropping){const desired=playerActor.position.clone().add(new THREE.Vector3(10,9,13));camera.position.lerp(desired,.16);camera.lookAt(playerActor.position.clone().add(new THREE.Vector3(0,-2,0)));camera.fov=lerp(camera.fov,72,.12);camera.updateProjectionMatrix();setActorOpacity(playerActor,1);return}
 const shoulder=s.ads?.48:1.55,dist=s.ads?3.7:7.8,height=s.crouched?2.45:3.25;
 const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const start=playerActor.position.clone().add(new THREE.Vector3(0,s.crouched?1.6:2.0,0));
 const target=start.clone().add(fwd.clone().multiplyScalar(s.ads?8:5.6));
 target.y+=Math.sin(pitch)*(s.ads?4.1:3.4);
 const raw=start.clone().add(new THREE.Vector3(0,height-start.y,0)).add(fwd.clone().multiplyScalar(-dist)).add(right.multiplyScalar(shoulder));
 const t=resolveCameraT(start.x,start.z,raw.x,raw.z,obstacles);
 const desired=start.clone().lerp(raw,t);
 desired.y=Math.max(1.9, start.y+(raw.y-start.y)*Math.max(.45,t));
 desired.y+=recoilKick;camera.position.lerp(desired,.24);recoilKick*=.72;
 camera.lookAt(target);
 camera.fov=lerp(camera.fov,s.ads?42:64,.2);camera.updateProjectionMatrix();
 setActorOpacity(playerActor,t<.46?.38:1);
}
function distanceToNearestEnemy(){
 let d=999;enemyData.forEach(e=>{if(e.alive)d=Math.min(d,e.actor.position.distanceTo(playerActor.position))});return d
}
function nearestEnemy(){
 return enemyData.filter(e=>e.alive).sort((a,b)=>a.actor.position.distanceTo(playerActor.position)-b.actor.position.distanceTo(playerActor.position))[0]
}
function aimedEnemy(){
 const view=new THREE.Vector3();camera.getWorldDirection(view);
 let best=null,bestScore=999;
 for(const e of enemyData){
   if(!e.alive)continue;
   const dir=e.actor.position.clone().add(new THREE.Vector3(0,1.5,0)).sub(camera.position);
   const dist=dir.length();dir.normalize();
   const angle=view.angleTo(dir);
   if(angle>.26)continue;
   if(segmentBlocked(playerActor.position.x,playerActor.position.z,e.actor.position.x,e.actor.position.z,obstacles,.18))continue;
   const score=angle+dist/300;
   if(score<bestScore){best=e;bestScore=score}
 }
 return best
}
function tracer(to,hit=false){
 const from=playerActor.position.clone().add(new THREE.Vector3(0,1.9,0));
 const pts=[from,to.clone().add(new THREE.Vector3(0,1.35,0))];
 const geom=new THREE.BufferGeometry().setFromPoints(pts);
 const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:hit?0xffe38c:0xe8edf2,transparent:true,opacity:.9}));
 scene.add(line);setTimeout(()=>{scene.remove(line);geom.dispose();line.material.dispose()},90);
}
function rayShoot(){
 if(!s.landed||s.ended||s.reloading)return;
 if(s.mag<=0){reload();return}
 s.mag--;shotSound();muzzleFlash();navigator.vibrate?.(18);recoilKick=Math.min(.45,recoilKick+.16);const e=aimedEnemy();
 pitch=clamp(pitch+.012,-.7,.28);
 if(!e){msg('Shot fired. No target in sights.');hud();return}
 const dist=e.actor.position.distanceTo(playerActor.position);s.lastShotDistance=dist;
 record('range:'+classifyRange(dist));record(s.ads?'ads:yes':'ads:no');
 let chance=s.acc+(s.ads?.15:0)+(s.crouched?.07:0);if(dist>s.range)chance*=.28;
 const hit=Math.random()<chance;tracer(e.actor.position,hit);
 if(hit){
   const raw=s.damage*(.88+Math.random()*.25);const d=applyDamage(e.hp,e.armor,raw);e.hp=d.hp;e.armor=d.armor;hitmarker();msg(`Hit ${e.rival?'Adaptive Rival':'enemy'} for ${Math.round(d.dealt)}.`);
   if(e.hp<=0){e.alive=false;e.actor.visible=false;s.alive--;const txt=e.rival?'Adaptive Rival eliminated':'Enemy eliminated';msg(txt+'.');feed('YOU  ▸  '+txt.toUpperCase())}
 }else msg('Miss.');
 hud()
}
function reload(){
 if(s.reloading||s.reserve<=0||s.mag>=currentWeapon().mag)return;
 s.reloading=true;reloadSound();msg('Reloading…');
 setTimeout(()=>{const r=reloadAmmo(s.mag,s.reserve,currentWeapon().mag);s.mag=r.mag;s.reserve=r.reserve;s.reloading=false;hud();msg('Reloaded.')},900)
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
 if(performance.now()<(s.graceUntil||0))return;
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
   if(dist<(e.rival?48:38) && !segmentBlocked(a.x,a.z,p.x,p.z,obstacles,.2)){
     let chance=e.rival?.47:.34;if(performance.now()<(s.smokedUntil||0))chance-=.22;if(e.rival&&baseline?.aggression==='push')chance+=.09;
     if(Math.random()<chance){
       const raw=e.rival?16+Math.random()*8:10+Math.random()*7;
       const d=applyDamage(s.hp,s.armor,raw);s.hp=d.hp;s.armor=d.armor;
       damageFlash();msg(e.rival&&baseline?'Rival hit using your learned counter.':'Enemy hit you.');
       if(s.hp<=0)end(false)
     }
   }
 }
}
function updateZone(dt){
 if(!s.landed||s.ended)return;
 s.zoneElapsed+=dt;s.matchElapsed+=dt;s.zoneDamageTimer+=dt;
 if(s.zoneElapsed>13&&s.zoneRadius>19){
   s.zoneElapsed=0;s.zoneRadius=shrinkZone(s.zoneRadius,19,7);s.zone=Math.round(s.zoneRadius/54*100);
   const sc=s.zoneRadius/54;zoneRing.scale.set(sc,sc,sc);blueWall.scale.set(sc,1,sc);
   record('rotation:'+(s.matchElapsed<40?'early':'late'));zonePulse();
 }
 const dist=Math.hypot(playerActor.position.x,playerActor.position.z);
 if(dist>s.zoneRadius&&s.zoneDamageTimer>=1){s.zoneDamageTimer=0;s.hp-=2.5;msg('Blue zone damage — rotate toward safety.');if(s.hp<=0)end(false)}
}
function minimap(){
 const near=loot.filter(l=>!l.userData.taken).sort((a,b)=>a.position.distanceTo(playerActor.position)-b.position.distanceTo(playerActor.position))[0];
 if(s.landed&&near&&near.position.distanceTo(playerActor.position)<6){$('nearby').style.display='block';$('nearby').textContent='NEARBY · '+LOOT_TYPES[near.userData.type].label+' · tap LOOT'}else $('nearby').style.display='none';
 const px=50+playerActor.position.x/130*100,pz=50+playerActor.position.z/130*100;$('mapPlayer').style.left=px+'%';$('mapPlayer').style.top=pz+'%';
 $('mapPlayer').style.transform=`translate(-50%,-50%) rotate(${-yaw}rad)`;
 $('mapZone').style.width=$('mapZone').style.height=(s.zoneRadius/54*82)+'%';
 const r=enemyData[0];if(r.alive&&r.actor.position.distanceTo(playerActor.position)<23){$('mapRival').style.display='block';$('mapRival').style.left=(50+r.actor.position.x/130*100)+'%';$('mapRival').style.top=(50+r.actor.position.z/130*100)+'%'}else $('mapRival').style.display='none'
}
function updateCompass(){let deg=((yaw*180/Math.PI)%360+360)%360;const dirs=['N','NE','E','SE','S','SW','W','NW'];const dir=dirs[Math.round(deg/45)%8];$('heading').textContent=dir+' '+String(Math.round(deg)).padStart(3,'0')+'°'}
function hud(){$('hp').textContent=Math.max(0,Math.round(s.hp));$('armor').textContent=Math.max(0,Math.round(s.armor));$('zone').textContent=s.zone+'%';$('weaponName').textContent=s.weapon;$('mag').textContent=s.mag;$('reserve').textContent=s.reserve;$('alive').textContent=s.alive+' ALIVE';updateCompass()}
function msg(t){$('message').textContent=t}
function toast(t){msg(t)}
function hitmarker(){$('hitmarker').classList.remove('hitmarkerOn');void $('hitmarker').offsetWidth;$('hitmarker').classList.add('hitmarkerOn')}
function end(win){if(s.ended)return;s.ended=true;$('endOverlay').style.display='grid';$('endTitle').textContent=win?'🏆 WINNER WINNER':'☠ ELIMINATED';$('endText').textContent=profile.secondOrder?'The Adaptive Rival had already detected a change in your strategy and was counter-adapting.':'Your match decisions were saved into the persistent player model.'}

function spawnMatch(landKey){beginDrop(landKey)}
function resetMatch(){
 s.match++;s.hp=100;s.armor=0;s.weapon='PISTOL';s.mag=12;s.reserve=36;s.damage=12;s.range=30;s.acc=.57;s.meds=1;s.smokes=0;s.zone=100;s.zoneRadius=54;s.landed=false;s.ended=false;s.ads=false;s.crouched=false;s.alive=12;s.zoneElapsed=0;s.matchElapsed=0;s.zoneDamageTimer=0;s.graceUntil=0;s.dropping=false;s.dropElapsed=0;s.dropTarget=null;parachute.visible=false;
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



window.ADAPT_X_GAME={
 startMatch:spawnMatch,
 fire:rayShoot,
 reload,
 loot:lootNearby,
 heal,
 smoke,
 jump,
 crouch,
 toggleADS:()=>{s.ads=!s.ads;$('ads').style.background=s.ads?'#35536add':'#102033dc';$('crosshair').classList.toggle('ads',s.ads);record(s.ads?'ads:yes':'ads:no');return s.ads},
 openBrain:()=>{$('brainOverlay').classList.remove('hidden');updateAIUI()},
 closeBrain:()=>$('brainOverlay').classList.add('hidden'),
 nextMatch:resetMatch,
 __qa:()=>({booted:window.__ADAPTX_BOOTED__,landed:s.landed,dropping:s.dropping,hp:s.hp,armor:s.armor,zone:s.zone,profile:structuredClone(profile),baseline:baseline?{...baseline}:null})
};
window.dispatchEvent(new Event('adaptx-ready'));
tryLoadHighDetailSoldier();

let last=performance.now();
function loop(now){
 const dt=Math.min(.035,(now-last)/1000);last=now;
 updateDrop(dt);movePlayer(dt);enemyData.forEach(e=>enemyThink(e,dt));updateZone(dt);shoulderCamera();minimap();
 const r=enemyData[0];if(r?.alive){rivalBeacon.visible=true;rivalBeacon.position.set(r.actor.position.x,4.2,r.actor.position.z)}else rivalBeacon.visible=false;
 if(playerActor.userData.mixer)playerActor.userData.mixer.update(dt);enemyActors.forEach(a=>a.userData.mixer?.update(dt));
 renderer.render(scene,camera);hud();requestAnimationFrame(loop)
}
function resize(){
 const w=Math.max(1,window.visualViewport?.width||document.documentElement.clientWidth||innerWidth);
 const h=Math.max(1,window.visualViewport?.height||document.documentElement.clientHeight||innerHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 canvas.style.width=w+'px';canvas.style.height=h+'px';
}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();camera.position.set(-20,5,-30);updateAIUI();hud();requestAnimationFrame(loop);
