const $ = (s) => document.querySelector(s);
const planDays = $('#planDays');
const dailyCap = $('#dailyCap');
const generateBtn = $('#generateBtn');
const resetBtn = $('#resetBtn');
const dayIndex = $('#dayIndex');
const dayPicker = $('#dayPicker');
const todayList = $('#todayList');
const timerSubject = $('#timerSubject');
const startTimerBtn = $('#startTimerBtn');
const pauseTimerBtn = $('#pauseTimerBtn');
const resumeTimerBtn = $('#resumeTimerBtn');
const stopTimerBtn = $('#stopTimerBtn');
const timerLine = $('#timerLine');
const photoInput = $('#photoInput');
const photoNote = $('#photoNote');
const savePhotoBtn = $('#savePhotoBtn');
const photoWall = $('#photoWall');
const summary = $('#summary');
const progressBySubject = $('#progressBySubject');
const timeBySubject = $('#timeBySubject');

const K_PLAN = 'plan_v3';
const K_PHOTO = 'photo_v3';
const K_TIME = 'time_v3';

let bank = [];
let timer = { status: 'idle', subject: '', startAt: 0, accMs: 0, tickId: null };

const fmt = (ms) => {
  const s = Math.floor(ms / 1000); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
};

async function init() {
  bank = await (await fetch('./data/homework.json')).json();
  initSubjectSelect();
  renderToday();
  renderPhotos();
  renderSummary();
}

function initSubjectSelect() {
  const subjects = [...new Set(bank.map(x => x.subject))];
  timerSubject.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function stableTasks() {
  return [...bank].sort((a,b)=>`${a.subject}-${a.id}`.localeCompare(`${b.subject}-${b.id}`));
}

function buildPlan(days, cap) {
  const tasks = stableTasks();
  const totalSlots = days * cap;
  const expanded = Array.from({ length: totalSlots }, (_, i) => tasks[i % tasks.length]);
  const plan = [];
  for (let d = 1; d <= days; d++) {
    const slice = expanded.slice((d-1)*cap, d*cap);
    plan.push({
      day: d,
      tasks: slice.map((q, idx) => ({
        uid: `D${d}-${idx+1}-${q.id}`,
        subject: q.subject,
        title: q.stem.slice(0, 28),
        sourceId: q.id,
        done: false,
        carryOver: false,
      }))
    });
  }
  const state = { days, cap, generatedAt: new Date().toISOString(), strategy: 'stable-round-robin', plan };
  localStorage.setItem(K_PLAN, JSON.stringify(state));
}

function getPlan() { return JSON.parse(localStorage.getItem(K_PLAN) || 'null'); }
function getTime() { return JSON.parse(localStorage.getItem(K_TIME) || '{}'); }

function getDayTasksWithCarry(s, d) {
  const current = s.plan[d-1]?.tasks || [];
  const carry = [];
  for (let i=0; i<d-1; i++) {
    for (const t of s.plan[i].tasks) if (!t.done) carry.push({ ...t, carryOver: true });
  }
  return [...carry, ...current].slice(0, s.cap);
}

function updateTaskDone(uid, checked, day) {
  const s = getPlan(); if (!s) return;
  const inDay = s.plan[day-1].tasks.find(t => t.uid === uid);
  if (inDay) inDay.done = checked;
  else {
    // carryOver task: mark at original day
    for (const d of s.plan) {
      const t = d.tasks.find(x => x.uid === uid);
      if (t) { t.done = checked; break; }
    }
  }
  localStorage.setItem(K_PLAN, JSON.stringify(s));
  renderToday(); renderSummary();
}

function renderToday() {
  const s = getPlan();
  if (!s) { todayList.innerHTML = '<li>未生成计划，请先点击“生成学习计划”。</li>'; return; }
  const d = Math.min(Math.max(1, Number(dayPicker.value || 1)), s.days);
  dayPicker.max = s.days; dayPicker.value = d; dayIndex.textContent = d;
  const tasks = getDayTasksWithCarry(s, d);
  todayList.innerHTML = tasks.map(t => `<li><label><input type='checkbox' data-uid='${t.uid}' ${t.done?'checked':''}/> <span class='${t.done?'done':''}'>[${t.subject}] ${t.title}${t.carryOver?'（顺延）':''}</span></label></li>`).join('') || '<li>当日无任务</li>';
  [...todayList.querySelectorAll('input[type=checkbox]')].forEach(el => el.onchange = () => updateTaskDone(el.dataset.uid, el.checked, d));
}

function renderPhotos() {
  const list = JSON.parse(localStorage.getItem(K_PHOTO) || '[]');
  photoWall.innerHTML = list.length ? list.slice().reverse().map(x => `<div class='photo-card'><img src='${x.img}'/><div>Day ${x.day} · ${x.time}</div><small>${x.note||''}</small></div>`).join('') : '<small>暂无拍照打卡</small>';
}

function renderSummary() {
  const s = getPlan();
  if (!s) { summary.textContent = '暂无数据'; progressBySubject.innerHTML=''; timeBySubject.innerHTML=''; return; }
  const all = s.plan.flatMap(x=>x.tasks);
  const done = all.filter(x=>x.done).length;
  summary.textContent = `总任务 ${all.length}，完成 ${done}，完成率 ${Math.round((done*100)/(all.length||1))}%`;
  const map = {};
  for (const t of all) { map[t.subject] ??= { total:0, done:0 }; map[t.subject].total++; if (t.done) map[t.subject].done++; }
  progressBySubject.innerHTML = Object.entries(map).map(([k,v]) => `<li>${k}：${v.done}/${v.total}</li>`).join('');
  const tm = getTime();
  timeBySubject.innerHTML = Object.entries(tm).map(([k,v]) => `<li>${k}累计用时：${Math.round(v/60000)} 分钟</li>`).join('') || '<li>暂无计时数据</li>';
}

function readFileWithRetry(file, retries=1) {
  return new Promise((resolve, reject) => {
    const run = (left) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => left > 0 ? run(left-1) : reject(new Error('读取失败'));
      r.readAsDataURL(file);
    };
    run(retries);
  });
}

