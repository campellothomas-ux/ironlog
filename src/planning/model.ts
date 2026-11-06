import { addDays, dateKey, monday, parseDate } from './dates';
export interface Session { id:string;name:string;day:string;exercises:unknown[];warmupExercises?:unknown[];cooldownExercises?:unknown[] }
export interface Program {id:string;name:string;weeks:{sessions:Session[]}[]}
export interface Schedule {startDate:string;moves:Record<string,string>}
export type Calendar = Record<string,Schedule>;
export interface Planned {key:string;date:string;week:number;session:Session}
const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
export function plannedSessions(program:Program,schedule?:Schedule):Planned[] {
  if(!schedule)return [];
  let start:string;try{start=monday(schedule.startDate);}catch{return [];}
  return program.weeks.flatMap((week,index)=>week.sessions.flatMap(session=>{
    const day=days.indexOf(session.day);if(day<0)return [];
    const key=`${index}:${session.id}`;
    const original=addDays(start,index*7+day);
    let date=schedule.moves?.[key]??original;
    try{parseDate(date);}catch{date=original;}
    return [{key,date,week:index+1,session}];
  }));
}
export function setStart(calendar:Calendar|undefined,programId:string,date:string):Calendar {
  return {...calendar,[programId]:{...calendar?.[programId],startDate:monday(date),moves:calendar?.[programId]?.moves??{}}};
}
export function moveOccurrence(calendar:Calendar,program:Program,key:string,date:string):Calendar {
  parseDate(date);
  if(!plannedSessions(program,calendar[program.id]).some(item=>item.key===key))throw Error('Séance planifiée introuvable');
  const schedule=calendar[program.id];
  return {...calendar,[program.id]:{...schedule,moves:{...schedule.moves,[key]:date}}};
}
export function activityDay(finishedAt:number):string|null {
  const date=new Date(finishedAt);return Number.isFinite(+date)?dateKey(date):null;
}
