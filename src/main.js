/* 老板成长中枢 · 交互逻辑 */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmtDate = d => d.toLocaleDateString('sv'); // 本地 YYYY-MM-DD；绝不用 toISOString（UTC 会让夜班用户的日期差一天）

/* ================= 今日修炼（每日打卡 + 连续天数） ================= */
const DAILY_KEY = 'boss_daily_v1', DAYS_KEY = 'boss_days_v1';
const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD 本地日期
const dBoxes = $$('input[data-d]');
let dailyState = {};
try {
  const raw = JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
  if (raw.date === today) dailyState = raw.done || {};
} catch {}
function saveDaily() {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, done: dailyState })); } catch {}
}
function getDoneDays() {
  try { return new Set(JSON.parse(localStorage.getItem(DAYS_KEY)) || []); } catch { return new Set(); }
}
function calcStreak(days) {
  let streak = 0;
  const d = new Date();
  // 今天没完成不打断连击（从昨天往回数）
  if (!days.has(d.toLocaleDateString('sv'))) d.setDate(d.getDate() - 1);
  while (days.has(d.toLocaleDateString('sv'))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function refreshDaily() {
  const done = dBoxes.filter(b => b.checked).length;
  $('#dcount').textContent = `${done} / ${dBoxes.length}`;
  $('#dpct').textContent = Math.round(done / dBoxes.length * 100) + '%';
  $('#dbar').style.width = (done / dBoxes.length * 100) + '%';
  const days = getDoneDays();
  if (done === dBoxes.length) { days.add(today); } else { days.delete(today); }
  try { localStorage.setItem(DAYS_KEY, JSON.stringify([...days])); } catch {}
  $('#streak').textContent = calcStreak(days) + ' 天';
}
dBoxes.forEach(b => {
  b.checked = !!dailyState[b.dataset.d];
  b.addEventListener('change', () => {
    dailyState[b.dataset.d] = b.checked;
    saveDaily(); refreshDaily();
  });
});
refreshDaily();

// 跨模块自动打勾：在其他模块完成动作时调用
function setDaily(key) {
  const b = document.querySelector(`input[data-d="${key}"]`);
  if (!b || b.checked) return;
  b.checked = true;
  dailyState[key] = true;
  saveDaily(); refreshDaily();
}

/* 每周轮修：高亮今天的支线 */
(function () {
  const rows = $$('#daily [data-day]');
  if (!rows.length) return;
  const dow = new Date().getDay();
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  rows.forEach(r => {
    if (+r.dataset.day === dow) {
      r.style.borderColor = 'var(--gold)';
      r.style.background = 'rgba(212,175,55,.08)';
    }
  });
  const lbl = $('#rot-label');
  if (lbl) lbl.textContent = names[dow];
})();

/* ================= 老板五问 ================= */
const QUESTIONS = [
  { q: '这件事动了谁的钱？', hint: '先写新闻标题，再回答：谁会因此赚钱 / 亏钱？补贴、订单、股价、工资——钱永远是最诚实的线索。' },
  { q: '谁是赢家，谁是输家？', hint: '把受影响的各方列出来：公司、员工、消费者、政府、竞争对手。各得其所还是有人出局？' },
  { q: '势在往哪边推？', hint: '政策方向、技术趋势、人口结构——这件事是顺着大潮还是逆着大潮？' },
  { q: '跟我的粤语 TTS 计划有什么关系？', hint: '机会、威胁、还是无关？能利用的政策？要避开的坑？写不出关系也要写下「暂无直接关系」。' },
  { q: '我现在能做的一个小动作是什么？', hint: '收藏一个信息源、访谈一个人、试一个工具、记一个待办。思考必须落到动作。' },
];
const qform = $('#qform'), qinput = $('#qinput'), qlabel = $('#qlabel'), qhint = $('#qhint');
const qback = $('#qback'), qnext = $('#qnext'), dotsEl = $('#dots'), notesEl = $('#notes');
let qStep = 0, qAnswers = [];

function renderDots() {
  dotsEl.innerHTML = '';
  QUESTIONS.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === qStep ? ' on' : '') + (qAnswers[i] ? ' done' : '');
    d.textContent = i + 1;
    dotsEl.appendChild(d);
  });
}
function renderQ() {
  qlabel.textContent = `第 ${qStep + 1} 问 · ${QUESTIONS[qStep].q}`;
  qhint.textContent = QUESTIONS[qStep].hint;
  qinput.value = qAnswers[qStep] || '';
  qback.style.visibility = qStep === 0 ? 'hidden' : 'visible';
  qnext.textContent = qStep === QUESTIONS.length - 1 ? '存成笔记' : '下一问';
  renderDots();
}
qform.addEventListener('submit', (e) => {
  e.preventDefault();
  qAnswers[qStep] = qinput.value.trim();
  if (qStep < QUESTIONS.length - 1) { qStep++; renderQ(); }
  else { saveNote(); }
});
qback.addEventListener('click', () => { qAnswers[qStep] = qinput.value.trim(); if (qStep > 0) { qStep--; renderQ(); } });

const NOTES_KEY = 'boss_notes_v1';
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch { return []; } };
function saveNote() {
  if (!qAnswers.some(a => a)) { qinput.focus(); return; }
  const notes = loadNotes();
  notes.unshift({ t: Date.now(), a: qAnswers.slice() });
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 100))); } catch {}
  qStep = 0; qAnswers = []; renderQ(); renderNotes();
  setDaily('five');
  const chain = document.getElementById('qchain');
  if (chain) chain.style.display = 'block';
}
function renderNotes() {
  const notes = loadNotes();
  if (!notes.length) {
    notesEl.innerHTML = '<div class="empty">还没有笔记。用上面的五问过一条新闻，存下你的第一份「老板视角」。</div>';
    return;
  }
  notesEl.innerHTML = '';
  notes.forEach((n, idx) => {
    const el = document.createElement('article');
    el.className = 'note';
    const date = new Date(n.t).toLocaleString('zh-CN', { hour12: false });
    el.innerHTML = `<div class="meta"><time>${date}</time>${n.sample ? '<span class="lv lv2">示例 · 可直接删</span>' : ''}<button type="button" data-del="${idx}">删除</button></div>` +
      n.a.map((ans, i) => ans ? `<p><b>${QUESTIONS[i].q}</b> ${ans.replace(/</g, '&lt;')}</p>` : '').join('');
    notesEl.appendChild(el);
  });
}
notesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-del]');
  if (!btn) return;
  const notes = loadNotes();
  notes.splice(Number(btn.dataset.del), 1);
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {}
  renderNotes();
});

function seedIfEmpty(key, samples) {
  try { if (!JSON.parse(localStorage.getItem(key) || '[]').length) localStorage.setItem(key, JSON.stringify(samples)); } catch {}
}
seedIfEmpty(NOTES_KEY, [{ t: Date.now(), sample: true, a: [
  '动的钱是「语音 API 收费」：阿里把模型开源，靠云平台收 API 费赚钱，模型本身是获客漏斗；纯卖通用 TTS 接口的小公司定价空间被压缩。',
  '赢家：需要多语言语音的创业者（顶级能力免费用）、阿里云的云业务；输家：只做普通话/英语通用 TTS 的小厂商。',
  '势：语音合成的基础能力正在商品化、免费化——值钱的东西上移到数据、场景和情感控制。',
  '关系很大：官方 10 种语言没有粤语，粤语只在「方言指令」里——缝隙被一手资料证实；我可以基于它微调粤语，不必从零造模型。',
  '小动作：本周实测一次 Qwen3-TTS 的粤语方言指令效果，录音存档对比。',
] }]);
renderQ(); renderNotes();

/* ================= AI 教练·一起拆新闻 ================= */
const COACH_ROUNDS = [
  { q: '第一轮 · 找事实：这条新闻到底发生了什么？',
    hint: '用一句话写清楚：谁、做了什么、结果是什么。',
    angle: '老板的第一步永远是把「事实」和「观点」分开。新闻里「可能」「或将」「专家认为」后面的都是观点，只有已经发生的事才是事实。',
    prompt: '我把一条新闻发给你，请帮我逐句区分：哪些是已经发生的事实，哪些是观点、预测或情绪渲染。' },
  { q: '第二轮 · 找利益：这件事动了谁的钱？',
    hint: '列出赢家和输家：公司、员工、消费者、政府、竞争对手。',
    angle: '老板看新闻先找钱。补贴、订单、股价、牌照、成本——找不到钱的流动，说明你还没看懂这条新闻。',
    prompt: '扮演一个资深投资人，分析这条新闻里的利益相关方：谁受益、谁受损、为什么。' },
  { q: '第三轮 · 找趋势：这是噪声还是趋势？',
    hint: '三个月后这事还重要吗？它和最近的哪些事是同一股潮流？',
    angle: '老板把每条新闻放进一条更长的线里看。孤立事件是噪声，反复出现同方向的事件才是趋势——趋势才值得下注。',
    prompt: '把这件事放进行业大趋势里分析：它是孤立的噪声，还是某个更大趋势的一环？请给出判断依据。' },
  { q: '第四轮 · 找关联：和我有什么关系？',
    hint: '对「在澳门做粤语 TTS」的我，这是机会、威胁还是无关？',
    angle: '老板的最后一公里：任何信息都要落到「我」身上。政策、技术、竞争、人才——四个方向各想一遍，想不出关系也要写「暂无直接关系，继续观察」。',
    prompt: '我的背景：在澳门的创业者，方向是粤语语音合成（TTS）教育产品。请分析这条新闻对我的机会、威胁，以及我可以利用的点。' },
  { q: '第五轮 · 找行动：我现在能做的一个小动作？',
    hint: '收藏一个来源、访谈一个人、试一个工具、记一个待办。',
    angle: '没有行动指向的思考只是消遣。老板的每条判断都以一个具体动作收尾——哪怕动作只是「下周再回来看这件事的后续」。',
    prompt: '基于以上全部分析，给我三个本周就能执行的小动作，按投入产出比排序。' },
];
const coachStart = $('#coach-start'), coachFlow = $('#coach-flow'), coachDone = $('#coach-done');
const coachInput = $('#coach-input'), coachNews = $('#coach-news'), coachQ = $('#coach-q'),
      coachHint = $('#coach-hint'), coachAngle = $('#coach-angle'), coachPromptEl = $('#coach-prompt'),
      coachAnswer = $('#coach-answer'), coachDots = $('#coach-dots'), coachNextBtn = $('#coach-next');
let cStep = 0, cNews = '', cAnswers = [];
const COACH_KEY = 'boss_coach_notes_v1';
const loadCoachNotes = () => { try { return JSON.parse(localStorage.getItem(COACH_KEY)) || []; } catch { return []; } };

function renderCoachDots() {
  coachDots.innerHTML = '';
  COACH_ROUNDS.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === cStep ? ' on' : '') + (cAnswers[i] ? ' done' : '');
    d.textContent = i + 1;
    coachDots.appendChild(d);
  });
}
function renderCoachRound() {
  const r = COACH_ROUNDS[cStep];
  coachQ.textContent = r.q;
  coachHint.textContent = r.hint;
  coachAngle.textContent = r.angle;
  coachPromptEl.textContent = `「${r.prompt}（附新闻：${cNews.slice(0, 80)}${cNews.length > 80 ? '…' : ''}）」`;
  coachAnswer.value = cAnswers[cStep] || '';
  coachNextBtn.textContent = cStep === COACH_ROUNDS.length - 1 ? '完成拆解' : '下一轮';
  renderCoachDots();
}
function coachReset() {
  cStep = 0; cAnswers = []; cNews = '';
  coachInput.value = '';
  coachStart.style.display = ''; coachFlow.style.display = 'none'; coachDone.style.display = 'none';
  coachInput.focus();
}
$('#coach-begin').addEventListener('click', () => {
  cNews = coachInput.value.trim();
  if (!cNews) { coachInput.focus(); return; }
  coachNews.textContent = '正在拆解：' + (cNews.length > 120 ? cNews.slice(0, 120) + '…' : cNews);
  coachStart.style.display = 'none'; coachDone.style.display = 'none'; coachFlow.style.display = '';
  cStep = 0; cAnswers = [];
  renderCoachRound();
});
coachNextBtn.addEventListener('click', () => {
  cAnswers[cStep] = coachAnswer.value.trim();
  if (cStep < COACH_ROUNDS.length - 1) { cStep++; renderCoachRound(); }
  else {
    const notes = loadCoachNotes();
    notes.unshift({ t: Date.now(), news: cNews, a: cAnswers.slice() });
    try { localStorage.setItem(COACH_KEY, JSON.stringify(notes.slice(0, 100))); } catch {}
    setDaily('five');
    coachFlow.style.display = 'none'; coachDone.style.display = '';
    renderCoachNotes();
  }
});
$('#coach-quit').addEventListener('click', coachReset);
$('#coach-again').addEventListener('click', coachReset);
$('#coach-copy').addEventListener('click', async () => {
  const text = COACH_ROUNDS[cStep].prompt + ' 新闻内容：' + cNews;
  try { await navigator.clipboard.writeText(text); $('#coach-copy').textContent = '已复制 ✓'; }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove(); $('#coach-copy').textContent = '已复制 ✓';
  }
  setTimeout(() => { $('#coach-copy').textContent = '复制这句提示词'; }, 1600);
});
function renderCoachNotes() {
  const notes = loadCoachNotes();
  const el = $('#coach-notes');
  if (!notes.length) { el.innerHTML = '<div class="empty">还没有拆解记录。贴一条今天的新闻，开始第一次「和教练一起拆」。</div>'; return; }
  el.innerHTML = '';
  notes.forEach((n, idx) => {
    const art = document.createElement('article');
    art.className = 'note';
    const date = new Date(n.t).toLocaleString('zh-CN', { hour12: false });
    art.innerHTML = `<div class="meta"><time>${date}</time>${n.sample ? '<span class="lv lv2">示例 · 可直接删</span>' : ''}<button type="button" data-cdel="${idx}">删除</button></div>` +
      `<h4>${n.news.replace(/</g, '&lt;').slice(0, 60)}${n.news.length > 60 ? '…' : ''}</h4>` +
      n.a.map((ans, i) => ans ? `<p><b>${COACH_ROUNDS[i].q.split('：')[0].replace(/^第.轮 · /, '')}</b> ${ans.replace(/</g, '&lt;')}</p>` : '').join('');
    el.appendChild(art);
  });
}
$('#coach-notes').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cdel]');
  if (!btn) return;
  const notes = loadCoachNotes();
  notes.splice(Number(btn.dataset.cdel), 1);
  try { localStorage.setItem(COACH_KEY, JSON.stringify(notes)); } catch {}
  renderCoachNotes();
});
renderCoachNotes();
seedIfEmpty(COACH_KEY, [{ t: Date.now(), sample: true,
  news: '阿里开源 Qwen3-TTS 语音模型：支持 10 种语言、3 秒声音克隆，但官方语言列表里没有粤语。',
  a: [
    '事实：阿里把 Qwen3-TTS 开源，官方 10 种语言无粤语，粤语只能靠「方言指令」调出。',
    '利益：阿里赚云 API 的钱；创业者白得顶级技术底座；做通用 TTS 的小厂商被挤压。',
    '趋势：这是「基础能力商品化」大趋势的一环——和文本大模型免费化是同一条线，不是孤立事件。',
    '关联：对我（澳门粤语 TTS）是双重利好——缝隙被证实 + 技术底座白捡。',
    '行动：本周实测它的粤语效果并存档；把「情感控制仍弱」记进产品机会清单。',
  ] }]);
renderCoachNotes();

