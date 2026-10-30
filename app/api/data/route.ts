import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {dataSchema,initialData,validateRelations} from '../../../lib/data';
import {encodeJournal,decodeJournal} from '../../../lib/storage';

export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function user(){return await getChatGPTUser()||(import.meta.env.DEV?{userId:'foodtrack-preview'}:null)}

export async function GET(){
  const u=await user();
  if(!u)return json({error:'Требуется вход'},401);
  if(!env.DB)return json({error:'База данных недоступна'},503);
  try{
    const row=await env.DB.prepare('SELECT payload,revision FROM journals WHERE user_id=?').bind(u.userId).first<{payload:string;revision:number}>();
    return json(row?{data:dataSchema.parse(await decodeJournal(row.payload)),revision:row.revision}:{data:initialData,revision:0});
  }catch{return json({error:'Не удалось загрузить дневник'},503)}
}

export async function PUT(req:Request){
  const u=await user();
  if(!u)return json({error:'Требуется вход'},401);
  if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Недопустимый источник'},403);
  if(!env.DB)return json({error:'База данных недоступна'},503);
  let data:ReturnType<typeof dataSchema.parse>,revision:number,payload:string;
  try{
    // Bound the streamed body as well as requests that supply Content-Length.
    const reader=req.body?.getReader();
    if(!reader)return json({error:'Пустой запрос'},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8000000){await reader.cancel();return json({error:'Запрос превышает 8 МБ'},413)}chunks.push(value)}
    const body=JSON.parse(await new Blob(chunks.map(chunk=>new Uint8Array(chunk))).text());
    revision=body.revision;
    if(!Number.isSafeInteger(revision)||revision<0)return json({error:'Некорректная версия'},400);
    data=dataSchema.parse(body.data);validateRelations(data);payload=await encodeJournal(data);
  }catch{return json({error:'Проверь данные дневника'},400)}
  try{
    // A single conditional statement prevents lost updates, including first save.
    const result=revision===0
      ?await env.DB.prepare('INSERT INTO journals(user_id,payload,revision) VALUES(?,?,1) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,revision=journals.revision+1 WHERE journals.revision=0').bind(u.userId,payload).run()
      :await env.DB.prepare('UPDATE journals SET payload=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(payload,u.userId,revision).run();
    if(!result.meta.changes)return json({error:'Данные изменились в другом окне. Обнови страницу.'},409);
    return json({revision:revision+1});
  }catch{return json({error:'Не удалось сохранить дневник'},503)}
}
