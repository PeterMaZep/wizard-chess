(() => {
  if (window.__ADMIN_LOADED__) { console.log('[admin] already loaded'); return; }
  window.__ADMIN_LOADED__ = true;

  const ADMIN_EMAILS = ["mazepeng2013@gmail.com"];
  const ADMIN_UIDS   = []; // optional: paste your Firebase uid here

  let _adminUser = null;
  const _adminReady = (async () => {
    try {
      if (!window.fb) {
        await new Promise(res => {
          if (window.fb) return res();
          addEventListener('fb-ready', res, {once: true});
          setTimeout(res, 4000);
        });
      }
      if (!window.fb) return;
      await window.fb.auth.authStateReady();
      _adminUser = window.fb.auth.currentUser || null;
    } catch (e) { console.warn('[admin] firebase probe failed', e); }
  })();

  function adminIdentity() {
    if (window.__FORCE_ADMIN__) return {email: window.__FORCE_ADMIN__};
    if (_adminUser) return {email: _adminUser.email, uid: _adminUser.uid, name: _adminUser.displayName};
    return {email: null};
  }
  const isAdmin = () => {
    if (window.__ADMIN__ === true) return true;
    const id = adminIdentity();
    if (id.email && ADMIN_EMAILS.includes(String(id.email).toLowerCase())) return true;
    if (id.uid   && ADMIN_UIDS.includes(id.uid))                          return true;
    return false;
  };

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
                       two:()=>two, opp:()=>opp, init:()=>init, busy:()=>busy };
      const out = {};
      for (const [n,f] of Object.entries(checks)) {
        try { out[n] = typeof f(); } catch { out[n] = 'MISSING'; }
      }
      console.table(out);
    },

    // ---- board ----
    spawn:  (t, sq) => { const {r,c}=_sq(sq); S.b[r][c] = {t:_pt[String(t).toLowerCase()]||t, c:human};     render(); },
    spawnb: (t, sq) => { const {r,c}=_sq(sq); S.b[r][c] = {t:_pt[String(t).toLowerCase()]||t, c:opp(human)}; render(); },
    kill:   (sq)    => { const {r,c}=_sq(sq); S.b[r][c] = null; render(); },
    clear:  ()      => { S.b = Array.from({length:8},()=>Array(8).fill(null)); render(); },
    reset:  ()      => init(),
    force:  (from,to) => { const f=_sq(from), t=_sq(to), p=S.b[f.r][f.c];
                           if(!p) throw new Error("no piece on "+from);
                           S.b[t.r][t.c]=p; S.b[f.r][f.c]=null; render(); },

    // ---- spells / hexes ----
    hexclear: () => { rules = []; render(); },
    
    // Clears MY hexes (cast by me, targeting opponent)
    clearhex: () => { 
      rules = rules.filter(r => !(r.cu === true && r.side === opp(human))); 
      render(); 
    },
    
    // Clears THEIR hexes (cast by opponent, targeting me)
    clearhexb: () => { 
      rules = rules.filter(r => !(r.cu === true && r.side === human)); 
      render(); 
    },
    
    // Clears THEIR spells
    clearspells: () => { 
      rules = rules.filter(r => !(r.cu !== true && r.side === opp(human))); 
      render(); 
    },
    
    // Clears MY spells
    clearspellsb: () => { 
      rules = rules.filter(r => !(r.cu !== true && r.side === human)); 
      render(); 
    },

    // Clears THEIR latest spell
    clearlastspell: () => {
      const idx = rules.findLastIndex(r => r.cu !== true && r.side === opp(human));
      if (idx !== -1) rules.splice(idx, 1);
      render();
    },

    // Clears MY latest spell
    clearlastspellb: () => {
      const idx = rules.findLastIndex(r => r.cu !== true && r.side === human);
      if (idx !== -1) rules.splice(idx, 1);
      render();
    },

    // Hexes all their pieces with freeze
    freezehex: () => {
      ['p', 'r', 'n', 'b', 'q', 'k'].forEach(t => {
        rules.push({k: 'freeze', side: opp(human), cu: true, a: t, b: 'p', n: 1, t: ""});
      });
      render();
    },

    hex:   (k,a,b,n) => { rules.push({k, side:human, cu:true,  a:a||"p", b:b||"p", n:+n||1, t:""}); render(); },
    spell: (k,a,b,n) => { rules.push({k, side:human, cu:false, a:a||"p", b:b||"p", n:+n||1, t:""}); render(); },
    ruleslist: () => console.table(rules),

    // ---- mana ----
    mana:    n => { S.pts[human] = +n; render(); },
    emana:   n => { S.pts[opp(human)] = +n; render(); },
    maxmana: () => { S.pts[human] = S.pts[opp(human)] = 99; render(); },

    // ---- state ----
    turn: c => { S.turn = c || opp(S.turn); render(); },
    free: () => { busy = false; render(); },
    swap: () => { human = opp(human); render(); },
    unfreeze: () => { S.turn = human; busy = false; render(); },

    // ---- outcome ----
    win:  () => { S.over = "Admin wins.";           render(); },
    lose: () => { S.over = "Admin loses.";          render(); },
    draw: () => { S.over = "Admin declares a draw."; render(); },
  };

  window.admin = async (line, ...rest) => {
    if (!isAdmin()) await _adminReady;
    if (!isAdmin()) return console.warn("🔒 admin only — run adminWhoami() to check");
    const parts = [line, ...rest].join(' ').trim().split(/\s+/);
    const [cmd, ...args] = parts;
    if (!ADMIN[cmd]) return console.warn("unknown:", cmd, "— try admin('help')");
    try { ADMIN[cmd](...args); } catch (e) { console.error("admin:", e.message); }
  };

  window.adminWhoami = async () => {
    await _adminReady;
    const id = adminIdentity();
    return { email: id.email, uid: id.uid, signedIn: !!_adminUser, isAdmin: isAdmin() };
  };

  console.log("[admin] loaded. try admin('help')");
})();