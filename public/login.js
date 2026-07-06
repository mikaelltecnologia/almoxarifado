document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const erroEl = document.getElementById('erro-login');

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = '/';
  } else {
    erroEl.textContent = data.erro;
    erroEl.style.display = 'block';
  }
});
