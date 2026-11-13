const HEARTBEAT_MS = 30000;
const ABSENT_MS = 5 * 60 * 1000;
let heartbeatTimer = null;

const fbxs = () => window.fb;

function attachGame(id) {
  if (online && online.unsub) online.unsub();
  online = {id, color: null, oppElo: null, oppName: '', applied: 0, pending: 0, started: false, marked: false, gone: false, absentSent: false, unsub: null};
  rememberGame(id);
  online.unsub = fbxs().onSnapshot(
    fbxs().doc(fbxs().db, 'games', id),
    snap => onGameSnap(snap),
    () => onlineGone('Lost connection to this game.')
  );
}

function onGameSnap(snap) {
  const cur = online;
  if (!cur || cur.gone) return;
  if (!snap.exists()) return onlineGone('This game no longer exists.');
  const g = snap.data();
  const uid = fbxs().auth.currentUser && fbxs().auth.currentUser.uid;
  if (!cur.color) cur.color = g.w.uid == uid ? 'w' : (g.b && g.b.uid == uid ? 'b' : null);
  if (!cur.color) return onlineGone('This game belongs to other players.');
  const opponent = cur.color == 'w' ? g.b : g.w;
  if (!opponent) return onlineWaiting(g.code);
  cur.oppElo = opponent.elo;
  cur.oppName = opponent.name;
  if (!cur.started) {
    cur.started = true;
    startOnlineBoard();
    startHeartbeat();
  }
  renderChat(g.chat || []);
  const evs = g.events || [];
  if (evs.length < cur.applied - cur.pending) return resync(evs);
  for (let i = cur.applied; i < evs.length; i++) {
    if (!applyRemote(evs[i])) return resync(evs);
    cur.applied = i + 1;
  }
  render();
  if (S.over && !cur.marked) {
    cur.marked = true;
    markOver();
  }
}

async function markOver() {
  const cur = online;
  if (!cur) return;
  stopHeartbeat();
  try {
    await fbxs().updateDoc(fbxs().doc(fbxs().db, 'games', cur.id), {status: 'over'});
  } catch (e) {
    console.error(e);
  }
  forgetGame(cur.id);
}

function startHeartbeat() {
  stopHeartbeat();
  tick();
  heartbeatTimer = setInterval(tick, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

async function tick() {
  const cur = online;
  if (!cur || !cur.color || cur.gone) return;
  const ref = fbxs().doc(fbxs().db, 'games', cur.id);
  try {
    await fbxs().updateDoc(ref, {['seen.' + cur.color]: Date.now()});
    const snap = await fbxs().getDoc(ref);
    if (snap.exists() && online === cur) checkPresence(snap.data());
  } catch (e) {
    console.error(e);
  }
}

function checkPresence(g) {
  const cur = online;
  if (!cur || !cur.started || cur.gone || S.over || g.status == 'over') return;
  const now = Date.now(), seen = g.seen || {};
  const away = c => now - (seen[c] || 0) > ABSENT_MS;
  const wAway = away('w'), bAway = away('b');
  if (wAway && bAway) return discardGame();
  if ((wAway || bAway) && !cur.absentSent) {
    cur.absentSent = true;
    sendEvent({t: 'resign', col: wAway ? 'w' : 'b'});
  }
}

async function discardGame() {
  const cur = online;
  if (!cur || cur.gone) return;
  cur.gone = true;
  stopHeartbeat();
  await fbxs().deleteDoc(fbxs().doc(fbxs().db, 'games', cur.id)).catch(() => {});
  forgetGame(cur.id);
  onlineGone('Match discarded: both players were away for 5 minutes.');
}

function resync(evs) {
  if (!online) return;
  resetGame();
  online.applied = 0;
  for (const ev of evs) {
    if (!applyRemote(ev)) break;
    online.applied++;
  }
  render();
}

function applyRemote(ev) {
  replaying = true;
  try {
    if (ev.t == 'resign') {
      S.winner = opp(ev.col);
      S.over = `${SD[S.winner]} wins. ${SD[ev.col]} resigned.`;
      return true;
    }
    if (S.turn !== ev.col) return false;
    if (ev.t == 'move') {
      const f = {r: ev.f.r, c: ev.f.c};
      const m = legalAt(f.r, f.c).find(x => x.r == ev.m.r && x.c == ev.m.c);
      if (!m) return false;
      play(f, m);
      return true;
    }
    if (ev.t == 'rule') {
      pass(ev.rule, ev.col);
      return true;
    }
    return false;
  } finally {
    replaying = false;
  }
}

function sendEvent(ev) {
  const mine = online;
  if (!mine || !mine.started || mine.gone) return;
  const expected = mine.applied;
  const ref = fbxs().doc(fbxs().db, 'games', mine.id);
  mine.applied++;
  mine.pending++;
  fbxs().runTransaction(fbxs().db, async tx => {
    const g = await tx.get(ref);
    const evs = (g.data() && g.data().events) || [];
    if (evs.length !== expected) throw new Error('out of sync');
    tx.update(ref, {events: [...evs, ev]});
  }).then(() => {
    mine.pending--;
  }).catch(async err => {
    console.error(err);
    mine.pending--;
    if (online === mine) {
      const snap = await fbxs().getDoc(ref);
      if (snap.exists()) resync(snap.data().events || []);
    }
  });
}
