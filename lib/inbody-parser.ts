export type InbodyValues={date?:string;weight?:number;muscle?:number;fatMass?:number;fatPercent?:number;visceral?:number;water?:number};
export type ParsedInbody={values:InbodyValues;warnings:string[];evidence:Partial<Record<keyof InbodyValues,string>>};
const number='(\\d{1,3}(?:[.,]\\d{1,2})?)';
const specs:{key:keyof InbodyValues;label:RegExp;unit:string;min:number;max:number;name:string}[]=[
{key:'weight',label:/(?:^|\n)\s*(?:Вес(?:\s*,\s*кг)?|Weight(?:\s*\(kg\))?)(?=\s|:|$)/gimu,unit:'(?:кг|kg)',min:20,max:350,name:'Вес'},
{key:'muscle',label:/(?:Содержание\s+мышц|Масса\s+скелетных\s+мышц|Скелетные\s+мышцы|Skeletal\s+Muscle\s+Mass|\bSMM\b|(?:^|\n)\s*Мышцы(?:\s*,\s*кг)?)/gimu,unit:'(?:кг|kg)',min:1,max:150,name:'Скелетные мышцы'},
{key:'fatMass',label:/(?<![\p{L}])(?:Содержание\s+жира|Жировая\s+масса|Масса\s+жира|Body\s+Fat\s+Mass)/gimu,unit:'(?:кг|kg)',min:0,max:250,name:'Жировая масса'},
{key:'fatPercent',label:/(?:Процент\s+жира|Percent\s+Body\s+Fat|Percentage\s+Body\s+Fat|\bPBF\b|(?:^|\n)\s*Жир(?:\s*,\s*%)?)/gimu,unit:'%',min:0,max:75,name:'Процент жира'},
{key:'water',label:/(?:Общая\s+вода|Total\s+Body\s+Water|(?:^|\n)\s*Вода)/gimu,unit:'(?:л|L|литр(?:а|ов)?)',min:1,max:150,name:'Общая вода'}
];
export function parseInbodyText(raw:string):ParsedInbody{
const text=raw.normalize('NFKC').replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/[ \t]+/g,' '),values:InbodyValues={},evidence:ParsedInbody['evidence']={},warnings:string[]=[];
const dateMatch=text.match(/(?:Дата(?:\s+измерения)?|Test\s*Date|Date(?:\s*\/\s*Time)?)\s*:?\s*(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2}|\d{4})(?!\d)/iu);
const iso=text.match(/(?:Дата(?:\s+измерения)?|Test\s*Date|Date)\s*:?\s*(\d{4})[-./](\d{2})[-./](\d{2})/iu);
let date='';if(iso)date=`${iso[1]}-${iso[2]}-${iso[3]}`;else if(dateMatch){let year=Number(dateMatch[3]);if(year<100)year+=year>=70?1900:2000;date=`${year}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`}
if(date){const d=new Date(date+'T12:00:00Z');if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date){values.date=date;evidence.date=(iso||dateMatch)![0]}}
for(const spec of specs){let found:{value:number;source:string}[]=[];for(const m of text.matchAll(spec.label)){
const tail=text.slice(m.index!+m[0].length).split('\n').slice(0,3).join('\n').slice(0,150);
// Never cross another metric label or take reference ranges / segmental values.
const same=tail.split('\n')[0];const next=tail.split('\n').slice(1).join('\n');
const candidates=[same,...(same.trim().match(/\d/)?[]:[next])];
for(const candidate of candidates){const match=candidate.match(new RegExp('(?:^|[^\\d.,<>−–-])'+number+'\\s*'+spec.unit+'(?=\\s|$|[,;)])','iu'));
let v=match?Number(match[1].replace(',','.')):null;
// Table rows may put the unit in the label: "Вес, кг 87,3".
if(v===null&&new RegExp(spec.unit+'\\s*$', 'iu').test(m[0])){const simple=same.match(new RegExp('^\\s*:?\\s*'+number+'(?:\\s|$)'));if(simple)v=Number(simple[1].replace(',','.'))}
if(v!==null&&v>=spec.min&&v<=spec.max){found.push({value:v,source:(m[0].trim()+' '+candidate.trim()).slice(0,180)});break}}
}
const unique=[...new Set(found.map(x=>x.value))];if(unique.length===1){(values as any)[spec.key]=unique[0];evidence[spec.key]=found[0].source}else if(unique.length>1)warnings.push(`${spec.name}: найдено несколько разных значений, проверь по отчёту.`)
}
const visceral=text.match(/(?:Висцеральный\s+жир|Visceral\s+Fat\s+Level)(?!\s*(?:площадь|area|см|cm))[^\n\d]{0,45}(\d{1,2}(?:[.,]\d)?)(?:\s|$)/iu);if(visceral){const value=Number(visceral[1].replace(',','.'));if(value<=100){values.visceral=value;evidence.visceral=visceral[0]}}
if(!values.date)warnings.push('Дата измерения не распознана — укажи её вручную, не дату загрузки.');
const missing=specs.filter(s=>values[s.key]===undefined).map(s=>s.name);if(missing.length)warnings.push('Не заполнено автоматически: '+missing.join(', ')+'.');
if(text.replace(/\s/g,'').length<30)warnings.unshift('В PDF нет доступного текстового слоя. Возможно, это скан: цифры нужно ввести вручную.');
return {values,warnings,evidence};
}
