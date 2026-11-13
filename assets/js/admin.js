(() => {
  if (window.__ADMIN_LOADED__) { console.log('[admin] already loaded'); return; }
  window.__ADMIN_LOADED__ = true;

  const ADMIN_EMAILS = ["mazepeng2013@gmail.com"];

  function email() {
    if (window.__USER__?.email) return window.__USER__.email;
    if (window.__user?.email) return window.__user.email;
    for (const k of ["email", "user:email", "auth.email", "user"]) {
      for (const store of [localStorage, sessionStorage]) {
        const v = store.getItem(k);
        if (!v) continue;
        try { const j = JSON.parse(v); if (j?.email) return j.email; } catch {}
        if (v.includes("@")) return v;
      }
    }
    return null;
  }
  const isAdmin = () => !!email() && ADMIN_EMAILS.includes(String(email()).toLowerCase());

  const _sq = s => {
    const m = /^([a-h])([1-8])$/i.exec(s);
    if (!m) throw new Error("bad square: " + s);
    return { r: 8 - +m[2], c: m[1].toLowerCase().charCodeAt(0) - 97 };
  };
  const _pt = { p:'p',pawn:'p', r:'r',rook:'r', n:'n',knight:'n',
                b:'b',bishop:'b', q:'q',queen:'q', k:'k',king:'k' };

  const ADMIN = {
    help: () => { console.log("admin('cmd', ...args):"); console.table(Object.keys(ADMIN)); },

    diag: () => {
      const checks = { S:()=>S, rules:()=>rules, render:()=>render, human:()=>human,
                       two:()=>two, opp:()=>opp, init:()=>init, busy:()=>busy,
                       sel:()=>sel, legal:()=>legal };
      const out = {};
      for (const [n,f] of Object.entries(checks)) {
        try { out[n] = typeof f(); } catch { out[n] = 'MISSING'; }
      }
      console.table(out);
    },

    // board
    spawn:  (t, sq) => { const {r,c}=_sq(sq); S.b[r][c] = {t:_pt[String(t).toLowerCase()]||t, c:human};     render(); },
    spawnb: (t, sq) => { const {r,c}=_sq(sq); S.b[r][c] = {t:_pt[String(t).toLowerCase()]||t, c:opp(human)}; render(); },
    kill:   (sq)    => { const {r,c}=_sq(sq); S.b[r][c] = null; render(); },
    clear:  ()      => { S.b = Array.from({length:8},()=>Array(8).fill(null)); render(); },
    reset:  ()      => init(),
    force:  (from,to) => { const f=_sq(from), t=_sq(to), p=S.b[f.r][f.c];
                           if(!p) throw new Error("no piece on "+from);
                           S.b[t.r][t.c]=p; S.b[f.r][f.c]=null; render(); },

    // spells / hexes
    hexclear: () => { rules = []; render(); },
    hex:   (k,a,b,n) => { rules.push({k, side:human, cu:true,  a:a||"p", b:b||"p", n:+n||1, t:""}); render(); },
    spell: (k,a,b,n) => { rules.push({k, side:human, cu:false, a:a||"p", b:b||"p", n:+n||1, t:""}); render(); },
    ruleslist: () => console.table(rules),

    // mana
    mana:    n => { S.pts[human] = +n; render(); },
    emana:   n => { S.pts[opp(human)] = +n; render(); },
    maxmana: () => { S.pts[human] = S.pts[opp(human)] = 99; render(); },

    // state
    turn: c => { S.turn = c || opp(S.turn); render(); },
    free: () => { busy = false; render(); },
    swap: () => { human = opp(human); render(); },
    unfreeze: () => { S.turn = human; busy = false; render(); },

    // outcome
    win:  () => { S.over = "Admin wins.";           render(); },
    lose: () => { S.over = "Admin loses.";          render(); },
    draw: () => { S.over = "Admin declares a draw."; render(); },
  };

  window.admin = (line, ...rest) => {
    if (!isAdmin()) {
      console.warn("🔒 admin only. run adminWhoami() to check email detection.");
      return;
    }
    const parts = typeof line === "string" ? line.trim().split(/\s+/) : [line, ...rest];
    const [cmd, ...args] = parts;
    if (!ADMIN[cmd]) return console.warn("unknown:", cmd, "— try admin('help')");
    try { ADMIN[cmd](...args); } catch (e) { console.error("admin:", e.message); }
  };

  window.adminWhoami = () => ({ email: email(), isAdmin: isAdmin() });

  console.log("[admin] loaded. try admin('help')");
})();