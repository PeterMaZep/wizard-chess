const $p = id => document.getElementById(id);

function openProfile() {
  $p('profilePanel').classList.remove('hid');
}

function closeProfile() {
  $p('profilePanel').classList.add('hid');
}

window.openProfile = openProfile;
$p('profileBtn').onclick = openProfile;
$p('profileClose').onclick = closeProfile;
$p('profilePanel').addEventListener('click', e => {
  if (e.target.id == 'profilePanel') closeProfile();
});

async function attempt(action) {
  $p('pMsg').textContent = '';
  try {
    await action();
  } catch (e) {
    $p('pMsg').textContent = window.account ? window.account.friendly(e) : e.message;
  }
}

$p('pLogin').onclick = () => attempt(() => window.account.logIn($p('pEmail').value, $p('pPass').value));
$p('pSignup').onclick = () => attempt(() => window.account.signUp($p('pEmail').value, $p('pPass').value));
$p('pGoogle').onclick = () => attempt(() => window.account.googleSignIn());
$p('pConnectGoogle').onclick = () => attempt(() => window.account.connectGoogle());
$p('pSetPw').onclick = () => {
  const a = $p('pNew').value, b = $p('pNew2').value;
  if (a !== b) return $p('pMsg').textContent = 'The passwords do not match.';
  attempt(() => window.account.setPassword(a));
};
$p('pLogout').onclick = () => attempt(() => window.account.logOut());

function renderProfile(s) {
  $p('profileOut').classList.toggle('hid', !!s);
  $p('profileIn').classList.toggle('hid', !s);
  if (!s) return;
  $p('pWhoEmail').textContent = s.email;
  const providers = [s.hasPassword ? 'Email' : null, s.hasGoogle ? 'Google' : null].filter(Boolean);
  $p('pProviders').textContent = providers.length ? providers.join(', ') : 'none';
  $p('pSetpwBox').classList.toggle('hid', s.hasPassword);
  $p('pConnectGoogle').classList.toggle('hid', s.hasGoogle);
}

window.addEventListener('account-state', e => renderProfile(e.detail));
