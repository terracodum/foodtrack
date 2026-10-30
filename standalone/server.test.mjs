import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer as netServer} from 'node:net';
const root=resolve(new URL('..',import.meta.url).pathname),serverFile=join(root,'dist/standalone/server/server.mjs'),password='only-for-automated-test-12345';
async function freePort(){const s=netServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function launch(dir,port){const child=spawn(process.execPath,[serverFile],{cwd:root,env:{...process.env,DATA_DIR:dir,HOST:'127.0.0.1',PORT:String(port),PUBLIC_URL:`http://127.0.0.1:${port}`,FOODTRACK_PASSWORD:password},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{child.kill();reject(Error('Server startup timed out'))},15000);child.stdout.on('data',b=>{if(b.toString().includes('self-hosted ready')){clearTimeout(timeout);resolve()}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);if(code)reject(Error('Server failed: '+code))})});return child}
async function stop(child){if(child.exitCode!==null)return;await new Promise(r=>{child.once('exit',r);child.kill('SIGTERM')})}
test('auth, private CRUD, files, conflicts, compression and restart persistence',{timeout:60000},async()=>{
await access(serverFile);const dir=await mkdtemp(join(tmpdir(),'foodtrack-qa-')),port=await freePort(),base=`http://127.0.0.1:${port}`;let child=await launch(dir,port),cookie='';
const request=(path,{method='GET',body,origin=base,auth=true,headers={}}={})=>fetch(base+path,{method,headers:{...(method!=='GET'?{Origin:origin}:{}),...(auth&&cookie?{Cookie:cookie}:{}),...(body!==undefined&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
try{
assert.equal((await request('/api/data',{auth:false})).status,401);
assert.equal((await request('/api/data',{auth:false,headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.invalid'}})).status,401);
assert.equal((await request('/api/login',{method:'POST',origin:'https://other.example',body:{password}})).status,403);
assert.equal((await request('/api/login',{method:'POST',body:{password:'wrong'}})).status,401);
const login=await request('/api/login',{method:'POST',body:{password}});assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);cookie=setCookie.split(';')[0];
let state=await (await request('/api/data')).json();assert.equal(state.revision,0);assert.equal(state.data.settings.setupComplete,false);assert.equal(state.data.settings.height,0);assert.deepEqual(state.data.entries,[]);
const date=new Date().toISOString().slice(0,10);state.data.settings={...state.data.settings,setupComplete:true,height:178,startWeight:78,startWeightDate:date,profile:{age:32,sex:'male',weight:78,weightDate:date,activity:1.375,goal:'maintain',proteinPerKg:1.6,fatPercent:30}};state.data.weights=[{date,value:78}];
let saved=await request('/api/data',{method:'PUT',body:state});assert.equal(saved.status,200);assert.equal((await saved.json()).revision,1);assert.equal((await request('/api/data',{method:'PUT',body:state})).status,409);
state=await (await request('/api/data')).json();assert.equal(state.data.settings.height,178);assert.equal(state.data.weights[0].value,78);assert.equal((await request('/api/data',{method:'PUT',body:state,origin:'https://other.example'})).status,403);
assert.equal((await request('/api/reports?id=00000000-0000-0000-0000-000000000000',{auth:false})).status,401);
const invalid=new FormData();invalid.append('file',new Blob(['not-a-pdf'],{type:'application/pdf'}),'invalid.pdf');assert.equal((await request('/api/reports',{method:'POST',body:invalid})).status,400);
const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3L8AAAAASUVORK5CYII=','base64'));const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'test.png');const reportRes=await request('/api/reports',{method:'POST',body:form});assert.equal(reportRes.status,200);const report=await reportRes.json();let downloaded=await request('/api/reports?id='+report.id);assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/^attachment/);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),bytes);
state.data.inbody=[{id:'test-inbody',date,weight:78,muscle:null,fatMass:null,fatPercent:null,visceral:null,water:null,notes:'',report}];saved=await request('/api/data',{method:'PUT',body:state});assert.equal(saved.status,200);state.revision=(await saved.json()).revision;assert.equal((await request('/api/reports?id='+report.id,{method:'DELETE'})).status,409);
state.data.inbody=[];saved=await request('/api/data',{method:'PUT',body:state});state.revision=(await saved.json()).revision;assert.equal((await request('/api/reports?id='+report.id,{method:'DELETE'})).status,200);assert.equal((await request('/api/reports?id='+report.id)).status,404);
state.data.entries=Array.from({length:1000},(_,i)=>({id:'e'+i,date,meal:'Завтрак',name:'Тестовый продукт',grams:100,kcal:200,p:10,f:5,c:25}));saved=await request('/api/data',{method:'PUT',body:state});assert.equal(saved.status,200);
await stop(child);child=await launch(dir,port);state=await (await request('/api/data')).json();assert.equal(state.data.entries.length,1000);assert.equal(state.data.settings.height,178);
state.data.entries=[];saved=await request('/api/data',{method:'PUT',body:state});assert.equal(saved.status,200);
assert.equal((await request('/manifest.webmanifest',{auth:false})).status,200);assert.equal((await (await request('/manifest.webmanifest',{auth:false})).json()).display,'standalone');assert.equal((await request('/data/foodtrack.sqlite',{auth:false})).status,404);
assert.equal((await request('/api/logout',{method:'POST'})).status,200);assert.equal((await request('/api/data')).status,401);
}finally{await stop(child);await rm(dir,{recursive:true,force:true})}
});
