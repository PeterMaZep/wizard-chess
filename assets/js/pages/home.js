const base = window.SITE_BASE || '/';

function snapElo() {
  const v = roundElo(+$('lvl').value);
  $('lvl').value = v;
  $('lvlOut').textContent = eloText(v);
  return v;
}

function showPanel(name) {
  ['modes', 'stockfish', 'online'].forEach(id => $(id).classList.toggle('hid', id != name));
  $('hero').classList.toggle('hid', !!name);
}

$('playBtn').onclick = () => showPanel('modes');
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => showPanel(b.dataset.back));

$('modeAi').onclick = () => showPanel('stockfish');
$('modeLocal').onclick = () => location.href = base + 'play/?mode=local';
$('modeOnline').onclick = () => showPanel('online');

document.querySelectorAll('.seg').forEach(g => g.onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x == b));
});

$('recBtn').onclick = () => {
  $('lvl').value = $('recBtn').dataset.v;
  $('lvlOut').textContent = eloText(+$('lvl').value);
};
$('lvl').oninput = () => $('lvlOut').textContent = eloText(+$('lvl').value);
let sliderHeld = false;
$('lvl').addEventListener('pointerdown', () => sliderHeld = true);
$('lvl').addEventListener('touchstart', () => sliderHeld = true, {passive: true});
$('lvl').addEventListener('keydown', () => sliderHeld = true);
const releaseSlider = () => {
  if (sliderHeld) {
    sliderHeld = false;
    snapElo();
  }
};
window.addEventListener('pointerup', releaseSlider);
window.addEventListener('touchend', releaseSlider);
window.addEventListener('keyup', releaseSlider);
$('lvl').onchange = snapElo;

$('startAi').onclick = () => {
  const side = document.querySelector('#side2 .on').dataset.v;
  location.href = base + 'play/?mode=ai&side=' + side + '&elo=' + snapElo();
};

$('createBtn').onclick = () => location.href = base + 'hosting/';
$('randomBtn').onclick = () => location.href = base + 'randomduel/';
$('joinBtn').onclick = async () => {
  $('homeMsg').textContent = 'Joining…';
  try {
    const id = await joinByCode($('codeIn').value);
    location.href = base + 'play/?g=' + id;
  } catch (e) {
    $('homeMsg').textContent = e.message;
  }
};

async function renderResume() {
  const list = $('resumeList');
  list.innerHTML = '';
  const user = window.fb && window.fb.auth.currentUser;
  if (!user) return $('resume').classList.add('hid');
  let shown = 0;
  for (const id of rememberedGames()) {
    const snap = await window.fb.getDoc(window.fb.doc(window.fb.db, 'games', id)).catch(() => null);
    if (!snap || !snap.exists() || snap.data().status == 'over') {
      forgetGame(id);
      continue;
    }
    const g = snap.data();
    const iAmWhite = g.w.uid == user.uid;
    const iAmBlack = !iAmWhite && g.b && g.b.uid == user.uid;
    if (!iAmWhite && !iAmBlack) {
      forgetGame(id);
      continue;
    }
    const opp = iAmWhite ? g.b : g.w;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = base + 'play/?g=' + id;
    a.textContent = opp ? `Continue vs ${opp.name}` : 'Waiting for opponent';
    li.appendChild(a);
    list.appendChild(li);
    shown++;
  }
  $('resume').classList.toggle('hid', !shown);
}

window.addEventListener('account-state', e => {
  const u = e.detail;
  $('acctText').textContent = u ? `Signed in as ${u.name}.` : 'Sign in with Google to play online.';
  $('acctBtn').textContent = u ? 'Sign out' : 'Sign in with Google';
  renderResume();
});
$('acctBtn').onclick = () => window.accountToggle && window.accountToggle();

updateRatingUI();
