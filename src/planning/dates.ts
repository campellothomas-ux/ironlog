/** Dates civiles locales à midi : aucun incrément de 24 h pour naviguer. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseDate(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw Error('Date invalide');
  const [y,m,d]=key.split('-').map(Number);
  const result=new Date(y,m-1,d,12);
  if (dateKey(result)!==key) throw Error('Date invalide');
  return result;
}
export function addDays(key: string, count: number): string {
  const date=parseDate(key);date.setDate(date.getDate()+count);return dateKey(date);
}
export function monday(key: string): string {
  const date=parseDate(key);return addDays(key,-((date.getDay()+6)%7));
}
export function shiftMonth(key: string, count: number): string {
  const date=parseDate(key);const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+count);
  const last=new Date(date.getFullYear(),date.getMonth()+1,0,12).getDate();
  date.setDate(Math.min(day,last));return dateKey(date);
}
export function monthDays(key: string): string[] {
  const date=parseDate(key);date.setDate(1);const start=monday(dateKey(date));
  const last=dateKey(new Date(date.getFullYear(),date.getMonth()+1,0,12));
  const result=[];for(let d=start;d<=last||result.length%7!==0;d=addDays(d,1))result.push(d);
  return result;
}
export const weekDays=(key: string)=>Array.from({length:7},(_,i)=>addDays(monday(key),i));
export const dateLabel=(key:string,options:Intl.DateTimeFormatOptions={dateStyle:'full'})=>parseDate(key).toLocaleDateString('fr-FR',options);
