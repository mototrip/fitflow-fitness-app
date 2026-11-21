/* FitFlow V2 — privacy-conscious DEVICE-ONLY accounts. Not server authentication. */
'use strict';
const STORAGE_KEY='fitflow_fitness_v1';
const USERS_KEY='fitflow_local_accounts_v2';
const SESSION_KEY='fitflow_session_v2';
const ACCOUNT_DATA_PREFIX='fitflow_account_data_v2_';
let activeAccount=null; // null = guest; account records live on this browser only
let authMode='signup';
let appUnlocked=false;
function accounts(){try{const arr=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');return Array.isArray(arr)?arr:[]}catch{return []}}
function saveAccounts(arr){localStorage.setItem(USERS_KEY,JSON.stringify(arr))}
const currentDataKey=()=>activeAccount?ACCOUNT_DATA_PREFIX+activeAccount.id:STORAGE_KEY;
function profileDefaults(){return {name:'',age:'',gender:'',bloodGroup:'',heightCm:'',weightKg:''}}
function getProfile(){return {...profileDefaults(),...(state.profile||{}),name:state.profile?.name||state.settings.name||''}}

const WEEKCOL=['#83aef3','#ee9fc4','#86d1c8','#f1ce78','#9bb9ef','#90cdea'];
const DEFAULT_HABITS=[
  {id:'workout',name:'Complete a workout',icon:'🏋️',color:'blue'},
  {id:'steps',name:'8,000 steps',icon:'🚶',color:'pink'},
  {id:'water',name:'Drink enough water',icon:'💧',color:'mint'},
  {id:'protein',name:'Hit protein goal',icon:'🥗',color:'yellow'},
  {id:'sleep',name:'7–8 hours of sleep',icon:'🌙',color:'purple'},
  {id:'stretch',name:'10 min stretching',icon:'🧘',color:'mint'},
  {id:'food',name:'No junk food',icon:'🥑',color:'pink'},
  {id:'mind',name:'10 min mindfulness',icon:'✨',color:'blue'},
];
const makeFresh=()=>({schema:2,profile:profileDefaults(),habits:DEFAULT_HABITS.map(h=>({...h})),checks:{},water:{},workouts:[],weights:[],settings:{name:'',waterGoal:2500,streakTarget:70,theme:'light'}});
function loadState(){try{const v=JSON.parse(localStorage.getItem(currentDataKey()));if(v && Array.isArray(v.habits) && typeof v.checks==='object'){
  const s=makeFresh();return {...s,...v,settings:{...s.settings,...(v.settings||{})},profile:{...s.profile,...(v.profile||{})},water:v.water||{},workouts:Array.isArray(v.workouts)?v.workouts:[],weights:Array.isArray(v.weights)?v.weights:[]};
}}catch(e){console.warn('Saved data could not be read',e)}return makeFresh()}
let state=loadState();
const now=()=>new Date();
const pad=n=>String(n).padStart(2,'0');
const keyOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey=()=>keyOf(now());
const asDate=key=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d)};
const fmtDate=(key,opts={day:'numeric',month:'short',year:'numeric'})=>asDate(key).toLocaleDateString('en-IN',opts);
const validKey=k=>/^\d{4}-\d{2}-\d{2}$/.test(k) && keyOf(asDate(k))===k;
let selectedDay=todayKey();
let shownMonth={y:now().getFullYear(),m:now().getMonth()};
let currentPage='today';
let calendarScroll=0;
let toastTimer;
const $=selector=>document.querySelector(selector);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const num=(n,defaultValue=0)=>Number.isFinite(+n)?+n:defaultValue;
const unique=()=>globalThis.crypto?.randomUUID?.()||`id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const save=()=>{try{localStorage.setItem(currentDataKey(),JSON.stringify(state))}catch(err){toast('Could not save — storage may be full')}};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200)}
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const shownMonthText=()=>new Date(shownMonth.y,shownMonth.m,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const isFuture=key=>key>todayKey();
const monthDays=()=>Array.from({length:daysInMonth(shownMonth.y,shownMonth.m)},(_,i)=>keyOf(new Date(shownMonth.y,shownMonth.m,i+1)));
const daysElapsed=()=>monthDays().filter(d=>d<=todayKey()).length;
const activeHabits=()=>state.habits.filter(h=>h.active!==false);
const checkCount=day=>activeHabits().reduce((count,h)=>count+((state.checks[day]||{})[h.id]?1:0),0);
const pctDay=day=>activeHabits().length?Math.round(checkCount(day)/activeHabits().length*100):0;
const pctMonth=()=>{const dates=monthDays().filter(d=>d<=todayKey());if(!dates.length||!activeHabits().length)return 0;return Math.round(dates.reduce((s,d)=>s+checkCount(d),0)/(dates.length*activeHabits().length)*100)};
const countMonthCheck=()=>monthDays().reduce((n,day)=>n+checkCount(day),0);
const workoutsInMonth=()=>state.workouts.filter(w=>w.date.startsWith(`${shownMonth.y}-${pad(shownMonth.m+1)}`));
const totalWorkoutMins=()=>workoutsInMonth().reduce((s,w)=>s+num(w.duration),0);
const streak=()=>{let d=asDate(todayKey());if(pctDay(todayKey())<state.settings.streakTarget)d.setDate(d.getDate()-1);let n=0;for(let i=0;i<3000;i++){const key=keyOf(d);if(pctDay(key)>=state.settings.streakTarget && activeHabits().length){n++;d.setDate(d.getDate()-1)}else break}return n};
function updateSidebar(){
  $('#sidebarMonth').textContent=shownMonthText();
  const days=monthDays();$('#sidebarMonthGrid').innerHTML=days.map(k=>`<span class="tiny-cell ${pctDay(k)>=state.settings.streakTarget?'done':''} ${k===todayKey()?'today-mini':''}" title="${safe(k)}"></span>`).join('');
  $('#todayLabel').textContent=now().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  $('#themeButton').textContent=state.settings.theme==='dark'?'☀':'☾';
  document.body.classList.toggle('dark',state.settings.theme==='dark');
  const acc=$('#accountInitial');if(acc)acc.textContent=(getProfile().name||activeAccount?.name||'U').trim().slice(0,1).toUpperCase();
  const foot=$('.sidebar-foot');if(foot)foot.innerHTML='<span class="online-dot"></span>'+(activeAccount?'Signed in on this device':'Guest · Stored on this device');
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===currentPage));
  $('#pageCrumb').textContent=({today:'Dashboard',habits:'Habit calendar',workouts:'Workout log',progress:'Progress',settings:'Settings'})[currentPage];
}
function monthSwitch(){return `<div class="month-switch"><button type="button" data-month-delta="-1" aria-label="Previous month">‹</button><strong>${safe(shownMonthText())}</strong><button type="button" data-month-delta="1" aria-label="Next month">›</button></div>`}
function pageHeader(kicker,title,subtitle,actions=''){return `<div class="page-head stack-on-mobile"><div><div class="title-kicker">${safe(kicker)}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions}</div>`}
function statCard(label,value,sub,icon){return `<article class="stat-card"><div class="stat-card-top"><span class="stat-label">${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></article>`}
function lineChart(values,labels,{hero=false,color='#6b98eb',height=205,unit='%'}={}){
  const W=700,H=height,L=hero?8:35,R=hero?8:20,T=hero?10:18,B=hero?8:31;
  const usableW=W-L-R,usableH=H-T-B;
  const series=values.length?values:[0],minV=0,maxV=100;
  const pos=(value,i)=>[L+(i/(Math.max(series.length-1,1)))*usableW,T+usableH-(clamp(value,minV,maxV)/maxV)*usableH];
  const pts=series.map((v,i)=>pos(v,i));
  const line=pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const fill=`${line} L${(L+usableW).toFixed(1)} ${(T+usableH).toFixed(1)} L${L} ${(T+usableH).toFixed(1)} Z`;
  const id=hero?'heroGrad':'progressGrad';
  const grid=hero?'':[0,25,50,75,100].map(v=>{const y=pos(v,0)[1];return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="var(--line)" stroke-dasharray="4 5"/><text x="${L-8}" y="${y+3}" font-size="9" text-anchor="end" fill="var(--muted)">${v}${unit}</text>`}).join('');
  const ticks=hero?'':labels.map((lab,i)=>({lab,i})).filter((v,i)=>i===0||i===labels.length-1||i%Math.max(1,Math.ceil(labels.length/6))===0).map(({lab,i})=>`<text x="${pos(0,i)[0]}" y="${H-7}" text-anchor="middle" font-size="10" fill="var(--muted)">${safe(lab)}</text>`).join('');
  const dot=hero?'':pts.map(([x,y],i)=>series[i]>0?`<circle cx="${x}" cy="${y}" r="3.2" fill="${color}" stroke="var(--panel)" stroke-width="1.5"/>`:'').join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily completion trend chart"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".33"/><stop offset="1" stop-color="${color}" stop-opacity=".018"/></linearGradient></defs>${grid}<path d="${fill}" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${hero?3.5:2.7}"/>${dot}${ticks}</svg>`;
}
function datesLast(n){const d=asDate(todayKey()),res=[];for(let i=n-1;i>=0;i--){let x=new Date(d);x.setDate(d.getDate()-i);res.push(keyOf(x))}return res}
function dailyList(){const arr=activeHabits();return arr.length?arr.map(h=>{const done=!!state.checks[selectedDay]?.[h.id];return `<button type="button" class="daily-habit ${done?'is-done':''}" data-toggle-habit="${safe(h.id)}" data-date="${safe(selectedDay)}" aria-pressed="${done}"><span class="habit-emoji ${safe(h.color)}">${safe(h.icon)}</span><span class="daily-habit-name">${safe(h.name)}<span class="daily-habit-sub">${done?'Completed — great job!':'Tap to mark complete'}</span></span><span class="check-square">${done?'✓':''}</span></button>`}).join(''):`<div class="habit-empty">No habits yet. Add your first habit to get started.</div>`}
function waterPanel(){const amount=num(state.water[selectedDay],0),goal=Math.max(250,num(state.settings.waterGoal,2500)),percent=Math.round(amount/goal*100);return `<section class="panel"><div class="panel-head"><div><h2>Hydration station 💧</h2><p>Tracking for ${fmtDate(selectedDay,{day:'numeric',month:'short'})}</p></div><span class="tag">${Math.min(percent,999)}% goal</span></div><div class="water-hero"><div><div class="water-amount">${amount.toLocaleString('en-IN')} <span>/ ${goal.toLocaleString('en-IN')} ml</span></div><span class="small muted">${amount>=goal?'Water goal achieved! ✨':'Stay hydrated, one sip at a time.'}</span></div><div class="water-drops">💦</div></div><div class="progress-track"><div class="progress-fill" style="width:${clamp(percent)}%"></div></div><div class="water-buttons"><button type="button" class="btn btn-secondary" data-water="-250">− 250 ml</button><button type="button" class="btn btn-primary" data-water="250">+ 250 ml</button></div><p class="water-tips">Water entries and habit checkboxes can be tracked separately.</p></section>`}
function leaderPanel(){const count=daysElapsed(),items=activeHabits().map(h=>({h,n:monthDays().reduce((v,d)=>v+(state.checks[d]?.[h.id]?1:0),0)})).sort((a,b)=>b.n-a.n).slice(0,10);return `<section class="panel"><div class="panel-head"><div><h2>Top habits</h2><p>Your most consistent routines this month</p></div><span class="tag">TOP ${items.length}</span></div><div class="leader-list">${items.length?items.map((v,i)=>`<div class="leader-row"><span class="leader-rank">${pad(i+1)}</span><div class="leader-main"><div class="leader-title"><span>${safe(v.h.icon)} ${safe(v.h.name)}</span><b>${count?Math.round(v.n/count*100):0}%</b></div><div class="leader-bar"><div style="width:${count?clamp(Math.round(v.n/count*100)):0}%"></div></div></div></div>`).join(''):'<p>Add habits to see your leaderboard.</p>'}</div></section>`}
function weekPanel(){const d=asDate(todayKey()),mon=new Date(d),weekday=(d.getDay()+6)%7;mon.setDate(d.getDate()-weekday);const dates=Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return keyOf(dd)});return `<section class="panel"><div class="panel-head"><div><h2>This week</h2><p>One better choice, every day</p></div><span class="tag">MON – SUN</span></div><div class="weekly-grid">${dates.map(day=>{const p=isFuture(day)?0:pctDay(day);return `<div class="week-day ${day===todayKey()?'is-today':''}"><span>${p}%</span><div class="week-bar-wrap"><div class="week-bar" style="height:${p}%"></div></div><b>${asDate(day).toLocaleDateString('en-IN',{weekday:'short'})}</b></div>`}).join('')}</div></section>`}
function calendarMatrix(){const days=monthDays();const weeks=Math.ceil(days.length/7);const habits=activeHabits();let header=`<thead><tr><th class="sticky-habit" rowspan="2">DAILY HABITS</th>`;for(let i=0;i<weeks;i++){header+=`<th colspan="${Math.min(7,days.length-i*7)}" class="week-title-${i}">week ${i+1}</th>`}header+='<th rowspan="2" class="matrix-percent">RATE</th></tr><tr>';days.forEach((key,i)=>{const d=asDate(key);header+=`<th class="day-head week-bg-${Math.floor(i/7)} ${key===todayKey()?'current-day':''}">${d.getDate()}<small>${d.toLocaleDateString('en-IN',{weekday:'narrow'})}</small></th>`});header+='</tr></thead>';
  let body='<tbody>';
  for(const h of habits){body+=`<tr><td class="sticky-habit"><span class="matrix-label"><em>${safe(h.icon)}</em><span title="${safe(h.name)}">${safe(h.name)}</span></span></td>`;days.forEach((key,i)=>{const done=!!state.checks[key]?.[h.id],future=isFuture(key);body+=`<td class="day-cell week-bg-${Math.floor(i/7)} ${key===todayKey()?'current-day':''}"><button type="button" class="matrix-check" data-toggle-habit="${safe(h.id)}" data-date="${key}" aria-label="${done?'Uncheck':'Check'} ${safe(h.name)} on ${fmtDate(key)}" aria-pressed="${done}" ${future?'disabled title="Future dates cannot be completed yet"':''}>${done?'✓':''}</button></td>`});const eligible=days.filter(d=>d<=todayKey()).length;const n=days.reduce((v,d)=>v+(state.checks[d]?.[h.id]?1:0),0);body+=`<td class="matrix-percent">${eligible?Math.round(n/eligible*100):0}%</td></tr>`}body+='</tbody>';
  return `<div class="calendar-topline"><div class="color-legend">${Array.from({length:weeks},(_,i)=>`<span class="legend-item"><i class="legend-dot" style="background:${WEEKCOL[i]}"></i>Week ${i+1}</span>`).join('')}</div><span class="small muted">← Swipe to see all dates →</span></div><div class="calendar-wrap" tabindex="0" aria-label="Scrollable habit calendar"><table class="calendar-table" style="width:${170+days.length*32+53}px;min-width:${170+days.length*32+53}px">${header}${body}</table></div><div class="calendar-foot"><span>✓ Tick any past day to record a win</span><span>${countMonthCheck()} completed habit-days · ${pctMonth()}% month progress</span></div>`}
function ring(pct,label,color){const val=clamp(pct);return `<div class="ring-tile"><div class="ring" style="background:conic-gradient(${color} ${val}%, #eaf0f9 ${val}% 100%)"><div class="ring-inner"><strong>${pct}%</strong><small>complete</small></div></div><p>${label}</p></div>`}
function renderToday(){const dayDates=datesLast(14),month=shownMonthText(),name=state.settings.name?.trim();const date=fmtDate(selectedDay,{weekday:'long',day:'numeric',month:'long'});const isToday=selectedDay===todayKey();return `${pageHeader('MAKE EVERY DAY COUNT',`Hello${name?', '+safe(name):''} <span style="font-weight:400">👋</span>`, `Your fitness journey is built one habit at a time.`, `<button class="btn btn-ghost" data-nav="habits">View calendar ↗</button>`)}
  <section class="hero"><div class="hero-content"><div class="hero-kicker">✦ YOUR DAILY REMINDER</div><h1>Progress, not <em>perfection.</em></h1><p>Show up for yourself today. Even the smallest steps add up to something amazing.</p></div><div class="hero-chart"><div class="chart-summary"><span>● LAST 14 DAYS</span><span>Completion ${pctDay(todayKey())}% today</span></div>${lineChart(dayDates.map(pctDay),dayDates.map(d=>asDate(d).getDate()),{hero:true,height:132})}</div></section>
  <section class="stats-grid">${statCard('Today’s progress',`${pctDay(todayKey())}%`,`${checkCount(todayKey())} of ${activeHabits().length} habits done`,'🎯')}${statCard('Current streak',`${streak()} days`,`${state.settings.streakTarget}%+ completion goal`,'🔥')}${statCard('Monthly success',`${pctMonth()}%`,month,'📈')}${statCard('Workouts logged',`${workoutsInMonth().length}`,`${totalWorkoutMins()} active minutes this month`,'🏋️')}</section>
  <div class="dashboard-grid"><div class="stack"><section class="panel"><div class="panel-head"><div><h2>${isToday?'Today’s':'Daily'} checklist</h2><p>Little habits create a big difference · ${date}</p></div><span class="tag">${checkCount(selectedDay)}/${activeHabits().length} DONE</span></div>${!isToday?`<div class="actions-row" style="margin-bottom:13px"><button class="btn btn-small btn-ghost" data-select-today>← Back to today</button></div>`:''}<div class="daily-habit-list">${dailyList()}</div><div class="actions-row section-gap"><button type="button" class="btn btn-secondary" data-open-habit>+ Add a habit</button><button type="button" class="btn btn-ghost" data-nav="habits">Monthly tracker ↗</button></div></section>${weekPanel()}</div><div class="stack">${waterPanel()}${leaderPanel()}</div></div>
  <section class="panel habit-calendar-card"><div class="panel-head"><div><h2>Your habit calendar</h2><p>A little progress, every single day</p></div>${monthSwitch()}</div>${calendarMatrix()}</section>`}
function habitManager(){return `<div class="habit-manage">${activeHabits().map(h=>`<div class="manage-row"><span class="habit-emoji ${safe(h.color)}">${safe(h.icon)}</span><span>${safe(h.name)}</span><button type="button" data-edit-habit="${safe(h.id)}" aria-label="Edit ${safe(h.name)}">✎ Edit</button><button type="button" class="remove" data-remove-habit="${safe(h.id)}" aria-label="Delete ${safe(h.name)}">×</button></div>`).join('')||'<div class="empty-state">No habits added yet.</div>'}</div>`}
function renderHabits(){const days=daysElapsed();return `${pageHeader('HABIT TRACKER',`Make consistency <em style="font-family:Georgia,serif;font-weight:400">a habit.</em>`,`Your month in checkboxes, just like your reference design.`,monthSwitch())}<div class="stats-grid">${statCard('Month complete',`${pctMonth()}%`,'Across all tracked habits','🌷')}${statCard('Habits tracked',activeHabits().length,'Customizable routines','💛')}${statCard('Days elapsed',days,shownMonthText(),'🗓️')}${statCard('Total checkmarks',countMonthCheck(),'Every check counts','✅')}</div><section class="panel"><div class="panel-head"><div><h2>Monthly habit tracker</h2><p>${safe(shownMonthText())} · tick the day you completed each habit</p></div><button type="button" class="btn btn-primary" data-open-habit>+ New habit</button></div>${calendarMatrix()}</section><div class="two-col section-gap"><section class="panel"><div class="panel-head"><div><h2>Weekly checkpoints</h2><p>Average completion across weeks</p></div></div><div class="ring-row">${[0,1,2].map((i)=>{const ds=monthDays().slice(i*7,i*7+7).filter(d=>d<=todayKey());const val=ds.length&&activeHabits().length?Math.round(ds.reduce((n,d)=>n+checkCount(d),0)/(ds.length*activeHabits().length)*100):0;return ring(val,`Week ${i+1}`,WEEKCOL[i])}).join('')}</div><div class="ring-row section-gap">${[3,4].map((i)=>{const ds=monthDays().slice(i*7,i*7+7).filter(d=>d<=todayKey());const val=ds.length&&activeHabits().length?Math.round(ds.reduce((n,d)=>n+checkCount(d),0)/(ds.length*activeHabits().length)*100):0;return ring(val,`Week ${i+1}`,WEEKCOL[i])}).join('')}</div></section><section class="panel"><div class="panel-head"><div><h2>Manage routines</h2><p>Edit or remove habits any time</p></div></div>${habitManager()}</section></div>`}
function exerciseRow(){const idx=document.querySelectorAll('.exercise-row').length;return `<div class="exercise-row"><label><span class="field-label">Exercise</span><input class="field-input ex-name" type="text" maxlength="70" placeholder="Bench press"></label><label><span class="field-label">Sets</span><input class="field-input ex-sets" type="number" min="1" max="100" placeholder="3" inputmode="numeric"></label><label><span class="field-label">Reps</span><input class="field-input ex-reps" type="number" min="1" max="500" placeholder="12" inputmode="numeric"></label><label><span class="field-label">Kg</span><input class="field-input ex-weight" type="number" min="0" max="3000" step="0.5" placeholder="40" inputmode="decimal"></label><button class="remove-exercise" type="button" data-remove-exercise aria-label="Remove exercise">×</button></div>`}
function renderWorkouts(){const workouts=[...state.workouts].sort((a,b)=>b.date.localeCompare(a.date)||num(b.createdAt)-num(a.createdAt));return `${pageHeader('TRAIN STRONG',`Workout <span style="color:var(--accent)">journal.</span>`,`Log a session, track your exercises, and keep getting stronger.`, `<span class="tag">${state.workouts.length} SESSIONS RECORDED</span>`)}<div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Log a workout 🏋️</h2><p>Record as much or as little detail as you need</p></div></div><form id="workoutForm"><div class="form-grid"><div><label class="field-label" for="woDate">Date</label><input class="field-input" type="date" id="woDate" max="${todayKey()}" value="${todayKey()}" required></div><div><label class="field-label" for="woType">Workout type</label><select class="field-input" id="woType"><option>Strength training</option><option>Cardio</option><option>Running</option><option>Cycling</option><option>Yoga</option><option>Sports</option><option>Other</option></select></div><div><label class="field-label" for="woDuration">Duration (minutes)</label><input class="field-input" type="number" id="woDuration" min="1" max="1440" placeholder="45" required inputmode="numeric"></div><div><label class="field-label" for="woNotes">Notes (optional)</label><input class="field-input" id="woNotes" maxlength="180" placeholder="Great energy today!"></div><div class="full"><div class="metric-line"><label class="field-label" style="margin:0">Exercises (optional)</label><button class="btn btn-small btn-secondary" data-add-exercise type="button">+ Add exercise</button></div><div class="exercise-rows" id="exerciseRows">${exerciseRow()}</div></div><div class="full"><button type="submit" class="btn btn-primary" style="width:100%">Save workout →</button></div></div></form></section><section class="panel"><div class="panel-head"><div><h2>Recent sessions</h2><p>All workouts saved on this device</p></div></div><div class="card-list">${workouts.length?workouts.map(w=>`<div class="activity-card"><span class="activity-emoji">${w.type==='Running'?'🏃':w.type==='Yoga'?'🧘':w.type==='Cycling'?'🚴':w.type==='Cardio'?'❤️':'🏋️'}</span><div class="activity-content"><strong>${safe(w.type)} <span class="activity-time">· ${num(w.duration)} min</span></strong><p>${fmtDate(w.date)}${w.exercises?.length?` · ${w.exercises.length} exercise${w.exercises.length>1?'s':''}`:''}</p>${w.exercises?.length?`<p>${safe(w.exercises.map(e=>e.name).join(', '))}</p>`:''}${w.notes?`<p>${safe(w.notes)}</p>`:''}</div><div class="activity-actions"><button type="button" class="icon-danger" data-delete-workout="${safe(w.id)}" aria-label="Delete workout">✕</button></div></div>`).join(''):`<div class="empty-state"><span class="empty-emoji">💪</span><strong>Your first workout starts here</strong><p>Log a training session to start a history.</p></div>`}</div></section></div>`}
function weightChart(){const arr=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-16);if(!arr.length)return `<div class="empty-state"><span class="empty-emoji">⚖️</span><strong>No weigh-ins yet</strong><p>Add a weight entry to see your trend.</p></div>`;if(arr.length===1)return `<div class="empty-state"><strong>${num(arr[0].kg)} kg</strong><p>Your first weigh-in was ${fmtDate(arr[0].date)}. Add one more to create a trend.</p></div>`;
  const W=700,H=205,L=43,R=22,T=16,B=28,lo=Math.floor(Math.min(...arr.map(x=>num(x.kg)))-1),hi=Math.ceil(Math.max(...arr.map(x=>num(x.kg)))+1),range=Math.max(hi-lo,1);
  const xy=arr.map((w,i)=>[L+i*(W-L-R)/(arr.length-1),T+(H-T-B)*(1-(num(w.kg)-lo)/range)]);
  const line=xy.map(([x,y],i)=>`${i?'L':'M'} ${x} ${y}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Body weight trend"><defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ccbc5" stop-opacity=".42"/><stop offset="1" stop-color="#9ccbc5" stop-opacity="0"/></linearGradient></defs><line x1="${L}" y1="${T}" x2="${W-R}" y2="${T}" stroke="var(--line)" stroke-dasharray="4"/><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="var(--line)" stroke-dasharray="4"/><text x="${L-7}" y="${T+4}" text-anchor="end" fill="var(--muted)" font-size="11">${hi}kg</text><text x="${L-7}" y="${H-B+4}" text-anchor="end" fill="var(--muted)" font-size="11">${lo}kg</text><path d="${line} L${xy.at(-1)[0]} ${H-B} L${L} ${H-B}Z" fill="url(#weightFill)"/><path d="${line}" fill="none" stroke="#58b4a4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="#58b4a4" stroke="var(--panel)" stroke-width="2"/>`).join('')}<text x="${L}" y="${H-5}" font-size="10" fill="var(--muted)">${fmtDate(arr[0].date,{day:'numeric',month:'short'})}</text><text x="${W-R}" y="${H-5}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtDate(arr.at(-1).date,{day:'numeric',month:'short'})}</text></svg>`}
