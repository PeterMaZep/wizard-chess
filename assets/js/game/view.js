function render() {
  if (two) human = S.turn;
  const k = kpos(S.b, S.turn), chk = !kc() && k && attacked(S.b, k[0], k[1], opp(S.turn));
  const bd = badge && badge.gid == gid && hist.length >= badge.ply && hist.length <= badge.ply + 1 ? badge : null;
  let h = '';
  for (let a = 0; a < 64; a++) {
    const fl = human == 'b' && !two;
    const r = fl ? 7 - (a >> 3) : a >> 3, c = fl ? 7 - (a & 7) : a & 7;
    const p = S.b[r][c], t = legal.find(m => m.r == r && m.c == c);
    const cl = ['sq', (r + c) % 2 ? 'd' : 'l'];
    if (sel && sel.r == r && sel.c == c) cl.push('sel');
    if (t) {
      cl.push('t');
      if (p || t.ep) cl.push('x');
    }
    if (chk && k[0] == r && k[1] == c) cl.push('chk');
    if (p && mod(p)) cl.push('mod');
    const piece = p ? `<span class="${p.c}${p.t == 'k' ? ' wiz' : ''}">${G[p.t]}</span>` : '';
    const mark = bd && bd.r == r && bd.c == c ? `<i class="badge ${bd.cls}" title="${bd.name}">${bd.sym}</i>` : '';
    const coords = (a & 7) == 0 ? `<span class="coord rk">${8 - r}</span>` : '';
    const files = (a >> 3) == 7 ? `<span class="coord fl">${'abcdefgh'[c]}</span>` : '';
    h += `<div class="${cl.join(' ')}" data-r="${r}" data-c="${c}">${coords}${files}${piece}${mark}</div>`;
  }
  $('bd').innerHTML = h;

  $('nw').disabled = !!online;
  $('un').disabled = !!online;
  $('rs').disabled = !!S.over || !!(online && online.gone);
  const dis = busy || !!S.over || S.turn != human || chk, pt = S.pts[human];
  $('cgo').disabled = dis || pt < cost(curseRule());
  lab();
  $('add').title = chk ? 'You cannot cast while in check' : '';
  $('nt').textContent = S.note || '';
  $('add').disabled = dis || pt < cost(formRule());
  $('ch').querySelectorAll('button').forEach(x => x.disabled = dis || pt < cost(PRE[x.dataset.p][1]));
  $('st').textContent = S.over || (busy ? (online ? 'Waiting…' : 'The enemy wizard is plotting…') : `${two ? SD[S.turn] + ' to move' : S.turn == human ? 'Your move' : online ? 'Opponent to move' : 'Enemy wizard to move'}${S.again ? ' again' : ''}${chk ? '. Check!' : ''}`);
  $('rl').innerHTML = rules.length
    ? rules.map((r, i) => `<li><span>${desc(r)}</span><button data-i="${i}" ${r.side == human && !r.cu ? '' : 'hidden'} aria-label="Remove rule">\u00d7</button></li>`).join('')
    : '<li class="none">No spells active yet. Cast one above, or try a quick spell.</li>';
  $('nTop').textContent = two ? 'Black' : online ? (online.oppName || 'Opponent') : 'Enemy wizard';
  $('rTop').textContent = two ? '' : online ? (online.oppElo ? eloText(online.oppElo) : '') : eloText(elo);
  $('nBottom').textContent = two ? 'White' : 'You';
  $('rBottom').textContent = two ? '' : `${rating.elo}`;
  renderEnd();
}

function renderEnd() {
  const show = !!S.over && !endDismissed;
  $('endmodal').classList.toggle('hid', !show);
  if (!show) return;
  recordIfOver();
  const mate = /^Checkmate/.test(S.over), stale = /^Stalemate/.test(S.over);
  let title = 'Game over';
  if (S.kingWin) title = 'King captured';
  else if (mate) title = 'Checkmate';
  else if (stale) title = 'Stalemate';
  let sub = S.over;
  if (mate && !two) sub = opp(S.turn) == human ? 'You checkmated the enemy wizard.' : 'The enemy wizard checkmated you.';
  $('endtitle').textContent = title;
  $('endsub').textContent = sub;
  const row = (col, label, extra) => {
    const a = acplOf(col), n = judgedCount(col);
    const headline = a == null ? 'Not enough moves to estimate' : `Est. Elo ${eloFromAcpl(a)}`;
    const detail = a == null ? '' : `avg. loss ${a.toFixed(0)} cp over ${n} moves`;
    return `<div class="erow"><span>${label}</span><strong>${headline}</strong><small>${[detail, extra].filter(Boolean).join(' · ')}</small></div>`;
  };
  $('endstats').innerHTML = two
    ? row('w', 'White') + row('b', 'Black')
    : `<div class="erow"><span>Your rating</span><strong>${rating.elo} (${lastDelta >= 0 ? '+' : ''}${lastDelta})</strong><small>Based on this game</small></div>` +
      row(human, 'You') + row(opp(human), online ? 'Opponent' : 'Enemy wizard', online ? '' : `set to ${eloText(elo)}`);
}

function recordIfOver() {
  if (two || recordedGid === gid) return;
  recordedGid = gid;
  let result = 0.5;
  if (S.winner) result = S.winner == human ? 1 : 0;
  if (S.kingWin) result = S.turn == human ? 1 : 0;
  else if (/^Checkmate/.test(S.over)) result = opp(S.turn) == human ? 1 : 0;
  lastDelta = applyGame(result, eloOpponent(), gid);
  updateRatingUI();
}


function opts() {
  return Object.keys(N).map(k => `<option value="${k}">${N[k]}</option>`).join('');
}

function form() {
  const k = $('kind').value, n = NEED[k];
  $('pb').innerHTML = opts();
  [['pa', 'a'], ['pb', 'b'], ['num', 'n']].forEach(([id, f]) => $(id).classList.toggle('hid', !n.includes(f)));
}

function cform() {
  const k = $('cs').value;
  $('ca').innerHTML = CP[k].map(x => `<option value="${x}">${N[x]}</option>`).join('');
  $('cb').innerHTML = opts();
  [['cb', k == 'nocap'], ['cn', k == 'range']].forEach(([id, on]) => $(id).classList.toggle('hid', !on));
}

function formRule() {
  const k = $('kind').value, n = NEED[k];
  return {
    k,
    side: human,
    a: n.includes('a') ? $('pa').value : 'p',
    b: $('pb').value,
    n: Math.max(1, Math.min(8, +$('num').value || 1)),
    t: ''
  };
}

function curseRule() {
  const k = $('cs').value;
  return {
    k,
    side: opp(human),
    cu: true,
    a: $('ca').value,
    b: $('cb').value,
    n: Math.max(1, Math.min(3, +$('cn').value || 1)),
    t: ''
  };
}

function lab() {
  $('add').textContent = `Cast spell (${cost(formRule())} mana, uses your turn)`;
  $('cgo').textContent = `Hex ${two ? SD[opp(human)] : 'the enemy wizard'} (${cost(curseRule())} mana, uses your turn)`;
  $('pt').textContent = `${two ? `White mana: ${S.pts.w}. Black mana: ${S.pts.b}.` : `Mana: ${S.pts[human]} (enemy wizard: ${S.pts[opp(human)]}).`} Everyone regains 1 mana every 2 moves, up to 6.`;
}

function eloOpponent() {
  if (online) return online.oppElo || ELO_MIN;
  return elo >= ELO_MAX ? ELO_MAX : elo;
}
