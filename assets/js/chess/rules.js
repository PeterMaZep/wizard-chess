const opp = c => c == 'w' ? 'b' : 'w';
const mt = (a, t) => a == '*' || a == t;
const kc = () => rules.some(x => x.k == 'kingcap');
const pn = t => N[t].toLowerCase();
const mod = p => rules.some(x => !['extra','kingcap','note'].includes(x.k) && (x.side == 'x' || x.side == p.c) && mt(x.a, p.t));
const has = r => rules.some(x => !!x.cu == !!r.cu && x.k == r.k && x.side == r.side && x.a == r.a && x.b == r.b);

function desc(r) {
  const s = two
    ? (r.cu ? 'Hex on ' + SD[r.side] : SD[r.side] + '’s spell')
    : r.cu ? 'Hex on ' + (r.side == human ? 'you' : 'the enemy')
    : r.side == human ? 'Your spell' : 'Enemy spell';
  const a = pn(r.a);
  return ({
    borrow: `${s}: ${a} also moves like a ${pn(r.b)}`,
    leap: `${s}: ${a} can jump over one piece`,
    range: `${s}: ${a} can move up to ${r.n} square${r.n > 1 ? 's' : ''}`,
    immune: `${s}: ${a} cannot be captured by ${pn(r.b)}`,
    freeze: `${s}: ${a} cannot move`,
    back: `${s}: pawns can also move backward`,
    extra: `${s}: chain spell, move again after ${a} captures`,
    kingcap: 'No check: capture the king to win',
    note: `House rule: ${r.t}`
  })[r.k] + (r.ttl ? ` (${r.ttl} turns left)` : '');
}

function gen(b, r, c, ep) {
  const p = b[r][c], t = p.t, col = p.c, out = [];
  const R = rules.filter(x => (x.side == 'x' || x.side == col) && mt(x.a, t));
  if (R.some(x => x.k == 'freeze')) return out;

  const types = [t, ...R.filter(x => x.k == 'borrow').map(x => x.b)];
  const leap = R.some(x => x.k == 'leap');
  const rg = R.filter(x => x.k == 'range').map(x => +x.n);
  const nocap = R.filter(x => x.k == 'nocap');

  const add = (rr, cc, capOnly) => {
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return;
    const q = b[rr][cc];
    if (!q) {
      if (!capOnly) out.push({r: rr, c: cc});
    } else if (q.c != col
      && !nocap.some(x => mt(x.b, q.t))
      && !rules.some(x => x.k == 'immune' && x.side == q.c && mt(x.a, q.t) && mt(x.b, t))) {
      out.push({r: rr, c: cc});
    }
  };

  for (const ty of types) {
    if (ty == 'n') {
      KN.forEach(([a, d]) => add(r + a, c + d));
    } else if (ty == 'p') {
      const f = col == 'w' ? -1 : 1, dirs = [f];
      if (R.some(x => x.k == 'back')) dirs.push(-f);
      for (const dr of dirs) {
        const rr = r + dr;
        if (rr < 0 || rr > 7) continue;
        if (!b[rr][c]) {
          out.push({r: rr, c});
          if (dr == f && r == (col == 'w' ? 6 : 1) && !b[rr + dr][c]) out.push({r: rr + dr, c});
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          if (b[rr][cc]) add(rr, cc, true);
          else if (ep && ep.r == rr && ep.c == cc && dr == f) out.push({r: rr, c: cc, ep: true});
        }
      }
    } else {
      const lim = rg.length ? rg[rg.length - 1] : (ty == 'k' ? 1 : 8);
      for (const [a, d] of D[ty]) {
        let occ = 0;
        for (let i = 1; i <= lim; i++) {
          const rr = r + a * i, cc = c + d * i;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break;
          if (!b[rr][cc]) {
            out.push({r: rr, c: cc});
            continue;
          }
          occ++;
          add(rr, cc);
          if (!leap || occ >= 2) break;
        }
      }
    }
  }
  return out;
}