/* ================= 信息食谱 ================= */
const CATS = [
  {
    name: 'AI 行业', time: '每天 10 分钟',
    desc: 'AI 是你未来的行业。<b>重点不是追热点，是判断技术走到了哪一步</b>——这决定你的 TTS 产品什么时候能做出来。',
    srcs: [
      { tag: '中文一线', name: '机器之心', lvl: '2', url: 'https://www.jiqizhixin.com/', p: '国内最聚焦的 AI 媒体，论文解读和产业动态并重。', boss: '看「产业」栏目，判断大厂在往哪砸钱。' },
      { tag: '中文一线', name: '量子位', lvl: '2', url: 'https://www.qbitai.com/', p: 'AI 新闻速度快，适合通勤刷。', boss: '重点看「融资」新闻——钱投给谁，风向就在哪。' },
      { tag: '聚合日报', name: 'TodayAI 日报', lvl: '2', url: 'https://todayai.com.cn/ai-daily/archive', p: '把过去 48 小时上百条 AI 动态压缩成一份日报，还有 1000+ 工具导航——没时间刷全网时的底稿。', boss: '用它做每日扫描的入口，但判断必须回到你自己的五问，不能外包给聚合器。' },
      { tag: '全球', name: 'Hugging Face Blog', lvl: '1', url: 'https://huggingface.co/blog', p: '开源 AI 的风向标，语音模型动态第一时间更新。', boss: '每周看一次 TTS / 语音板块即可。' },
      { tag: '技术深度', name: 'InfoQ 中文', lvl: '2', url: 'https://www.infoq.cn/', p: '面向开发者和架构师的深度技术媒体，AI 工程化内容扎实。', boss: '看「AI 工程」栏目——论文到产品之间那段路，这里讲得最清楚。' },
      { tag: '创业视角', name: '36氪', lvl: '2', url: 'https://36kr.com/', p: '创业公司与商业模式报道，学别人怎么把技术变成生意。', boss: '看教育科技和语音赛道的融资案例。' },
    ],
  },
  {
    name: '澳门与政策', time: '每天 10 分钟',
    desc: '你在澳门，政策就是你的杠杆。<b>资助、人才计划、横琴政策都藏在政府公告里</b>，大多数人从来不看——这就是信息差。',
    srcs: [
      { tag: '官方', name: '澳门新闻局', lvl: '1', url: 'https://news.gov.mo/', p: '特区政府所有政策的第一发布口。', boss: '搜「科技」「资助」「人才」关键词。' },
      { tag: '官方', name: '澳门科技基金 FDCT', lvl: '1', url: 'https://www.fdct.gov.mo/', p: '科技企业认证、研发资助的申请入口。', boss: '把申请条件打印出来，逐条对照自己缺什么。' },
      { tag: '官方', name: '横琴深合区', lvl: '1', url: 'https://www.hengqin.gov.cn/', p: '横琴政策发布地，「澳门研发+横琴转化」的钱在这里。', boss: '重点关注创新创业大赛和攻关项目申报时间。' },
      { tag: '官方 · 商事', name: '澳门经科局 DSEDT', lvl: '1', url: 'https://www.dsedt.gov.mo/', p: '商业登记、中小企业援助计划、科技相关政策的官方出处——将来注册公司、申请援助都用它。', boss: '把「中小企业援助」的申请条件逐条读一遍，比看十篇创业文章有用。（本地民情新闻在「本地与湾区」分类，不重复。）' },
      { tag: '官方 · 培训', name: '澳门劳工局 DSAL 培训计划', lvl: '1', url: 'https://www.dsal.gov.mo/zh_tw/text/huawei_ai_2026.html', p: '劳工局的实习/实训计划发布口——2026 年 11 月的「青年 AI 实训计划」（华为合作、30 名额、四周横琴实训）就是从这里发的。', boss: '这类计划报名期只有两周，过期不候——每周一扫这个页面，别让截止日从眼皮底下溜过去。' },
    ],
  },
  {
    name: '金融商业', time: '每天 10 分钟',
    desc: '老板不需要会炒股，但需要<b>看得懂钱的语言</b>：利率、汇率、融资、估值。先懂概念，再看行情。',
    srcs: [
      { tag: '快讯', name: '华尔街见闻', lvl: '2', url: 'https://wallstreetcn.com/', p: '全球财经快讯，7×24 滚动。', boss: '只看头条，训练「这条新闻动了谁的钱」。' },
      { tag: '深度', name: 'FT 中文网', lvl: '2', url: 'https://www.ftchinese.com/', p: '国际视野的商业深度分析，中英对照还能练英语。', boss: '每周精读一篇，用五问拆解。' },
      { tag: '数据', name: '金十数据', lvl: '1', url: 'https://www.jin10.com/', p: '财经日历和宏观数据发布。', boss: '知道大事件发生的时间，提前想而不是事后追。' },
    ],
  },
  {
    name: 'TTS 与语音', time: '每周 1 次',
    desc: '你的主战场。<b>每周一次深度扫描</b>：技术进展、开源项目、竞争对手，比天天刷更有用。',
    srcs: [
      { tag: '开源', name: 'GitHub TTS 专题', lvl: '1', url: 'https://github.com/topics/tts', p: '开源语音合成项目总入口。', boss: '跟踪粤语（Cantonese）支持的进展，这就是你的技术雷达。' },
      { tag: '开源 · 可商用', name: 'GPT-SoVITS', lvl: '1', url: 'https://github.com/RVC-Boss/GPT-SoVITS', p: '最火的少样本语音克隆项目，5 秒音频就能克隆音色，支持粤语。', boss: '你第一个 Demo 的技术底座大概率是它——先收藏，路线图第二阶段动手。' },
      { tag: '开源 · 阿里系', name: 'CosyVoice', lvl: '1', url: 'https://github.com/FunAudioLLM/CosyVoice', p: '阿里通义开源的语音合成模型，多语言含粤语，流式输出。', boss: '对比它和 GPT-SoVITS 的粤语效果——用体感评测五个维度打分。' },
      { tag: '开源 · 新秀', name: 'Fish Speech', lvl: '1', url: 'https://github.com/fishaudio/fish-speech', p: 'B 站 up 主团队做的开源 TTS，中文圈口碑好，迭代快。', boss: '华人团队做语音的成功样本——他们能成，你也有路。' },
      { tag: '大厂 API · 对标', name: '腾讯云语音合成', lvl: '1', url: 'https://cloud.tencent.com/product/tts', p: '腾讯的商用 TTS 定价页。', boss: '抄它的定价结构：按字符还是按调用量？你的报价单从这里起步。' },
      { tag: '大厂 API · 对标', name: '火山引擎语音技术', lvl: '1', url: 'https://www.volcengine.com/product/tts', p: '字节跳动的语音产品线，豆包同款声音。', boss: '听它的粤语效果——大厂粤语做到什么程度，你的差异化空间就在哪。' },
      { tag: '榜单', name: 'HF Trending Papers', lvl: '1', url: 'https://huggingface.co/papers/trending', p: 'Papers with Code 2025 年关站后的官方接替者：热门论文榜，关联 GitHub 代码实现。', boss: '看趋势不看细节：语音方向的论文热度就是技术风向标。' },
      { tag: '竞品', name: '讯飞开放平台', lvl: '1', url: 'https://www.xfyun.cn/', p: '国内语音龙头的产品与定价，你的对标对象。', boss: '研究它的粤语产品缺什么——缺口就是你的定位。' },
      { tag: '盲测 · 听感擂台', name: 'TTS Arena（Hugging Face）', lvl: '1', url: 'https://huggingface.co/spaces/TTS-AGI/TTS-Arena', p: '全球 TTS 模型的盲测擂台：同一段文字，两个匿名模型各读一遍，你投票选好听的那个。', boss: '每周来投 10 票——既练了耳朵，又知道全世界哪个模型最强。投票前先用「体感评测」模块的五个维度过一遍。' },
    ],
  },
  {
    name: '教育行业', time: '每周 1 次',
    desc: 'TTS 最大的落地场景之一是教育。<b>懂教育，你的语音技术才卖得上价。</b>',
    srcs: [
      { tag: '行业', name: '多知网', lvl: '2', url: 'https://www.duozhi.com/', p: '教育产业媒体，政策、公司、产品全覆盖。', boss: '关注「AI+教育」的落地案例和失败教训。' },
      { tag: '行业', name: '芥末堆', lvl: '2', url: 'https://www.jiemodui.com/', p: '教育科技报道，海外市场内容较多。', boss: '看海外语言学习产品怎么做语音功能。' },
      { tag: '官方 · 澳门', name: '澳门教青局 DSEDJ', lvl: '1', url: 'https://portal.dsedj.gov.mo/', p: '澳门教育政策的发布口：课程指引、学校名单、资助计划。', boss: '你的第一批客户是澳门学校——它的政策原文比任何分析都值钱。' },
      { tag: '官方 · 香港', name: '香港教育局 EDB', lvl: '1', url: 'https://www.edb.gov.hk/', p: '香港课程指引、语文教育政策的一手源。', boss: '香港学校的粤语教学怎么规定，决定你的产品能不能进课堂。' },
      { tag: '官方 · 新加坡', name: '新加坡教育部 MOE', lvl: '1', url: 'https://www.moe.gov.sg/', p: '多语言教育政策做得最系统的政府。', boss: '它的「母语+英语」双语架构，就是海外粤语产品的政策模板。' },
      { tag: '官方 · 全国', name: '中国教育部', lvl: '1', url: 'http://www.moe.gov.cn/', p: '全国教育政策总闸：课改、教材、人工智能教育试点。', boss: '「AI+教育」试点文件一出来，跟着政策走的预算就来了。' },
      { tag: '国际', name: 'UNESCO 教育', lvl: '1', url: 'https://www.unesco.org/en/education', p: '全球教育趋势与 AI 教育伦理框架的发布方。', boss: '写提案时引用 UNESCO，你的格局立刻不一样。' },
      { tag: '海外 · 行业', name: 'EdSurge', lvl: '2', url: 'https://www.edsurge.com/', p: '美国教育科技媒体，产品和研究并重。', boss: '看美国语音学习产品怎么讲故事、怎么定价。' },
    ],
  },
  {
    name: '同行与市场', time: '每周 1 次',
    desc: '做 TTS 不能闭门造车。<b>同行怎么定价、怎么获客、怎么讲故事，是最值钱的商业情报</b>——竞品官网和价格页就是行情本身。',
    srcs: [
      { tag: '竞品 · 全球语音龙头', name: 'ElevenLabs', lvl: '1', url: 'https://elevenlabs.io/', p: '全球语音 AI 龙头。直接看它的定价页和功能列表——那就是行情的上限。', boss: '每月看一次价格和新功能，判断大厂往哪走、粤语缺什么。' },
      { tag: '竞品 · TTS 订阅', name: 'Speechify', lvl: '1', url: 'https://speechify.com/', p: '从阅读障碍人群起家的 TTS 订阅产品，验证了「语音朗读 + 学习」的付费模型。', boss: '学它的定位话术：它怎么向有痛点的人群卖，而不是向所有人卖。' },
      { tag: '竞品 · 口语陪练', name: 'Speak', lvl: '1', url: 'https://www.speak.com/', p: 'AI 口语陪练标杆，订阅制，OpenAI 战略投资。', boss: '对照它的定价想：你的粤语产品收多少钱，用户不眨眼？' },
      { tag: '竞品 · 语言学王', name: '多邻国 Duolingo', lvl: '1', url: 'https://www.duolingo.com/', p: '全球用户最多的语言学习产品，游戏化黏住用户是它最狠的一招。', boss: '学它的打卡和连击设计——你的粤语产品也需要让人上瘾。' },
      { tag: '新品雷达', name: 'Product Hunt', lvl: '2', url: 'https://www.producthunt.com/', p: '全球新产品首发平台，AI 语音 / 教育类新品第一时间在这里冒头。', boss: '每周扫一次 education 与 audio 类新品——新同行出现，你比本地人早知道。' },
    ],
  },
  {
    name: '大湾区 9+2', time: '每天扫一眼',
    desc: '九个内地城市 + 港澳，点开哪个看哪个：<b>你的客户、政策、供应链全在这张图上。</b><br><span style="display:inline-flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
      '<a href="https://www.macaodaily.com/" target="_blank" rel="noopener" style="border:1px solid var(--gold);color:var(--gold);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">澳门 · 澳门日报</a>' +
      '<a href="https://www.hk01.com/" target="_blank" rel="noopener" style="border:1px solid var(--gold);color:var(--gold);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">香港 · 香港01</a>' +
      '<a href="https://www.dayoo.com/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">广州 · 大洋网</a>' +
      '<a href="https://www.sznews.com/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">深圳 · 深圳新闻网</a>' +
      '<a href="https://www.guanhai.com.cn/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">珠海 · 观海融媒</a>' +
      '<a href="https://www.foshannews.net/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">佛山 · 佛山新闻网</a>' +
      '<a href="https://www.sun0769.com/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">东莞 · 东莞阳光网</a>' +
      '<a href="https://www.zsnews.cn/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">中山 · 中山网</a>' +
      '<a href="https://www.huizhou.gov.cn/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">惠州 · 市政府门户</a>' +
      '<a href="https://www.jiangmen.gov.cn/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">江门 · 市政府门户</a>' +
      '<a href="https://www.zhaoqing.gov.cn/" target="_blank" rel="noopener" style="border:1px solid var(--line);color:var(--text-2);border-radius:999px;padding:6px 16px;font-size:14px;text-decoration:none">肇庆 · 市政府门户</a>' +
      '</span><br><span style="font-size:13px;color:var(--text-3)">每个城市给你的东西不一样：澳门是政策和客户，香港是粤语商业标杆，珠海横琴是成本洼地，广州深圳是供应链和人才。</span>',
    srcs: [
      { tag: '澳门', name: '澳门日报', lvl: '2', url: 'https://www.macaodaily.com/', p: '澳门发行量最大的报纸，本地社会与经济的第一窗口。', boss: '教育、长者、中小企业版面藏着客户痛点。' },
      { tag: '澳门', name: '力报', lvl: '2', url: 'https://www.exmoo.com/', p: '澳门本地媒体，民生与商业新闻的补充视角。', boss: '同一新闻看两家怎么说，训练信息交叉验证。' },
      { tag: '香港 · 电台', name: '香港电台 RTHK', lvl: '1', url: 'https://www.rthk.hk/', p: '香港公共广播，粤语新闻播报的标准音。', boss: '你的 TTS 标杆就在这：听它的主播怎么断句、怎么换气。' },
      { tag: '香港 · 深度', name: '明报', lvl: '2', url: 'https://www.mingpao.com/', p: '香港老牌报纸，社评和专题有深度。', boss: '学它的专题结构——一个议题怎么一层层剥开。' },
      { tag: '湾区 · 官方', name: '粤港澳大湾区门户网', lvl: '1', url: 'https://www.cnbayarea.org.cn/', p: '湾区官方政策与措施发布平台。', boss: '政策原文一手源，补贴和人才措施都在这。' },
    ],
  },
  {
    name: '海外粤语圈', time: '每周 1 次',
    desc: '全球说粤语的人大半在港澳之外。<b>新加坡、马来西亚的华文媒体架构最成熟</b>——他们怎么在多语言环境里做内容，就是你的教科书。',
    srcs: [
      { tag: '新加坡', name: '联合早报', lvl: '2', url: 'https://www.zaobao.com.sg/', p: '东南亚最权威的华文媒体，多语言内容架构的标杆。', boss: '研究它怎么一套内容服务中英双语读者——你未来就是粤语/普通话/英语三语。' },
      { tag: '新加坡 · 广播', name: 'CNA（亚洲新闻台）', lvl: '2', url: 'https://www.channelnewsasia.com/', p: '新加坡公共媒体，英语报道亚洲事务的一手源。', boss: '顺便练英语听力——它的发音清晰，适合当雅思素材。' },
      { tag: '马来西亚', name: '星洲日报', lvl: '2', url: 'https://www.sinchew.com.my/', p: '马来西亚最大华文报，粤语社群活跃。', boss: '大马华人怎么维系粤语？那就是你海外用户的画像。' },
      { tag: '马来西亚', name: '南洋商报', lvl: '2', url: 'https://www.enanyang.my/', p: '马来西亚老牌华文商报，财经视角。', boss: '海外华人的商业付费习惯，这里看得出来。' },
      { tag: '澳洲 · 粤语广播', name: 'SBS 粤语', lvl: '1', url: 'https://www.sbs.com.au/language/cantonese', p: '澳大利亚公共媒体的粤语频道，有音频节目。', boss: '现成的粤语新闻音频库——听它，学它，也是你的语料参考。' },
      { tag: '全球 · 侨乡', name: '星岛日报', lvl: '2', url: 'https://www.singtao.ca/', p: '港资背景、覆盖加拿大和全球的华文媒体。', boss: '温哥华、多伦多的粤语社群，是你产品出海的桥头堡。' },
    ],
  },
  {
    name: '溯源与人', time: '顺藤摸瓜',
    desc: '二手变一手的核心：<b>不关注博主，关注博主的信源。</b>好博主每个观点都有出处——顺着他引用的链接、关注的人、转发的论文，三层以内必到源头。',
    srcs: [
      { tag: '一手 · X', name: 'Andrej Karpathy', lvl: '1', url: 'https://x.com/karpathy', p: '前 OpenAI 创始成员、前特斯拉 AI 总监。AI 教育天花板，停更的 YouTube 课依然是最值得看的底层原理。', boss: '他转发谁，你就关注谁——大牛的关注列表就是你的雷达图。' },
      { tag: '一手 · X', name: 'Jim Fan（英伟达研究总监）', lvl: '1', url: 'https://x.com/DrJimFan', p: '行业趋势由这群人先开口，全世界媒体跟在后面写稿。', boss: '他对新模型的评价，比任何评测文章都快且准。' },
      { tag: '一手 · X', name: 'Yann LeCun（Meta 首席 AI 科学家）', lvl: '1', url: 'https://x.com/ylecun', p: '图灵奖得主，敢公开唱反调——他说「这个方向没戏」时往往值得听。', boss: '学他怎么质疑主流叙事，这就是思辨的活教材。' },
      { tag: '一手 · 论文', name: 'arXiv 语音合成区', lvl: '1', url: 'https://arxiv.org/list/eess.AS/recent', p: '全世界语音研究的第一发布口，比任何媒体快 48 小时以上。', boss: '看标题和摘要就够——标题里出现 Cantonese / low-resource 的论文，就是你的技术情报。' },
      { tag: '一手 · 订阅', name: 'Import AI（Jack Clark）', lvl: '1', url: 'https://importai.substack.com/', p: 'OpenAI 联合创始人写的周刊，十几年没断更，每期都回链到原始论文。', boss: '这就是「博主给信源」的典范——读他引用的东西，而不是只读他。' },
      { tag: '二手 · 日报', name: 'The Rundown AI', lvl: '2', url: 'https://www.therundown.ai/', p: '全球订阅量最大的 AI 日报，每天 5 分钟扫完。', boss: '当雷达用：看到感兴趣的，必须点进它给的原始链接才算完。' },
      { tag: '工具 · 雷达', name: 'Feedly（RSS 聚合）', lvl: '2', url: 'https://feedly.com/', p: '把你信任的所有源头订阅到一个地方，信息自己来找你，而不是你刷算法。', boss: '把本页的一手源全部加进去——这就是你的「自动寻找雷达」第一步。' },
      { tag: '工具 · 溯源', name: 'Google Scholar 快讯', lvl: '1', url: 'https://scholar.google.com/scholar_alerts', p: '设定关键词（如 Cantonese TTS），有新论文自动发邮件给你。', boss: '设置一次，终身受益——这才是真正的自动情报。' },
    ],
  },
  {
    name: '国际视野', time: '每周 1 次',
    desc: '要做国际老板，就要看国际媒体怎么讲同一件事。<b>对照两地报道的差异，本身就是思辨训练。</b>',
    srcs: [
      { tag: '国际', name: 'Reuters 路透社', lvl: '2', url: 'https://www.reuters.com/', p: '全球新闻通讯社标杆：快、短、只讲事实。', boss: '学它的写法——第一段必须讲完谁做了什么。' },
      { tag: '国际 · 中文', name: 'BBC 中文', lvl: '2', url: 'https://www.bbc.com/zhongwen', p: '国际视角的中文报道，阅读门槛低。', boss: '看国际媒体怎么报道大湾区——那是你客户看到的世界。' },
      { tag: '国际 · 财经', name: 'Bloomberg 彭博', lvl: '2', url: 'https://www.bloomberg.com/', p: '全球财经与科技商业深度报道。', boss: '看 AI 公司的估值与融资新闻，感受资本市场的语言。' },
    ],
  },
  {
    name: '顶尖学府', time: '每月深读一门',
    desc: '世界顶尖大学把课免费放出来了。<b>和全球最好的大脑学同一门课，这是最便宜的教育平权。</b>',
    srcs: [
      { tag: '公开课 · 美国', name: 'MIT OpenCourseWare', lvl: '1', url: 'https://ocw.mit.edu/', p: 'MIT 全部课程免费开放：讲义、作业、考试全公开。', boss: '搜「Introduction to Computer Science」或管理学课程，跟一门就够。' },
      { tag: '公开课 · 美国', name: 'Stanford Online', lvl: '1', url: 'https://online.stanford.edu/', p: '斯坦福在线课程，AI 与创业课程尤其强。', boss: '创业课直接对应你注册公司那一步。' },
      { tag: '公开课 · 综合', name: 'edX', lvl: '1', url: 'https://www.edx.org/', p: '哈佛、MIT 等校课程平台，可旁听。', boss: '搜「speech」「linguistics」，站在学界肩膀上看语音。' },
      { tag: '研究 · 一手', name: 'MIT Technology Review', lvl: '1', url: 'https://www.technologyreview.com/', p: ' MIT 旗下的技术评论，AI 研究的权威解读。', boss: '它的「年度突破技术」榜单就是前瞻性的参考答案。' },
    ],
  },
  {
    name: '大佬博客', time: '每月深读 1 篇',
    desc: '碎片推文之上，是完整思考。<b>一线研究者把想法完整写在个人博客里——这就是高手们真正的信息源头。</b>每月挑一篇深读，用 AI 辅助翻译，读一篇胜过刷一个月碎片。',
    srcs: [
      { tag: '从零手搓', name: 'Andrej Karpathy', lvl: '1', url: 'https://karpathy.github.io/', p: 'OpenAI 创始成员、前特斯拉 AI 总监。博客 + YouTube「从零实现 GPT」系列是学 AI 原理的最佳材料。', boss: '他的「从零实现」思路=先懂本质再谈创新，你学 TTS 也走这条路。' },
      { tag: '万字综述', name: 'Lilian Weng 翁荔 · Lil\'Log', lvl: '1', url: 'https://lilianweng.github.io/', p: '前 OpenAI 安全副总裁、Thinking Machines 联创。每个主题一篇万字系统综述，被全行业当教材引用。', boss: '搜「TTS」「speech」看学界怎么梳理语音技术全貌。' },
      { tag: '可视化思考', name: 'Chris Olah', lvl: '1', url: 'https://colah.github.io/', p: 'Anthropic 联创，可解释性研究开创者。擅长把最抽象的概念画成图。', boss: '学他的表达：把抽象东西画出来，是做产品和做内容共同的核心能力。' },
      { tag: '工程追踪', name: 'Sebastian Raschka · Ahead of AI', lvl: '1', url: 'https://magazine.sebastianraschka.com/', p: '高口碑 AI 科普作者，更新快、质量稳，论文与工程实践并重。', boss: '最省力的论文追踪方式——他筛过一遍，你读结论。' },
      { tag: '慢思考长文', name: 'Sander Dieleman', lvl: '1', url: 'https://sander.ai/', p: 'DeepMind 研究科学家，更新少但篇篇深度长文，思考生成模型与人类创作的关系。', boss: '学「慢思考」：不追热点，把一个问题想到底——这正是反同质化的内功。' },
    ],
  },
  {
    name: '一手频道', time: '取关搬运号',
    desc: '一条 AI 新闻从论文到国内平台，至少倒五六手，48 小时都算快——每倒一手加一层滤镜，到你手里只剩「太炸裂了」。<b>直接关注源头的人：趋势由他们先开口，全世界的媒体跟在后面写稿。</b>',
    srcs: [
      { tag: '论文入门 · YouTube', name: 'DeepLearning.AI（吴恩达）', lvl: '1', url: 'https://www.youtube.com/@DeepLearningAI', p: '全网公认的 AI 入门第一站，零基础从这里起步。', boss: '先建立结构化认知，再谈追新。' },
      { tag: '论文动画速览 · YouTube', name: 'Two Minute Papers', lvl: '1', url: 'https://www.youtube.com/@TwoMinutePapers', p: '把最新论文做成几分钟动画，不啃原文也知道研究者发现了什么。', boss: '没时间读论文时的第一现场。' },
      { tag: '论文精读 · YouTube', name: 'Yannic Kilcher', lvl: '1', url: 'https://www.youtube.com/@YannicKilcher', p: '逐篇拆解架构与模型，想看懂真本事就跟他。', boss: '学他的怀疑论视角——挤掉官方宣传稿的水分。' },
      { tag: '底层原理 · YouTube', name: 'Andrej Karpathy', lvl: '1', url: 'https://www.youtube.com/@AndrejKarpathy', p: '前 OpenAI 创始成员、前特斯拉 AI 总监。存量视频是 AI 教育的天花板；他离开 OpenAI 后创办了 AI 原生学校 Eureka Labs——「AI 怎么重塑教育」他是真下场做的人。', boss: '想搞懂 AI 而不是只会用工具，这个频道绕不开；他做学校的打法，值得你这个未来的教育老板盯死。' },
      { tag: '工具盘点 · YouTube', name: 'Matt Wolfe', lvl: '2', url: 'https://www.youtube.com/@mreflow', p: '每周一期 AI 工具大盘点：好用的、坑人的、新出的全筛一遍。', boss: '配合 futurepedia.io 工具库一起用。' },
      { tag: '实测直播 · X', name: 'Matthew Berman', lvl: '2', url: 'https://x.com/MatthewBerman', p: '新模型发布当天无脚本实测，翻车现场都直播——比官方 demo 可信得多。', boss: '判断模型真假本事，看实测，不看发布会。' },
      { tag: '关键人 · X', name: 'Jim Fan（英伟达研究总监）', lvl: '1', url: 'https://x.com/DrJimFan', p: '行业趋势往往由这群人先开口。', boss: '关注他 = 站在英伟达研究部的窗口边上。' },
      { tag: '关键人 · X', name: 'Yann LeCun（Meta 首席 AI 科学家）', lvl: '1', url: 'https://x.com/ylecun', p: '图灵奖得主，经常公开唱反调，观点犀利。', boss: '听反方观点，训练自己的独立判断。' },
      { tag: '关键人 · X', name: 'Karpathy / 吴恩达 / Sam Altman', lvl: '1', url: 'https://x.com/karpathy', p: '@karpathy · @AndrewYNg · @sama——源头中的源头。', boss: '他们的一句话，48 小时后才会变成你刷到的「炸裂」。' },
      { tag: '论文精读 · YouTube', name: '跟李沐学AI', lvl: '1', url: 'https://www.youtube.com/@mu_li', p: '前亚马逊首席科学家，论文逐篇精讲 + PyTorch 实战，中文讲解。', boss: 'B站也有号，两边的评论区都值得看。' },
      { tag: 'AI 提效 · YouTube', name: 'Jeff Su', lvl: '1', url: 'https://www.youtube.com/@JeffSu', p: '普通人用 AI 提效，12 分钟一个主题，框架感强，看完就能上手。', boss: '学他把复杂功能讲成三步的表达能力。' },
      { tag: '数据科学 · YouTube', name: 'Tina Huang', lvl: '1', url: 'https://www.youtube.com/@TinaHuang1', p: '前 Meta 数据科学家，44 分钟讲透 Agent，零基础也能跟。', boss: '她的「先跑起来再优化」就是一人公司的节奏。' },
      { tag: 'AI 实战 · YouTube', name: 'Riley Brown', lvl: '1', url: 'https://www.youtube.com/@rileybrownai', p: '被称为「AI 教学第一人」，vibe coding 快速造 App。', boss: '看他用 AI 做产品的速度——那就是你的开发团队。' },
      { tag: '趋势逻辑 · YouTube', name: 'AI Explained', lvl: '2', url: 'https://www.youtube.com/@aiexplained-official', p: '讲清楚 AI 背后的逻辑和趋势，不追热点追本质。', boss: '训练「看山不是山」的那一层。' },
      { tag: '深度访谈 · YouTube', name: 'Lex Fridman / Dwarkesh Patel', lvl: '1', url: 'https://www.youtube.com/@DwarkeshPatel', p: '几小时的大佬对谈，一线思考者的完整推理过程。', boss: '通勤听——学大佬怎么想问题，不只是听结论。' },
      { tag: '风投视角 · YouTube', name: 'a16z', lvl: '1', url: 'https://www.youtube.com/@a16z', p: '硅谷顶级风投官方频道：AI 趋势 + 创业访谈。', boss: '投资人在赌什么方向，钱的眼光值得借。' },
      { tag: '创业 · YouTube', name: 'Y Combinator', lvl: '1', url: 'https://www.youtube.com/@ycombinator', p: '硅谷顶级孵化器官方频道，创业者必看。', boss: '「做人们想要的东西」——一人公司的第一性原理。' },
      { tag: '轻创业 · YouTube', name: 'Starter Story', lvl: '2', url: 'https://www.youtube.com/@starterstory', p: '普通人用 AI 轻创业的完整拆解：选方向、获客、变现。', boss: '全是可模仿的真实案例。' },
      { tag: '官方发布 · YouTube', name: 'OpenAI / Anthropic', lvl: '1', url: 'https://www.youtube.com/@OpenAI', p: '产品发布和官方路线图的第一现场（Anthropic：@anthropic-ai）。', boss: '发布会看官方，水分靠 Yannic 那种怀疑论者挤。' },
      { tag: 'AI 工程 · YouTube', name: 'Dave Ebbelaar / AI Jason / All About AI', lvl: '2', url: 'https://www.youtube.com/@daveebbelaar', p: '工程实战、Agent 工作流、新模型实测与本地部署（另两个：@AIJasonZ · @AllAboutAI）。', boss: '从「会用」到「会搭」的台阶。' },
      { tag: '自动化工作流 · YouTube', name: 'Sabrina Ramonov', lvl: '1', url: 'https://www.youtube.com/@SabrinaRamonov', p: 'AI 自动化系统搭建，信息密度高，每套系统都亲测有效。', boss: '情报流、工作流的搭建思路直接抄她的架构。' },
      { tag: '零基础自动化 · YouTube', name: 'Nate Herk', lvl: '1', url: 'https://www.youtube.com/@nateherk', p: '前高盛分析师，no-code 自动化手把手教学，步骤细、截图多。', boss: 'n8n 入门跟他最省力——把重复工作交给机器。' },
      { tag: 'AI 商业化 · YouTube', name: 'Liam Ottley', lvl: '1', url: 'https://www.youtube.com/@LiamOttley', p: 'AI 自动化怎么卖钱：完整案例研究和客户交付流程。', boss: '从「会做」到「有人付钱」的那一段路，看他。' },
      { tag: '真实用法 · YouTube', name: 'How I AI', lvl: '1', url: 'https://www.youtube.com/@howiai', p: '访谈节目：请各行业普通人边聊边演示真实项目里怎么用 AI——拍照找订单、自动写退款邮件这种生活级用法。', boss: '看普通人把 AI 用进生活，比看教程更能想出你的 TTS 产品能帮人干什么。' },
      { tag: '系统课 · YouTube', name: 'freeCodeCamp', lvl: '1', url: 'https://www.youtube.com/@freecodecamp', p: '免费编程课的天花板，AI 和数据课从零到落地，配好学习顺序和练习。', boss: '不花钱的大学，夜班后的正经课堂。' },
      { tag: '大学公开课 · YouTube', name: 'MIT OCW / Stanford Online', lvl: '1', url: 'https://www.youtube.com/@mitocw', p: 'MIT 公开课 + 斯坦福 CS25 Transformers 讲座（@stanfordonline）。', boss: '世界顶尖大学的课，免费，区别只在你坐不坐得住。' },
      { tag: '教学法 · YouTube', name: 'Jeremy Howard（fast.ai）', lvl: '1', url: 'https://www.youtube.com/@howardjeremy', p: '「先跑通再补理论」的反向教学法创始人，降低深度学习门槛这件事他做了十年。', boss: '你做粤语教学的课程设计，方法论抄他的。' },
      { tag: '教学脚手架 · YouTube', name: 'Kevin Stratvert / Skill Leap AI', lvl: '2', url: 'https://www.youtube.com/@kevinstratvert', p: '不跳步、不花哨，一格一格跟着点（另一个：@SkillLeapAI）。', boss: '「怎么教人」的活样本——你的课程就该这么不装。' },
      { tag: 'LLM 教育 · Substack/YouTube', name: 'Sebastian Raschka', lvl: '1', url: 'https://www.youtube.com/@SebastianRaschka', p: '《从零构建 LLM》作者，AI 教育工程师。', boss: '想懂 LLM 内部怎么运作，他的拆解最干净。' },
      { tag: '游戏化教学 · YouTube', name: 'Code Bullet', lvl: '2', url: 'https://www.youtube.com/@codebullet', p: '把强化学习、神经网络做成趣味实验，看着乐就学会了。', boss: '「寓教于乐」的极端样本——学习可以不只是正襟危坐。' },
      { tag: 'MVP 实操 · YouTube', name: 'Greg Isenberg', lvl: '1', url: 'https://www.youtube.com/@gregisenberg', p: 'AI 创业实操：怎么找痛点、怎么做最小可行产品。', boss: '你的第一个 demo 该怎么切，看他的拆解。' },
      { tag: '提示词 · YouTube', name: 'The AI Advantage', lvl: '2', url: 'https://www.youtube.com/@TheAIAdvantage', p: '教你怎么开口问 AI——提问质量决定产出质量。', boss: '调用 AI 的基本功，每天在用就该每天磨。' },
    ],
  },
];
const tabsEl = $('#newstabs'), catdescEl = $('#catdesc'), srcgridEl = $('#srcgrid');
function renderCat(i) {
  const c = CATS[i];
  catdescEl.innerHTML = `<b>${c.time}</b> · ${c.desc}`;
  srcgridEl.innerHTML = '';
  c.srcs.forEach(s => {
    const el = document.createElement('div');
    el.className = 'src';
    const lvBadge = s.lvl ? ` <span class="lv lv${s.lvl}">${'一二三'[s.lvl-1]}手</span>` : '';
    el.innerHTML = `<span class="tag">${s.tag}${lvBadge}</span><h3><a href="${s.url}" target="_blank" rel="noopener">${s.name} ↗</a></h3><p>${s.p}</p><div class="boss-view"><b>老板看这里：</b>${s.boss}</div>`;
    srcgridEl.appendChild(el);
  });
  $$('.tab-btn', tabsEl).forEach((b, j) => b.classList.toggle('on', j === i));
  paginateGrid(srcgridEl);
}
CATS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tab-btn'; b.textContent = c.name;
  b.setAttribute('role', 'tab');
  b.addEventListener('click', () => renderCat(i));
  tabsEl.appendChild(b);
});
renderCat(0);

