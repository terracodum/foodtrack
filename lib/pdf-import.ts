import {parseInbodyText} from './inbody-parser';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
export async function readInbodyPdf(file:File){
if(file.size>10485760)throw Error('PDF должен быть не больше 10 МБ');
const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true,stopAtErrors:true});
const timeout=setTimeout(()=>task.destroy(),30000);let pdf:any;
try{pdf=await task.promise;let text='';for(let i=1;i<=Math.min(pdf.numPages,10);i++){const page=await pdf.getPage(i);const content=await page.getTextContent();const lines:{y:number,items:{x:number,s:string}[]}[]=[];for(const item of content.items){if(!('str'in item))continue;const y=item.transform[5],x=item.transform[4];let line=lines.find(l=>Math.abs(l.y-y)<3);if(!line){line={y,items:[]};lines.push(line)}line.items.push({x,s:item.str})}lines.sort((a,b)=>b.y-a.y);text+=lines.map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ')).join('\n')+'\n';page.cleanup()}if(!text.trim())throw Error('В PDF нет текстового слоя. Для скана или фото пока нужен ручной ввод.');return parseInbodyText(text)}catch(e:any){if(e.name==='PasswordException')throw Error('PDF защищён паролем. Загрузи незашифрованную копию.');throw Error(e.message||'Не удалось прочитать PDF. Можно ввести данные вручную.')}finally{clearTimeout(timeout);await task.destroy()}
}
