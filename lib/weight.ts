export const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const LEGACY_START_DATE='';
type Candidate={value:number;date:string;source:string;priority:number};
export function currentWeight(data:any,asOf=localDate()){
const candidates:Candidate[]=[];const add=(value:any,date:any,source:string,priority:number)=>{if(Number.isFinite(value)&&value>0&&typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=asOf)candidates.push({value,date,source,priority})};
add(data.settings.startWeight,data.settings.startWeightDate??LEGACY_START_DATE,'Стартовый замер',0);
for(const r of data.inbody||[])add(r.weight,r.date,'InBody',1);
if(data.settings.profile)add(data.settings.profile.weight,data.settings.profile.weightDate,'Анкета',2);
for(const r of data.weights||[])add(r.value,r.date,'Журнал веса',3);
candidates.sort((a,b)=>a.date.localeCompare(b.date)||a.priority-b.priority);
return candidates.at(-1)||{value:data.settings.startWeight,date:null,source:'Стартовый вес без даты',priority:0};
}
