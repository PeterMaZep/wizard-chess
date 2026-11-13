const base = window.SITE_BASE || '/';
let stopSearch = null;

startMatchmaking(
  text => $('lobbyStatus').textContent = text,
  id => location.href = base + 'play/?g=' + id
).then(stop => {
  stopSearch = stop;
}).catch(e => {
  $('lobbyStatus').textContent = e.message;
});

$('cancelBtn').onclick = () => {
  if (stopSearch) stopSearch(true);
  location.href = base;
};