/* ================= 口才训练 ================= */
const TOPICS = [
  '用 60 秒向一位校长推销你的粤语课文朗读工具',
  '用 60 秒向投资人解释：为什么是粤语 TTS，而不是普通话',
  '用 60 秒说服一个程序员加入你这家还没注册的公司',
  '用 60 秒向一位老师解释 AI 配音不会取代她',
  '用 60 秒介绍你自己：一个正在转型的夜班打工人',
  '用 60 秒向澳门政府部门说明你的项目为什么值得资助',
  '用 60 秒反驳「小公司做语音没有前途」',
  '用 60 秒向家长解释语音技术如何帮孩子学语言',
  '用 60 秒总结你今天读到的一条新闻',
  '用 60 秒讲清楚你的公司和科大讯飞的区别',
  '用 60 秒向横琴的招商人员介绍你的项目',
  '用 60 秒向未来的合伙人描述五年后的公司',
];
const topicEl = $('#topic'), drawBtn = $('#draw');
let lastIdx = -1;
drawBtn.addEventListener('click', () => {
  let i;
  do { i = Math.floor(Math.random() * TOPICS.length); } while (i === lastIdx && TOPICS.length > 1);
  lastIdx = i;
  topicEl.textContent = TOPICS[i];
});
$('#speakdone').addEventListener('click', () => setDaily('speak'));

/* ================= 学习引擎·路径生成器 ================= */
const TRACKS = [
  {
    name: '英语（雅思）',
    goal: '从零基础到雅思 6.5，约 18 个月',
    stages: [
      { t: '建立地图（第 1–2 周）', d: '先在 B站看一套「雅思全科扫盲」合集，弄清四个单项考什么；做一次模考摸底。', r: '<a href="https://search.bilibili.com/all?keyword=%E9%9B%85%E6%80%9D%20%E5%85%A5%E9%97%A8" target="_blank" rel="noopener">B站「雅思 入门」合集 ↗</a>' },
      { t: '系统输入（第 1–6 月）', d: '音标 + 2000 基础词 + 跟读；每天 20 分钟 App 打卡 + 20 分钟精听。不急着做题。', r: '每日英语听力 App · YouTube 开英文字幕看感兴趣的频道' },
      { t: '实战冲刺（第 7–18 月）', d: '进入真题体系，下班黄金时间做题，口语用 AI 当考官每天练 5 问。', r: '<a href="https://ieltsliz.com/" target="_blank" rel="noopener">IELTS Liz ↗</a>（免费全科攻略）· 剑桥雅思真题' },
      { t: '输出检验', d: '报名考试拿到分数；能用英语写一封合作邮件、打一通业务电话，比分数更算数。', r: '小红书搜「澳门 雅思 报名」看亲历攻略' },
    ],
  },
  {
    name: 'AI 与 TTS 技术',
    goal: '能独立跑通开源 TTS 项目并做出粤语 Demo，约 12 个月',
    stages: [
      { t: '建立地图（第 1 月）', d: '看科普建立大局观：语音合成是什么、主流技术路线、开源项目有哪些。', r: '<a href="https://search.bilibili.com/all?keyword=%E8%AF%AD%E9%9F%B3%E5%90%88%E6%88%90%20%E7%A7%91%E6%99%AE" target="_blank" rel="noopener">B站「语音合成 科普」 ↗</a> · 让 AI 用白话解释 10 个核心术语' },
      { t: '系统输入（第 2–4 月）', d: 'Python 基础，每天 1 小时。目标是能看懂脚本、改参数，不是当程序员。', r: '廖雪峰 Python 教程（liaoxuefeng.com）· B站 Python 入门合集' },
      { t: '动手实战（第 5–12 月）', d: '跑通 GPT-SoVITS / CosyVoice，录自己的粤语素材微调出声音；每卡住一步就截图问 AI。', r: '<a href="https://github.com/RVC-Boss/GPT-SoVITS" target="_blank" rel="noopener">GPT-SoVITS 官方仓库 ↗</a> · Hugging Face 语音课程' },
      { t: '输出检验', d: '做出 3 个 Demo：课文朗读、商户广播、有声故事。发出去收集真实反馈。', r: '把作品发小红书/B站，看真实用户的反应' },
    ],
  },
  {
    name: '商业与金融常识',
    goal: '看懂钱怎么流动、一单生意赚不赚钱，持续进行',
    stages: [
      { t: '建立地图（第 1–2 周）', d: '先搞懂 10 个词：利率、通胀、汇率、毛利、现金流、估值、股权、融资、复利、风险。', r: '每个词问 AI：「用澳门茶餐厅的例子解释」' },
      { t: '系统输入（第 1–3 月）', d: '读两本入门书建立商业直觉；每天 10 分钟财经快讯。', r: '《小狗钱钱》《穷爸爸富爸爸》· 华尔街见闻头条' },
      { t: '动手实战', d: '给自己的 TTS 副业算一笔账：做一单配音的成本、定价、毛利是多少。', r: '用 Excel 或纸笔画出第一张「生意算账表」' },
      { t: '输出检验', d: '能向朋友讲清「我的生意怎么赚钱」，并回答三个追问不露怯。', r: '<a href="https://www.startupschool.org/" target="_blank" rel="noopener">YC 创业课 ↗</a>（免费，全球创业者的必修课）' },
    ],
  },
  {
    name: '表达与演讲',
    goal: '任何场合 60 秒说清楚一件事，每天 3 分钟',
    stages: [
      { t: '建立地图（第 1 周）', d: '掌握 PREP 框架（观点-理由-例子-重申），看 3 个 TED 演讲找感觉。', r: '<a href="https://www.ted.com/" target="_blank" rel="noopener">TED ↗</a> 搜「how to speak」' },
      { t: '系统输入（第 1–3 月）', d: '每天用本站「口才训练」抽题录音 60 秒，回放找一个毛病。', r: '本站「口才训练」模块 + 手机录音机' },
      { t: '动手实战', d: '把学到的东西讲给真人听：朋友、家人、同事。每周一次，观察对方是否走神。', r: '费曼检验法：讲不明白 = 没真懂' },
      { t: '输出检验', d: '做一次 5 分钟的完整分享（可以是对着手机），讲你的创业想法，全程不卡壳。', r: 'B站搜「演讲 技巧」看高手拆解' },
    ],
  },
  {
    name: '粤语 TTS 行业研究',
    goal: '成为「最懂粤语语音场景」的人，每周 2 小时',
    stages: [
      { t: '建立地图（第 1 月）', d: '梳理粤语使用场景全景：教育、政务、长者服务、无障碍、内容创作、出海华人。', r: '澳门日报教育版 · 小红书搜「粤语 教学」' },
      { t: '系统输入', d: '每周读 1 篇语音合成论文摘要（AI 翻译）+ 刷 1 次 GitHub TTS 趋势。', r: 'Google Scholar 搜「Cantonese TTS」· GitHub topics/tts' },
      { t: '动手实战', d: '每月访谈 2 个潜在用户（老师、商户、社福机构），记录原话。', r: '访谈提纲让 AI 帮你列，但人必须亲自去聊' },
      { t: '输出检验', d: '写出一份「粤语 TTS 机会地图」笔记，能说出 3 个没人做好的细分场景。', r: '用本站「老板五问」存成系列笔记' },
    ],
  },
];
const learnTabsEl = $('#learntabs'), learnPlanEl = $('#learnplan');
function renderTrack(i) {
  const t = TRACKS[i];
  learnPlanEl.innerHTML =
    `<div style="margin-bottom:16px"><span style="color:var(--gold);font-weight:700;font-size:17px">${t.name}</span><span style="color:var(--text-3);font-size:14px;margin-left:10px">目标：${t.goal}</span></div>` +
    t.stages.map((s, j) =>
      `<div class="chain-step" style="margin-bottom:10px"><span class="n">${j + 1}</span><div><b>${s.t}</b><p>${s.d}</p><p style="margin-top:4px;font-size:13px"><b style="color:var(--gold);font-weight:600">资源：</b>${s.r}</p></div></div>`
    ).join('');
  $$('.tab-btn', learnTabsEl).forEach((b, j) => b.classList.toggle('on', j === i));
}
TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tab-btn'; b.textContent = t.name;
  b.setAttribute('role', 'tab');
  b.addEventListener('click', () => renderTrack(i));
  learnTabsEl.appendChild(b);
});
renderTrack(0);

/* ================= 粤语语音对练 ================= */
const VNEWS = [
  '从今天情报里挑一条新闻，用粤语播报 60 秒，像电台主播一样',
  '用粤语向一位澳门阿婆解释：今日有咩重要新闻？60 秒讲清楚',
  '挑一条政策新闻，用粤语讲出「关我哋咩事」的三个点',
  '用粤语播报一条国际新闻，最后加一句你自己的评论',
  '把今天读过最有用嘅嘢，用粤语讲成一段 60 秒嘅「今日学咗啲乜」',
];
const VTALK = [
  '突发·死机：你同陈校长约好 demo 课文朗读工具，点知投影死机，净返你部手机。佢望表：「我 3 分钟后有个会。」——60 秒口讲清楚你嘅产品点帮佢啲学生，讲唔到重点就冇下次',
  '突发·临时加价：录音艺员阿 May 录咗 2 个钟，突然话由 1,500 加到 2,400，理由係「你攞我把声去练 AI」。——60 秒回应：唔准闹交、唔准即刻答应，要保住合作同预算',
  '突发·群组质疑：家长群有人疯传「AI 教细路讲嘢会教坏口音」，仲特登 @ 你。群主俾你发一段 60 秒语音——讲到家长安心，仲想俾细路试你嘅产品',
  '突发·当面泼冷水：横琴招商陈生听完你讲，直接反问：「讯飞、腾讯都做粤语，点解要扶你？」——60 秒讲出你嘅差异化，目标：换到一张名片',
  '突发·假音频危机：有人用 AI 模仿你把声录咗段假嘢放上业主群，楼下阿婆信以为真。记者打嚟问——60 秒回应：拆穿假音频之馀，仲要顺便讲清楚你公司点样防呢单嘢',
  '突发·冷场：商会聚会，你递名片畀做教育出版嘅黄生，佢睇完只讲句「哦，TTS 呀」就想走——60 秒令佢转返头问你攞资料',
  '突发·压价：客戶掟报价单返嚟：「大厂通用语音先收个零，你凭咩贵三倍？」——60 秒讲清楚你卖嘅唔係通用语音，係乜嘢，令佢觉得值',
];
function drawFrom(arr, el, lastRef) {
  let i;
  do { i = Math.floor(Math.random() * arr.length); } while (i === lastRef.v && arr.length > 1);
  lastRef.v = i;
  el.textContent = arr[i];
}
const vnEl = $('#vnews');
const vnLast = { v: -1 };
$('#vnews-draw').addEventListener('click', () => drawFrom(VNEWS, vnEl, vnLast));
$('#vnews-done').addEventListener('click', () => setDaily('speak'));

/* ================= 泡沫鉴别器 ================= */
const hBoxes = $$('input[data-h]');
$('#hype-judge').addEventListener('click', () => {
  const score = hBoxes.filter(b => b.checked).length;
  const v = $('#hype-verdict');
  let cls, title, body;
  if (score >= 6) {
    cls = 'var(--ok)'; title = '✓ 大概率是真机会';
    body = '通过了大部分检验。可以进入下一步：小成本验证（访谈用户 / 做个最简 Demo），而不是立刻下注。';
  } else if (score >= 4) {
    cls = 'var(--gold)'; title = '◐ 观望，先验证再说';
    body = '有真有假。把没打勾的那几条当作你的调研清单——逐条去找证据，找到了再行动。';
  } else {
    cls = 'oklch(0.52 0.12 30)'; title = '✕ 泡沫警报';
    body = '多项核心检验未通过。把钱和时间放在口袋里，让子弹再飞一会儿——错过泡沫不是损失。';
  }
  v.innerHTML = `<div class="note" style="border-left-color:${cls}"><h4 style="color:${cls}">${title}（通过 ${score} / 7 条）</h4><p>${body}</p></div>`;
});
$('#hype-reset').addEventListener('click', () => {
  hBoxes.forEach(b => b.checked = false);
  $('#hype-claim').value = '';
  $('#hype-verdict').innerHTML = '';
});

/* ================= 领袖气质·今日修炼 ================= */
const CHARISMA = [
  '靠墙站 5 分钟：后脑、肩胛、臀、脚跟贴墙，感受「站直」的身体记忆',
  '朗读今天的一条新闻并录音，数出有几个「嗯、然后、就是」，明天少一个',
  '把语速放慢 20% 复述一遍今天学到的东西，句尾用降调',
  '对着镜子练习：说观点时盯住自己的眉心，30 秒不飘',
  '把「TTS 是什么」用 3 分钟讲给一个完全不懂技术的人听',
  '今天说出的每个观点，后面跟一个具体数字或画面',
  '练习停顿：说完最重要的一句话后，心里默数两秒再开口',
  '被质疑时不辩解，先复述对方观点：「你的意思是……对吗？」',
  '遇到不懂的问题，练习说：「这个我不确定，查实后答复你」',
  '今天有人帮了你，当面具体地感谢：说出他做的那件事，而不只是「谢谢」',
];
const chTopicEl = $('#chtopic'), chDrawBtn = $('#chdraw');
let chLast = -1;
chDrawBtn.addEventListener('click', () => {
  let i;
  do { i = Math.floor(Math.random() * CHARISMA.length); } while (i === chLast && CHARISMA.length > 1);
  chLast = i;
  chTopicEl.textContent = CHARISMA[i];
});
$('#chardone').addEventListener('click', () => setDaily('char'));

/* ================= 路线图进度 ================= */
const CHECK_KEY = 'boss_roadmap_v1';
const boxes = $$('#roadmap .check input');
let saved = {};
try { saved = JSON.parse(localStorage.getItem(CHECK_KEY)) || {}; } catch {}
function refreshProgress() {
  const done = boxes.filter(b => b.checked).length;
  const total = boxes.length;
  $('#done-count').textContent = `${done} / ${total}`;
  $('#pct').textContent = total ? Math.round(done / total * 100) + '%' : '0%';
  $('#bar').style.width = total ? (done / total * 100) + '%' : '0%';
}
boxes.forEach(b => {
  b.checked = !!saved[b.dataset.k];
  b.addEventListener('change', () => {
    saved[b.dataset.k] = b.checked;
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(saved)); } catch {}
    refreshProgress();
  });
});
refreshProgress();

/* ================= 本周侦察任务（每周自动重置） ================= */
const R_KEY = 'boss_recon_v1';
const rBoxes = $$('input[data-r]');
function weekStr() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + '-W' + (1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7));
}
let reconState = {};
try {
  const raw = JSON.parse(localStorage.getItem(R_KEY)) || {};
  if (raw.week === weekStr()) reconState = raw.done || {};
} catch {}
function refreshRecon() {
  const done = rBoxes.filter(b => b.checked).length;
  const el = $('#recon-progress');
  if (el) el.textContent = `${done} / ${rBoxes.length}`;
}
rBoxes.forEach(b => {
  b.checked = !!reconState[b.dataset.r];
  b.addEventListener('change', () => {
    reconState[b.dataset.r] = b.checked;
    try { localStorage.setItem(R_KEY, JSON.stringify({ week: weekStr(), done: reconState })); } catch {}
    refreshRecon();
  });
});
refreshRecon();

