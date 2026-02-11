const subjectFilter = document.querySelector('#subjectFilter');
const levelFilter = document.querySelector('#levelFilter');
const timerSelect = document.querySelector('#timerSelect');
const startBtn = document.querySelector('#startBtn');
const reviewBtn = document.querySelector('#reviewBtn');
const quizPanel = document.querySelector('#quizPanel');
const resultPanel = document.querySelector('#resultPanel');
const qIndex = document.querySelector('#qIndex');
const qTag = document.querySelector('#qTag');
const timerLine = document.querySelector('#timerLine');
const qStem = document.querySelector('#qStem');
const qPassage = document.querySelector('#qPassage');
const qOptions = document.querySelector('#qOptions');
const qTextAnswer = document.querySelector('#qTextAnswer');
const submitBtn = document.querySelector('#submitBtn');
const nextBtn = document.querySelector('#nextBtn');
const feedback = document.querySelector('#feedback');
const scoreLine = document.querySelector('#scoreLine');
const wrongList = document.querySelector('#wrongList');
const restartBtn = document.querySelector('#restartBtn');
const parentStats = document.querySelector('#parentStats');

let bank = [];
let queue = [];
let idx = 0;
let score = 0;
let wrong = [];
let selected = null;
let startAt = 0;
let timerId = null;
let limitMs = 0;

const KEY = 'homework_stats_v1';
const shuffle = (arr) => arr.map(v => ({ v, r: Math.random() })).sort((a,b)=>a.r-b.r).map(x=>x.v);

function formatTime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderStats() {
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!list.length) {
    parentStats.textContent = '暂无练习记录';
    return;
  }
  const total = list.length;
  const avg = Math.round(list.reduce((a,b)=>a+b.accuracy,0) / total);
  const latest = list[list.length - 1];
  parentStats.textContent = `累计 ${total} 次｜平均正确率 ${avg}%｜最近：${latest.subject} ${latest.score}/${latest.total}，用时 ${latest.duration}`;
}

function saveStats() {
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const total = queue.length || 1;
  const subject = subjectFilter.value === 'all' ? '综合' : subjectFilter.value;
  list.push({
    date: new Date().toISOString(),
    subject,
    score,
    total,
    accuracy: Math.round(score * 100 / total),
    duration: formatTime(Date.now() - startAt),
    wrong: wrong.length,
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(-100)));
  renderStats();
}

async function init() {
  const res = await fetch('./data/homework.json');
  bank = await res.json();
  const subjects = ['all', ...new Set(bank.map(q => q.subject))];
  subjectFilter.innerHTML = subjects.map(s => `<option value="${s}">${s === 'all' ? '全部' : s}</option>`).join('');
  renderStats();
}

function buildQueue(onlyWrong = false) {
  const s = subjectFilter.value;
  const lv = levelFilter.value;
  let base = onlyWrong ? wrong.map(w => w.raw) : bank;
  if (s !== 'all') base = base.filter(q => q.subject === s);
  if (lv !== 'all') base = base.filter(q => q.level === lv);
  queue = shuffle(base);
}

function showQuestion() {
  if (!queue.length || idx >= queue.length) return finish();
  const q = queue[idx];
  selected = null;
  feedback.textContent = '';
  feedback.className = 'feedback';
  qIndex.textContent = `第 ${idx + 1} / ${queue.length} 题`;
  qTag.textContent = `${q.subject} · ${q.type}`;
  qStem.textContent = q.stem;

  if (q.passage) {
    qPassage.hidden = false;
    qPassage.textContent = q.passage;
  } else qPassage.hidden = true;

  qOptions.innerHTML = '';
  qTextAnswer.hidden = true;
  qTextAnswer.value = '';
  submitBtn.hidden = false;
  nextBtn.hidden = true;

  if (q.type === 'choice') {
    q.options.forEach((opt, i) => {
      const el = document.createElement('button');
      el.className = 'opt';
      el.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
      el.onclick = () => {
        [...qOptions.children].forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        selected = i;
      };
      qOptions.appendChild(el);
    });
  } else {
    qTextAnswer.hidden = false;
    qTextAnswer.placeholder = q.type === 'fill' ? '填空答案（可多个，用分号分隔）' : '请输入你的解题过程/答案';
  }
}

