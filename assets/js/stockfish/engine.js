const SF_FILE = 'stockfish-19-lite-single.js';
let sfWorker = null;
let sfDead = false;
let sfWaiters = [];
let sfReady = null;
let sfChain = Promise.resolve();
let sfConfigKey = null;
let sfInfoScore = null;

function sfHandle(line) {
  const m = line.match(/ score (cp|mate) (-?\d+)/);
  if (m) {
    const n = +m[2];
    sfInfoScore = m[1] == 'cp' ? n : n > 0 ? 100000 - n * 100 : -100000 - n * 100;
  }
  sfWaiters = sfWaiters.filter(w => {
    if (w.re.test(line)) {
      w.resolve(line);
      return false;
    }
    return true;
  });
}

function sfStart() {
  if (sfWorker) return true;
  if (sfDead) return false;
  try {
    sfWorker = new Worker((window.SF_BASE || '/assets/js/vendor/') + SF_FILE);
  } catch (e) {
    sfDead = true;
    return false;
  }
  sfWorker.onmessage = e => sfHandle(String(e.data));
  sfWorker.onerror = () => {
    sfDead = true;
    sfWorker = null;
    sfReady = null;
  };
  return true;
}

function sfWait(re, ms) {
  return new Promise((resolve, reject) => {
    const w = {re, resolve};
    sfWaiters.push(w);
    setTimeout(() => {
      const i = sfWaiters.indexOf(w);
      if (i >= 0) {
        sfWaiters.splice(i, 1);
        reject(new Error('Stockfish timed out'));
      }
    }, ms);
  });
}

function sfAsk(cmd, re, ms) {
  const p = sfWait(re, ms);
  sfWorker.postMessage(cmd);
  return p;
}

function sfEnsureReady() {
  if (!sfReady) {
    sfReady = (async () => {
      await sfAsk('uci', /^uciok/, 20000);
      await sfAsk('isready', /^readyok/, 20000);
    })().catch(e => {
      sfReady = null;
      throw e;
    });
  }
  return sfReady;
}

function sfConfigure(cfg) {
  const k = cfg.full ? 'full' : cfg.elo ? 'elo' + cfg.elo : 'skill' + cfg.skill;
  if (k == sfConfigKey) return;
  if (cfg.full) {
    sfWorker.postMessage('setoption name UCI_LimitStrength value false');
    sfWorker.postMessage('setoption name Skill Level value 20');
  } else if (cfg.elo) {
    sfWorker.postMessage('setoption name UCI_LimitStrength value true');
    sfWorker.postMessage('setoption name UCI_Elo value ' + cfg.elo);
  } else {
    sfWorker.postMessage('setoption name UCI_LimitStrength value false');
    sfWorker.postMessage('setoption name Skill Level value ' + cfg.skill);
  }
  sfConfigKey = k;
}

async function sfRun(fen, moves, depth, cfg) {
  if (!sfStart()) throw new Error('Stockfish unavailable');
  await sfEnsureReady();
  sfConfigure(cfg);
  sfInfoScore = null;
  sfWorker.postMessage('position fen ' + fen);
  const line = await sfAsk('go depth ' + depth + (moves ? ' searchmoves ' + moves.join(' ') : ''), /^bestmove /, 60000);
  const mv = line.split(' ')[1];
  return {
    move: mv && mv !== '(none)' && mv !== '0000' ? mv : null,
    score: sfInfoScore
  };
}

function sfSearch(fen, moves, depth, cfg) {
  const job = sfChain.then(() => sfRun(fen, moves, depth, cfg));
  sfChain = job.catch(() => {});
  return job;
}

function toFen(b, col, ep) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let s = '', e = 0;
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) {
        e++;
        continue;
      }
      if (e) {
        s += e;
        e = 0;
      }
      s += p.c == 'w' ? p.t.toUpperCase() : p.t;
    }
    if (e) s += e;
    rows.push(s);
  }
  let cast = '';
  const rook = (r, c, col) => {
    const p = b[r][c];
    return p && p.t == 'r' && p.c == col && !p.m;
  };
  const wk = b[7][4], bk = b[0][4];
  if (wk && wk.t == 'k' && wk.c == 'w' && !wk.m) {
    if (rook(7, 7, 'w')) cast += 'K';
    if (rook(7, 0, 'w')) cast += 'Q';
  }
  if (bk && bk.t == 'k' && bk.c == 'b' && !bk.m) {
    if (rook(0, 7, 'b')) cast += 'k';
    if (rook(0, 0, 'b')) cast += 'q';
  }
  const epSq = ep ? 'abcdefgh'[ep.c] + (8 - ep.r) : '-';
  return `${rows.join('/')} ${col} ${cast || '-'} ${epSq} 0 1`;
}

function uciOf(b, f, m) {
  let s = 'abcdefgh'[f.c] + (8 - f.r) + 'abcdefgh'[m.c] + (8 - m.r);
  const p = b[f.r][f.c];
  if (p && p.t == 'p' && (m.r == 0 || m.r == 7)) s += 'q';
  return s;
}
