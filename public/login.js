const API_BASE = (window.location.port === '3000' || window.location.port === '') ? '' : 'http://localhost:3000';

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const erroEl = document.getElementById('erro-login');

  const res = await fetch(API_BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