function attacked(b, r, c, by) {
  const had = b[r][c];
  if (!had) b[r][c] = {t: 'x', c: opp(by)};
  let res = false;
  for (let i = 0; i < 8 && !res; i++) {
    for (let j = 0; j < 8; j++) {
      const p = b[i][j];
      if (p && p.c == by && gen(b, i, j, null).some(m => m.r == r && m.c == c)) {
        res = true;
        break;
      }
    }
  }
  if (!had) b[r][c] = null;
  return res;
}

function kpos(b, col) {
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (b[i][j] && b[i][j].t == 'k' && b[i][j].c == col) return [i, j];
  return null;
}

function doMove(b, f, m) {
  const n = b.map(r => r.map(p => p && {...p})), p = n[f.r][f.c];
  let cap = n[m.r][m.c];
  if (m.ep) {
    cap = n[f.r][m.c];
    n[f.r][m.c] = null;
  }
  if (m.castle != null) {
    const rk = n[f.r][m.castle];
    n[f.r][m.castle] = null;
    n[f.r][m.c == 6 ? 5 : 3] = rk;
    rk.m = true;
  }
  const dbl = p.t == 'p' && Math.abs(m.r - f.r) == 2;
  n[m.r][m.c] = p;
  n[f.r][f.c] = null;
  p.m = true;
  if (p.t == 'p' && m.r == (p.c == 'w' ? 0 : 7)) p.t = 'q';
  return {b: n, cap, ep: dbl ? {r: (m.r + f.r) / 2, c: f.c} : null};
}

function legalB(b, r, c, ep) {
  const p = b[r][c], ms = gen(b, r, c, ep);
  if (kc()) return ms;
  return ms.filter(m => {
    const n = doMove(b, {r, c}, m).b, k = kpos(n, p.c);
    return !k || !attacked(n, k[0], k[1], opp(p.c));
  });
}

function legalAt(r, c) {
  const p = S.b[r][c], ms = legalB(S.b, r, c, S.ep);
  if (p.t == 'k' && !p.m && c == 4 && r == (p.c == 'w' ? 7 : 0)) {
    for (const [rc, d, gap] of [[7, 1, [5, 6]], [0, -1, [1, 2, 3]]]) {
      const rk = S.b[r][rc];
      if (rk && rk.t == 'r' && rk.c == p.c && !rk.m && gap.every(x => !S.b[r][x])
        && (kc() || ![4, 4 + d, 4 + 2 * d].some(x => attacked(S.b, r, x, opp(p.c)))))
        ms.push({r, c: 4 + 2 * d, castle: rc});
    }
  }
  return ms;
}

function endCheck() {
  const t = S.turn;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (S.b[i][j] && S.b[i][j].c == t && legalAt(i, j).length) return;
  const k = kpos(S.b, t), chk = !kc() && k && attacked(S.b, k[0], k[1], opp(t));
  S.over = chk ? `Checkmate. ${SD[opp(t)]} wins.` : 'Stalemate. The game is a draw.';
}

function inChk(col) {
  const k = kpos(S.b, col);
  return !kc() && !!k && attacked(S.b, k[0], k[1], opp(col));
}

function movesB(b, col, ep) {
  const o = [];
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (b[i][j] && b[i][j].c == col)
        for (const m of legalB(b, i, j, ep)) o.push({f: {r: i, c: j}, m});
  return o;
}

function cost(r) {
  const k = r.k, a = r.a;
  if (r.cu) return k == 'freeze' ? 4 : 2;
  if (k == 'back') return 1;
  if (k == 'range') return r.n > 2 ? 3 : 2;
  if (k == 'leap' || k == 'immune') return a == 'q' ? 3 : 2;
  if (k == 'borrow') return r.b == 'q' ? 3 : 2;
  return 3;
}

function withRules(R, fn) {
  const o = rules;
  rules = R;
  try {
    return fn();
  } finally {
    rules = o;
  }
}
