const base = window.SITE_BASE || '/';
const showEl = el => el.classList.remove('hid');
const hideEl = el => el.classList.add('hid');

$('beginBtn').onclick = () => {
  hideEl($('home'));
  showEl($('modes'));
};
$('backBtn').onclick = () => {
  hideEl($('modes'));
  hideEl($('online'));
  showEl($('home'));
};
$('modeAi').onclick = () => location.href = base + 'play/';
$('modeLocal').onclick = () => location.href = base + 'play/?mode=local';
$('modeOnline').onclick = () => {
  hideEl($('modes'));
  showEl($('online'));
};
$('onlineBack').onclick = () => {
  hideEl($('online'));
  showEl($('modes'));
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
  const user = window.fb.auth.currentUser;
  if (!user) return hideEl($('resume'));
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
  shown ? showEl($('resume')) : hideEl($('resume'));
}

window.addEventListener('account-state', e => {
  const u = e.detail;
  $('acctText').textContent = u ? `Signed in as ${u.name}.` : 'Sign in with Google to play online.';
  $('acctBtn').textContent = u ? 'Sign out' : 'Sign in with Google';
  renderResume();
});
$('acctBtn').onclick = () => window.accountToggle && window.accountToggle();
