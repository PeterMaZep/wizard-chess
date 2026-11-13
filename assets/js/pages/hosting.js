const base = window.SITE_BASE || '/';
let unsubHost = null;
let hostedId = null;

createCodeGame().then(({id, code}) => {
  hostedId = id;
  $('codeBig').textContent = code;
  $('lobbyMsg').textContent = 'Waiting for your friend to enter this code…';
  unsubHost = window.fb.onSnapshot(window.fb.doc(window.fb.db, 'games', id), snap => {
    const g = snap.data();
    if (g && g.b) {
      unsubHost();
      location.href = base + 'play/?g=' + id;
    }
  });
}).catch(e => {
  $('lobbyMsg').textContent = e.message;
});

$('cancelBtn').onclick = async () => {
  if (unsubHost) unsubHost();
  if (hostedId) await cancelGame(hostedId);
  location.href = base;
};
