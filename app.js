const planDays = document.querySelector('#planDays');
const dailyCap = document.querySelector('#dailyCap');
const generateBtn = document.querySelector('#generateBtn');
const resetBtn = document.querySelector('#resetBtn');
const dayIndex = document.querySelector('#dayIndex');
const dayPicker = document.querySelector('#dayPicker');
const todayList = document.querySelector('#todayList');
const startTimerBtn = document.querySelector('#startTimerBtn');
const stopTimerBtn = document.querySelector('#stopTimerBtn');
const timerLine = document.querySelector('#timerLine');
const photoInput = document.querySelector('#photoInput');
const photoNote = document.querySelector('#photoNote');
const savePhotoBtn = document.querySelector('#savePhotoBtn');
const photoWall = document.querySelector('#photoWall');
const summary = document.querySelector('#summary');
const progressBySubject = document.querySelector('#progressBySubject');

const K_PLAN = 'plan_v2';
const K_PHOTO = 'photo_v2';
let bank = [];
let timerId = null;
let startAt = 0;

const fmt = (ms) => {
  const s = Math.floor(ms / 1000); const m = String(Math.floor(s/60)).padStart(2,'0'); const r = String(s%60).padStart(2,'0');
  return `${m}:${r}`;
};

async function init(){
  bank = await (await fetch('./data/homework.json')).json();
  renderToday();
  renderPhotos();
  renderSummary();
}

function buildPlan(days, cap){
  const bySubject = bank.reduce((m,q)=>((m[q.subject]??=[]).push(q),m),{});
  const subjects = Object.keys(bySubject);
  const plan = Array.from({length: days}, (_,i)=>({day:i+1,tasks:[]}));
  let p = 0;
  for (const d of plan){
    for(let j=0;j<cap;j++){
      const s = subjects[p % subjects.length];
      const arr = bySubject[s];
      const item = arr[(d.day + j) % arr.length];
      d.tasks.push({
        id: `${d.day}-${j}-${item.id}`,
        subject: s,
        title: item.stem.slice(0,26),
        done: false,
        minutes: 0
      });
      p++;
    }
  }
  localStorage.setItem(K_PLAN, JSON.stringify({days, cap, plan, updatedAt: new Date().toISOString()}));
}

function getState(){ return JSON.parse(localStorage.getItem(K_PLAN)||'null'); }

function renderToday(){
  const s = getState();
  if(!s){ todayList.innerHTML = '<li>未生成计划，请先点击“生成学习计划”。</li>'; return; }
  const d = Math.min(Math.max(1, Number(dayPicker.value||1)), s.days);
  dayPicker.max = s.days; dayPicker.value = d; dayIndex.textContent = d;
  const current = s.plan[d-1];
  todayList.innerHTML = current.tasks.map(t=>`<li><label><input type='checkbox' data-id='${t.id}' ${t.done?'checked':''}/> <span class='${t.done?'done':''}'>[${t.subject}] ${t.title}（用时 ${t.minutes} 分）</span></label></li>`).join('');
  [...todayList.querySelectorAll('input[type=checkbox]')].forEach(el=>el.onchange=()=>{
    const id = el.dataset.id;
    for(const day of s.plan){ for(const t of day.tasks){ if(t.id===id){ t.done = el.checked; } } }
    localStorage.setItem(K_PLAN, JSON.stringify(s));
    renderToday(); renderSummary();
  });
}

function renderPhotos(){
  const list = JSON.parse(localStorage.getItem(K_PHOTO)||'[]');
  photoWall.innerHTML = list.length ? list.slice().reverse().map(x=>`<div class='photo-card'><img src='${x.img}'/><div>Day ${x.day} · ${x.time}</div><small>${x.note||''}</small></div>`).join('') : '<small>暂无拍照打卡</small>';
}

function renderSummary(){
  const s = getState();
  if(!s){ summary.textContent = '暂无数据'; progressBySubject.innerHTML=''; return; }
  const all = s.plan.flatMap(d=>d.tasks);
  const done = all.filter(x=>x.done).length;
  summary.textContent = `总任务 ${all.length}，已完成 ${done}，完成率 ${Math.round(done*100/(all.length||1))}%`;
  const m = {};
  for(const t of all){ m[t.subject] ??= {total:0, done:0}; m[t.subject].total++; if(t.done) m[t.subject].done++; }
  progressBySubject.innerHTML = Object.entries(m).map(([k,v])=>`<li>${k}：${v.done}/${v.total}</li>`).join('');
}

generateBtn.onclick = ()=>{ buildPlan(Number(planDays.value), Number(dailyCap.value)); dayPicker.value=1; renderToday(); renderSummary(); };
resetBtn.onclick = ()=>{ localStorage.removeItem(K_PLAN); localStorage.removeItem(K_PHOTO); renderToday(); renderPhotos(); renderSummary(); timerLine.textContent='未开始'; };
dayPicker.onchange = renderToday;

startTimerBtn.onclick = ()=>{
  const s = getState(); if(!s) return alert('请先生成计划');
  startAt = Date.now();
  clearInterval(timerId);
  timerId = setInterval(()=>{ timerLine.textContent = `计时中 ${fmt(Date.now()-startAt)}`; }, 500);
};

stopTimerBtn.onclick = ()=>{
  const s = getState(); if(!s || !startAt) return;
  clearInterval(timerId);
  const mins = Math.max(1, Math.round((Date.now()-startAt)/60000));
  const d = Number(dayPicker.value||1);
  if(s.plan[d-1]?.tasks?.length){ s.plan[d-1].tasks[0].minutes += mins; }
  localStorage.setItem(K_PLAN, JSON.stringify(s));
  timerLine.textContent = `本次 ${mins} 分钟（已记入Day ${d}首任务）`;
  startAt = 0;
  renderToday(); renderSummary();
};

savePhotoBtn.onclick = ()=>{
  const f = photoInput.files?.[0];
  if(!f) return alert('请先拍照/选择图片');
  const r = new FileReader();
  r.onload = ()=>{
    const list = JSON.parse(localStorage.getItem(K_PHOTO)||'[]');
    list.push({ day:Number(dayPicker.value||1), img:r.result, note:photoNote.value.trim(), time:new Date().toLocaleString('zh-CN') });
    localStorage.setItem(K_PHOTO, JSON.stringify(list.slice(-60)));
    photoInput.value=''; photoNote.value=''; renderPhotos();
  };
  r.readAsDataURL(f);
};

init();