export type NutritionProfile={age:number;weightDate?:string;sex:'male'|'female';weight:number;activity:number;goal:'maintain'|'loss10'|'loss15'|'gain5';proteinPerKg:number;fatPercent:number};
export function calculateNutrition(height:number,p:NutritionProfile){
if(!Number.isFinite(height)||height<100||height>250||!Number.isInteger(p.age)||p.age<18||p.age>100||!Number.isFinite(p.weight)||p.weight<30||p.weight>350||![1.2,1.375,1.55,1.725].includes(p.activity)||!['male','female'].includes(p.sex)||!['maintain','loss10','loss15','gain5'].includes(p.goal)||!Number.isFinite(p.proteinPerKg)||p.proteinPerKg<0.8||p.proteinPerKg>2.5||!Number.isFinite(p.fatPercent)||p.fatPercent<20||p.fatPercent>35)return null;
const resting=10*p.weight+6.25*height-5*p.age+(p.sex==='male'?5:-161);
const maintenance=Math.round(resting*p.activity);const factor={maintain:1,loss10:0.9,loss15:0.85,gain5:1.05}[p.goal];const kcal=Math.round(maintenance*factor/10)*10;
const protein=Math.round(p.weight*p.proteinPerKg),fat=Math.round(kcal*p.fatPercent/100/9),carbs=Math.round((kcal-protein*4-fat*9)/4);
return {resting:Math.round(resting),maintenance,kcal,p:protein,f:fat,c:carbs,applicable:kcal>=(p.sex==='male'?1500:1200)&&carbs>=0};
}
