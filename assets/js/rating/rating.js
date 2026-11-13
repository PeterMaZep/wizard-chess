const RATING_KEY = 'wizard-chess-rating';
const RATING_START = 600;
const RATING_K = 32;

function loadRating() {
  try {
    const r = JSON.parse(localStorage.getItem(RATING_KEY));
    if (r && typeof r.elo == 'number' && Array.isArray(r.games)) return r;
  } catch (e) {}
  return {elo: RATING_START, games: []};
}

function saveRating() {
  try {
    localStorage.setItem(RATING_KEY, JSON.stringify(rating));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('account-push', {detail: rating}));
}

window.addEventListener('account-rating', e => {
  const d = e.detail;
  if (typeof d.elo == 'number') {
    rating = {elo: d.elo, games: Array.isArray(d.games) ? d.games : []};
    try {
      localStorage.setItem(RATING_KEY, JSON.stringify(rating));
    } catch (err) {}
    if (typeof updateRatingUI == 'function') updateRatingUI();
  } else {
    saveRating();
  }
});

let rating = loadRating();

function maxAllowedElo() {
  return rating.elo < 300 ? 350 : ELO_MAX;
}

function roundElo(v) {
  const s = Math.round(v / ELO_SNAP) * ELO_SNAP;
  return Math.min(maxAllowedElo(), Math.max(ELO_MIN, s));
}

function recommendedElo() {
  const last = rating.games.slice(-5);
  const avg = last.length ? last.reduce((s, g) => s + g.r, 0) / last.length : 0.5;
  return roundElo(rating.elo + Math.round((avg - 0.5) * 200));
}

function applyGame(result, botElo, g) {
  const before = rating.elo;
  const expected = 1 / (1 + Math.pow(10, (botElo - before) / 400));
  rating.elo = Math.max(0, Math.round(before + RATING_K * (result - expected)));
  rating.games.push({g, r: result, bot: botElo, before, after: rating.elo});
  if (rating.games.length > 200) rating.games.shift();
  saveRating();
  return rating.elo - before;
}

function revertGame(g) {
  const last = rating.games[rating.games.length - 1];
  if (last && last.g === g) {
    rating.elo = last.before;
    rating.games.pop();
    saveRating();
  }
}
