export const sampleState = () => {
 const exercise={id:'ex_1',name:'Squat',primary:['Quadriceps'],secondary:['Fessiers'],tip:'Stable',sets:[{kg:72.5,reps:8,rest:90,done:true}]};
 const session={id:'session_1',name:'Jambes',day:'Lundi',exercises:[exercise]};
 return {programs:[{id:'plan_1',name:'Force',weeks:[{sessions:[session]}]}],activePlanId:'plan_1',week:1,homeSessionId:'session_1',prefs:{mode:'detail',profile:'Camille'},history:[{...session,id:'activity_1',finishedAt:1760000000000,duration:1200}],workout:{...session,startedAt:1760000000000,exIndex:0,focusSet:null,mode:'detail'},calendar:{plan_1:{startDate:'2025-10-06',moves:{'0:session_1':'2025-10-08'}}},youTab:'activities',progView:'landing',statsMetric:'tonnage',statsPeriod:'12',musclePeriod:7,custom:{tag:'conserver'}};
};
