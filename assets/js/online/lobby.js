const ONLINE_LOW = 300;
const ONLINE_WINDOW = 200;
const QUEUE_STALE_MS = 120000;
const GAMES_KEY = 'wc-online-games';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const fbx = () => window.fb;

function fbReady() {
  return new Promise(resolve => {
    if (window.fb) return resolve();
    window.addEventListener('fb-ready', () => resolve(), {once: true});
  });
}

function rememberedGames() {
  try {
    return JSON.parse(localStorage.getItem(GAMES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function rememberGame(id) {
  const list = rememberedGames();
  if (!list.includes(id)) list.push(id);
  localStorage.setItem(GAMES_KEY, JSON.stringify(list));
}

function forgetGame(id) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(rememberedGames().filter(x => x != id)));
}

async function requireUser() {
  await fbReady();
  await fbx().auth.authStateReady();
  const u = fbx().auth.currentUser;
  if (!u) throw new Error('Sign in with Google first.');
  return u;
}

function myInfo(u) {
  return {uid: u.uid, name: u.displayName || u.email || 'Player', elo: rating.elo};
}

function makeCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.random() * CODE_CHARS.length | 0];
  return s;
}

async function createCodeGame() {
  const u = await requireUser();
  const ref = fbx().doc(fbx().collection(fbx().db, 'games'));
  const code = makeCode();
  const now = Date.now();
  await fbx().setDoc(ref, {
    code,
    status: 'waiting',
    w: myInfo(u),
    b: null,
    events: [],
    seen: {w: now, b: 0},
    createdAt: now
  });
  return {id: ref.id, code};
}

async function cancelGame(id) {
  await fbReady();
  await fbx().deleteDoc(fbx().doc(fbx().db, 'games', id)).catch(() => {});
}

async function joinByCode(codeRaw) {
  const u = await requireUser();
  const code = (codeRaw || '').trim().toUpperCase();
  if (code.length !== 6) throw new Error('Enter the 6-character code.');
  const snap = await fbx().getDocs(fbx().query(
    fbx().collection(fbx().db, 'games'),
    fbx().where('code', '==', code),
    fbx().where('status', '==', 'waiting'),
    fbx().limit(1)
  ));
  if (snap.empty) throw new Error('No open game with that code.');
  const found = snap.docs[0];
  if (found.data().w.uid == u.uid) throw new Error("You can't join your own game.");
  const me = myInfo(u);
  await fbx().runTransaction(fbx().db, async tx => {
    const g = await tx.get(found.ref);
    if (!g.exists() || g.data().status != 'waiting') throw new Error('That game is no longer open.');
    tx.update(found.ref, {b: me, status: 'active', 'seen.b': Date.now()});
  });
  return found.ref.id;
}

async function startMatchmaking(onStatus, onMatch) {
  const u = await requireUser();
  const me = myInfo(u);
  const bracket = me.elo < ONLINE_LOW ? 'low' : 'main';
  const db = fbx().db;
  await fbx().setDoc(fbx().doc(db, 'queue', u.uid), {...me, bracket, t: Date.now()});

  let done = false, timer = null, unsub = null;
  const finish = gameId => {
    if (done) return;
    done = true;
    clearInterval(timer);
    if (unsub) unsub();
    onMatch(gameId);
  };

  unsub = fbx().onSnapshot(fbx().doc(db, 'matches', u.uid), snap => {
    const d = snap.data();
    if (!d || !d.gameId || done) return;
    fbx().deleteDoc(fbx().doc(db, 'matches', u.uid)).catch(() => {});
    onStatus('Partner found, joining game…');
    finish(d.gameId);
  });

  const pair = async () => {
    if (done) return;
    const now = Date.now();
    const snap = await fbx().getDocs(fbx().query(
      fbx().collection(db, 'queue'),
      fbx().where('bracket', '==', bracket),
      fbx().limit(30)
    ));
    if (done) return;
    const cands = snap.docs
      .map(d => d.data())
      .filter(c => c.uid != me.uid && now - c.t < QUEUE_STALE_MS && (bracket == 'low' || Math.abs(c.elo - me.elo) <= ONLINE_WINDOW));
    if (!cands.length) return;
    cands.sort((a, b) => Math.abs(a.elo - me.elo) - Math.abs(b.elo - me.elo));
    const c = cands[0];
    const colorMe = Math.random() < 0.5 ? 'w' : 'b';
    const colorThem = colorMe == 'w' ? 'b' : 'w';
    const gRef = fbx().doc(fbx().collection(db, 'games'));
    const myQ = fbx().doc(db, 'queue', u.uid);
    const theirQ = fbx().doc(db, 'queue', c.uid);
    try {
      await fbx().runTransaction(db, async tx => {
        const a = await tx.get(myQ);
        const b = await tx.get(theirQ);
        if (!a.exists() || !b.exists()) throw new Error('already matched');
        tx.delete(myQ);
        tx.delete(theirQ);
        const t = Date.now();
        tx.set(gRef, {
          status: 'active',
          code: null,
          [colorMe]: me,
          [colorThem]: {uid: c.uid, name: c.name, elo: c.elo},
          events: [],
          seen: {w: t, b: t},
          createdAt: t
        });
        tx.set(fbx().doc(db, 'matches', c.uid), {gameId: gRef.id, color: colorThem, t});
      });
      onStatus('Partner found, joining game…');
      finish(gRef.id);
    } catch (e) {}
  };

  timer = setInterval(pair, 3000);
  onStatus('Searching for a partner…');
  pair();

  return removeQueue => {
    if (done) return;
    done = true;
    clearInterval(timer);
    if (unsub) unsub();
    if (removeQueue) fbx().deleteDoc(fbx().doc(db, 'queue', u.uid)).catch(() => {});
  };
}
