// ---- Suporte IA - Widget de Chat ----

(function () {
  'use strict';

  const historico = []; // { role: 'user'|'assistant', content: string }

  function toggleChat() {
    const panel  = document.getElementById('ai-chat-panel');
    const btn    = document.getElementById('ai-chat-btn');
    const iconOpen  = document.getElementById('ai-chat-icon-open');
    const iconClose = document.getElementById('ai-chat-icon-close');
    const aberto = panel.classList.toggle('aberto');
    btn.setAttribute('aria-expanded', String(aberto));
    iconOpen.style.display  = aberto ? 'none' : '';
    iconClose.style.display = aberto ? ''     : 'none';
    if (aberto) {
      // Mensagem inicial se vazio
      if (historico.length === 0) {
        adicionarMensagem('assistant', 'Olá! 👋 Sou o assistente do Almoxarifado. Como posso te ajudar?');
      }
      setTimeout(() => {
        document.getElementById('ai-chat-input').focus();
        rolarParaBaixo();
      }, 80);
    }
  }

  function adicionarMensagem(role, texto) {
    const lista = document.getElementById('ai-chat-messages');
    const div   = document.createElement('div');
    div.className = 'ai-msg ai-msg--' + role;
    div.textContent = texto;
    lista.appendChild(div);
    rolarParaBaixo();
  }

  function rolarParaBaixo() {
    const lista = document.getElementById('ai-chat-messages');
    lista.scrollTop = lista.scrollHeight;
  }

  function setLoading(ativo) {
    let el = document.getElementById('ai-chat-loading');
    if (ativo) {
      if (el) return;
      el = document.createElement('div');
      el.id = 'ai-chat-loading';
      el.className = 'ai-msg ai-msg--assistant ai-msg--loading';
      el.innerHTML = '<span></span><span></span><span></span>';
      document.getElementById('ai-chat-messages').appendChild(el);
      rolarParaBaixo();
    } else {
      if (el) el.remove();
    }
  }

  async function enviarMensagem() {
    const input = document.getElementById('ai-chat-input');
    const texto = input.value.trim();
    if (!texto) return;

    input.value = '';
    input.disabled = true;
    document.getElementById('ai-chat-send').disabled = true;

    adicionarMensagem('user', texto);
    historico.push({ role: 'user', content: texto });
    setLoading(true);

    try {
      const res = await fetch(window.API_BASE + '/api/suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mensagens: historico })
      });

      setLoading(false);
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Erro ao contatar o assistente.';
        adicionarMensagem('assistant', '⚠️ ' + errMsg);
      } else {
        adicionarMensagem('assistant', data.resposta);
        historico.push({ role: 'assistant', content: data.resposta });
      }
    } catch (err) {
      setLoading(false);
      adicionarMensagem('assistant', '⚠️ Não foi possível conectar ao assistente. Verifique sua conexão.');
    } finally {
      input.disabled = false;
      document.getElementById('ai-chat-send').disabled = false;
      input.focus();
    }
  }

  // Expõe funções globalmente para os onclick do HTML
  window.toggleChat    = toggleChat;
  window.enviarMensagem = enviarMensagem;

  // Permite enviar com Enter
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          enviarMensagem();
        }
      });
    }
  });
})();