/* ================= 人格化改写器 ================= */
const RW_SRC = [
  '人工智能技术正在深刻改变教育行业，为学习者带来全新体验。',
  '粤港澳大湾区建设为澳门青年提供了前所未有的发展机遇。',
  '语音合成市场潜力巨大，是一个值得关注的新兴赛道。',
  '我们应该保持终身学习的态度，不断提升自己的核心竞争力。',
  'AI 不会取代人类，但会使用 AI 的人将取代不会使用 AI 的人。',
  '本产品致力于为用户提供智能化、个性化的语音解决方案。',
];
const RW_KEY = 'boss_rewrite_v1';
const loadRw = () => { try { return JSON.parse(localStorage.getItem(RW_KEY)) || []; } catch { return []; } };
let rwLast = -1;
$('#rw-draw').addEventListener('click', () => {
  let i;
  do { i = Math.floor(Math.random() * RW_SRC.length); } while (i === rwLast && RW_SRC.length > 1);
  rwLast = i;
  $('#rw-src').textContent = RW_SRC[i];
});
$('#rw-save').addEventListener('click', () => {
  const mine = $('#rw-input').value.trim();
  if (!mine) { $('#rw-input').focus(); return; }
  const list = loadRw();
  list.unshift({ t: Date.now(), src: rwLast >= 0 ? RW_SRC[rwLast] : '', mine });
  try { localStorage.setItem(RW_KEY, JSON.stringify(list.slice(0, 100))); } catch {}
  $('#rw-input').value = '';
  setDaily('out');
  renderRw();
});
function renderRw() {
  const el = $('#rw-notes');
  const list = loadRw();
  if (!list.length) { el.innerHTML = '<div class="empty">还没有改写记录。抽一句 AI 腔，救活它。</div>'; return; }
  el.innerHTML = '';
  list.forEach((n, idx) => {
    const art = document.createElement('article');
    art.className = 'note';
    const date = new Date(n.t).toLocaleString('zh-CN', { hour12: false });
    art.innerHTML = `<div class="meta"><time>${date}</time>${n.sample ? '<span class="lv lv2">示例 · 可直接删</span>' : ''}<button type="button" data-rwdel="${idx}">删除</button></div>` +
      (n.src ? `<p style="color:var(--text-3)"><b>原句：</b>${n.src.replace(/</g, '&lt;')}</p>` : '') +
      `<p><b>我的改写：</b>${n.mine.replace(/</g, '&lt;')}</p>`;
    el.appendChild(art);
  });
}
$('#rw-notes').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-rwdel]');
  if (!btn) return;
  const list = loadRw();
  list.splice(Number(btn.dataset.rwdel), 1);
  try { localStorage.setItem(RW_KEY, JSON.stringify(list)); } catch {}
  renderRw();
});
seedIfEmpty(RW_KEY, [{ t: Date.now(), sample: true,
  src: '人工智能技术正在深刻改变教育行业，为学习者带来全新体验。',
  mine: '我夜班落班嗰日，听到两个学生用 AI 读课文，粤语错到离嗮谱——教育行业变唔变我唔知，但澳门啲老师真系需要有人帮手读课文。' }]);
renderRw();

/* ================= 首开自动抽题：拒绝空面板 ================= */
drawBtn.click();
$('#vnews-draw').click();
chDrawBtn.click();
$('#rw-draw').click();

/* ================= TradingView 行情组件（带失败兜底） ================= */
(function () {
  const wrap = $('#tvwrap .tradingview-widget-container');
  if (!wrap) return;
  const s = document.createElement('script');
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
  s.async = true;
  s.onerror = () => { $('#tvwrap').style.display = 'none'; };
  s.textContent = JSON.stringify({
    colorTheme: 'light', dateRange: '12M', showChart: true, locale: 'zh_CN',
    largeChartUrl: '', isTransparent: true, showSymbolLogo: true, showFloatingTooltip: false,
    width: '100%', height: '420', plotLineColorGrowing: 'rgba(158,59,46,1)',
    plotLineColorFalling: 'rgba(74,107,82,1)', gridLineColor: 'rgba(60,50,40,0.08)',
    scaleFontColor: 'rgba(70,60,50,1)', belowLineFillColorGrowing: 'rgba(158,59,46,0.10)',
    belowLineFillColorFalling: 'rgba(74,107,82,0.10)', symbolActiveColor: 'rgba(158,59,46,0.12)',
    tabs: [
      { title: '汇率', symbols: [{ s: 'FX_IDC:USDCNY' }, { s: 'FX_IDC:USDHKD' }, { s: 'FX_IDC:USDMOP' }, { s: 'FX_IDC:HKDCNY' }, { s: 'FX_IDC:USDSGD' }, { s: 'FX_IDC:USDMYR' }] },
      { title: '美股科技', symbols: [{ s: 'NASDAQ:NVDA' }, { s: 'NASDAQ:MSFT' }, { s: 'NASDAQ:GOOGL' }, { s: 'NASDAQ:META' }, { s: 'NASDAQ:AAPL' }, { s: 'NASDAQ:AMD' }] },
      { title: '港股', symbols: [{ s: 'HSI:HSI' }, { s: 'HKEX:700' }, { s: 'HKEX:9988' }, { s: 'HKEX:9888' }] },
      { title: 'A股 AI', symbols: [{ s: 'SSE:000300' }, { s: 'SZSE:002230' }, { s: 'SSE:688981' }] },
    ],
  });
  wrap.appendChild(s);
})();


