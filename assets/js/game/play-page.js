const SITE = window.SITE_BASE || '/';

function goHome() {
  location.href = SITE;
}

function showGame() {
  $('setup').classList.add('hid');
  $('game').classList.remove('hid');
}

function showSetup() {
  $('setup').classList.remove('hid');
  $('game').classList.add('hid');
}

function startOnlineBoard() {
  two = false;
  resetGame();
  human = online.color;
  online.applied = 0;
  online.pending = 0;
  showGame();
  render();
}

function onlineWaiting(code) {
  two = false;
  human = 'w';
  resetGame();
  busy = true;
  showGame();
  render();
  $('st').textContent = `Waiting for your opponent. Join code: ${code}`;
}

function onlineGone(msg) {
  if (online) {
    online.gone = true;
    if (online.unsub) online.unsub();
  }
  stopHeartbeat();
  busy = true;
  showGame();
  render();
  $('st').textContent = msg;
}

function startOnlineFromLink(gid) {
  two = false;
  resetGame();
  busy = true;
  showGame();
  render();
  $('st').textContent = 'Connecting to your game…';
  fbx().auth.authStateReady().then(() => {
    if (!fbx().auth.currentUser) return onlineGone('Sign in on the homepage to open this game.');
    attachGame(gid);
  });
}

function startLocal() {
  two = true;
  human = 'w';
  rules = [];
  showGame();
  init();
}

$('go').onclick = () => {
  const side = document.querySelector('#side2 .on').dataset.v;
  two = false;
  elo = snapElo();
  human = side == 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : side;
  rules = [];
  showGame();
  init();
};

form();
cform();
updateRatingUI();
const params = new URLSearchParams(location.search);
const gameParam = params.get('g');
if (gameParam) startOnlineFromLink(gameParam);
else if (params.get('mode') == 'local') startLocal();
else showSetup();