function renderProgress(){const days=monthDays().filter(k=>k<=todayKey()),recentWeights=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date)),avgWater=days.length?Math.round(days.reduce((v,d)=>v+num(state.water[d]),0)/days.length):0;
  return `${pageHeader('THE BIGGER PICTURE',`Your progress <span style="color:var(--accent)">matters.</span>`,`No pressure, just a clearer view of what you've accomplished.`,monthSwitch())}<div class="stats-grid">${statCard('Habit completion',`${pctMonth()}%`,shownMonthText(),'✅')}${statCard('Minutes trained',totalWorkoutMins(),`${workoutsInMonth().length} workouts this month`,'⏱️')}${statCard('Avg daily water',`${avgWater} ml`,'Recorded average this month','💧')}${statCard('Latest weight',recentWeights.length?`${num(recentWeights[0].kg)} kg`:'—',recentWeights.length?fmtDate(recentWeights[0].date):'No entries yet','⚖️')}</div><div class="two-col"><section class="panel chart-panel"><div class="panel-head"><div><h2>Daily completion</h2><p>Habit success by day · ${shownMonthText()}</p></div><span class="tag">${pctMonth()}% AVG</span></div>${lineChart(days.map(pctDay),days.map(d=>asDate(d).getDate()),{height:235})}</section><section class="panel chart-panel"><div class="panel-head"><div><h2>Body weight trend</h2><p>Weight in kilograms · personal log</p></div></div>${weightChart()}</section></div><div class="two-col section-gap"><section class="panel"><div class="panel-head"><div><h2>Log your weight</h2><p>Optional. Track only what feels useful to you.</p></div></div><form id="weightForm" class="form-grid"><div><label class="field-label" for="weightDate">Date</label><input class="field-input" id="weightDate" type="date" max="${todayKey()}" value="${todayKey()}" required></div><div><label class="field-label" for="weightKg">Body weight (kg)</label><input class="field-input" id="weightKg" type="number" min="10" max="500" step="0.1" placeholder="72.5" required inputmode="decimal"></div><div><label class="field-label" for="weightWaist">Waist (cm) — optional</label><input class="field-input" id="weightWaist" type="number" min="20" max="300" step="0.1" placeholder="80" inputmode="decimal"></div><div style="display:flex;align-items:end"><button type="submit" class="btn btn-primary" style="height:42px;width:100%">Save weigh-in →</button></div></form></section><section class="panel"><div class="panel-head"><div><h2>Recent weigh-ins</h2><p>Your private measurement history</p></div></div><div class="card-list">${recentWeights.length?recentWeights.slice(0,10).map(w=>`<div class="activity-card"><span class="activity-emoji">⚖️</span><div class="activity-content"><strong>${num(w.kg)} kg</strong><p>${fmtDate(w.date)}${w.waist?` · Waist: ${num(w.waist)} cm`:''}</p></div><button type="button" class="icon-danger" data-delete-weight="${safe(w.id)}" aria-label="Delete weight entry">✕</button></div>`).join(''):`<div class="empty-state"><span class="empty-emoji">🌱</span><strong>Start whenever you're ready</strong><p>No measurements recorded yet.</p></div>`}</div></section></div>`}
