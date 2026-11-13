const ADMIN_EMAILS = ["mazepeng2013@gmail.com"];
const ADMIN_UIDS   = []; // optional: paste your Firebase uid for a stronger pin

let _adminUser = null;

const _adminReady = (async () => {
  try {
    if (!window.fb) {
      await new Promise(res => {
        if (window.fb) return res();
        addEventListener('fb-ready', res, {once: true});
        setTimeout(res, 4000); // don't hang forever if fb never loads
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

window.admin = async (line, ...rest) => {
  await _adminReady;
  if (!isAdmin()) return console.warn("🔒 admin only — run adminWhoami() to check");
  const parts = typeof line === "string" ? line.trim().split(/\s+/) : [line, ...rest];
  const [cmd, ...args] = parts;
  if (!ADMIN[cmd]) return console.warn("unknown:", cmd, "— try admin('help')");
  try { ADMIN[cmd](...args); } catch (e) { console.error("admin:", e.message); }
};

window.adminWhoami = async () => {
  await _adminReady;
  const id = adminIdentity();
  return { email: id.email, uid: id.uid, signedIn: !!_adminUser, isAdmin: isAdmin() };
};