/* ================= 首页：问候 / 连击 / 统计卡 ================= */
(function () {
  const gd = $('#gdate');
  if (gd) {
    const d = new Date();
    const wk = '日一二三四五六'[d.getDay()];
    gd.textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${wk} · 老板成长中枢`;
    const h = d.getHours();
    const g = h < 6 ? '夜深了' : h < 12 ? '早晨' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    const gh = $('#greet-h');
    if (gh) gh.innerHTML = `${g}。`;
  }
  const s2 = $('#streak2');
  if (s2) s2.textContent = calcStreak(getDoneDays());
  const e1 = $('#stat-daily');
  function refreshStat() {
    if (!e1) return;
    const done = dBoxes.filter(b => b.checked).length;
    e1.textContent = `${done} / ${dBoxes.length}`;
  }
  dBoxes.forEach(b => b.addEventListener('change', refreshStat));
  refreshStat();
})();

/* ================= 实时快讯：打开就抓，十分钟自动刷新 ================= */
const LIVE_FEEDS = [
  { tab: 'AI 与科技', name: 'IT之家', g: '媒体', url: 'https://www.ithome.com/rss/' },
  { tab: 'AI 与科技', name: 'Solidot', g: '媒体', url: 'https://www.solidot.org/index.rss' },
  { tab: 'AI 与科技', name: '量子位', g: '媒体', url: 'https://www.qbitai.com/feed' },
  { tab: 'AI 与科技', name: 'Hugging Face', g: '一手', url: 'https://huggingface.co/blog/feed.xml' },
  { tab: 'AI 与科技', name: 'arXiv语音论文', g: '一手', url: 'http://export.arxiv.org/rss/eess.AS' },
  { tab: '财经与国际', name: 'FT中文网', g: '媒体', url: 'http://www.ftchinese.com/rss/news' },
  { tab: '财经与国际', name: 'BBC 中文', g: '媒体', url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml' },
  { tab: '财经与国际', name: 'RTHK 國際', g: '一手', url: 'https://rthk.hk/rthk/news/rss/c_expressnews_cinternational.xml' },
  { tab: '粤港澳大湾区', region: '澳门', name: '澳門政府新聞', g: '一手', url: 'https://www.gov.mo/zh-hant/news/feed/' },
  { tab: '粤港澳大湾区', region: '澳门', name: '澳門日報', g: '一手', url: 'https://news.google.com/rss/search?q=site:macaodaily.com&hl=zh-MO&gl=MO&ceid=MO:zh-Hant' },
  { tab: '粤港澳大湾区', region: '澳门', name: '澳廣視TDM', g: '一手', url: 'https://news.google.com/rss/search?q=site:tdm.com.mo&hl=zh-MO&gl=MO&ceid=MO:zh-Hant' },
  { tab: '粤港澳大湾区', region: '澳门', name: '聚合·澳門', g: '聚合', url: 'https://news.google.com/rss/search?q=%E6%BE%B3%E9%96%80&hl=zh-HK&gl=HK&ceid=HK:zh-Hant' },
  { tab: '粤港澳大湾区', region: '香港', name: 'RTHK 本地', g: '一手', url: 'https://rthk.hk/rthk/news/rss/c_expressnews_clocal.xml' },
  { tab: '粤港澳大湾区', region: '香港', name: 'TVB新聞', g: '一手', url: 'https://news.google.com/rss/search?q=site:news.tvb.com&hl=zh-HK&gl=HK&ceid=HK:zh-Hant' },
  { tab: '粤港澳大湾区', region: '香港', name: '明報', g: '一手', url: 'https://news.google.com/rss/search?q=site:mingpao.com&hl=zh-HK&gl=HK&ceid=HK:zh-Hant' },
  { tab: '粤港澳大湾区', region: '香港', name: '聚合·香港', g: '聚合', url: 'https://news.google.com/rss/search?q=%E9%A6%99%E6%B8%AF&hl=zh-HK&gl=HK&ceid=HK:zh-Hant' },
  { tab: '粤港澳大湾区', region: '珠海', name: '聚合·珠海', g: '聚合', url: 'https://news.google.com/rss/search?q=%E7%8F%A0%E6%B5%B7&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { tab: '粤港澳大湾区', region: '横琴', name: '聚合·横琴', g: '聚合', url: 'https://news.google.com/rss/search?q=%E6%A8%AA%E7%90%B4&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { tab: '粤港澳大湾区', region: '广州', name: '聚合·广州', g: '聚合', url: 'https://news.google.com/rss/search?q=%E5%B9%BF%E5%B7%9E&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
  { tab: '粤港澳大湾区', region: '广东', name: '聚合·大湾区', g: '聚合', url: 'https://news.google.com/rss/search?q=%E7%B2%A4%E6%B8%AF%E6%BE%B3%E5%A4%A7%E6%B9%BE%E5%8C%BA&hl=zh-CN&gl=CN&ceid=CN:zh-Hans' },
];
/* 地区子筛选：只在大湾区分类下出现。聚合源 = 谷歌新闻按地区聚合，属二手快筛，点进去看原始出处 */
const LIVE_REGIONS = ['全部', '澳门', '香港', '珠海', '横琴', '广州', '广东'];
let liveRegion = '全部';
const LIVE_TABS = ['AI 与科技', '财经与国际', '粤港澳大湾区', '民生与生活', '舆情热榜', '社区与博主', '教育前线'];
let liveTab = 0, liveData = {};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60e3) return '刚刚';
  if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
  if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' 小时前';
  return Math.floor(diff / 86400e3) + ' 天前';
}
async function fetchFeed(f) {
  const api = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(f.url);
  const r = await fetch(api);
  if (!r.ok) throw new Error('bad');
  const j = await r.json();
  if (j.status !== 'ok') throw new Error('bad');
  return (j.items || []).slice(0, 8).map(it => ({
    t: (it.title || '').trim(),
    u: it.link,
    ts: new Date((it.pubDate || '').replace(' ', 'T')).getTime() || Date.now(),
    src: f.name, tab: f.tab, region: f.region || null,
  }));
}
/* 注入过滤（2026-11-21 审计 P1-3）：凡从 JSON/网络入嚟嘅内容，渲染前必过闸 */
function __stripDanger(h) {
  return String(h == null ? '' : h)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(script|iframe|object|embed|form)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
function __esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* 服务端雷达：定时任务抓好的 news.json 优先；超过 4 小时没更新或没有文件，才走浏览器直连兜底 */
async function tryServerLive() {
  try {
    const r = await fetch('news.json?_=' + Date.now());
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.items || !j.items.length) return null;
    if (Date.now() - (j.updated || 0) > 4 * 3600e3) return null; // 太旧，当没有
    return j;
  } catch { return null; }
}
async function loadLive(force) {
  const meta = $('#live-meta'), list = $('#livelist');
  if (!list) return;
  if (!force && liveData._done) { renderLive(); return; }
  meta.textContent = '正在读取雷达新闻…';
  const srv = await tryServerLive();
  if (srv) {
    liveData = { _done: true };
    srv.items.forEach(it => (liveData[it.tab] = liveData[it.tab] || []).push(it));
    Object.keys(liveData).forEach(k => { if (k[0] !== '_') liveData[k].sort((a, b) => b.ts - a.ts); });
    const n = srv.items.length;
    const sl = $('#stat-live'); if (sl) sl.textContent = n + ' 条';
    meta.textContent = '服务端雷达更新于 ' + new Date(srv.updated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + n + ' 条（每 3 小时自动抓取，不受限流影响）';
    renderLive();
    return;
  }
  meta.textContent = '雷达文件不可用，改为浏览器直连抓取…';
  const results = await Promise.allSettled(LIVE_FEEDS.map(fetchFeed));
  liveData = { _done: true };
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.length) { ok++; r.value.forEach(it => (liveData[it.tab] = liveData[it.tab] || []).push(it)); }
  });
  Object.keys(liveData).forEach(k => { if (k[0] !== '_') liveData[k].sort((a, b) => b.ts - a.ts); });
  if (!ok) {
    meta.textContent = '抓取失败';
    list.innerHTML = '<div class="empty">网络抓不到快讯（可能在墙内网络）。直接去：<a href="https://www.ithome.com/" target="_blank" rel="noopener">IT之家</a> · <a href="https://www.ftchinese.com/" target="_blank" rel="noopener">FT中文网</a> · <a href="https://www.bbc.com/zhongwen" target="_blank" rel="noopener">BBC中文</a></div>';
    return;
  }
  const n = Object.keys(liveData).filter(k => k[0] !== '_').reduce((a, k) => a + liveData[k].length, 0);
  const sl = $('#stat-live'); if (sl) sl.textContent = n + ' 条';
  meta.textContent = '已更新 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + '（每 10 分钟自动刷新）';
  renderLive();
}
/* ---- 自进化：打分学习 + 已读置灰 ---- */
const VOTE_KEY = 'boss_live_votes_v1', SEEN_KEY = 'boss_live_seen_v1';
const KW_LIST = ['AI', '大模型', '语音', 'TTS', '粤语', '教育', '融资', '政策', '澳门', '香港', '横琴', '芯片', '英伟达', '上市', '开源', '补贴'];
const loadVotes = () => { try { return JSON.parse(localStorage.getItem(VOTE_KEY)) || {}; } catch { return {}; } };
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; } };
function voteScore(it, votes) {
  let s = votes[it.src] || 0;
  KW_LIST.forEach(k => { if (it.t.includes(k)) s += (votes['kw:' + k] || 0); });
  return s;
}
function castVote(it, dir) {
  const votes = loadVotes();
  votes[it.src] = (votes[it.src] || 0) + dir;
  KW_LIST.forEach(k => { if (it.t.includes(k)) votes['kw:' + k] = (votes['kw:' + k] || 0) + dir; });
  localStorage.setItem(VOTE_KEY, JSON.stringify(votes));
  renderLive();
}
function markSeen(u) {
  const seen = loadSeen();
  if (!seen.includes(u)) { seen.push(u); if (seen.length > 300) seen.shift(); localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); }
}
const LIVE_ICONS = [['粤语', '🗣️'], ['TTS', '🔊'], ['语音', '🔊'], ['AI', '🤖'], ['大模型', '🤖'], ['融资', '💰'], ['上市', '📈'], ['IPO', '📈'], ['股', '📈'], ['政策', '📜'], ['澳门', '🇲🇴'], ['澳門', '🇲🇴'], ['香港', '🇭🇰'], ['横琴', '🏝️'], ['橫琴', '🏝️'], ['教育', '📚'], ['老师', '📚'], ['教師', '📚'], ['芯片', '🔌'], ['英伟达', '🔌'], ['开源', '🧰'], ['GitHub', '🧰'], ['补贴', '💸'], ['補貼', '💸'], ['人才', '🧑‍💼'], ['招聘', '🧑‍💼'], ['水印', '🛡️'], ['诈骗', '🛡️'], ['詐騙', '🛡️'], ['论文', '📄'], ['論文', '📄'], ['游戏', '🎮'], ['遊戲', '🎮'], ['音乐', '🎵'], ['音樂', '🎵'], ['电影', '🎬'], ['電影', '🎬'], ['长者', '👴'], ['長者', '👴'], ['医疗', '🏥'], ['醫療', '🏥'], ['美联储', '🏦'], ['汇率', '💱'], ['苹果', '🍎'], ['华为', '📱'], ['華為', '📱'], ['腾讯', '🐧'], ['騰訊', '🐧']];
function liveIcon(t) { for (const pair of LIVE_ICONS) { if (t.includes(pair[0])) return pair[1]; } return '📰'; }
function renderRegions(inBay) {
  const rbox = $('#liveregions');
  if (!rbox) return;
  if (!inBay) { rbox.style.display = 'none'; return; }
  rbox.style.display = 'flex';
  rbox.innerHTML = '';
  LIVE_REGIONS.forEach(rg => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab-btn' + (rg === liveRegion ? ' on' : ''); b.textContent = rg;
    b.addEventListener('click', () => { liveRegion = rg; renderLive(); });
    rbox.appendChild(b);
  });
}
function renderLive() {
  const list = $('#livelist');
  const votes = loadVotes(), seen = loadSeen();
  const hasVotes = Object.keys(votes).length > 0;
  const inBay = LIVE_TABS[liveTab] === '粤港澳大湾区';
  renderRegions(inBay);
  let items = (liveData[LIVE_TABS[liveTab]] || []).slice();
  if (inBay && liveRegion !== '全部') items = items.filter(it => it.region === liveRegion);
  if (hasVotes) items.sort((a, b) => voteScore(b, votes) - voteScore(a, votes) || b.ts - a.ts);
  items = items.slice(0, 25);
  $$('.tab-btn', $('#livetabs')).forEach((b, j) => b.classList.toggle('on', j === liveTab));
  const hint = $('#live-hint');
  if (hint) hint.textContent = hasVotes ? '已按你的打分偏好排序——越打分越懂你' : '每条后面的 👍👎 打一下，系统会慢慢学会你爱看什么';
  if (!items.length) { list.innerHTML = '<div class="empty">这个分类暂时没抓到，点「手动刷新」再试。</div>'; return; }
  list.innerHTML = items.map((it, i) => {
    const dim = seen.includes(it.u) ? ' style="opacity:.45"' : '';
    return `<div class="live-item"${dim}><span class="t"><span style="margin-right:4px">${liveIcon(it.t)}</span><span class="src-chip">${it.src}</span>${it.g && it.g !== '媒体' ? `<span class="g-chip g-${it.g === '一手' ? 'first' : 'agg'}">${it.g}</span>` : ''}<a href="${it.u}" target="_blank" rel="noopener" data-live-link="${i}">${it.t.replace(/</g, '&lt;')}</a></span><span class="m">${timeAgo(it.ts)}</span><span class="vote-btns"><button type="button" class="vote-btn" data-vote="1" data-i="${i}" title="有用">👍</button><button type="button" class="vote-btn" data-vote="-1" data-i="${i}" title="没劲">👎</button></span></div>`;
  }).join('');
  list.querySelectorAll('[data-vote]').forEach(b => b.addEventListener('click', () => castVote(items[+b.dataset.i], +b.dataset.vote)));
  list.querySelectorAll('[data-live-link]').forEach(a => a.addEventListener('click', () => { markSeen(a.href); a.closest('.live-item').style.opacity = '.45'; }));
}
(function initLive() {
  const tabs = $('#livetabs');
  if (!tabs) return;
  LIVE_TABS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab-btn'; b.textContent = t;
    b.addEventListener('click', () => { liveTab = i; liveRegion = '全部'; renderLive(); });
    tabs.appendChild(b);
  });
  $('#live-reload').addEventListener('click', () => { liveData = {}; loadLive(true); });
  loadLive();
  setInterval(() => { liveData = {}; loadLive(true); }, 600e3);
})();

/* ================= 今日深读：读 digest.json（定时任务每天自动更新） ================= */
(function () {
  const box = $('#digest-box'), meta = $('#digest-meta'), sd = $('#stat-dive');
  if (!box) return;
  const fallback = [
    { k: '深读 1 · 澳门政策', t: '澳门《2027 施政报告》：「政府引导基金」首次写入，你的政策窗口开闸了', p: '116 个重点项目、引导基金、科技企业认证、中小企数字化支援一次放出。注意：从报告到细则落地通常 6–12 个月——窗口用来看、用来准备，不是用来跳的。', a: '今晚花 10 分钟：去 policyaddress.gov.mo 搜「引导基金」，三段原文截图存档。' },
    { k: '深读 2 · AI 行业', t: '通用大模型开始吞掉专用模型——语音就是下一张骨牌', p: '阿里 Qwen-Audio 把 TTS 价格砍了 70%。结论很直白：别再想「自研粤语引擎」，改用最好的现成 API 做粤语教学闭环，把发音纠错数据攒成自己的矿。', a: '把创业假设改写一句话，列出要积累的三类自有数据。' },
  ];
  const SCORE_KEY = 'boss_dive_scores_v1';
  const loadScores = () => { try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || []; } catch { return []; } };
  function renderDives(dives, tip, stamp) {
    box.innerHTML = dives.map((d, i) =>
      `<div class="dive"><div class="k">${__esc(d.k)}</div><h3>${__esc(d.t)}</h3><p>${__esc(d.p)}</p><div class="act"><b>今日动作：</b>${__esc(d.a)}</div>` +
      `<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span style="font-size:12.5px;color:var(--text-3)">这条情报值几分？</span>` +
      [1,2,3,4,5].map(n => `<button type="button" class="mini-btn" data-dive="${i}" data-score="${n}" style="padding:4px 12px;min-height:32px;font-size:13px">${n}</button>`).join('') +
      `</div></div>`
    ).join('') + (tip ? `<div class="dive" style="border-color:var(--line)"><div class="k">一句话行动建议</div><p style="font-size:15px">${tip}</p></div>` : '') +
    `<div style="margin-top:2px"><button type="button" class="mini-btn" id="score-export">📋 导出我的评分给情报部门</button><span id="score-hint" style="font-size:12.5px;color:var(--text-3);margin-left:10px">打分越认真，明天的简报越对你的胃口</span></div>`;
    if (stamp) meta.textContent = '情报更新于 ' + stamp;
    if (sd) sd.textContent = dives.length + ' 篇';
    box.querySelectorAll('[data-score]').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = loadScores();
        list.unshift({ t: Date.now(), title: dives[Number(btn.dataset.dive)].t, score: Number(btn.dataset.score) });
        try { localStorage.setItem(SCORE_KEY, JSON.stringify(list.slice(0, 200))); } catch {}
        btn.textContent = btn.dataset.score + ' ✓';
        btn.style.borderColor = 'var(--gold)'; btn.style.color = 'var(--gold)';
      });
    });
    const ex = box.querySelector('#score-export');
    if (ex) ex.addEventListener('click', async () => {
      const list = loadScores().slice(0, 60);
      if (!list.length) { ex.textContent = '还没有评分记录'; setTimeout(() => ex.textContent = '📋 导出我的评分给情报部门', 1600); return; }
      const txt = '【我的情报评分记录】\n' + list.map(x => `${new Date(x.t).toLocaleDateString('zh-CN')}｜${x.score}分｜${x.title}`).join('\n') + '\n请根据评分调整选稿偏好：高分方向多挖，低分类型少送。';
      try { await navigator.clipboard.writeText(txt); } catch {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      ex.textContent = '已复制 ✓ 粘贴给 Kimi 即可';
      setTimeout(() => ex.textContent = '📋 导出我的评分给情报部门', 2500);
    });
  }
  fetch('digest.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (j && j.dives && j.dives.length) renderDives(j.dives, j.tip, j.updated);
      else renderDives(fallback, null, null);
    })
    .catch(() => renderDives(fallback, null, null));
})();

/* ================= 三餐播报：嵌入快讯页+深读页，读 broadcasts.json（三餐任务写 md 后跑 sync_broadcasts.py 自动同步，含语音） ================= */
(function () {
  const boxes = $$('.bc-embed-box'), metas = $$('.bc-embed-meta');
  if (!boxes.length) return;
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  fetch('broadcasts.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j || !j.items || !j.items.length) {
        boxes.forEach(box => { box.innerHTML = '<p class="lite-sub" style="font-size:13.5px">今天的播报还在路上——早 07:43、午 12:47、晚 18:33 各送一顿。</p>'; });
        return;
      }
      metas.forEach(m => { m.textContent = '最新：' + (j.items[0].icon || '') + ' ' + j.items[0].meal + ' ' + j.items[0].date.slice(5) + ' 已送达'; });
      const html = j.items.map((it, i) => {
        const d = new Date(it.date + 'T00:00:00');
        const wd = isNaN(d) ? '' : '（周' + WD[d.getDay()] + '）';
        const audio = it.audio
          ? '<div style="margin:12px 0 2px;background:rgba(184,145,47,.08);border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button class="mp-handoff" data-mp-date="' + it.date + '" data-mp-meal="' + it.meal + '" style="font-size:13px;padding:5px 14px;border-radius:8px;border:1px solid rgba(212,175,55,.45);background:none;color:#c8a445;cursor:pointer">🎧 听呢段（右下角随身听）</button><span style="font-size:12px;color:var(--text-3)">文字照睇，声交畀随身听</span><div class="vrate" data-rate-id="bc-' + it.date + '-' + it.meal + '" style="margin-top:2px"></div></div>'
          : '';
        return '<details class="bc-item"><summary><span>' + (it.icon || '📻') + ' ' + it.meal + ' · ' + it.date.slice(5) + wd + '</span><span class="bc-arrow">▾ 点击展开</span></summary><div class="bc-body">' + audio + it.html + '</div></details>';
      }).join('');
      boxes.forEach(box => {
        box.innerHTML = __stripDanger(html);
        // 展开限高：正文太长就夹短，想读全文先揿掣（老板 11-21：唔好成屏长文）
        box.querySelectorAll('.bc-body').forEach(bd => {
          if (bd.scrollHeight > 240) {
            bd.classList.add('bc-clamped');
            const btn = document.createElement('button');
            btn.className = 'bc-more';
            btn.textContent = '展开全文 ▾';
            btn.addEventListener('click', () => {
              const open = !bd.classList.contains('bc-clamped');
              bd.classList.toggle('bc-clamped', open);
              btn.textContent = open ? '展开全文 ▾' : '收起 ▴';
            });
            bd.after(btn);
          }
        });
      });
      if (window.mountVrates) window.mountVrates();
    })
    .catch(() => {
      boxes.forEach(box => { box.innerHTML = '<p class="lite-sub" style="font-size:13.5px">播报数据暂时读不到，稍后再来。</p>'; });
    });
})();

/* ================= 老板生活圈：读 life.json（经营会每48小时巡检更新，过期自动下架） ================= */
(function () {
  const box = $('#life-box'), meta = $('#life-meta');
  if (!box) return;
  fetch('life.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j || !j.items || !j.items.length) {
        box.innerHTML = '<p class="lite-sub">近期没有查到值得去的展——经营会每 48 小时扫一轮，有货自动上架。</p>';
        return;
      }
      const today = new Date(); today.setHours(0,0,0,0);
      const live = j.items.map(it => {
        const end = it.end ? new Date(it.end + 'T00:00:00') : null;
        const left = end ? Math.round((end - today) / 864e5) : null;
        return Object.assign({}, it, { _left: left });
      }).filter(it => it._left === null || it._left >= 0)
        .sort((a, b) => (a._left === null ? 9999 : a._left) - (b._left === null ? 9999 : b._left));
      if (!live.length) {
        box.innerHTML = '<p class="lite-sub">上一批展都闭展了，经营会正在扫新货。</p>';
        return;
      }
      if (meta) meta.textContent = '巡检更新于 ' + (j.updated || '');
      box.innerHTML = live.map(it => {
        const chip = it._left === null ? '' :
          it._left <= 14 ? '<span style="background:var(--ver,#a63a2a);color:#fff;border-radius:6px;padding:2px 8px;font-size:12px;margin-left:8px">还剩 ' + it._left + ' 天</span>' :
          '<span style="color:var(--text-3);font-size:12.5px;margin-left:8px">还剩 ' + it._left + ' 天</span>';
        return '<div class="dive"><div class="k">' + it.type + ' · ' + it.area + chip + '</div><h3>' + it.name + '</h3>' +
          '<p style="font-size:13.5px;color:var(--text-3);margin:2px 0 8px">📍 ' + it.venue + '<br>🗓 ' + it.dates + ' · 💰 ' + it.cost + '</p>' +
          '<p><b>老板视角：</b>' + it.why + '</p>' +
          '<div class="act"><b>行动：</b>' + it.action + '</div>' +
          (it.url ? '<div style="margin-top:8px"><a href="' + it.url + '" target="_blank" rel="noopener" style="color:var(--gold);font-size:13.5px">官方信息 ↗</a></div>' : '') +
          '</div>';
      }).join('');
    })
    .catch(() => {
      box.innerHTML = '<p class="lite-sub">生活圈数据暂时读不到，稍后再来。</p>';
    });
})();

/* ================= 生活圈汇率：open.er-api.com 免费接口，MOP 视角看三种钱 ================= */
(function () {
  const box = $('#fx-box');
  if (!box) return;
  fetch('https://open.er-api.com/v6/latest/MOP')
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j || !j.rates || !j.rates.CNY || !j.rates.USD || !j.rates.HKD) throw 0;
      const inv = r => (1 / r).toFixed(3);
      box.innerHTML =
        '<span>🇨🇳 1 人民币 ≈ <b>' + inv(j.rates.CNY) + '</b> 澳门元</span>' +
        '<span>🇺🇸 1 美金 ≈ <b>' + inv(j.rates.USD) + '</b> 澳门元</span>' +
        '<span>🇭🇰 1 港元 ≈ <b>' + inv(j.rates.HKD) + '</b> 澳门元</span>';
    })
    .catch(() => {
      box.innerHTML = '<span style="color:var(--text-3);font-size:13.5px">汇率暂时读不到（网络或接口原因），不影响看展。</span>';
    });
})();

/* ================= 体感评测：打分 + 雷达图 + 档案 ================= */
(function () {
  const form = $('#feel-form');
  if (!form) return;
  const DIMS = [
    { k: 'natural', name: '自然度', desc: '像不像真人在说话' },
    { k: 'warm', name: '亲切感', desc: '愿不愿意让它跟你说话' },
    { k: 'clear', name: '清晰度', desc: '不费力气就能听懂' },
    { k: 'endure', name: '耐听度', desc: '听 30 分钟累不累' },
    { k: 'trust', name: '信任感', desc: '它说的内容你敢不敢信' },
  ];
  const FEEL_KEY = 'boss_feel_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(FEEL_KEY)) || []; } catch { return []; } };
  const state = {};
  form.innerHTML = DIMS.map(d => `
    <div style="padding:14px 0;border-top:1px solid var(--line)" data-dim="${d.k}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px">
        <b style="font-size:15.5px">${d.name}</b><span style="color:var(--text-3);font-size:13px">${d.desc}</span>
      </div>
      <div class="row" style="margin-top:10px;gap:8px">
        ${[1,2,3,4,5].map(n => `<button type="button" class="mini-btn feel-score" data-n="${n}" style="min-width:44px">${n}</button>`).join('')}
      </div>
    </div>`).join('');
  form.addEventListener('click', e => {
    const btn = e.target.closest('.feel-score');
    if (!btn) return;
    const row = btn.closest('[data-dim]');
    const dim = row.dataset.dim;
    state[dim] = +btn.dataset.n;
    row.querySelectorAll('.feel-score').forEach(b => {
      const on = +b.dataset.n === state[dim];
      b.style.background = on ? 'var(--gold)' : '';
      b.style.color = on ? 'oklch(0.97 0.012 90)' : '';
      b.style.borderColor = on ? 'var(--gold)' : '';
    });
  });
  function drawRadar(recs) {
    const wrap = $('#feel-radar');
    if (!wrap) return;
    const avg = DIMS.map(d => recs.reduce((s, r) => s + (r.scores[d.k] || 0), 0) / recs.length);
    const cx = 130, cy = 130, R = 100;
    const pt = (i, v) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / DIMS.length;
      const r = R * v / 5;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    };
    const rings = [1,2,3,4,5].map(v =>
      `<polygon points="${DIMS.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
    const axes = DIMS.map((d, i) => {
      const [x, y] = pt(i, 5);
      const [lx, ly] = pt(i, 6.2);
      const avgVal = avg[i];
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>
        <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="var(--text-2)">${d.name} ${avgVal.toFixed(1)}</text>`;
    }).join('');
    const poly = DIMS.map((_, i) => pt(i, avg[i]).join(',')).join(' ');
    wrap.innerHTML = `<svg viewBox="0 0 260 260" style="width:min(300px,90vw);height:auto">
      ${rings}${axes}
      <polygon points="${poly}" fill="oklch(0.52 0.15 35 / 0.18)" stroke="var(--gold)" stroke-width="2"/>
    </svg>
    <p style="color:var(--text-3);font-size:13px;margin-top:4px">${recs.length} 次评测的平均体感</p>`;
  }
  function renderHistory() {
    const recs = load();
    const wrapEl = $('#feel-history-wrap'), list = $('#feel-list');
    if (!wrapEl || !list) return;
    if (!recs.length) { wrapEl.style.display = 'none'; return; }
    wrapEl.style.display = '';
    drawRadar(recs);
    list.innerHTML = recs.slice(-8).reverse().map((r, i) => {
      const realIdx = recs.length - 1 - i;
      const total = DIMS.reduce((s, d) => s + (r.scores[d.k] || 0), 0);
      return `<div class="note"><div class="meta"><time>${r.date}</time><button type="button" data-del="${realIdx}">删除</button></div>
        <p><b>总分 ${total} / 25</b> · ${DIMS.map(d => `${d.name} ${r.scores[d.k] || '-'}`).join(' · ')}</p>
        ${r.note ? `<p>${r.note.replace(/</g, '&lt;')}</p>` : ''}</div>`;
    }).join('');
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const recs2 = load(); recs2.splice(+b.dataset.del, 1);
      localStorage.setItem(FEEL_KEY, JSON.stringify(recs2));
      renderHistory();
    }));
  }
  $('#feel-save').addEventListener('click', () => {
    if (DIMS.some(d => !state[d.k])) {
      form.insertAdjacentHTML('beforebegin', '<p id="feel-warn" style="color:var(--gold);font-size:14px;margin-bottom:12px">五个维度都要打分才能存档。</p>');
      setTimeout(() => $('#feel-warn') && $('#feel-warn').remove(), 2600);
      return;
    }
    const recs = load();
    recs.push({ date: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }), scores: { ...state }, note: '' });
    localStorage.setItem(FEEL_KEY, JSON.stringify(recs));
    renderHistory();
    const btn = $('#feel-save');
    btn.textContent = '已存入档案 ✓';
    setTimeout(() => { btn.textContent = '记下这次评测'; }, 2000);
  });
  renderHistory();
})();

/* ================= AI 员工：复制聘书 + 周会提示词 ================= */
(function () {
  function copyText(t, btn, okLabel) {
    const done = () => {
      const old = btn.textContent;
      btn.textContent = okLabel;
      setTimeout(() => { btn.textContent = old; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
    } else fallbackCopy(t, done);
  }
  function fallbackCopy(t, done) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
  document.querySelectorAll('.hire-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const box = btn.closest('.boss-view');
      const text = box ? box.textContent.replace(/^上岗口令：/, '').replace(/复制聘书$/, '').trim() : '';
      copyText(text, btn, '已复制 ✓');
    });
  });
  const mtg = $('#meeting-copy');
  if (mtg) {
    mtg.addEventListener('click', () => {
      const text = '你是我的管理层团队，现在开本周经营会（30 分钟节奏）。按顺序扮演六个角色向我汇报并追问：① 情报官：本周最重要的三条情报，每条一句「对我们意味着什么」；② 产品评测员：本周体感评测结果，竞品进步没有，五维雷达哪里塌了；③ 学习教练：学习进度，没完成的直说，当场排下周计划；④ 内容编辑：本周产出和反馈，下周做什么；⑤ 财务哨兵 + 健康管家：钱和身体的红线检查；⑥ 最后提醒我拍板：下周只做三件事。我是老板，在澳门，做粤语 TTS 初创，夜班打工人。一个角色汇报完等我回复，再进入下一个。';
      copyText(text, mtg, '已复制 ✓');
    });
  }
})();

/* ================= OPML 导出 + 卡片分页（通用机制） ================= */
(function () {
  // OPML：把信源库变成可导入任何 RSS 阅读器的雷达
  const btn = $('#opml-btn');
  if (btn && typeof CATS !== 'undefined') {
    btn.addEventListener('click', () => {
      const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      let body = '';
      CATS.forEach(c => {
        body += `  <outline text="${esc(c.name)}" title="${esc(c.name)}">\n`;
        c.srcs.forEach(s => {
          if (s.url) body += `    <outline type="rss" text="${esc(s.name)}" title="${esc(s.name)}" htmlUrl="${esc(s.url)}" xmlUrl="${esc(s.url)}"/>\n`;
        });
        body += `  </outline>\n`;
      });
      const opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>老板成长中枢 · 信源雷达</title><dateCreated>${new Date().toUTCString()}</dateCreated></head><body>\n${body}</body></opml>`;
      const blob = new Blob([opml], { type: 'text/xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '信源雷达.opml';
      a.click();
      URL.revokeObjectURL(a.href);
      btn.textContent = '已下载 ✓ 去 Feedly 导入';
      setTimeout(() => { btn.textContent = '📡 一键导出全部信源（OPML）'; }, 2600);
    });
  }
})();
// 分页：卡片超过 6 张自动收起（顶层函数，renderCat 每次渲染后复用）
function paginateGrid(grid) {
  if (!grid) return;
  grid.querySelectorAll('.grid-more').forEach(m => m.remove());
  const kids = Array.from(grid.children).filter(k => k.classList.contains('src'));
  if (kids.length <= 6) { kids.forEach(k => k.style.display = ''); return; }
  kids.forEach((k, idx) => k.style.display = idx < 6 ? '' : 'none');
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'mini-btn grid-more';
  more.style.cssText = 'grid-column:1/-1;justify-self:center;margin-top:4px';
  more.textContent = `展开其余 ${kids.length - 6} 个 ▾`;
  grid.appendChild(more);
  more.addEventListener('click', () => {
    const open = more.dataset.open === '1';
    kids.forEach((k, idx) => k.style.display = (open && idx >= 6) ? 'none' : '');
    more.dataset.open = open ? '' : '1';
    more.textContent = open ? `展开其余 ${kids.length - 6} 个 ▾` : '收起 ▴';
  });
}
$$('.src-grid').forEach(g => { if (g.id !== 'srcgrid') paginateGrid(g); });

/* ================= 预测与对答案：判断力校准 ================= */
(function () {
  const textEl = $('#pred-text');
  if (!textEl) return;
  const PRED_KEY = 'boss_preds_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(PRED_KEY)) || []; } catch { return []; } };
  const save = r => localStorage.setItem(PRED_KEY, JSON.stringify(r));
  const confEl = $('#pred-conf'), confV = $('#pred-conf-v');
  confEl.addEventListener('input', () => confV.textContent = confEl.value + '%');
  const dateEl = $('#pred-date');
  dateEl.value = fmtDate(new Date(Date.now() + 30 * 864e5));

  function stats(recs) {
    const done = recs.filter(r => r.result);
    const wrap = $('#pred-stats');
    if (!done.length) { wrap.style.display = 'none'; return; }
    const hits = done.filter(r => r.result === 'hit').length;
    const part = done.filter(r => r.result === 'part').length;
    const rate = Math.round((hits + part * 0.5) / done.length * 100);
    const avgConf = Math.round(done.reduce((s, r) => s + r.conf, 0) / done.length);
    const calib = rate >= avgConf ? '你比你以为的更准——可以更敢下注' : '你的把握比实际准头高——下注前先多问一个人';
    wrap.style.display = '';
    wrap.innerHTML = `<div class="stat-row" style="margin:0">
      <div class="stat-card sc-b"><span>已对答案</span><b>${done.length} 条</b><span>应验 ${hits} · 部分 ${part} · 落空 ${done.length - hits - part}</span></div>
      <div class="stat-card sc-c"><span>命中率</span><b>${rate}%</b><span>部分应验算半条</span></div>
      <div class="stat-card sc-a"><span>平均把握</span><b>${avgConf}%</b><span>${calib}</span></div>
    </div>`;
  }
  function render() {
    const recs = load();
    const list = $('#pred-list');
    const today = fmtDate(new Date());
    stats(recs);
    if (!recs.length) { list.innerHTML = '<div class="empty">还没有判断。从今晚简报的「可证伪判断」抄一条过来开始。</div>'; return; }
    list.innerHTML = recs.map((r, i) => {
      const due = r.date <= today;
      const badge = r.result
        ? (r.result === 'hit' ? '<span class="lv lv1">应验</span>' : r.result === 'part' ? '<span class="lv lv2">部分应验</span>' : '<span class="lv lv3">落空</span>')
        : (due ? '<span class="lv lv2">到期了，来对答案</span>' : `<span class="lv lv1">待检验 · ${r.date}</span>`);
      const actions = r.result ? `<button type="button" data-del="${i}">删除</button>`
        : `<button type="button" data-mark="hit" data-i="${i}">应验</button><button type="button" data-mark="part" data-i="${i}">部分</button><button type="button" data-mark="miss" data-i="${i}">落空</button><button type="button" data-del="${i}">删除</button>`;
      return `<div class="note" ${due && !r.result ? 'style="border-left-color:var(--gold)"' : ''}>
        <div class="meta"><span>${badge} <span style="color:var(--text-3);font-size:13px">把握 ${r.conf}%</span></span><span style="display:flex;gap:2px">${actions}</span></div>
        <p><b>${r.text.replace(/</g, '&lt;')}</b></p>
        <p style="color:var(--text-3);font-size:13px">记于 ${r.created} · 检验日 ${r.date}</p>
      </div>`;
    }).reverse().join('');
    list.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', () => {
      const recs2 = load(); recs2[+b.dataset.i].result = b.dataset.mark; save(recs2); render();
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const recs2 = load(); recs2.splice(+b.dataset.del, 1); save(recs2); render();
    }));
  }
  $('#pred-add').addEventListener('click', () => {
    const t = textEl.value.trim();
    if (!t || !dateEl.value) { textEl.focus(); return; }
    const recs = load();
    recs.push({ text: t, date: dateEl.value, conf: +confEl.value, created: fmtDate(new Date()), result: '' });
    save(recs);
    textEl.value = '';
    render();
  });
  render();
})();