generateBtn.onclick = () => {
  buildPlan(Number(planDays.value), Number(dailyCap.value));
  dayPicker.value = 1;
  renderToday(); renderSummary();
};

resetBtn.onclick = () => {
  localStorage.removeItem(K_PLAN); localStorage.removeItem(K_PHOTO); localStorage.removeItem(K_TIME);
  timer = { status: 'idle', subject: '', startAt: 0, accMs: 0, tickId: null };
  timerLine.textContent = '未开始';
  renderToday(); renderPhotos(); renderSummary();
};

dayPicker.onchange = renderToday;

startTimerBtn.onclick = () => {
  if (timer.status === 'running') return;
  timer.subject = timerSubject.value;
  timer.status = 'running';
  timer.startAt = Date.now();
  clearInterval(timer.tickId);
  timer.tickId = setInterval(() => {
    const nowMs = timer.accMs + (Date.now() - timer.startAt);
    timerLine.textContent = `${timer.subject} 计时中 ${fmt(nowMs)}`;
  }, 500);
};

pauseTimerBtn.onclick = () => {
  if (timer.status !== 'running') return;
  timer.accMs += Date.now() - timer.startAt;
  timer.status = 'paused';
  clearInterval(timer.tickId);
  timerLine.textContent = `${timer.subject} 已暂停 ${fmt(timer.accMs)}`;
};

resumeTimerBtn.onclick = () => {
  if (timer.status !== 'paused') return;
  timer.status = 'running';
  timer.startAt = Date.now();
  clearInterval(timer.tickId);
  timer.tickId = setInterval(() => {
    const nowMs = timer.accMs + (Date.now() - timer.startAt);
    timerLine.textContent = `${timer.subject} 计时中 ${fmt(nowMs)}`;
  }, 500);
};

stopTimerBtn.onclick = () => {
  if (!['running','paused'].includes(timer.status)) return;
  if (timer.status === 'running') timer.accMs += Date.now() - timer.startAt;
  clearInterval(timer.tickId);
  const tm = getTime();
  tm[timer.subject] = (tm[timer.subject] || 0) + timer.accMs;
  localStorage.setItem(K_TIME, JSON.stringify(tm));
  timerLine.textContent = `${timer.subject} 本次 ${fmt(timer.accMs)}，已累计`;
  timer = { status: 'idle', subject: '', startAt: 0, accMs: 0, tickId: null };
  renderSummary();
};

savePhotoBtn.onclick = async () => {
  const file = photoInput.files?.[0];
  if (!file) return alert('请先拍照/选图');
  if (!file.type.startsWith('image/')) return alert('仅支持图片格式');
  if (file.size > 5 * 1024 * 1024) return alert('图片过大，请控制在5MB以内');
  try {
    const img = await readFileWithRetry(file, 1);
    const list = JSON.parse(localStorage.getItem(K_PHOTO) || '[]');
    list.push({ day: Number(dayPicker.value||1), img, note: photoNote.value.trim(), time: new Date().toLocaleString('zh-CN') });
    localStorage.setItem(K_PHOTO, JSON.stringify(list.slice(-80)));
    photoInput.value = ''; photoNote.value = '';
    renderPhotos();
  } catch (e) {
    alert('保存失败，请重试');
  }
};

init();