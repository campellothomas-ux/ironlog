/** Absolute wall-clock deadlines survive page suspension. Changing the system clock
 * necessarily changes the apparent remaining duration; no background worker is assumed. */
export type RestStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export interface RestTimer {
  version: 1;
  id: string;
  workoutStartedAt: number;
  status: RestStatus;
  deadline: number | null;
  remainingMs: number;
  minimized: boolean;
}
export function startRestTimer(id:string,workoutStartedAt:number,seconds:number,now=Date.now()):RestTimer {
  const duration=Math.max(0,seconds*1000);
  return {version:1,id,workoutStartedAt,status:duration?'active':'completed',deadline:duration?now+duration:null,remainingMs:duration,minimized:false};
}
export function remainingMs(timer:RestTimer,now=Date.now()):number {
  if(timer.status==='active')return Math.max(0,(timer.deadline??now)-now);
  return timer.status==='paused'?Math.max(0,timer.remainingMs):0;
}
export function reconcile(timer:RestTimer,now=Date.now()):RestTimer {
  if(timer.status==='active'&&remainingMs(timer,now)===0)return {...timer,status:'completed',deadline:null,remainingMs:0};
  return timer;
}
export function pause(timer:RestTimer,now=Date.now()):RestTimer {
  const current=reconcile(timer,now);if(current.status!=='active')return current;
  return {...current,status:'paused',remainingMs:remainingMs(current,now),deadline:null};
}
export function resume(timer:RestTimer,now=Date.now()):RestTimer {
  if(timer.status!=='paused')return timer;
  return timer.remainingMs>0?{...timer,status:'active',deadline:now+timer.remainingMs}:{...timer,status:'completed',deadline:null};
}
export function adjust(timer:RestTimer,seconds:number,now=Date.now()):RestTimer {
  const current=reconcile(timer,now);if(current.status!=='active'&&current.status!=='paused')return current;
  const value=Math.max(0,remainingMs(current,now)+seconds*1000);
  if(!value)return {...current,status:'completed',deadline:null,remainingMs:0};
  return current.status==='paused'?{...current,remainingMs:value}:{...current,deadline:now+value,remainingMs:value};
}
export function cancel(timer:RestTimer):RestTimer {return {...timer,status:'cancelled',deadline:null,remainingMs:0};}
export function restoreTimer(value:unknown,startedAt:number):RestTimer|null {
  if(!value||typeof value!=='object')return null;
  const t=value as Partial<RestTimer>;
  if(t.version!==1||typeof t.id!=='string'||!t.id||t.workoutStartedAt!==startedAt||!['active','paused','completed','cancelled'].includes(t.status??'')||typeof t.remainingMs!=='number'||!Number.isFinite(t.remainingMs)||t.remainingMs<0||typeof t.minimized!=='boolean')return null;
  if(t.status==='active'&&(typeof t.deadline!=='number'||!Number.isFinite(t.deadline)))return null;
  if(t.status!=='active'&&t.deadline!==null)return null;
  return t as RestTimer;
}