/* ================= 间隔重复回顾：记忆曲线 ================= */
(function () {
  const cardBox = $('#review-card');
  if (!cardBox) return;
  const RKEY = 'boss_review_v1';
  const INTERVALS = [1, 3, 7, 14, 30]; // 第几次记对，就隔几天再考
  const loadSt = () => { try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch { return {}; } };
  const saveSt = s => { try { localStorage.setItem(RKEY, JSON.stringify(s)); } catch {} };
  const today = () => fmtDate(new Date());
  const addDays = (base, n) => { const t = new Date(base + 'T00:00:00'); t.setDate(t.getDate() + n); return fmtDate(t); };
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'r' + h.toString(36); };
  const esc = s => String(s).replace(/</g, '&lt;');

  function collect() {
    const items = [];
    try {
      (JSON.parse(localStorage.getItem('boss_notes_v1')) || []).forEach(n => {
        (n.a || []).forEach((ans, i) => {
          if (!ans || !QUESTIONS[i]) return;
          items.push({ id: hash('n' + n.t + '|' + i), src: '五问笔记', q: QUESTIONS[i].q, a: ans, born: fmtDate(new Date(n.t)) });
        });
      });
    } catch {}
    try {
      (JSON.parse(localStorage.getItem('boss_preds_v1')) || []).forEach(p => {
        if (!p.result) return;
        const res = p.result === 'hit' ? '应验 ✅' : p.result === 'part' ? '部分应验 ◐' : '落空 ❌';
        items.push({ id: hash('p' + p.text), src: '预测复盘', q: '你曾判断：' + p.text, a: `结果：${res}（当时把握 ${p.conf}%）。回看这条：把握和结果对得上吗？下次同类判断，把握该调高还是调低？`, born: p.created });
      });
    } catch {}
    return items;
  }

  function render() {
    const items = collect();
    const st = loadSt();
    const t = today();
    items.forEach(it => { if (!st[it.id]) st[it.id] = { lv: 0, next: it.born }; });

    const due = items.filter(it => st[it.id].next <= t).sort((a, b) => st[a.id].next < st[b.id].next ? -1 : 1);
    const mastered = items.filter(it => st[it.id].lv >= INTERVALS.length).length;
    const fresh = items.filter(it => st[it.id].lv === 0).length;

    // 统计行
    const statsBox = $('#review-stats');
    if (!items.length) {
      statsBox.innerHTML = '';
    } else {
      statsBox.innerHTML = `<div class="stat-row" style="margin:0 0 18px">
        <div class="stat-card sc-a"><span>今天到期</span><b>${due.length} 条</b><span>${due.length ? '翻完才收工' : '今天没有到期，明早再来'}</span></div>
        <div class="stat-card sc-b"><span>复习库总量</span><b>${items.length} 条</b><span>新条目 ${fresh} 条</span></div>
        <div class="stat-card sc-c"><span>已记牢</span><b>${mastered} 条</b><span>连对 5 次（挺过 30 天）算记牢</span></div>
      </div>`;
    }

    // 首页宫格角标
    const badge = $('#review-badge');
    if (badge) badge.textContent = due.length ? `${due.length} 条到期` : '记忆曲线';

    // 未来 7 天到期分布
    const fut = $('#review-future');
    if (items.length) {
      const buckets = [];
      for (let d = 1; d <= 7; d++) {
        const day = addDays(t, d);
        const n = items.filter(it => st[it.id].next === day).length;
        if (n) buckets.push(`${d === 1 ? '明天' : d + ' 天后'} ${n} 条`);
      }
      fut.innerHTML = buckets.length ? `<p style="font-size:13px;color:var(--text-3)">接下来排队等你的：${buckets.join(' · ')}</p>` : '';
    } else fut.innerHTML = '';

    // 当前卡片
    if (!items.length) {
      cardBox.innerHTML = '<div class="empty">复习库是空的。去「五问」写一条笔记、或在「预测对答案」里给一条判断对答案——写下的东西会自动排进这里的复习队列。</div>';
      return;
    }
    if (!due.length) {
      cardBox.innerHTML = '<div class="empty">今天到期的都翻完了。记忆这东西，急不来——明天见。</div>';
      return;
    }
    const it = due[0];
    cardBox.innerHTML = `<div class="note" style="border-left-color:var(--gold)">
      <div class="meta"><span class="lv lv2">${it.src}</span><span style="color:var(--text-3);font-size:13px">还剩 ${due.length} 条 · 写于 ${it.born}</span></div>
      <p style="font-size:17px"><b>${esc(it.q)}</b></p>
      <p style="color:var(--text-3);font-size:13.5px">先别看答案——心里默想出你当时写的内容，想好了再翻面。</p>
      <div id="rv-ans" style="display:none;margin-top:10px;padding-top:10px;border-top:1px dashed oklch(0.7 0.03 60 / 0.5)">
        <p>${esc(it.a)}</p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button type="button" class="mini-btn" data-rate="good" style="background:var(--ok);color:#fff;border-color:transparent">记得 ✓</button>
          <button type="button" class="mini-btn" data-rate="mid">模糊 ~</button>
          <button type="button" class="mini-btn" data-rate="bad" style="color:oklch(0.52 0.12 30);border-color:currentColor">忘了 ✗</button>
        </div>
      </div>
      <button type="button" class="mini-btn" id="rv-flip" style="margin-top:10px">翻面，对答案</button>
    </div>`;
    $('#rv-flip').addEventListener('click', () => {
      $('#rv-ans').style.display = '';
      $('#rv-flip').style.display = 'none';
    });
    cardBox.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      const st2 = loadSt();
      const rec = st2[it.id] || { lv: 0, next: it.born };
      const rate = b.dataset.rate;
      if (rate === 'good') { rec.lv = Math.min(rec.lv + 1, INTERVALS.length); rec.next = addDays(t, INTERVALS[Math.min(rec.lv, INTERVALS.length) - 1]); }
      else if (rate === 'mid') { rec.next = addDays(t, Math.max(1, Math.round(INTERVALS[Math.min(rec.lv, INTERVALS.length - 1)] / 2))); }
      else { rec.lv = 0; rec.next = addDays(t, 1); }
      st2[it.id] = rec;
      saveSt(st2);
      render();
    }));
  }
  render();
  // 页面不刷新切换模块：每次切到回顾页都重新收集，保证看到的队列是最新的
  window.addEventListener('hashchange', () => { if (location.hash === '#review') render(); });
})();

/* ================= 三段跃迁：阶段切换 ================= */
(function () {
  const tabs = $('#stage-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-stage]');
    if (!b) return;
    $$('#stage-tabs .tab-btn').forEach(x => x.classList.toggle('on', x === b));
    $$('.stage-grid').forEach(g => { g.style.display = g.dataset.stage === b.dataset.stage ? 'grid' : 'none'; });
  });
})();
(function () {
  function showView(id) {
    id = id || '';
    let sec = id ? document.getElementById(id) : null;
    const isModule = !!(sec && sec.tagName === 'SECTION');
    if (!isModule) sec = document.getElementById('apps');
    document.body.classList.toggle('in-module', isModule);
    $$('main > section').forEach(s => s.classList.toggle('active-view', s === sec));
    const h2 = isModule ? sec.querySelector('h2') : null;
    const bt = $('#back-title');
    if (bt) bt.textContent = h2 ? h2.textContent.slice(0, 16) : '';
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    history.pushState(null, '', '#' + id);
    showView(id);
  });
  const bh = $('#backhome');
  if (bh) bh.addEventListener('click', () => { history.pushState(null, '', '#top'); showView(''); });
  const brand = $('.brand');
  if (brand) brand.addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', '#top'); showView(''); });
  window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
  showView(location.hash.slice(1));
})();

/* ================= 录音棚：录、分析、存成语音数据集 ================= */
(function () {
  const btn = $('#rec-toggle'), status = $('#rec-status'), result = $('#rec-result'),
        statsBox = $('#rec-stats'), listBox = $('#rec-list'), exportBtn = $('#rec-export');
  if (!btn) return;
  let db = null;
  const req = indexedDB.open('boss-voice', 1);
  req.onupgradeneeded = e => { e.target.result.createObjectStore('recs', { keyPath: 'id', autoIncrement: true }); };
  req.onsuccess = e => { db = e.target.result; refreshList(); };
  const putRec = r => new Promise(res => { const tx = db.transaction('recs', 'readwrite'); tx.objectStore('recs').add(r); tx.oncomplete = res; });
  const allRecs = () => new Promise(res => { const tx = db.transaction('recs', 'readonly'); const q = tx.objectStore('recs').getAll(); q.onsuccess = () => res(q.result || []); });
  const delRec = id => new Promise(res => { const tx = db.transaction('recs', 'readwrite'); tx.objectStore('recs').delete(id); tx.oncomplete = res; });

  let recorder = null, chunks = [], stream = null, actx = null, timer = null;
  let startTs = 0, silences = 0, silStart = 0, voicedMs = 0, lastTick = 0, lastVoiced = false;

  function tick(analyser, buf) {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    const quiet = rms < 0.02;
    if (!quiet) { voicedMs += now - lastTick; }
    if (quiet && !lastVoiced) { if (!silStart) silStart = now; if (now - silStart > 800) { silences++; silStart = now; } }
    else if (!quiet) { silStart = 0; }
    lastVoiced = !quiet; lastTick = now;
    status.textContent = '录音中… ' + Math.round((now - startTs) / 1000) + ' 秒（再按一次停止）';
  }

  async function startRec() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { status.textContent = '麦克风没授权——浏览器地址栏左边的小锁里允许麦克风，再试。'; return; }
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const srcNode = actx.createMediaStreamSource(stream);
    const analyser = actx.createAnalyser(); analyser.fftSize = 512;
    srcNode.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    startTs = performance.now(); silences = 0; silStart = 0; voicedMs = 0; lastTick = startTs; lastVoiced = false;
    timer = setInterval(() => tick(analyser, buf), 100);
    recorder.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      if (actx) actx.close();
      const dur = Math.round((performance.now() - startTs) / 1000);
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const voiced = Math.round(voicedMs / 1000);
      const ratio = dur ? Math.round(voicedMs / (performance.now() - startTs) * 100) : 0;
      const rec = { ts: Date.now(), dur, pauses: silences, ratio, blob, ctx: '自由麦' };
      if (db) { await putRec(rec); }
      result.style.display = 'block';
      result.innerHTML = '<div class="speech-card" style="padding:14px;text-align:left">'
        + '<b>本次分析：</b>时长 ' + dur + ' 秒 · 明显停顿 ' + silences + ' 次 · 有效发声 ' + ratio + '%'
        + '<div style="font-size:13px;color:var(--text-3);margin-top:6px">'
        + (ratio < 60 ? '有效发声偏低——多半是犹豫太久。先把稿子读顺再录。' : silences > 4 ? '停顿偏多——试着把长句拆短，换气点提前想好。' : '节奏不错。坚持住，重点看下周同任务对比。')
        + '</div><audio controls style="width:100%;margin-top:8px" src="' + URL.createObjectURL(blob) + '"></audio>'
        + '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="mini-btn mr-score">📝 找 Kimi 评分（复制口令）</button><span style="font-size:12.5px;color:var(--text-3)">机器只测得出停顿，内容好坏发给 Kimi 按量规打分</span></div>' + '</div>';

      const sc2 = result.querySelector('.mr-score');
      sc2.addEventListener('click', async () => {
        const txt = '你是我的口才教练。我刚完成一段自由录音（任务：自由麦）。机器实测：时长 ' + dur + ' 秒、明显停顿 ' + silences + ' 次、有效发声 ' + ratio + '%。我说的大意是：【在这里粘贴你刚才说的内容要点】。请按四条各打 1-5 分：①结论前置 ②有具体细节（数字/人名）③语气词控制 ④收尾有行动；先指出最大的一个毛病，再给一句改写示范。';
        try { await navigator.clipboard.writeText(txt); } catch {
          const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); ta.remove();
        }
        sc2.textContent = '已复制 ✓ 发给 Kimi 就出分';
        setTimeout(() => { sc2.textContent = '📝 找 Kimi 评分（复制口令）'; }, 3000);
      });
      status.textContent = '已存进你的语音数据集。';
      refreshList();
    };
    recorder.start();
    btn.textContent = '■ 停止并分析';
    status.textContent = '录音中…';
  }

  async function refreshList() {
    if (!db) return;
    const recs = (await allRecs()).sort((a, b) => b.ts - a.ts);
    const totalSec = recs.reduce((a, r) => a + (r.dur || 0), 0);
    statsBox.innerHTML = recs.length
      ? '🗃️ 你的语音数据集：<b>' + recs.length + ' 条</b> · 累计 <b>' + Math.round(totalSec / 60 * 10) / 10 + ' 分钟</b> · 每条都带时长/停顿标注，可直接做 TTS 训练素材'
      : '';
    listBox.innerHTML = recs.slice(0, 10).map(r => {
      const d = new Date(r.ts);
      const label = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return '<div class="live-item"><span class="t"><span class="src-chip">' + (r.ctx ? r.ctx + ' · ' : '') + label + '</span>' + r.dur + '秒 · 停顿' + r.pauses + ' · 发声' + r.ratio + '%</span>'
        + '<span class="vote-btns"><button type="button" class="vote-btn" data-play="' + r.id + '">▶</button>'
        + '<button type="button" class="vote-btn" data-dl="' + r.id + '" title="下载">⬇</button>'
        + '<button type="button" class="vote-btn" data-del="' + r.id + '" title="删除">✕</button></span></div>';
    }).join('');
    listBox.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', async () => {
      const r = (await allRecs()).find(x => x.id === +b.dataset.play);
      if (r) new Audio(URL.createObjectURL(r.blob)).play();
    }));
    listBox.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => {
      const r = (await allRecs()).find(x => x.id === +b.dataset.dl);
      if (!r) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(r.blob);
      a.download = 'voice-' + new Date(r.ts).toISOString().slice(0, 10) + '-' + r.id + '.webm';
      a.click();
    }));
    listBox.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      await delRec(+b.dataset.del); refreshList();
    }));
  }

  btn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') { recorder.stop(); recorder = null; btn.textContent = '● 开始录音'; }
    else startRec();
  });
  exportBtn.addEventListener('click', async () => {
    const recs = await allRecs();
    if (!recs.length) { status.textContent = '数据集还是空的，先录一条。'; return; }
    status.textContent = '开始逐条下载 ' + recs.length + ' 条录音（浏览器可能问你允许多文件下载，点允许）…';
    recs.forEach((r, i) => setTimeout(() => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(r.blob);
      a.download = 'voice-' + new Date(r.ts).toISOString().slice(0, 10) + '-' + r.id + '.webm';
      a.click();
    }, i * 800));
  });
})();

/* ================= 朗读台：每晚一篇老板分享稿 + 五层拆解 ================= */
(function () {
  const box = $('#readaloud-box');
  if (!box) return;
  function renderRead(read) {
    const layers = (read.analysis || []).map(l =>
      `<div style="padding:8px 0;border-top:1px solid var(--line)"><b style="color:var(--gold)">${l.layer}</b>　<span style="font-size:14.5px">${l.point}</span></div>`).join('');
    box.innerHTML = `
      <div class="dive" style="border-color:var(--gold)">
        <div class="k">今日朗读稿 · 约 60 秒 · 跟读模式</div>
        <h3 style="margin-bottom:4px">${read.title}</h3>
        <audio controls preload="none" src="assets/audio/digest-read.mp3?_=${Date.now()}" style="width:100%;height:38px;margin:10px 0 2px"></audio>
        <div class="vrate" data-rate-id="digest-read" style="margin:4px 0 8px"></div>
        <p style="font-size:13px;color:var(--text-3);margin:0 0 8px">👆 机器示范（粤语合成声）——边听边挑毛病边打分，它的毛病就是你产品的清单。</p>
        <div class="tp">${read.script}</div>
        <div class="minirec" data-rec="朗读稿跟读"></div>
        <div class="act" style="margin-top:10px"><b>跟读三步：</b>① 听机器示范挑一个毛病 → ② 按录音，眼睛跟着上面的文稿往下拉（可以滚动，不用背）→ ③ 回放对比——你的版本就是评测基准</div>
      </div>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;padding:10px 0">🧠 我是怎么分析的（五层拆解，点开学思路）</summary>${layers}</details>`;
    if (window.mountRecorders) window.mountRecorders(box);
    if (window.mountVrates) window.mountVrates(box);
  }
  fetch('digest.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (j && j.read && j.read.script) renderRead(j.read);
      else box.innerHTML = '<div class="empty">今晚 18:33 简报会自动补上今天的朗读稿。等不及？把上面那段口令和任意一篇文章发给 Kimi，立刻生成一篇。</div>';
    })
    .catch(() => { box.innerHTML = '<div class="empty">朗读稿还没生成。把上面那段口令和任意一篇文章发给 Kimi，立刻生成一篇。</div>'; });
})();

/* ================= 机会雷达：实习培训申报死线 ================= */
(function () {
  const box = $('#opps-box');
  if (!box) return;
  function daysLeft(dl) {
    const end = new Date(dl + 'T23:59:59');
    return Math.ceil((end - Date.now()) / 86400e3);
  }
  function render(opps, updated) {
    const sorted = opps.slice().sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || daysLeft(a.deadline) - daysLeft(b.deadline));
    box.innerHTML = sorted.map(o => {
      const d = daysLeft(o.deadline);
      const urgent = d <= 7, over = d < 0;
      const badge = o.out ? '<span style="display:inline-block;padding:2px 10px;border-radius:8px;font-size:13px;font-weight:700;background:#eee;color:#888">已排除 · ' + (o.out_reason || '不适合') + '</span>'
        : over ? '<span style="color:#999">已截止</span>'
        : `<span style="display:inline-block;padding:2px 10px;border-radius:8px;font-size:13px;font-weight:700;background:${urgent ? '#fdecea' : '#e8f5e9'};color:${urgent ? '#c62828' : '#2e7d32'}">剩 ${d} 天</span>`;
      return `<div class="dive" style="${o.out ? 'opacity:.55' : urgent && !over ? 'border-color:#c62828' : ''}">
        <div class="k">${o.org}</div>
        <h3 style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${o.name} ${badge}</h3>
        <p style="font-size:14.5px"><b>截止：</b>${o.deadline}　<b>条件：</b>${o.who}</p>
        <p style="font-size:14.5px"><b>补贴/收益：</b>${o.money}</p>
        <div class="act"><b>${o.out ? '为什么放弃：' : '下一步：'}</b>${o.action}</div>
        ${o.url ? `<div style="margin-top:6px"><a href="${o.url}" target="_blank" rel="noopener" style="font-size:13.5px">官方页面 ↗</a></div>` : ''}
      </div>`;
    }).join('') + `
      <details style="margin-top:6px"><summary style="cursor:pointer;font-weight:600;padding:10px 0">📝 申请模板（AI 实训计划这类，直接套用）</summary>
      <div class="dive"><p style="font-size:14.5px;line-height:1.8;white-space:pre-wrap">【自我介绍模板】
本人持澳门居民身份证及回乡证，学士学位（[学校][专业][年份]）。现任[行业]夜班岗位，保持每日 1 小时 AI 自学（ Python 基础、大模型应用）。报读本计划目标明确：掌握大模型实操与编程基础，考取华为初级认证，为日后在澳门创办 AI 语音教育项目打底。夜班工作安排稳定，可配合日间集中培训时间（报名时已电话确认上课时间安排）。

【报名三问（打电话先问清）】
① 上课时间可否配合夜班工作者（日间班/晚间班/录播）
② 缺课有无补堂机制
③ 华为初级认证考试费是否包含

【材料清单】回乡证 · 学士学位证书 · 澳门身份证 · 证件相 · 在职证明（如有）</p></div>
    </details>
    <div style="font-size:12.5px;color:var(--text-3);margin-top:8px">机会清单更新于 ${updated || '—'} · 每晚 18:33 自动重扫劳工局/横琴页面</div>`;
  }
  fetch('opps.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j && j.opps && j.opps.length) render(j.opps, j.updated); else box.innerHTML = '<div class="empty">机会清单加载中，今晚 18:33 简报自动更新。</div>'; })
    .catch(() => { box.innerHTML = '<div class="empty">机会清单暂时读不到，稍后再试。</div>'; });
})();

/* ================= 练兵场：三关，用今天的新闻练老板基本功 ================= */
(function () {
  const box = $('#drill-box');
  if (!box) return;
  const GRADE_KEY = 'boss_drill_grade_v1', NOTE_KEY = 'boss_drill_notes_v1';
  const loadNotes = () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY)) || []; } catch { return []; } };

  /* ---- 第一关：信息验尸官 ---- */
  async function initGrade() {
    const el = $('#drill-grade');
    try {
      const r = await fetch('news.json?_=' + Date.now());
      const j = await r.json();
      const pool = (j.items || []).filter(it => it.g && it.t.length > 10);
      if (pool.length < 8) throw 0;
      const qs = pool.sort(() => Math.random() - .5).slice(0, 8);
      let i = 0, score = 0;
      const G = { '一手': '一手：原始出处（政府、报社、论文、官方）', '媒体': '媒体：记者编辑加工过的二手报道', '聚合': '聚合：谷歌机器按关键词扫来的三手快筛' };
      function draw() {
        if (i >= qs.length) {
          const best = +(localStorage.getItem(GRADE_KEY) || 0);
          if (score > best) localStorage.setItem(GRADE_KEY, score);
          el.innerHTML = `<div class="act"><b>本局：${score}/8</b>（历史最佳 ${Math.max(best, score)}/8）${score >= 6 ? '——嗅觉在线，保持。' : '——低于 6 分就多问一句：这东西的源头是谁？'}</div><button class="mini-btn" id="dg-re" style="margin-top:8px">再来 8 条</button>`;
          el.querySelector('#dg-re').addEventListener('click', initGrade);
          return;
        }
        const it = qs[i];
        el.innerHTML = `<div style="font-size:13px;color:var(--text-3)">第 ${i + 1}/8 条 · 得分 ${score}</div>
          <p style="font-size:15.5px;margin:8px 0">${it.t.replace(/</g, '&lt;')}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${['一手', '媒体', '聚合'].map(g => `<button class="mini-btn" data-g="${g}">${g}</button>`).join('')}</div>
          <div class="dg-fb" style="font-size:13.5px;margin-top:8px"></div>`;
        el.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
          const pick = b.dataset.g, ok = pick === it.g;
          if (ok) score++;
          el.querySelectorAll('[data-g]').forEach(x => x.disabled = true);
          el.querySelector('.dg-fb').innerHTML = `${ok ? '✅ 猜对' : '❌ 不对'}——实际是「${it.g}」（${it.src}）。${G[it.g]}<div style="margin-top:6px"><button class="mini-btn" id="dg-next">下一条</button></div>`;
          el.querySelector('#dg-next').addEventListener('click', () => { i++; draw(); });
        }));
      }
      draw();
    } catch { el.innerHTML = '<div class="empty">题目加载失败，点「手动刷新」后再试。</div>'; }
  }

  /* ---- 第二关：总结过招 ---- */
  async function initSum() {
    const el = $('#drill-sum');
    try {
      const r = await fetch('digest.json?_=' + Date.now());
      const j = await r.json();
      const d = (j.dives || [])[0];
      if (!d) throw 0;
      el.innerHTML = `<div style="font-size:13px;color:var(--text-3)">今天的题：${d.k}</div>
        <p style="font-size:15.5px;margin:8px 0"><b>${d.t}</b></p>
        <p style="font-size:13.5px;color:var(--text-3)">不看答案，先写你的一句话（发生了什么 + 钱往哪流 + 对你意味着什么，三选二也算赢）：</p>
        <textarea id="ds-input" rows="3" style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:14.5px;background:transparent;color:inherit"></textarea>
        <div style="margin-top:8px"><button class="mini-btn" id="ds-reveal">写完了，揭晓情报部门版本</button></div>
        <div class="ds-ans" style="display:none;margin-top:10px"></div>`;
      el.querySelector('#ds-reveal').addEventListener('click', () => {
        const mine = el.querySelector('#ds-input').value.trim();
        if (mine.length < 8) { el.querySelector('#ds-input').placeholder = '至少写一句话再揭晓——写错也比空着强。'; return; }
        const ans = el.querySelector('.ds-ans');
        ans.style.display = 'block';
        ans.innerHTML = `<div style="padding:10px;border-left:3px solid var(--gold);font-size:14.5px"><b>情报部门版本：</b>${d.p}</div>
          <div class="act" style="margin-top:8px"><b>对照三问：</b>① 我漏了哪个具体数字或人名？② 钱的方向我押对了吗？③ 下次第一句先写什么？</div>`;
      });
    } catch { el.innerHTML = '<div class="empty">今天的题还没备好，晚 18:33 后自动更新。</div>'; }
  }

  /* ---- 第三关：老板之问 ---- */
  async function initAsk() {
    const el = $('#drill-ask');
    try {
      const r = await fetch('digest.json?_=' + Date.now());
      const j = await r.json();
      const dives = j.dives || [];
      if (!dives.length) throw 0;
      const q = dives[dives.length > 1 ? 1 : 0];
      el.innerHTML = `<div style="font-size:13px;color:var(--text-3)">来自今天：${q.k}</div>
        <p style="font-size:15.5px;margin:8px 0"><b>${q.t}</b></p>
        <p style="font-size:14.5px">这件事三个月后对你会有什么影响？写下你的判断和理由（会被检验的那种，别写"可能有影响"）：</p>
        <textarea id="da-input" rows="3" style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:14.5px;background:transparent;color:inherit"></textarea>
        <div style="margin-top:8px"><button class="mini-btn" id="da-save">存进我的判断笔记</button><span id="da-hint" style="font-size:12.5px;color:var(--text-3);margin-left:10px"></span></div>
        <div class="da-history" style="margin-top:10px;font-size:13.5px"></div>`;
      const renderH = () => {
        const ns = loadNotes().slice(0, 5);
        el.querySelector('.da-history').innerHTML = ns.length
          ? '<b>最近的判断：</b>' + ns.map(n => `<div style="padding:6px 0;border-top:1px solid var(--line)">${new Date(n.t).toLocaleDateString('zh-CN')} · ${n.q.slice(0, 22)}…<br><span style="color:var(--text-2)">${n.a}</span></div>`).join('')
          : '';
      };
      renderH();
      el.querySelector('#da-save').addEventListener('click', () => {
        const v = el.querySelector('#da-input').value.trim();
        if (v.length < 10) { el.querySelector('#da-hint').textContent = '写够一句完整判断再存。'; return; }
        const ns = loadNotes();
        ns.unshift({ t: Date.now(), q: q.t, a: v });
        try { localStorage.setItem(NOTE_KEY, JSON.stringify(ns.slice(0, 100))); } catch {}
        el.querySelector('#da-input').value = '';
        el.querySelector('#da-hint').textContent = '已存 ✓';
        renderH();
      });
    } catch { el.innerHTML = '<div class="empty">今天的题还没备好，晚 18:33 后自动更新。</div>'; }
  }

  initGrade(); initSum(); initAsk();
})();