function renderSettings(){return `${pageHeader('MAKE IT YOURS',`Your app, <span style="color:var(--accent)">your rules.</span>`,`Personalize goals, keep a backup, and manage your data.`)}<div class="two-col"><section class="panel"><div class="settings-section"><h3>Personal profile 👤</h3><p>Manage your name, age, gender, blood group, height and weight.</p><button type="button" class="btn btn-primary" data-nav="profile">View / edit my profile →</button></div><div class="settings-section"><h3>Daily goals ⚙️</h3><p>Adjust the goals that work for your routine.</p><form id="settingsForm"><div class="settings-grid"><div><label class="field-label" for="profileName">Your name (optional)</label><input class="field-input" id="profileName" maxlength="30" placeholder="What should we call you?" value="${safe(state.settings.name||'')}"></div><div><label class="field-label" for="waterGoal">Water target (ml / day)</label><input class="field-input" type="number" id="waterGoal" min="250" max="12000" step="250" value="${num(state.settings.waterGoal,2500)}" required inputmode="numeric"></div><div><label class="field-label" for="streakTarget">Daily streak threshold (%)</label><input class="field-input" type="number" id="streakTarget" min="1" max="100" step="1" value="${num(state.settings.streakTarget,70)}" required inputmode="numeric"></div><div style="display:flex;align-items:end"><button type="submit" class="btn btn-primary" style="width:100%;height:42px">Save settings</button></div></div></form></div><div class="settings-section"><h3>Data backup 🔐</h3><p>Nothing is uploaded. Your fitness entries are saved in this browser only. Export a backup before clearing browser data or switching devices.</p><div class="actions-row"><button type="button" class="btn btn-primary" data-export>↓ Export backup</button><button type="button" class="btn btn-ghost" data-import-trigger>↑ Import backup</button><input type="file" accept="application/json,.json" id="importFile" hidden></div></div><div class="settings-section"><h3>Start fresh</h3><p>Want to clear your tracking history? This action cannot be undone without a backup.</p><button type="button" class="btn btn-danger" data-reset>Delete all app data</button></div></section><section class="panel"><div class="panel-head"><div><h2>Install FitFlow on iPhone 📱</h2><p>Use it like a regular app from your Home Screen</p></div></div><div class="card-list"><div class="activity-card"><div class="activity-emoji">①</div><div class="activity-content"><strong>Open the hosted app in Safari</strong><p>App installation and offline mode require an HTTPS website. A downloaded HTML file is for preview only.</p></div></div><div class="activity-card"><div class="activity-emoji">②</div><div class="activity-content"><strong>Tap Share → Add to Home Screen</strong><p>In Safari, open the share menu, then choose Add to Home Screen.</p></div></div><div class="activity-card"><div class="activity-emoji">③</div><div class="activity-content"><strong>Open FitFlow from your Home Screen</strong><p>It will work offline after first successful website visit. Keep backups for safety.</p></div></div></div><div class="settings-section" style="margin-top:20px"><h3>About your data</h3><p>LocalStorage is private to this browser and website. Clearing Safari website data or changing website domains can erase access to entries. Export regularly.</p><div class="actions-row"><span class="tag">DEVICE-ONLY ACCOUNTS</span><span class="tag">NO TRACKERS</span><span class="tag">OFFLINE-READY</span></div></div></section></div>`}

