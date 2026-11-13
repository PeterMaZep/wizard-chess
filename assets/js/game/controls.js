$('kind').innerHTML = Object.keys(KINDS).map(k => `<option value="${k}">${KINDS[k]}</option>`).join('');
$('pa').innerHTML = opts();
$('kind').onchange = form;

$('ch').innerHTML = '<span class="chips-label hint">Quick spells</span>' + PRE.map((p, i) => `<button data-p="${i}">${p[0]} (${cost(p[1])})</button>`).join('');
$('ch').onclick = e => {
  const i = e.target.dataset.p;
  if (i != null) addRule({n: 3, t: '', b: 'p', ...PRE[i][1]});
};

$('add').onclick = () => addRule(formRule());
$('rl').onclick = e => {
  const i = e.target.dataset.i;
  if (i != null) {
    rules.splice(+i, 1);
    changed();
  }
};
$('bd').onclick = e => {
  const s = e.target.closest('.sq');
  if (s) click(+s.dataset.r, +s.dataset.c);
};
$('un').onclick = () => {
  if (busy || !hist.length) return;
  if (recordedGid === gid) {
    revertGame(gid);
    recordedGid = -1;
    lastDelta = 0;
    updateRatingUI();
  }
  do {
    S = JSON.parse(hist.pop());
    if (S.rl) rules = S.rl;
  } while (!two && hist.length && S.turn != human);
  S.rl = null;
  sel = null;
  legal = [];
  endDismissed = false;
  if (!S.over && S.turn != human) think();
  else render();
};
$('nw').onclick = () => init();
$('mn').onclick = () => goHome();
$('rs').onclick = () => resign();
$('again').onclick = () => online ? goHome() : init();
$('cont').onclick = () => {
  endDismissed = true;
  render();
};

document.querySelectorAll('.seg').forEach(g => g.onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x == b));
});

const snapElo = () => {
  const v = roundElo(+$('lvl').value);
  $('lvl').value = v;
  $('lvlOut').textContent = eloText(v);
  return v;
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


document.querySelector('aside').addEventListener('change', lab);
document.querySelector('aside').addEventListener('input', lab);

$('cs').onchange = cform;
$('cgo').onclick = () => curse(curseRule());