/* ============ 粤讲粤过瘾 · 每日金句（culture.json 驱动） ============ */
(function initCulture() {
  const box = document.getElementById('culture-list');
  if (!box) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  fetch('culture.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(d => {
    if (!d || !d.entries || !d.entries.length) { box.innerHTML = '<div class="empty">金句库备货中。</div>'; return; }
    // 每日一句置顶：按日期轮换，每天都有「今日」的仪式感
    const dayIdx = Math.floor(Date.now() / 86400000) % d.entries.length;
    const ordered = d.entries.slice(dayIdx).concat(d.entries.slice(0, dayIdx));
    box.innerHTML = ordered.map((e, i) => `
      <div class="panel${i === 0 ? ' gold' : ''}" style="padding:14px 16px">
        <img src="assets/img/culture-${esc(e.id)}.png" alt="${esc(e.yue)}金句卡" loading="lazy" style="width:100%;max-width:320px;border-radius:10px;display:block;margin:0 auto 10px">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          ${i === 0 ? '<span style="font-size:12px;background:var(--gold,#b8860b);color:#fff;padding:2px 8px;border-radius:10px">今日</span>' : ''}
          <b style="font-size:20px">${esc(e.yue)}</b>
          <span style="color:var(--text-3);font-size:13px">${esc(e.jyut)}</span>
        </div>
        <div style="margin-top:6px"><b>意思：</b>${esc(e.han)}</div>
        <div style="color:var(--text-2);font-size:14px;margin-top:4px"><b>文化：</b>${esc(e.bg)}</div>
        <div style="color:var(--text-2);font-size:14px;margin-top:4px"><b>例句：</b>${esc(e.eg)}</div>
        <audio controls preload="none" src="assets/audio/culture-${esc(e.id)}.mp3" style="width:100%;height:36px;margin-top:8px"></audio>
      </div>`).join('');
  }).catch(() => { box.innerHTML = '<div class="empty">金句库加载失败，稍后刷新。</div>'; });
})();

/* ================= 跟读录音室：每个练习点就地录音（数据统一进语音数据集，带练习来源标签） ================= */
(function () {
  let db = null;
  const req = indexedDB.open('boss-voice', 1);
  req.onupgradeneeded = e => { e.target.result.createObjectStore('recs', { keyPath: 'id', autoIncrement: true }); };
  req.onsuccess = e => { db = e.target.result; };
  const putRec = r => new Promise(res => { if (!db) return res(); const tx = db.transaction('recs', 'readwrite'); tx.objectStore('recs').add(r); tx.oncomplete = res; });

  function mountOne(m) {
    if (m.dataset.mounted) return;
    m.dataset.mounted = '1';
    const ctxName = m.dataset.rec || '练习';
    m.innerHTML = '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn ghost mr-btn">🎙️ 就在这录（' + ctxName + '）</button></div>'
      + '<div class="mr-status" style="text-align:center;font-size:13px;color:var(--text-3);margin-top:6px"></div>'
      + '<div class="mr-result" style="display:none;margin-top:10px"></div>';
    const btn = m.querySelector('.mr-btn'), status = m.querySelector('.mr-status'), result = m.querySelector('.mr-result');
    let recorder = null, chunks = [], stream = null, actx = null, timer = null;
    let startTs = 0, silences = 0, silStart = 0, voicedMs = 0, lastTick = 0, lastVoiced = false;

    function tick(analyser, buf) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      const quiet = rms < 0.02;
      if (!quiet) { voicedMs += now - lastTick; }
      if (quiet && !lastVoiced) { if (!silStart) silStart = now; if (now - silStart > 800) { silences++; silStart = now; } }
      else if (!quiet) { silStart = 0; }
      lastVoiced = !quiet; lastTick = now;
      status.textContent = '录音中… ' + Math.round((now - startTs) / 1000) + ' 秒（再按一次停止）';
    }

    async function startRec() {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { status.textContent = '麦克风没授权——浏览器地址栏左边的小锁里允许麦克风，再试。'; return; }
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => chunks.push(e.data);
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const srcNode = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser(); analyser.fftSize = 512;
      srcNode.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      startTs = performance.now(); silences = 0; silStart = 0; voicedMs = 0; lastTick = startTs; lastVoiced = false;
      timer = setInterval(() => tick(analyser, buf), 100);
      recorder.onstop = async () => {
        clearInterval(timer);
        stream.getTracks().forEach(t => t.stop());
        if (actx) actx.close();
        const dur = Math.round((performance.now() - startTs) / 1000);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const ratio = dur ? Math.round(voicedMs / (performance.now() - startTs) * 100) : 0;
        const rec = { ts: Date.now(), dur, pauses: silences, ratio, blob, ctx: ctxName };
        if (db) { await putRec(rec); }
        result.style.display = 'block';
        result.innerHTML = '<div class="speech-card" style="padding:14px;text-align:left">'
          + '<b>本次分析：</b>时长 ' + dur + ' 秒 · 明显停顿 ' + silences + ' 次 · 有效发声 ' + ratio + '%'
          + '<div style="font-size:13px;color:var(--text-3);margin-top:6px">'
          + (ratio < 60 ? '有效发声偏低——多半是犹豫太久。先把稿子读顺再录。' : silences > 4 ? '停顿偏多——试着把长句拆短，换气点提前想好。' : '节奏不错。坚持住，重点看下周同任务对比。')
          + '</div><audio controls style="width:100%;margin-top:8px" src="' + URL.createObjectURL(blob) + '"></audio>'
          + '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="mini-btn mr-score">📝 找 Kimi 评分（复制口令）</button><span style="font-size:12.5px;color:var(--text-3)">机器只测得出停顿，内容好坏发给 Kimi 按量规打分</span></div>' + '</div>';

        const sc = result.querySelector('.mr-score');
        sc.addEventListener('click', async () => {
          const txt = '你是我的口才教练。我刚完成一段 60 秒练习（任务：' + ctxName + '）。机器实测：时长 ' + dur + ' 秒、明显停顿 ' + silences + ' 次、有效发声 ' + ratio + '%。我说的大意是：【在这里粘贴你刚才说的内容要点】。请按四条各打 1-5 分：①结论前置 ②有具体细节（数字/人名）③语气词控制 ④收尾有行动；先指出最大的一个毛病，再给一句改写示范。';
          try { await navigator.clipboard.writeText(txt); } catch {
            const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
            ta.select(); document.execCommand('copy'); ta.remove();
          }
          sc.textContent = '已复制 ✓ 发给 Kimi 就出分';
          setTimeout(() => { sc.textContent = '📝 找 Kimi 评分（复制口令）'; }, 3000);
        });
        status.textContent = '已存进你的语音数据集（来源：' + ctxName + '），到底部「管理台」可回放导出。';
      };
      recorder.start();
      btn.textContent = '■ 停止并分析';
      status.textContent = '录音中…';
    }

    btn.addEventListener('click', () => {
      if (recorder && recorder.state === 'recording') { recorder.stop(); recorder = null; btn.textContent = '🎙️ 就在这录（' + ctxName + '）'; }
      else startRec();
    });
  }

  window.mountRecorders = function (root) {
    $$('.minirec', root || document).forEach(mountOne);
  };
  window.mountRecorders(document);
})();

/* ================= 声音评分：像不像真人，就地打分（存本地，可导出给情报部调口味） ================= */
(function () {
  const KEY = 'boss_voice_scores_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  function mount(box) {
    if (box.dataset.mounted) return;
    box.dataset.mounted = '1';
    const id = box.dataset.rateId;
    if (!id) return;
    const cur = (load()[id] || {}).s;
    box.innerHTML = '<span style="font-size:12.5px;color:var(--text-3)">像不像真人？</span>' +
      [1, 2, 3, 4, 5].map(n => '<button type="button" class="mini-btn vr-b" data-n="' + n + '" style="padding:2px 9px;min-height:28px;font-size:13px' + (cur === n ? ';border-color:var(--gold);color:var(--gold)' : '') + '">' + n + '</button>').join('') +
      '<span class="vr-note" style="font-size:12.5px;color:var(--gold)">' + (cur ? '已评 ' + cur + ' 分' : '') + '</span>';
    box.querySelectorAll('.vr-b').forEach(b => b.addEventListener('click', () => {
      const all = load();
      all[id] = { s: +b.dataset.n, ts: Date.now() };
      save(all);
      box.querySelectorAll('.vr-b').forEach(x => { x.style.borderColor = ''; x.style.color = ''; });
      b.style.borderColor = 'var(--gold)'; b.style.color = 'var(--gold)';
      box.querySelector('.vr-note').textContent = '已评 ' + b.dataset.n + ' 分 ✓';
    }));
  }
  window.mountVrates = function (root) {
    $$('.vrate', root || document).forEach(mount);
  };
  window.mountVrates(document);
  const ex = $('#vrate-export');
  if (ex) ex.addEventListener('click', async () => {
    const all = load();
    const ids = Object.keys(all);
    if (!ids.length) { ex.textContent = '还没评分'; setTimeout(() => { ex.textContent = '📋 导出我的声音评分（给情报部调口味）'; }, 1500); return; }
    const txt = '【我的声音评分（像不像真人 1-5）】\n' + ids.map(k => k + '：' + all[k].s + ' 分').join('\n') + '\n请按我的口味调整语音流水线的选声和参数。';
    try { await navigator.clipboard.writeText(txt); } catch {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
    ex.textContent = '已复制 ✓ 粘贴给 Kimi';
    setTimeout(() => { ex.textContent = '📋 导出我的声音评分（给情报部调口味）'; }, 2500);
  });
})();

/* ================= 60秒主播·今日素材：先看完内容再开口 ================= */
(function () {
  const box = $('#vnews-material');
  if (!box) return;
  Promise.all([
    fetch('news.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('digest.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null),
  ]).then(([news, dig]) => {
    let html = '<div style="background:#fbf7ee;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-align:left">';
    html += '<div style="font-size:12.5px;color:var(--text-3);margin-bottom:6px">📖 今日素材（先看完再开口——没内容硬讲是耍流氓）</div>';
    if (news && news.items && news.items.length) {
      const it = news.items.find(x => ['军火库哨兵', '雷达熔断器'].indexOf(x.src) < 0 && x.src.indexOf('·缓存') < 0) || news.items[0];
      html += '<div style="font-size:15px;line-height:1.6"><b>播这条：</b><a href="' + it.u + '" target="_blank" rel="noopener">' + it.t.replace(/</g, '&lt;') + '</a> <span style="font-size:12.5px;color:var(--text-3)">（' + it.src + '）</span></div>';
    } else {
      html += '<div style="font-size:14px;color:var(--text-3)">雷达暂时没货——也可以去深读页挑任何一条播。</div>';
    }
    html += '<div style="font-size:13px;color:var(--text-3);margin-top:8px">想照稿读？今晚的粤语朗读稿在本页底部「📢 朗读台」——稿只放一处，不重复。</div>';
    html += '</div>';
    box.innerHTML = __stripDanger(html);
  });
})();

/* ================= AI 考官：出题 + 量规 + 录音 + 自评闭环（实时对练版走 Kimi 口令） ================= */
(function () {
  const qEl = $('#exam-q'), rubEl = $('#exam-rubric');
  if (!qEl) return;
  const RUBRIC = '评分量规（录音回放时对照）：① 结论有没有在前 10 秒出现 ② 有没有至少一个具体数字或人名 ③ 结尾有没有给对方一个明确动作';
  const EXAMS = [
    '点解係粤语，唔係普通话？——用 60 秒答投资人呢条必考题',
    '用 60 秒同一位澳门阿婆解释：TTS 係乜嘢，点解唔会抢咗佢个孙嘅老师份工',
    '你公司三个月内最有可能点死？讲一个死因，加一个你而家做紧嘅拆弹动作',
    '假设我係教青局官员：用 60 秒讲清楚你嘅产品点样帮澳门学校悭返老师嘅时间',
    '用 60 秒复盘你今日学到嘅一样嘢——规规矩矩用 PREP（观点-理由-例子-重申）',
    '我係潜在客户，我讲「太贵喇」——你用 60 秒唔减价说服我',
    '用 60 秒讲一个你失败过嘅经历，重点讲你学到乜（考官重点听你有冇讲大话）',
  ];
  const BANK = EXAMS.concat(VTALK); // 题库合并：通用考题 + 粤语突发情景（原「今日会谈」并入）
  let last = -1;
  $('#exam-draw').addEventListener('click', () => {
    let i;
    do { i = Math.floor(Math.random() * BANK.length); } while (i === last && BANK.length > 1);
    last = i;
    qEl.textContent = BANK[i];
    rubEl.textContent = RUBRIC;
  });
  $('#exam-copy').addEventListener('click', async () => {
    const q = qEl.textContent.includes('点击') ? BANK[0] : qEl.textContent;
    const txt = '你係我嘅口才考官。规则：你一次出一题商业场景题，我用语音答；你按三条量规打分（结论前置/有具体细节/有行动收尾），指出一个最大毛病，然后追问一个更尖酸嘅问题。而家开始，第一题：' + q;
    try { await navigator.clipboard.writeText(txt); $('#exam-copy').textContent = '已复制 ✓ 发给 Kimi 就开始'; }
    catch {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove(); $('#exam-copy').textContent = '已复制 ✓ 发给 Kimi 就开始';
    }
    setTimeout(() => { $('#exam-copy').textContent = '复制考官口令（找 Kimi 实时对练）'; }, 2500);
  });
  $('#exam-draw').click();
})();

/* ===== 秘书台死线卡：读 opps.json（单一事实来源）。排除自动标灰+写原因；「唔办」一键出同步口令 ===== */
(() => {
  const box = document.getElementById('tasks-deadline');
  if (!box) return;
  const KEY = 'mishutai_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const kid = n => 'opp_' + n.replace(/[^\w一-鿿]/g, '').slice(0, 16);
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  fetch('opps.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(d => {
    if (!d || !d.opps || !d.opps.length) { box.innerHTML = '<p class="lite-sub" style="font-size:13.5px">机会雷达数据未到位。</p>'; return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const state = load();
    const rows = d.opps.map(o => {
      let left = o.deadline || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(o.deadline || '')) {
        const days = Math.round((new Date(o.deadline + 'T00:00:00') - today) / 86400000);
        left = days < 0 ? '已过期' : days === 0 ? '今日截止！' : '剩 ' + days + ' 天';
      }
      return { o, out: !!o.out, left };
    }).sort((a, b) => a.out - b.out);
    box.innerHTML = rows.map(({ o, out, left }) => {
      if (out) return '<label class="check" style="opacity:.45"><input type="checkbox" disabled><span><b>' + esc(o.name) + '</b>——⛔ 已排除：' + esc(o.out_reason || '老板亲口排除') + '<br><span style="font-size:12.5px;color:var(--text-3)">' + esc(o.action) + '</span></span></label>';
      const k = kid(o.name);
      return '<label class="check"><input type="checkbox" data-k="' + k + '"><span><b>' + esc(o.name) + '</b>（' + esc(o.deadline) + ' 截止 · ' + esc(left) + '）<br><span style="font-size:13px">' + esc(o.action) + '</span> <button type="button" class="mini-btn" data-out="' + esc(o.name) + '" style="margin-left:6px;padding:2px 10px;min-height:26px;font-size:12px">唔办</button></span></label>';
    }).join('');
    box.querySelectorAll('input[data-k]').forEach(b => {
      b.checked = !!state[b.dataset.k];
      b.addEventListener('change', () => { const s = load(); s[b.dataset.k] = b.checked; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} });
    });
    box.querySelectorAll('[data-out]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const txt = '【秘书台指令】将「' + btn.dataset.out + '」标为不办：opps.json 加 out:true 和原因，三餐播报以后唔好再提。';
        try { await navigator.clipboard.writeText(txt); } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
        btn.textContent = '口令已复制 ✓ 发给 Kimi';
        setTimeout(() => { btn.textContent = '唔办'; }, 2500);
      });
    });
  }).catch(() => { box.innerHTML = '<p class="lite-sub" style="font-size:13.5px">机会雷达数据未到位。</p>'; });
})();

/* ===== 秘书台任务栏：打钩状态持久化（localStorage） ===== */
(() => {
  const KEY = 'mishutai_v1';
  const boxes = document.querySelectorAll('#tasks input[type="checkbox"][data-k]');
  if (!boxes.length) return;
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  boxes.forEach(b => {
    b.checked = !!state[b.dataset.k];
    b.addEventListener('change', () => {
      state[b.dataset.k] = b.checked;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    });
  });
})();