// Device-only login supports separate local profiles; it is NOT secure remote authentication.
function authError(message){const el=$('#authError');el.textContent=message;el.hidden=!message}
function showAuth(mode='signup'){
  appUnlocked=false;
  document.body.classList.add('auth-locked');
  $('#authScreen').hidden=false;
  setAuthMode(mode);
}
function setAuthMode(mode){
  authMode=mode==='login'?'login':'signup';const signup=authMode==='signup';
  $('#signupFields').hidden=!signup;$('#signupProfileFields').hidden=!signup;$('#signupConfirmFields').hidden=!signup;$('#authConfirm').required=signup;
  $('#signupName').required=signup;
  $('#authPassword').autocomplete=signup?'new-password':'current-password';
  $('#authHeading').textContent=signup?'Create your account':'Welcome back!';
  $('#authSubheading').textContent=signup?'Set up your fitness profile to get started.':'Access your fitness data on this device.';
  $('#authSubmit').innerHTML=signup?'Create local account <span>→</span>':'Log in <span>→</span>';
  document.querySelectorAll('[data-auth-mode]').forEach(btn=>{const yes=btn.dataset.authMode===authMode;btn.classList.toggle('active',yes);btn.setAttribute('aria-selected',String(yes))});
  $('#migrateRow').hidden=!(signup && Boolean(localStorage.getItem(STORAGE_KEY)));
  authError('');
}
function unlockApp(account){
  activeAccount=account||null;
  appUnlocked=true;
  state=loadState();
  if(activeAccount && !state.settings.name){state.settings.name=activeAccount.name||'';state.profile.name=state.settings.name;save()}
  $('#authScreen').hidden=true;
  document.body.classList.remove('auth-locked');
  currentPage='today';selectedDay=todayKey();
  shownMonth={y:now().getFullYear(),m:now().getMonth()};render();
}
function setGuest(){localStorage.setItem(SESSION_KEY,'guest');unlockApp(null);toast('Guest mode: data stays on this device')}
function logout(){
  localStorage.removeItem(SESSION_KEY);activeAccount=null;appUnlocked=false;
  $('#authForm').reset();showAuth('login');window.scrollTo(0,0)
}
function base64(bytes){return btoa(String.fromCharCode(...bytes))}
async function derivePassword(password,salt){
  if(!crypto?.subtle)throw Error('Sign up needs a secure HTTPS page or localhost.');
  const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'},key,256);
  return base64(new Uint8Array(bits));
}
const bloodGroups=new Set(['A+','A-','B+','B-','AB+','AB-','O+','O-']);
const genderOptions=new Set(['Male','Female','Non-binary','Other','Prefer not to say']);
function validOptionalNumber(v,minimum,maximum,label){
  if(String(v).trim()==='')return '';
  const n=Number(v);if(!Number.isFinite(n)||n<minimum||n>maximum)throw Error(`Please enter a valid ${label}.`);
  return Math.round(n*10)/10;
}
function sanitizeProfile(raw){
  const age=validOptionalNumber(raw.age,1,120,'age');
  if(age!==''&&!Number.isInteger(age))throw Error('Age should be a whole number.');
  return {name:String(raw.name||'').trim().slice(0,60),age,gender:genderOptions.has(raw.gender)?raw.gender:'',bloodGroup:bloodGroups.has(raw.bloodGroup)?raw.bloodGroup:'',heightCm:validOptionalNumber(raw.heightCm,50,250,'height'),weightKg:validOptionalNumber(raw.weightKg,10,500,'weight')};
}
function profileFromSignup(){return sanitizeProfile({name:$('#signupName').value,age:$('#signupAge').value,gender:$('#signupGender').value,bloodGroup:$('#signupBlood').value,heightCm:$('#signupHeight').value,weightKg:$('#signupWeight').value})}
function setProfileOnState(profile,addWeight=false){
  state.profile=profile;state.settings.name=profile.name;
  if(addWeight && profile.weightKg!=='' && profile.weightKg!==null){
    const existing=state.weights.find(w=>w.date===todayKey());
    if(existing)existing.kg=Number(profile.weightKg);
    else state.weights.push({id:unique(),date:todayKey(),kg:Number(profile.weightKg),waist:0});
  }
}
async function submitAuth(){
  authError('');const email=$('#authEmail').value.trim().toLowerCase(),password=$('#authPassword').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){authError('Enter a valid email address.');return}
  if(password.length<8){authError('Password should be at least 8 characters.');return}
  if(authMode==='signup'&&password!==$('#authConfirm').value){authError('Passwords do not match.');return}
  const submit=$('#authSubmit');submit.disabled=true;submit.textContent='Please wait…';
  try{
    const users=accounts();
    if(authMode==='signup'){
      const profile=profileFromSignup();
      if(!profile.name){authError('Please enter your name.');return}
      if(users.some(u=>u.email===email)){authError('This email already has an account on this device. Log in instead.');return}
      const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await derivePassword(password,salt);
      const user={id:unique(),email,name:profile.name,salt:base64(salt),hash,createdAt:Date.now()};users.push(user);saveAccounts(users);
      const copyExisting=$('#migrateExisting').checked&&Boolean(localStorage.getItem(STORAGE_KEY));
      // A copy, never a move: old guest data stays intact for backup/recovery.
      activeAccount=user;
      const prior=copyExisting?localStorage.getItem(STORAGE_KEY):null;
      if(prior){localStorage.setItem(currentDataKey(),prior)}
      state=loadState();setProfileOnState(profile,Boolean(profile.weightKg));save();
      localStorage.setItem(SESSION_KEY,user.id);unlockApp(user);toast('Your local account is ready! 🎉');
    }else{
      const user=users.find(u=>u.email===email);
      if(!user){authError('Account not found on this device. Create one here.');return}
      const salt=Uint8Array.from(atob(user.salt),ch=>ch.charCodeAt(0));const hash=await derivePassword(password,salt);
      if(hash!==user.hash){authError('Incorrect password. Please try again.');return}
      localStorage.setItem(SESSION_KEY,user.id);unlockApp(user);toast(`Welcome back${user.name?', '+user.name:''}!`);
    }
  }catch(err){authError(err.message||'Unable to sign in. Please retry.')}finally{
    submit.disabled=false;submit.innerHTML=authMode==='signup'?'Create local account <span>→</span>':'Log in <span>→</span>';
  }
}
function startAuth(){
  const session=localStorage.getItem(SESSION_KEY);
  if(session==='guest'){unlockApp(null);return}
  const current=accounts().find(u=>u.id===session);
  if(current){unlockApp(current);return}
  if(localStorage.getItem(STORAGE_KEY) && !session){setGuest();return} // preserve old V1 users seamlessly
  showAuth('signup');
}
function profileValue(v,suffix=''){return v!==''&&v!==null&&v!==undefined?`${safe(v)}${suffix}`:'Not added'}
function renderProfile(){const p=getProfile();const initial=(p.name||activeAccount?.email||'F').trim().charAt(0).toUpperCase();return `${pageHeader('YOUR FITNESS IDENTITY','My <span style="color:var(--accent)">Profile</span>','Your details and measurements, all in one place.')}<div class="profile-layout"><section class="panel profile-overview"><div class="profile-avatar">${safe(initial)}</div><h2>${safe(p.name||'Fitness explorer')}</h2><p>${activeAccount?safe(activeAccount.email):'Guest profile · This device'}</p><span class="profile-local-badge">🔒 Device-only storage</span><div class="profile-highlights"><div><span>AGE</span><strong>${profileValue(p.age, ' yrs')}</strong></div><div><span>HEIGHT</span><strong>${profileValue(p.heightCm, ' cm')}</strong></div><div><span>WEIGHT</span><strong>${profileValue(p.weightKg, ' kg')}</strong></div><div><span>BLOOD GROUP</span><strong>${profileValue(p.bloodGroup)}</strong></div></div><p class="profile-privacy-note">Blood group, age and measurements are optional. They are saved only in this browser, not sent to a server.</p>${activeAccount?'<button class="btn btn-ghost profile-logout" type="button" data-logout>↪ Log out</button>':'<button class="btn btn-primary profile-logout" type="button" data-create-account>+ Create local account</button>'}</section><section class="panel profile-editor"><div class="panel-head"><div><h2>Edit personal details ✎</h2><p>Update your profile anytime.</p></div><span class="tag">FITNESS PROFILE</span></div><form id="profileForm"><div class="form-grid"><div class="full"><label class="field-label" for="editName">Full name</label><input class="field-input" id="editName" maxlength="60" value="${safe(p.name)}" required placeholder="Your full name"></div><div><label class="field-label" for="editAge">Age (years)</label><input class="field-input" type="number" min="1" max="120" id="editAge" value="${safe(p.age)}" placeholder="Age" inputmode="numeric"></div><div><label class="field-label" for="editGender">Gender</label><select class="field-input" id="editGender">${['','Male','Female','Non-binary','Other','Prefer not to say'].map(v=>`<option value="${safe(v)}" ${v===p.gender?'selected':''}>${v||'Select'}</option>`).join('')}</select></div><div><label class="field-label" for="editBlood">Blood group</label><select class="field-input" id="editBlood">${['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>`<option value="${safe(v)}" ${v===p.bloodGroup?'selected':''}>${v||'Unknown / skip'}</option>`).join('')}</select></div><div><label class="field-label" for="editHeight">Height (cm)</label><input class="field-input" type="number" min="50" max="250" step="0.1" id="editHeight" value="${safe(p.heightCm)}" placeholder="175" inputmode="decimal"></div><div><label class="field-label" for="editWeight">Weight (kg)</label><input class="field-input" type="number" min="10" max="500" step="0.1" id="editWeight" value="${safe(p.weightKg)}" placeholder="72.5" inputmode="decimal"></div><div class="full"><p class="form-note">If you change your weight, today's weigh-in will also be updated in Progress.</p></div><div class="full"><button type="submit" class="btn btn-primary profile-save">Save profile →</button></div></div></form></section></div>`}
function saveProfile(){
  try{const prev=getProfile();const next=sanitizeProfile({name:$('#editName').value,age:$('#editAge').value,gender:$('#editGender').value,bloodGroup:$('#editBlood').value,heightCm:$('#editHeight').value,weightKg:$('#editWeight').value});
    if(!next.name){toast('Please add your name.');return}
    setProfileOnState(next,next.weightKg!==''&&Number(next.weightKg)!==Number(prev.weightKg));
    if(activeAccount){activeAccount.name=next.name;saveAccounts(accounts().map(u=>u.id===activeAccount.id?{...u,name:next.name}:u))}
    save();render();toast('Profile saved ✓');
  }catch(err){toast(err.message||'Please check the profile details')}
}