function suggestScore(input, q) {
  const hit = (q.accept || []).filter(k => input.includes(k)).length;
  if (!input || input.length < 4) return 20;
  if (!q.accept?.length) return Math.min(95, 60 + Math.min(35, Math.floor(input.length / 8) * 5));
  return Math.min(100, 40 + hit * 20 + Math.min(20, Math.floor(input.length / 20) * 5));
}

function checkAnswer() {
  const q = queue[idx];
  let ok = false;

  if (q.type === 'choice') {
    if (selected === null) return alert('请先选择一个选项');
    ok = selected === q.answer;
    [...qOptions.children].forEach((el, i) => {
      if (i === q.answer) el.classList.add('correct');
      if (i === selected && i !== q.answer) el.classList.add('wrong');
      el.disabled = true;
    });
  } else {
    const input = qTextAnswer.value.trim();
    if (!input) return alert('请输入答案');
    ok = (q.accept || []).some(ans => input.replace(/\s/g, '').includes(ans.replace(/\s/g, '')));
    if (q.type === 'short') {
      const s = suggestScore(input, q);
      feedback.textContent = `📝 建议评分：${s}/100（家长参考）`;
    }
  }

  if (ok) {
    score++;
    feedback.className = 'feedback ok';
    feedback.textContent += `${feedback.textContent ? '｜' : ''}✅ 正确。${q.explain ? ' 解析：' + q.explain : ''}`;
  } else {
    feedback.className = 'feedback bad';
    feedback.textContent += `${feedback.textContent ? '｜' : ''}❌ 不正确。参考答案：${q.answerText || ''}${q.explain ? '；解析：' + q.explain : ''}`;
    wrong.push({ id: q.id, stem: q.stem, answerText: q.answerText, raw: q });
  }

  submitBtn.hidden = true;
  nextBtn.hidden = false;
}

function finish(fromTimeout = false) {
  clearInterval(timerId);
  quizPanel.hidden = true;
  resultPanel.hidden = false;
  scoreLine.textContent = `${fromTimeout ? '⏰ 时间到。' : ''}本轮得分：${score} / ${queue.length}（正确率 ${queue.length ? Math.round(score*100/queue.length) : 0}%），用时 ${formatTime(Date.now()-startAt)}`;
  wrongList.innerHTML = wrong.length
    ? wrong.map((w, i) => `<li>${i + 1}. ${w.stem}<br/>答案：${w.answerText}</li>`).join('')
    : '<li>本轮全对，表现非常好！</li>';
  saveStats();
}

function startTimer() {
  clearInterval(timerId);
  limitMs = Number(timerSelect.value) * 60 * 1000;
  if (!limitMs) {
    timerLine.textContent = '不限时';
    return;
  }
  timerId = setInterval(() => {
    const left = limitMs - (Date.now() - startAt);
    timerLine.textContent = `剩余 ${formatTime(left)}`;
    if (left <= 0) finish(true);
  }, 500);
}

startBtn.onclick = () => {
  wrong = [];
  idx = 0;
  score = 0;
  startAt = Date.now();
  resultPanel.hidden = true;
  quizPanel.hidden = false;
  buildQueue(false);
  startTimer();
  showQuestion();
};

reviewBtn.onclick = () => {
  if (!wrong.length) return alert('当前没有错题可复习，请先完成一轮练习。');
  idx = 0;
  score = 0;
  startAt = Date.now();
  resultPanel.hidden = true;
  quizPanel.hidden = false;
  buildQueue(true);
  startTimer();
  showQuestion();
};

submitBtn.onclick = checkAnswer;
nextBtn.onclick = () => { idx++; showQuestion(); };
restartBtn.onclick = () => startBtn.click();

init();