/* ===== v3.9.2 · 悬浮随身听（Mini Player）+ 数据备份 ===== */
(function () {
  // ---- 样式一次过注入 ----
  const css = `
  #mpFab{position:fixed;right:16px;bottom:16px;z-index:999;width:52px;height:52px;border-radius:50%;border:1px solid rgba(212,175,55,.5);background:#141b2e;color:#e8c96a;font-size:22px;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.45);display:none;align-items:center;justify-content:center}
  #mpFab.on{display:flex}
  #mpFab.playing{animation:mpPulse 1.6s infinite}
  @keyframes mpPulse{0%,100%{box-shadow:0 4px 18px rgba(0,0,0,.45)}50%{box-shadow:0 4px 22px rgba(232,201,106,.55)}}
  #mpBar{position:fixed;right:16px;bottom:80px;left:16px;max-width:430px;margin-left:auto;z-index:999;background:#141b2e;border:1px solid rgba(212,175,55,.4);border-radius:14px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.55);display:none;color:#e8e6df;font-family:inherit}
  #mpBar.open{display:block}
  #mpBar .mp-title{font-size:14px;font-weight:700;color:#e8c96a;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mpBar .mp-row{display:flex;align-items:center;gap:10px}
  #mpBar button.mp-btn{background:none;border:1px solid rgba(232,201,106,.35);color:#e8c96a;border-radius:8px;width:36px;height:32px;font-size:15px;cursor:pointer;flex:none}
  #mpBar .mp-prog{flex:1;height:5px;background:rgba(255,255,255,.12);border-radius:3px;cursor:pointer;position:relative}
  #mpBar .mp-prog i{position:absolute;left:0;top:0;bottom:0;background:#e8c96a;border-radius:3px;width:0%}
  #mpBar .mp-time{font-size:11px;color:#9aa3b5;flex:none;min-width:70px;text-align:right}
  #mpBar .mp-list{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;max-height:180px;overflow:auto}
  #mpBar .mp-item{display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:13px;cursor:pointer;border-radius:8px}
  #mpBar .mp-item:hover{background:rgba(255,255,255,.05)}
  #mpBar .mp-item.cur{color:#e8c96a;font-weight:700}
  #mpBar .mp-item .mp-meal{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mpBar .mp-item .mp-state{font-size:11px;color:#9aa3b5}
  .bk-bar{display:flex;gap:10px;justify-content:center;margin-top:10px;flex-wrap:wrap}
  .bk-bar button,.bk-bar label{font-size:12.5px;padding:5px 12px;border-radius:8px;border:1px solid rgba(212,175,55,.35);background:none;color:#c8a445;cursor:pointer}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---- 悬浮随身听 ----
  const fab = document.createElement('button'); fab.id = 'mpFab'; fab.title = '随身听 · 三餐播报'; fab.textContent = '🎧';
  const bar = document.createElement('div'); bar.id = 'mpBar';
  document.body.append(fab, bar);
  const audio = new Audio(); audio.preload = 'metadata';
  let queue = [], cur = -1;

  const fmt = s => { if (!isFinite(s)) return '--:--'; s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function render() {
    const it = queue[cur] || {};
    bar.innerHTML = `
      <div class="mp-title">${it.icon || '🎧'} ${it.meal || '随身听'} ${it.date ? '· ' + it.date.slice(5) : ''}</div>
      <div class="mp-row">
        <button class="mp-btn" data-a="prev" title="上一段">⏮</button>
        <button class="mp-btn" data-a="play" title="播放/暂停">${audio.paused ? '▶' : '⏸'}</button>
        <button class="mp-btn" data-a="next" title="下一段">⏭</button>
        <div class="mp-prog"><i style="width:${audio.duration ? (audio.currentTime / audio.duration * 100) : 0}%"></i></div>
        <span class="mp-time">${fmt(audio.currentTime)} / ${fmt(audio.duration)}</span>
      </div>
      <div class="mp-list">${queue.map((q, i) => `<div class="mp-item${i === cur ? ' cur' : ''}" data-i="${i}"><span>${q.icon || '🎧'}</span><span class="mp-meal">${q.date.slice(5)} ${q.meal}</span><span class="mp-state">${i === cur && !audio.paused ? '播放中' : ''}</span></div>`).join('')}</div>`;
  }
  function playAt(i) {
    if (i < 0 || i >= queue.length) return;
    cur = i; audio.src = queue[i].audio; audio.play().catch(() => {});
    fab.classList.add('playing'); render();
  }
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'), item = e.target.closest('.mp-item'), prog = e.target.closest('.mp-prog');
    if (b) {
      const a = b.dataset.a;
      if (a === 'play') { if (cur < 0) playAt(0); else if (audio.paused) audio.play(); else audio.pause(); }
      if (a === 'prev') playAt((cur - 1 + queue.length) % queue.length);
      if (a === 'next') playAt((cur + 1) % queue.length);
    } else if (item) playAt(+item.dataset.i);
    else if (prog && audio.duration) { const r = prog.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; }
  });
  audio.addEventListener('play', () => { fab.classList.add('playing'); render(); });
  audio.addEventListener('pause', () => { fab.classList.remove('playing'); render(); });
  audio.addEventListener('timeupdate', () => { const i = bar.querySelector('.mp-prog i'); if (i && audio.duration) i.style.width = (audio.currentTime / audio.duration * 100) + '%'; const t = bar.querySelector('.mp-time'); if (t) t.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration); });
  audio.addEventListener('ended', () => { if (cur + 1 < queue.length) playAt(cur + 1); else { fab.classList.remove('playing'); render(); } });
  audio.addEventListener('loadedmetadata', render);
  fab.addEventListener('click', () => { bar.classList.toggle('open'); if (bar.classList.contains('open')) render(); });

  // 深读简报语音（digest-latest）归入同一队列，全站得一架播放器
  fetch('digest-audio.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(p => { if (p && p.src) queue.unshift({ icon: '📻', meal: '深读简报语音', date: p.date || '', audio: p.src }); fab.classList.add('on'); }).catch(() => {});

  fetch('broadcasts.json?_=' + Date.now()).then(r => r.json()).then(d => {
    const all = (d.items || []);
    const todayStr = all.length ? all[0].date : '';
    queue = queue.concat(all.filter(x => x.date === todayStr && x.audio));
    if (queue.length) fab.classList.add('on');
  }).catch(() => {});

  // 全站「🎧 听呢段」按钮统一交畀随身听
  window.mpPlayMeal = function (date, meal) {
    const i = queue.findIndex(q => (date ? q.date === date : true) && q.meal === meal);
    bar.classList.add('open');
    if (i >= 0) playAt(i); else render();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('.mp-handoff');
    if (b) window.mpPlayMeal(b.dataset.mpDate, b.dataset.mpMeal);
  });

  // ---- 秘书台数据备份/还原 ----
  const footer = document.querySelector('footer.wrap');
  if (footer) {
    const box = document.createElement('div'); box.className = 'bk-bar';
    const exp = document.createElement('button'); exp.textContent = '💾 备份我的数据';
    const imp = document.createElement('label'); imp.textContent = '♻️ 还原备份';
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.json'; file.style.display = 'none';
    // 备份龄提示（2026-11-21 老板亲令三保护措施）
    const LBKEY = 'boss_hub_last_backup';
    const age = document.createElement('span');
    age.style.cssText = 'font-size:12px;color:var(--text-3);margin-left:8px';
    const renderAge = () => {
      const t = localStorage.getItem(LBKEY);
      if (!t) { age.textContent = '⚠️ 从未备份'; age.style.color = '#c8a445'; return; }
      const days = Math.floor((Date.now() - new Date(t).getTime()) / 864e5);
      age.textContent = days > 7 ? `⚠️ 上次备份 ${days} 日前` : `上次备份 ${days} 日前`;
      age.style.color = days > 7 ? '#c8a445' : 'var(--text-3)';
    };
    renderAge();
    exp.onclick = () => {
      const dump = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); dump[k] = localStorage.getItem(k); }
      // 完整性检查：序列化后必须可以 parse 返，兼记录数据量
      const payload = { app: 'boss-hub', v: 2, saved: new Date().toISOString(), keyCount: Object.keys(dump).length, data: dump };
      let txt;
      try { txt = JSON.stringify(payload, null, 1); JSON.parse(txt); } catch { alert('备份失败：数据无法序列化，请截图俾情报部'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      a.download = 'boss-hub-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
      try { localStorage.setItem(LBKEY, new Date().toISOString()); } catch {}
      renderAge();
      exp.textContent = '已备份 ' + payload.keyCount + ' 项 ✓';
      setTimeout(() => { exp.textContent = '⬇️ 备份我的数据'; }, 2500);
    };
    file.onchange = () => {
      const f = file.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(rd.result);
          const d = j.data || j;
          if (typeof d !== 'object' || d === null || Array.isArray(d)) throw 0;
          const keys = Object.keys(d);
          if (!keys.length) throw 0;
          const meta = j.saved ? `备份时间：${j.saved.slice(0, 16).replace('T', ' ')}
数据项：${j.keyCount || keys.length}` : `数据项：${keys.length}`;
          // 恢复前保护：先将而家嘅数据自动下载一份，防误覆盖
          const cur = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); cur[k] = localStorage.getItem(k); }
          const pre = document.createElement('a');
          pre.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'boss-hub', v: 2, saved: new Date().toISOString(), keyCount: Object.keys(cur).length, note: '还原前自动快照', data: cur }, null, 1)], { type: 'application/json' }));
          pre.download = 'boss-hub-还原前快照-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-').slice(0, 16) + '.json';
          pre.click();
          if (!confirm(`即将还原备份：
${meta}

你而家嘅数据已自动另存一份「还原前快照」。
确定继续？`)) return;
          keys.forEach(k => localStorage.setItem(k, d[k]));
          alert('还原完成，页面即将刷新'); location.reload();
        } catch { alert('备份文件格式唔啱'); }
      };
      rd.readAsText(f);
    };
    imp.appendChild(file); imp.onclick = () => file.click();
    box.append(exp, imp); footer.appendChild(box);
  }
})();





/* ================= 真题库做题记录（2026-11-21 数据打通：做题要有数） ================= */
(function () {
  const qs = [...document.querySelectorAll('details')].filter(d => /^[①②③④⑤⑥⑦⑧⑨⑩]/.test((d.querySelector('summary') || {}).textContent || ''));
  if (!qs.length) return;
  const KEY = 'boss_quiz_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const st = load();
  // 记分牌插喺题库 case 顶部
  const caseBox = qs[0].closest('.case');
  const board = document.createElement('div');
  board.style.cssText = 'font-size:13.5px;color:var(--gold);margin-bottom:10px';
  if (caseBox) caseBox.insertBefore(board, caseBox.children[2] || null);
  const render = () => {
    const done = Object.keys(st).length, right = Object.values(st).filter(v => v === 'right').length;
    board.textContent = done ? `做题记录：${right}/${done} 啱（错咗嘅会自动变红，得闲回头再做）` : '做题记录：未开始——每题对完答案，揿「啱/错」记账';
  };
  qs.forEach((d, i) => {
    const p = d.querySelector('p');
    if (!p) return;
    const bar = document.createElement('div');
    bar.style.cssText = 'margin-top:8px;display:flex;gap:8px';
    ['right', 'wrong'].forEach(v => {
      const b = document.createElement('button');
      b.className = 'mini-btn';
      b.textContent = v === 'right' ? '我答啱咗' : '答错咗';
      b.style.cssText = 'font-size:12px;padding:3px 10px';
      b.addEventListener('click', () => {
        st[i] = v;
        try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {}
        d.style.borderColor = v === 'right' ? 'var(--gold)' : '#c05c5c';
        render();
      });
      bar.appendChild(b);
    });
    if (st[i]) d.style.borderColor = st[i] === 'right' ? 'var(--gold)' : '#c05c5c';
    p.appendChild(bar);
  });
  render();
})();

/* ================= 后路规划：体能自测台 + 下一步清单（2026-11-21） ================= */
(function () {
  const box = document.getElementById('fit-inputs');
  if (!box) return;
  const STD = [
    ['sprint', '80 米跑', v => v <= 11.5, '≤11.5 秒', v => v.toFixed(1) + ' 秒', false],
    ['jump', '立定跳远', v => v >= 2.0, '≥2.0 米', v => v.toFixed(2) + ' 米', true],
    ['wall', '跨墙', v => v >= 0.9, '≥0.9 米', v => v.toFixed(2) + ' 米', true],
    ['pull', '引体向上', v => v >= 5, '≥5 次', v => v + ' 次', true],
    ['situp', '仰卧起坐45秒', v => v >= 30, '≥30 次', v => v + ' 次', true],
    ['run', '2400 米跑', v => v <= 720, '≤12:00', v => Math.floor(v/60) + ':' + String(Math.round(v%60)).padStart(2,'0'), false],
  ];
  const KEY = 'boss_fit_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const saved = load();
  box.querySelectorAll('input[data-fit]').forEach(inp => { if (saved[inp.dataset.fit] != null) inp.value = saved[inp.dataset.fit]; });
  const btn = document.getElementById('fit-eval'), res = document.getElementById('fit-result');
  btn.addEventListener('click', () => {
    const vals = {};
    box.querySelectorAll('input[data-fit]').forEach(inp => {
      let v = inp.value.trim();
      if (inp.dataset.fit === 'run' && v.includes(':')) {
        const p = v.split(':'); v = (+p[0]) * 60 + (+p[1] || 0);
      }
      vals[inp.dataset.fit] = parseFloat(v);
    });
    try { localStorage.setItem(KEY, JSON.stringify(vals)); } catch {}
    let pass = 0, rows = [];
    STD.forEach(([k, name, test, std, fmt]) => {
      const v = vals[k];
      if (isNaN(v)) { rows.push(`<div style="padding:6px 0;border-bottom:1px dashed var(--line)">⬜ ${name}：未填（标准 ${std}）</div>`); return; }
      const ok = test(v);
      if (ok) pass++;
      rows.push(`<div style="padding:6px 0;border-bottom:1px dashed var(--line)">${ok ? '✅' : '❌'} ${name}：你 ${fmt(v)} ｜ 标准 ${std}${ok ? '' : ' —— 仲差一截'}</div>`);
    });
    res.innerHTML = rows.join('') + `<div style="margin-top:10px;font-size:15px"><b>${pass}/6 达标</b> —— ${pass === 6 ? '全部达标！你可以去考消防员。' : pass >= 4 ? '接近了，针对❌项加练。' : '基线已记下——每次测完嚟对一次，睇住数字逼近。'}</div>`;
  });
  // 下一步清单打勾持久化
  const steps = document.getElementById('backup-steps');
  if (steps) {
    const BKEY = 'boss_backup_v1';
    let st = {}; try { st = JSON.parse(localStorage.getItem(BKEY)) || {}; } catch {}
    steps.querySelectorAll('input[data-b]').forEach(cb => {
      cb.checked = !!st[cb.dataset.b];
      cb.addEventListener('change', () => { st[cb.dataset.b] = cb.checked; try { localStorage.setItem(BKEY, JSON.stringify(st)); } catch {} });
    });
  }
})();




/* ================= 全站搜寻（2026-11-21：料越储越多，冇搜寻等于冇累积） ================= */
(function () {
  const inp = document.getElementById('gsearch'), out = document.getElementById('gsearch-out');
  if (!inp) return;
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  let idx = null;
  async function build() {
    if (idx) return idx;
    idx = [];
    document.querySelectorAll('.gicon').forEach(a => {
      const b = a.querySelector('b'), sp = a.querySelector('span:not(.ic)');
      if (b) idx.push({ t: b.textContent + ' ' + (sp ? sp.textContent : ''), label: '板块 · ' + b.textContent, href: a.getAttribute('href') });
    });
    const grabs = [
      ['news.json', d => (d.items || []).slice(0, 400).map(x => ({ t: x.t, label: '快讯 · ' + x.src, href: x.u, ext: 1 }))],
      ['wordbank.json', d => (d.words || []).map(x => ({ t: x.t + ' ' + (x.m || ''), label: '词库 · ' + x.t, href: '#cert' }))],
      ['practicebank.json', d => (d.items || []).map(x => ({ t: (x.read || '') + (x.fill || ''), label: '练习 · ' + x.d, href: '#cert' }))],
      ['digest.json', d => (d.dives || []).map(x => ({ t: x.t + ' ' + x.p, label: '深读 · ' + x.t.slice(0, 30), href: '#deepread' }))],
    ];
    await Promise.all(grabs.map(([f, fn]) => fetch(f + '?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(d => { if (d) idx.push(...fn(d)); }).catch(() => {})));
    // 真题（静态喺页面）
    document.querySelectorAll('#cert details summary').forEach(sm => idx.push({ t: sm.textContent, label: '题目 · ' + sm.textContent.slice(0, 24), href: '#cert' }));
    return idx;
  }
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const q = inp.value.trim();
    if (q.length < 2) { out.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      const data = await build();
      const hits = data.filter(x => x.t && x.t.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
      out.innerHTML = hits.length
        ? hits.map(h => `<a href="${esc(h.href)}" ${h.ext ? 'target="_blank" rel="noopener"' : ''} style="display:block;padding:9px 10px;border-radius:8px;text-decoration:none;color:var(--text);font-size:14px;border-bottom:1px solid var(--line)">${esc(h.label)}</a>`).join('')
        : '<div style="padding:12px;font-size:13.5px;color:var(--text-3)">冇结果——呢个词未入过你嘅库。</div>';
      out.style.display = '';
    }, 250);
  });
  document.addEventListener('click', e => { if (!out.contains(e.target) && e.target !== inp) out.style.display = 'none'; });
})();

/* ================= 语音秘书桥（2026-11-21 老板亲令：秘书要识听讲） ================= */
(function () {
  const mic = document.getElementById('vs-mic');
  if (!mic) return;
  const out = document.getElementById('vs-out'), txt = document.getElementById('vs-text');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  mic.addEventListener('click', () => {
    if (!SR) { alert('你嘅浏览器唔支持语音转文字（Chrome/Edge 得）'); return; }
    if (listening) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'zh-HK'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = e => {
      const t = e.results[0][0].transcript;
      txt.textContent = t; out.style.display = '';
      document.getElementById('vs-send').onclick = async () => {
        try { await navigator.clipboard.writeText(t); } catch {}
        const b = document.getElementById('vs-send'); b.textContent = '已复制 ✓ 去 Kimi 对话贴出';
        setTimeout(() => b.textContent = '📋 复制（贴去 Kimi 对话即问）➔', 2500);
      };
    };
    rec.onend = () => { listening = false; mic.textContent = '🎤 揿住讲嘢'; };
    rec.onerror = () => { listening = false; mic.textContent = '🎤 揿住讲嘢（再试）'; };
    listening = true; mic.textContent = '🔴 讲紧…再揿停';
    rec.start();
  });
  document.getElementById('vs-read').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { alert('浏览器唔支持人声朗读'); return; }
    let daily = 0;
    try { const r = JSON.parse(localStorage.getItem('boss_daily_v1')); if (r && r.date === new Date().toLocaleDateString('sv')) daily = Object.values(r.done || {}).filter(Boolean).length; } catch {}
    const h = new Date().getHours();
    const slot = h < 12 ? '朝早' : h < 18 ? '下昼' : '夜晚';
    const text = `老板，而家${slot}${h}点。今日四门修炼你完成咗${daily}门。` +
      (daily < 4 ? '仲有功课未做，去练功房搞掂佢。' : '今日已打晒卡，可以休息。');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-HK'; u.rate = 1.0;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
})();

/* ================= 跨分頁同步（2026-11-21：两个 tab 开住，一边改咗另一边即刻跟） ================= */
window.addEventListener('storage', e => {
  if (e.key && (e.key.startsWith('boss_') || e.key === 'mishutai_v1')) location.reload();
});

/* ================= 今日引导条（2026-11-21：唔俾选项墙，直接话佢知做边样） ================= */
(function () {
  const txt = document.getElementById('guide-text');
  if (!txt) return;
  const sub = document.getElementById('guide-sub'), btn = document.getElementById('guide-btn');
  const h = new Date().getHours();
  let daily = {};
  try { const r = JSON.parse(localStorage.getItem('boss_daily_v1')); if (r && r.date === new Date().toLocaleDateString('sv')) daily = r.done || {}; } catch {}
  const doneCount = Object.values(daily).filter(Boolean).length;
  // 决策树：按时辰 + 打卡进度，净系话佢知一步
  let step;
  if (h >= 6 && h < 12) step = ['听今朝晨报（5–10 分钟）', '边听边记住今日三个词', '#live', '去听 ▶'];
  else if (h >= 12 && h < 18) step = ['听午报 + 做两题真题', '题喺「学习与考证」，开卷即做', '#cert', '去做题 ▶'];
  else if (h >= 18 || h < 2) step = ['听今晚深读（15–30 分钟）', '夜班路上听，听完谂嗰个思考钩子', '#deepread', '去听 ▶'];
  else step = ['抽张口语卡录 2 分钟', '雅思战备卡，录完数自己有冇四根柱', '#cert', '去录音 ▶'];
  if (doneCount >= 4) step = ['今日四门已打晒卡，叻', '可以睇深读或者早唞——唔好硬挤', '#deepread', '睇深读 ▶'];
  txt.textContent = step[0];
  sub.textContent = step[1] + ' · 今日已打卡 ' + doneCount + '/4';
  btn.href = step[2]; btn.textContent = step[3];
})();


/* ================= 每日练习库（2026-11-21 数据打通） ================= */
(function () {
  const box = document.getElementById('pb-list');
  if (!box) return;
  fetch('practicebank.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !j.items || !j.items.length) { box.innerHTML = '<div class="empty">今晚晚报之后开始累积。</div>'; return; }
    const meta = document.getElementById('pb-meta');
    if (meta) meta.textContent = '共存 ' + j.items.length + ' 期练习 · 最近更新 ' + (j.updated || '');
    box.innerHTML = j.items.slice(0, 8).map(x =>
      '<details style="border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:8px"><summary style="cursor:pointer;font-size:14.5px">📝 ' + __esc(x.d) + ' 练习</summary>' +
      (x.read ? '<p style="margin-top:8px;font-size:14px"><b>跟读：</b>「' + __esc(x.read) + '」</p>' : '') +
      (x.fill ? '<p style="font-size:13px;color:var(--text-3)"><b>填空：</b>' + __esc(x.fill) + '</p>' : '') + '</details>'
    ).join('');
  }).catch(() => { box.innerHTML = '<div class="empty">练习库加载失败。</div>'; });
})();

/* ================= 每日三词词库（2026-11-21：学习资产累积器） ================= */
(function () {
  const box = document.getElementById('wb-list');
  if (!box) return;
  fetch('wordbank.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !j.words || !j.words.length) {
      box.innerHTML = '<div class="empty">词库今日开始累积——每日晨报三个词自动入库。</div>';
      return;
    }
    const meta = document.getElementById('wb-meta');
    if (meta) meta.textContent = '共存 ' + j.words.length + ' 词 · 最近更新 ' + (j.updated || '');
    box.innerHTML = j.words.slice(0, 12).map(w =>
      '<div class="src"><span class="tag">' + __esc(w.d || '') + '</span><h3>' + __esc(w.t) + (w.r ? ' <small style="color:var(--text-3)">读作「' + __esc(w.r) + '」</small>' : '') + '</h3>' +
      (w.m ? '<p><b>' + __esc(w.m) + '</b></p>' : '') +
      (w.e ? '<p style="font-size:13px;color:var(--text-3)">' + __esc(w.e) + '</p>' : '') + '</div>'
    ).join('');
  }).catch(() => { box.innerHTML = '<div class="empty">词库加载失败，稍后再试。</div>'; });
})();

/* ================= 学习证明仪表盘（2026-11-21 老板亲令：学习要有证据，唔系概念） ================= */
(function () {
  const statsBox = document.getElementById('lp-stats');
  if (!statsBox) return;
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const arr = k => { const v = load(k); return Array.isArray(v) ? v : []; };
  const tsOf = r => r && (r.t || r.ts || r.time || 0);
  const inDays = (r, d) => { const t = tsOf(r); return t && (Date.now() - t) < d * 864e5; };
  // 连击（同今日修炼同一套数据）
  let streak = 0;
  try {
    const days = new Set(load('boss_days_v1') || []);
    const d = new Date();
    if (!days.has(d.toLocaleDateString('sv'))) d.setDate(d.getDate() - 1);
    while (days.has(d.toLocaleDateString('sv'))) { streak++; d.setDate(d.getDate() - 1); }
  } catch {}
  const notes = arr('boss_notes_v1'), coach = arr('boss_coach_notes_v1'),
        preds = arr('boss_preds_v1'), scores = arr('boss_dive_scores_v1'),
        feels = arr('boss_feel_v1'), rw = arr('boss_rewrite_v1');
  const outputs = [...notes, ...coach, ...preds, ...scores, ...feels, ...rw];
  const week = outputs.filter(r => inDays(r, 7)).length;
  const lastWeek = outputs.filter(r => !inDays(r, 7) && inDays(r, 14)).length;
  const trend = week > lastWeek ? '📈 多过上周' : week < lastWeek ? '📉 少过上周' : '➖ 同上周持平';
  const cards = [
    ['🔥 连续打卡', streak + ' 天'],
    ['🧠 五问笔记', notes.length + ' 条'],
    ['🤖 教练拆解', coach.length + ' 次'],
    ['🔮 写下判断', preds.length + ' 条'],
    ['⭐ 深读打分', scores.length + ' 次'],
    ['🎚️ 体感评测', feels.length + ' 段'],
  ];
  statsBox.innerHTML = cards.map(c =>
    `<div class="stat-card sc-b"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
  const wk = document.getElementById('lp-week');
  if (wk) wk.innerHTML = `本周产出 <b style="color:var(--gold)">${week}</b> 件 ｜ 上周 ${lastWeek} 件 ｜ ${trend}` +
    (week === 0 ? ' —— 今日仲未开张，由「听晨报」开始。' : '');
})();