function render(){if(!appUnlocked)return;updateSidebar();const root=$('#pageRoot');root.innerHTML=({today:renderToday,habits:renderHabits,workouts:renderWorkouts,progress:renderProgress,profile:renderProfile,settings:renderSettings})[currentPage]();document.querySelectorAll('.calendar-wrap').forEach(el=>el.scrollLeft=calendarScroll);}
function navigate(page){if(!['today','habits','workouts','progress','profile','settings'].includes(page))return;calendarScroll=0;currentPage=page;render();window.scrollTo({top:0,behavior:'smooth'})}
function changeMonth(delta){calendarScroll=0;const d=new Date(shownMonth.y,shownMonth.m+delta,1);shownMonth={y:d.getFullYear(),m:d.getMonth()};render()}
function toggleHabit(id,day){calendarScroll=document.querySelector('.calendar-wrap')?.scrollLeft||0;if(isFuture(day)){toast('Future dates cannot be marked complete');return}if(!activeHabits().some(h=>h.id===id)||!validKey(day))return;const rec=state.checks[day]||{};if(rec[id])delete rec[id];else rec[id]=true;if(Object.keys(rec).length)state.checks[day]=rec;else delete state.checks[day];save();render()}
function openHabit(id){const dlg=$('#habitDialog'),h=state.habits.find(x=>x.id===id);$('#habitDialogTitle').textContent=h?'Edit habit':'New habit';$('#habitId').value=h?.id||'';$('#habitName').value=h?.name||'';$('#habitIcon').value=h?.icon||'🏋️';if($('#habitIcon').value!== (h?.icon||'🏋️'))$('#habitIcon').value='✨';$('#habitColor').value=h?.color||'blue';dlg.showModal();$('#habitName').focus()}
function addExercise(){const rows=$('#exerciseRows');if(!rows)return;if(rows.children.length>=20){toast('Maximum 20 exercises per workout');return}rows.insertAdjacentHTML('beforeend',exerciseRow())}
function downloadBackup(){const file=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=`FitFlow-backup-${todayKey()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Backup downloaded')}
function importBackup(file){if(!file)return;if(file.size>3*1024*1024){toast('Backup is too large (max 3 MB)');return}file.text().then(txt=>{let imported;try{imported=JSON.parse(txt)}catch{return toast('This is not valid JSON')}if(!imported||!Array.isArray(imported.habits)||!imported.checks||typeof imported.checks!=='object'||Array.isArray(imported.checks)||!Array.isArray(imported.workouts)||!Array.isArray(imported.weights)||!imported.water||typeof imported.water!=='object'){toast('Not a valid FitFlow backup');return}
  if(!confirm('Import will replace all current FitFlow data on this device. Continue?'))return;
  const clean=makeFresh(),allowedColors=new Set(['blue','pink','mint','yellow','purple']);
  clean.habits=imported.habits.slice(0,200).filter(h=>h&&typeof h.id==='string'&&typeof h.name==='string').map(h=>({id:h.id.slice(0,100),name:h.name.slice(0,45),icon:typeof h.icon==='string'?h.icon.slice(0,12):'✨',color:allowedColors.has(h.color)?h.color:'blue',active:h.active!==false}));
  clean.checks=Object.fromEntries(Object.entries(imported.checks).filter(([k,v])=>validKey(k)&&v&&typeof v==='object'&&!Array.isArray(v)).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([id,on])=>on===true&&clean.habits.some(h=>h.id===id)))]));
  clean.water=Object.fromEntries(Object.entries(imported.water).filter(([k,v])=>validKey(k)&&Number.isFinite(+v)&&+v>=0&&+v<=25000));
  clean.workouts=imported.workouts.slice(0,5000).filter(w=>w&&validKey(w.date)&&typeof w.type==='string'&&num(w.duration)>=1).map(w=>({id:String(w.id||unique()).slice(0,100),date:w.date,type:w.type.slice(0,80),duration:clamp(num(w.duration),1,1440),createdAt:num(w.createdAt),notes:String(w.notes||'').slice(0,180),exercises:Array.isArray(w.exercises)?w.exercises.slice(0,20).map(e=>({name:String(e.name||'').slice(0,70),sets:clamp(num(e.sets),0,100),reps:clamp(num(e.reps),0,500),weight:clamp(num(e.weight),0,3000)})):[]}));
  clean.weights=imported.weights.slice(0,5000).filter(w=>w&&validKey(w.date)&&num(w.kg)>=10&&num(w.kg)<=500).map(w=>({id:String(w.id||unique()).slice(0,100),date:w.date,kg:num(w.kg),waist:clamp(num(w.waist),0,300)}));
  clean.profile=sanitizeProfile({...profileDefaults(),...(imported.profile||{}),name:String(imported.profile?.name||imported.settings?.name||'').slice(0,60)});
  clean.settings={...clean.settings,name:String(imported.settings?.name||'').slice(0,30),waterGoal:clamp(num(imported.settings?.waterGoal,2500),250,12000),streakTarget:clamp(num(imported.settings?.streakTarget,70),1,100),theme:imported.settings?.theme==='dark'?'dark':'light'};
  state=clean;save();render();toast('Backup imported successfully')
}).catch(()=>toast('Unable to read backup file'))}
function renderWorkoutSubmit(form){const date=$('#woDate').value,type=$('#woType').value,duration=Number($('#woDuration').value),notes=$('#woNotes').value.trim();if(!validKey(date)||isFuture(date)||!Number.isInteger(duration)||duration<1||duration>1440){toast('Check workout date and duration');return}const exercises=Array.from(document.querySelectorAll('.exercise-row')).map(row=>({name:row.querySelector('.ex-name').value.trim(),sets:num(row.querySelector('.ex-sets').value),reps:num(row.querySelector('.ex-reps').value),weight:num(row.querySelector('.ex-weight').value)})).filter(ex=>ex.name).map(ex=>({...ex,sets:clamp(ex.sets,0,100),reps:clamp(ex.reps,0,500),weight:clamp(ex.weight,0,3000)}));state.workouts.push({id:unique(),date,type,duration,notes,exercises,createdAt:Date.now()});save();render();toast('Workout saved! Keep going 💪')}
function saveWeight(){const date=$('#weightDate').value,kg=Number($('#weightKg').value),waist=$('#weightWaist').value?Number($('#weightWaist').value):0;if(!validKey(date)||isFuture(date)||!Number.isFinite(kg)||kg<10||kg>500||(waist&&(waist<20||waist>300))){toast('Please check your measurements');return}state.weights.push({id:unique(),date,kg,waist});save();render();toast('Measurement saved')}
function saveSettings(){const name=$('#profileName').value.trim().slice(0,30),waterGoal=Number($('#waterGoal').value),streakTarget=Number($('#streakTarget').value);if(!Number.isFinite(waterGoal)||waterGoal<250||waterGoal>12000||!Number.isFinite(streakTarget)||streakTarget<1||streakTarget>100){toast('Please check your goal values');return}state.settings={...state.settings,name,waterGoal,streakTarget};state.profile={...getProfile(),name};if(activeAccount){activeAccount.name=name;saveAccounts(accounts().map(u=>u.id===activeAccount.id?{...u,name}:u))}save();render();toast('Settings saved')}
// One delegated handler keeps controls working after each page renders.
document.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.matches('[data-close-dialog]')){e.preventDefault();$('#habitDialog').close();return}
  if(btn.hasAttribute('data-nav')){navigate(btn.dataset.nav);return}
  if(btn.id==='accountButton'){navigate('profile');return}
  if(btn.hasAttribute('data-logout')){logout();return}
  if(btn.hasAttribute('data-create-account')){showAuth('signup');return}
  if(btn.hasAttribute('data-open-habit')){openHabit();return}
  if(btn.hasAttribute('data-month-delta')){changeMonth(+btn.dataset.monthDelta);return}
  if(btn.hasAttribute('data-select-today')){selectedDay=todayKey();render();return}
  if(btn.hasAttribute('data-toggle-habit')){toggleHabit(btn.dataset.toggleHabit,btn.dataset.date);return}
  if(btn.hasAttribute('data-water')){const diff=+btn.dataset.water;state.water[selectedDay]=Math.max(0,Math.min(25000,num(state.water[selectedDay])+diff));save();render();return}
  if(btn.hasAttribute('data-edit-habit')){openHabit(btn.dataset.editHabit);return}
  if(btn.hasAttribute('data-remove-habit')){const h=state.habits.find(h=>h.id===btn.dataset.removeHabit);if(h&&confirm(`Delete "${h.name}" and its history?`)){state.habits=state.habits.filter(x=>x.id!==h.id);for(const rec of Object.values(state.checks))delete rec[h.id];save();render();toast('Habit deleted')}return}
  if(btn.hasAttribute('data-add-exercise')){addExercise();return}
  if(btn.hasAttribute('data-remove-exercise')){const rows=$('#exerciseRows');if(rows?.children.length===1){rows.querySelectorAll('input').forEach(x=>x.value='')}else btn.closest('.exercise-row').remove();return}
  if(btn.hasAttribute('data-delete-workout')){if(confirm('Delete this workout?')){state.workouts=state.workouts.filter(w=>w.id!==btn.dataset.deleteWorkout);save();render();toast('Workout removed')}return}
  if(btn.hasAttribute('data-delete-weight')){if(confirm('Delete this weigh-in?')){state.weights=state.weights.filter(w=>w.id!==btn.dataset.deleteWeight);save();render();toast('Weigh-in removed')}return}
  if(btn.hasAttribute('data-export')){downloadBackup();return}
  if(btn.hasAttribute('data-import-trigger')){$('#importFile').click();return}
  if(btn.hasAttribute('data-reset')){if(confirm('Delete ALL fitness data, workout logs and habits? This cannot be undone.')&&confirm('Final confirmation: permanently clear everything?')){const keepTheme=state.settings.theme;state=makeFresh();state.settings.theme=keepTheme;selectedDay=todayKey();shownMonth={y:now().getFullYear(),m:now().getMonth()};save();render();toast('App reset to a clean start')}return}
  if(btn.id==='themeButton'){state.settings.theme=state.settings.theme==='dark'?'light':'dark';save();render();return}
});
document.addEventListener('submit',e=>{
  if(e.target.id==='habitForm'){e.preventDefault();const id=$('#habitId').value,name=$('#habitName').value.trim(),icon=$('#habitIcon').value,color=$('#habitColor').value;if(!name)return toast('Please enter a habit name');if(id){const h=state.habits.find(h=>h.id===id);if(h)Object.assign(h,{name,icon,color})}else if(state.habits.length>=50){return toast('Maximum 50 habits supported')}else state.habits.push({id:unique(),name,icon,color});save();$('#habitDialog').close();render();toast(id?'Habit updated':'New habit added');return}
  if(e.target.id==='workoutForm'){e.preventDefault();renderWorkoutSubmit(e.target);return}
  if(e.target.id==='weightForm'){e.preventDefault();saveWeight();return}
  if(e.target.id==='settingsForm'){e.preventDefault();saveSettings();return}
  if(e.target.id==='profileForm'){e.preventDefault();saveProfile();return}
  if(e.target.id==='authForm'){e.preventDefault();submitAuth();return}
});
document.addEventListener('change',e=>{if(e.target.id==='importFile'){importBackup(e.target.files?.[0]);e.target.value=''}});
document.querySelector('#habitDialog').addEventListener('click',e=>{if(e.target===$('#habitDialog'))$('#habitDialog').close()});
document.querySelectorAll('[data-auth-mode]').forEach(btn=>btn.addEventListener('click',()=>setAuthMode(btn.dataset.authMode)));
$('#guestButton').addEventListener('click',setGuest);
$('#passwordToggle').addEventListener('click',()=>{const input=$('#authPassword');const showing=input.type==='password';input.type=showing?'text':'password';$('#passwordToggle').textContent=showing?'Hide':'Show';$('#passwordToggle').setAttribute('aria-label',showing?'Hide password':'Show password')});
startAuth();
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline mode unavailable',err)))}
