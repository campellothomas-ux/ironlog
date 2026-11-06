import { dateKey,dateLabel,monthDays,parseDate,weekDays } from './dates';
import { activityDay,plannedSessions,type Program,type Schedule } from './model';
import { escapeHtml as esc } from '../ui/html';
export interface CalendarView {mode:'week'|'month';selected:string}
interface HistoryItem {id:string;name:string;finishedAt:number}
export function renderCalendar(program:Program,schedule:Schedule|undefined,history:HistoryItem[],view:CalendarView):string {
  const today=dateKey(new Date());
  const planned=plannedSessions(program,schedule);
  const days=view.mode==='week'?weekDays(view.selected):monthDays(view.selected);
  const selected=planned.filter(item=>item.date===view.selected);
  const activities=history.filter(item=>activityDay(item.finishedAt)===view.selected);
  const month=parseDate(view.selected).getMonth();
  return `<div class="page calendar-page"><button class="btn mini" data-a="program-back">← Programmes</button>
  <div class="section-eyebrow calendar-eyebrow">Votre rythme</div><h1 class="title">Planning</h1>
  <div class="segmented" aria-label="Vue du calendrier">${[['week','Semaine'],['month','Mois']].map(([mode,label])=>`<button data-a="calendar-mode" data-id="${mode}" aria-pressed="${view.mode===mode}" class="${view.mode===mode?'active':''}">${label}</button>`).join('')}</div>
  <div class="calendar-toolbar"><button class="btn icon" data-a="calendar-prev" aria-label="Période précédente">‹</button><h2 class="smallhead">${dateLabel(view.selected,{month:'long',year:'numeric'})}</h2><button class="btn icon" data-a="calendar-next" aria-label="Période suivante">›</button></div>
  <button class="btn mini today-button" data-a="calendar-today">Aujourd’hui</button>
  <div class="calendar-grid" aria-label="${view.mode==='week'?'Semaine':'Mois'}">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('')}${days.map(day=>{
    const count=planned.filter(item=>item.date===day).length;
    const done=history.filter(item=>activityDay(item.finishedAt)===day).length;
    return `<button class="calendar-day ${parseDate(day).getMonth()!==month?'outside':''} ${day===view.selected?'selected':''}" data-a="calendar-select" data-date="${day}" aria-pressed="${day===view.selected}" ${day===today?'aria-current="date"':''} aria-label="${esc(dateLabel(day))}, ${count} séance(s) prévue(s), ${done} activité(s)"><span>${parseDate(day).getDate()}</span><span class="calendar-dots">${count?'<i class="planned-dot"></i>':''}${done?'<i class="activity-dot"></i>':''}</span></button>`;
  }).join('')}</div>
  <p class="calendar-legend"><span><i class="planned-dot"></i> Prévue</span><span><i class="activity-dot"></i> Enregistrée</span></p>
  <section class="calendar-agenda" aria-label="Séances du jour"><h2 class="smallhead">${esc(dateLabel(view.selected,{weekday:'long',day:'numeric',month:'long'}))}</h2>
  ${selected.map(item=>`<article class="programitem"><span class="ey">Prévue · semaine ${item.week}</span><h3>${esc(item.session.name)}</h3><p class="muted sm">${item.session.exercises.length} exercices</p><div class="row calendar-actions"><button class="btn mini" data-a="calendar-info" data-key="${esc(item.key)}">Voir la séance</button><button class="btn mini outline" data-a="calendar-move" data-key="${esc(item.key)}">Déplacer</button></div></article>`).join('')}
  ${activities.map(item=>`<article class="programitem"><span class="ey">Activité enregistrée ✓</span><h3>${esc(item.name)}</h3><button class="btn mini" data-a="activity-open" data-id="${esc(item.id)}">Détails de l’activité</button></article>`).join('')}
  ${!selected.length&&!activities.length?'<p class="blank">Aucune séance pour cette journée.</p>':''}</section>
  <section class="card calendar-settings"><h2 class="smallhead">Dates du programme</h2><p class="hint">${esc(program.name)} · ${program.weeks.length} semaines. La date choisie fixe le lundi de la semaine 1, sans changer votre progression actuelle. Les séances déplacées gardent leur date explicite.</p>
  ${!schedule?'<p class="hint">Aucune date de départ définie. Vos activités restent visibles ; choisissez un début pour afficher les séances prévues.</p>':''}
  <label class="field" for="calendar-start">Début de la semaine 1<input id="calendar-start" type="date" value="${esc(schedule?.startDate??'')}"></label><button class="btn outline block" data-a="calendar-anchor">${schedule?'Modifier les dates':'Définir le début'}</button></section></div>`;
}
