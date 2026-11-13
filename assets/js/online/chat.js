const CHAT_MAX_LENGTH = 200;
const CHAT_KEEP = 100;

function renderChat(list) {
  const log = $('chatLog');
  const u = window.fb && window.fb.auth.currentUser;
  const uid = u && u.uid;
  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
  log.innerHTML = '';
  for (const m of list) {
    const row = document.createElement('div');
    row.className = 'chat-line' + (m.uid == uid ? ' mine' : '');
    const who = document.createElement('strong');
    who.textContent = m.uid == uid ? 'You' : m.name;
    row.appendChild(who);
    row.appendChild(document.createTextNode(': ' + m.text));
    log.appendChild(row);
  }
  if (atBottom) log.scrollTop = log.scrollHeight;
}

function sendChat(raw) {
  const mine = online;
  const text = (raw || '').trim().slice(0, CHAT_MAX_LENGTH);
  if (!mine || !mine.started || mine.gone || !text) return;
  const u = window.fb.auth.currentUser;
  if (!u) return;
  const msg = {uid: u.uid, name: u.displayName || u.email || 'Player', text, t: Date.now()};
  const ref = window.fb.doc(window.fb.db, 'games', mine.id);
  window.fb.runTransaction(window.fb.db, async tx => {
    const g = await tx.get(ref);
    if (!g.exists()) return;
    const list = (g.data().chat || []).concat([msg]).slice(-CHAT_KEEP);
    tx.update(ref, {chat: list});
  }).catch(e => console.error('Could not send chat', e));
}

$('chatForm').onsubmit = e => {
  e.preventDefault();
  sendChat($('chatInput').value);
  $('chatInput').value = '';
};
