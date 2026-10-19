import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.ADAPT_X_URL||'http://127.0.0.1:4173/';
fs.mkdirSync('qa-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
let failures=[];
for(const device of [{name:'desktop',width:1365,height:768},{name:'mobile-landscape',width:844,height:390},{name:'mobile-portrait',width:390,height:844}]){
 const page=await browser.newPage({viewport:{width:device.width,height:device.height},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForTimeout(4000);
 const result=await page.evaluate(()=>({
  canvas:!!document.querySelector('#game'),
  buttons:['brainBtn','bagBtn','swapBtn'].every(id=>!!document.getElementById(id)),
  overflow:document.documentElement.scrollWidth>innerWidth+2,
  engineReady:!!window.__adaptx || !!window.game || !!document.querySelector('canvas')
 }));
 if(!result.canvas||!result.buttons||result.overflow)failures.push(device.name+': '+JSON.stringify(result));
 if(errors.length)failures.push(device.name+' runtime errors: '+errors.join(' | '));
 await page.screenshot({path:'qa-artifacts/'+device.name+'.png',fullPage:true});
 console.log(device.name,JSON.stringify(result),'runtime errors',errors.length);
 await page.close();
}
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log('PASS browser smoke checks across three viewports');
