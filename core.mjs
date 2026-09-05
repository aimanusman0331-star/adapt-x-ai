
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function pointCollides(x,z,obstacles,margin=0){
  return obstacles.some(o=>Math.abs(x-o.x)<o.hw+margin && Math.abs(z-o.z)<o.hd+margin);
}

export function safeSpawn(spawn, obstacles, margin=1.4){
  let {x,z}=spawn;
  if(!pointCollides(x,z,obstacles,margin)) return {x,z};
  for(let r=2;r<=24;r+=2){
    for(let a=0;a<Math.PI*2;a+=Math.PI/8){
      const nx=x+Math.cos(a)*r, nz=z+Math.sin(a)*r;
      if(!pointCollides(nx,nz,obstacles,margin)) return {x:nx,z:nz};
    }
  }
  return {x:0,z:0};
}

export function segmentBlocked(x1,z1,x2,z2,obstacles,margin=.25){
  const dx=x2-x1,dz=z2-z1;
  const dist=Math.hypot(dx,dz);
  const steps=Math.max(2,Math.ceil(dist/1.25));
  for(let i=1;i<steps;i++){
    const t=i/steps, x=x1+dx*t, z=z1+dz*t;
    if(pointCollides(x,z,obstacles,margin)) return true;
  }
  return false;
}

export function resolveCameraT(startX,startZ,endX,endZ,obstacles){
  const dx=endX-startX,dz=endZ-startZ;
  for(let i=2;i<=20;i++){
    const t=i/20;
    const x=startX+dx*t,z=startZ+dz*t;
    if(pointCollides(x,z,obstacles,.3)) return Math.max(.28,(i-2)/20);
  }
  return 1;
}

export function emptyProfile(){
  return {
    landing:{hot:0,safe:0,high:0,medium:0},
    range:{close:0,mid:0,long:0},
    rotation:{early:0,late:0},
    aggression:{push:0,hold:0},
    ads:{yes:0,no:0},
    heal:{early:0,late:0},
    crouch:{yes:0,no:0},
    observations:0,
    secondOrder:0
  };
}

export function dominant(o){
  return Object.entries(o).sort((a,b)=>b[1]-a[1])[0][0];
}

export function snapshot(profile){
  return {
    range:dominant(profile.range),
    rotation:dominant(profile.rotation),
    aggression:dominant(profile.aggression),
    ads:dominant(profile.ads)
  };
}

export function recordBehavior(profile,baseline,recent,tag){
  profile=structuredClone(profile);
  recent=[...recent,tag].slice(-18);
  profile.observations++;
  if(tag.startsWith('land:')) profile.landing[tag.split(':')[1]]++;
  if(tag.startsWith('range:')) profile.range[tag.split(':')[1]]++;
  if(tag.startsWith('rotation:')) profile.rotation[tag.split(':')[1]]++;
  if(tag==='push'||tag==='hold') profile.aggression[tag]++;
  if(tag==='ads:yes') profile.ads.yes++;
  if(tag==='ads:no') profile.ads.no++;
  if(tag==='heal:early') profile.heal.early++;
  if(tag==='heal:late') profile.heal.late++;
  if(tag==='crouch:yes') profile.crouch.yes++;
  if(tag==='crouch:no') profile.crouch.no++;

  let built=false, shifted=false;
  if(!baseline && profile.observations>=16){
    baseline=snapshot(profile);
    built=true;
  }
  if(baseline && !profile.secondOrder){
    const rangeTags=recent.filter(x=>x.startsWith('range:')).map(x=>x.split(':')[1]);
    const rotTags=recent.filter(x=>x.startsWith('rotation:')).map(x=>x.split(':')[1]);
    const agTags=recent.filter(x=>x==='push'||x==='hold');
    const recentDom=(arr)=>{
      if(!arr.length)return null;
      const c={};for(const v of arr)c[v]=(c[v]||0)+1;
      return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];
    };
    const rr=recentDom(rangeTags), rt=recentDom(rotTags), ra=recentDom(agTags);
    const rangeShift=rangeTags.length>=4 && rr && rr!==baseline.range && rangeTags.filter(x=>x===rr).length>=4;
    const rotateShift=rotTags.length>=2 && rt && rt!==baseline.rotation && rotTags.filter(x=>x===rt).length>=2;
    const agShift=agTags.length>=5 && ra && ra!==baseline.aggression && agTags.filter(x=>x===ra).length>=4;
    if(rangeShift||rotateShift||agShift){
      profile.secondOrder=1;
      shifted=true;
    }
  }
  return {profile,baseline,recent,built,shifted};
}

export function classifyRange(distance){
  return distance<18?'close':distance>38?'long':'mid';
}

export function applyDamage(hp,armor,raw){
  const absorb=Math.min(armor,raw*.42);
  return {hp:hp-(raw-absorb),armor:armor-absorb,absorbed:absorb,dealt:raw-absorb};
}

export function reloadAmmo(mag,reserve,capacity){
  if(reserve<=0||mag>=capacity) return {mag,reserve,moved:0};
  const need=capacity-mag,moved=Math.min(need,reserve);
  return {mag:mag+moved,reserve:reserve-moved,moved};
}

export function shrinkZone(radius,minRadius=19,step=7){
  return Math.max(minRadius,radius-step);
}
