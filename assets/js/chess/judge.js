const BADGE = {
  brilliant: {sym: '!!', name: 'Brilliant', cls: 'brilliant'},
  best: {sym: '★', name: 'Best move', cls: 'best'},
  excellent: {sym: '!', name: 'Excellent', cls: 'excellent'},
  good: {sym: '✓', name: 'Good', cls: 'good'},
  inaccuracy: {sym: '?!', name: 'Inaccuracy', cls: 'inaccuracy'},
  mistake: {sym: '?', name: 'Mistake', cls: 'mistake'},
  blunder: {sym: '??', name: 'Blunder', cls: 'blunder'}
};

const JUDGE_DEPTH = 10;
const JUDGE_CFG = {skill: 20};
const ELO_CURVE = [[0, 2800], [10, 2500], [20, 2200], [30, 1950], [45, 1700], [60, 1450], [80, 1200], [100, 1000], [150, 700], [250, 400]];
const anaCache = new Map();
let judgeQueue = Promise.resolve();

function analyse(fen) {
  if (anaCache.has(fen)) return Promise.resolve(anaCache.get(fen));
  return sfSearch(fen, null, JUDGE_DEPTH, JUDGE_CFG).then(r => {
    anaCache.set(fen, r);
    return r;
  });
}

function classify(loss, best, sac) {
  if (best) return sac ? BADGE.brilliant : BADGE.best;
  if (loss <= 20) return BADGE.excellent;
  if (loss <= 60) return BADGE.good;
  if (loss <= 120) return BADGE.inaccuracy;
  if (loss <= 250) return BADGE.mistake;
  return BADGE.blunder;
}

async function runJudge(j) {
  if (j.gid !== gid) return;
  const a = await analyse(j.pre);
  if (j.gid !== gid || !a.move || a.score === null) return;
  const best = a.move === j.uci;
  let loss = 0;
  if (!best) {
    const b = await analyse(j.post);
    if (j.gid !== gid || b.score === null) return;
    loss = a.score + b.score;
  }
  loss = Math.max(0, Math.min(500, loss));
  judged[j.ply] = {col: j.col, loss, ply: j.ply};
  if (two || j.col === human) {
    badge = {gid: j.gid, r: j.dest.r, c: j.dest.c, ply: j.ply, ...classify(loss, best, j.sac)};
  }
  render();
}

function queueJudge(col, f, m, ply) {
  if (online) return;
  const legalNow = withRules([], () => allLegal(col)).some(x => key(x.f, x.m) == key(f, m));
  if (!legalNow) return;
  const pre = toFen(S.b, col, S.ep);
  const uci = uciOf(S.b, f, m);
  const moved = S.b[f.r][f.c];
  const cap = m.ep ? S.b[f.r][m.c] : S.b[m.r][m.c];
  const r = doMove(S.b, f, m);
  const post = toFen(r.b, opp(col), r.ep);
  const hanging = withRules([], () => attacked(r.b, m.r, m.c, opp(col)));
  const sac = moved.t != 'k' && hanging && PV[moved.t] - (cap ? PV[cap.t] : 0) >= 200;
  const job = {gid, col, ply, uci, pre, post, sac, dest: {r: m.r, c: m.c}};
  judgeQueue = judgeQueue.then(() => runJudge(job)).catch(() => {});
}

function judgedCount(col) {
  return Object.values(judged).filter(x => x.col == col && x.ply <= hist.length).length;
}

function acplOf(col) {
  const v = Object.values(judged).filter(x => x.col == col && x.ply <= hist.length).map(x => x.loss);
  if (v.length < 3) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

function eloFromAcpl(a) {
  if (a <= ELO_CURVE[0][0]) return ELO_CURVE[0][1];
  for (let i = 1; i < ELO_CURVE.length; i++) {
    const [x1, y1] = ELO_CURVE[i - 1], [x2, y2] = ELO_CURVE[i];
    if (a <= x2) return Math.round(y1 + (y2 - y1) * (a - x1) / (x2 - x1));
  }
  return ELO_CURVE[ELO_CURVE.length - 1][1];
}
