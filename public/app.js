// checa sessão e carrega dashboard inicial
fetch('/api/session').then(r => r.json()).then(d => {
  if (!d.user) window.location.href = '/login.html';
  else loadDashboard();
});

function logout() {
  fetch('/api/logout', { method: 'POST' }).then(() => window.location.href = '/login.html');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(tab).classList.add('active');
    loadTab(tab);
  };
});

async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) alert(data.error || 'Erro');
  return data;
}

function loadTab(tab) {
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'cadastros') loadCadastros();
  if (tab === 'movimentacao') loadMovimentacao();
  if (tab === 'ficha') loadFicha();
  if (tab === 'baixa') loadBaixa();
}

// util: alterna subabas dentro de um container
function ativarSubtab(containerId, subtabName) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
  container.querySelector(`.subtab-btn[data-subtab="${subtabName}"]`).classList.add('active');
  container.querySelector(`#${containerId}_${subtabName}`).classList.add('active');
}

// converte data ISO (yyyy-mm-dd) para exibição BR (dd/mm/yyyy)
function formatarDataBR(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- DASHBOARD ----------

async function loadDashboard() {
  const el = document.getElementById('dashboard');
  el.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;opacity:0.7">Carregando...</div>';
  try {
    const d = await fetch('/api/dashboard').then(r => r.json());
    if (d.error) throw new Error(d.error);

    const disp = d.equipamentos_disponiveis || [];
    const emp  = d.equipamentos_emprestados || [];
    const baixo = d.estoque_baixo || { epis: [], consumiveis: [], produtos: [] };

    el.innerHTML = `
      <div class="card">
        <h3>Equipamentos Disponíveis <span style="font-weight:600;opacity:0.85">(${disp.length})</span></h3>
        <div class="stat-bar"><div class="stat-count">${disp.length}</div></div>
        <div class="small-list">
          ${disp.slice(0,6).map(e => `<div>${e.tag} — ${e.nome}</div>`).join('') || '<div>Nenhum equipamento disponível</div>'}
        </div>
      </div>

      <div class="card">
        <h3>Equipamentos Não Devolvidos <span style="font-weight:600;opacity:0.85">(${emp.length})</span></h3>
        <div class="stat-bar"><div class="stat-count">${emp.length}</div></div>
        <div class="small-list">
          ${emp.slice(0,6).map(e => `<div>${e.equipamento_tag} — ${e.equipamento_nome} <span style="opacity:0.7">(${e.funcionario_nome})</span></div>`).join('') || '<div>Sem registros</div>'}
        </div>
      </div>

      <div class="card">
        <h3>Estoque Baixo</h3>
        <div class="small-list">
          <div><b>EPIs:</b> ${baixo.epis.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}</div>
          <div><b>Consumíveis:</b> ${baixo.consumiveis.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}</div>
          <div><b>Produtos:</b> ${baixo.produtos.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}</div>
        </div>
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1;color:#f87171">Erro ao carregar dashboard: ${err.message}</div>`;
  }
}


// ---------- CADASTROS ----------
function loadCadastros() {
  const el = document.getElementById('cadastros');
  el.innerHTML = `
    <div class="subtabs">
      <button class="subtab-btn active" data-subtab="funcionario" onclick="ativarSubtab('cadastros','funcionario')">Funcionário</button>
      <button class="subtab-btn" data-subtab="fornecedor" onclick="ativarSubtab('cadastros','fornecedor')">Fornecedor</button>
      <button class="subtab-btn" data-subtab="unidade" onclick="ativarSubtab('cadastros','unidade')">Unidade</button>
      <button class="subtab-btn" data-subtab="tipoferramenta" onclick="ativarSubtab('cadastros','tipoferramenta')">Tipo de Ferramenta</button>
      <button class="subtab-btn" data-subtab="equipamento" onclick="ativarSubtab('cadastros','equipamento')">Equipamento</button>
      <button class="subtab-btn" data-subtab="epi" onclick="ativarSubtab('cadastros','epi')">EPI</button>
      <button class="subtab-btn" data-subtab="consumivel" onclick="ativarSubtab('cadastros','consumivel')">Consumível</button>
      <button class="subtab-btn" data-subtab="produto" onclick="ativarSubtab('cadastros','produto')">Produto</button>
    </div>

    <div id="cadastros_funcionario" class="subtab-content active">
      <div class="card">
        <h3>Funcionário</h3>
        <input id="f_codigo" placeholder="Gerado automaticamente" disabled>
        <input id="f_nome" placeholder="Nome">
        <label>Data de Nascimento: <input id="f_nascimento" type="date"></label>
        <input id="f_cargo" placeholder="Cargo">
        <label>Data de Admissão: <input id="f_admissao" type="date"></label>
        <label>Data de Demissão: <input id="f_demissao" type="date"></label>
        <button class="action" onclick="salvarFuncionario()">Salvar</button>
      </div>
      <div class="card">
        <h3>Funcionários Cadastrados</h3>
        <div id="lista_funcionarios"></div>
      </div>
    </div>

    <div id="cadastros_fornecedor" class="subtab-content">
      <div class="card">
        <h3>Fornecedor</h3>
        <input id="fo_nome" placeholder="Nome">
        <input id="fo_contato" placeholder="Contato">
        <button class="action" onclick="salvarFornecedor()">Salvar</button>
      </div>
      <div class="card">
        <h3>Fornecedores Cadastrados</h3>
        <table>
          <tr><th>Nome</th><th>Contato</th><th></th></tr>
          <tbody id="lista-fornecedores"></tbody>
        </table>
      </div>
    </div>

    <div id="cadastros_tipoferramenta" class="subtab-content">
      <div class="card">
        <h3>Tipo de Ferramenta</h3>
        <input id="tf_nome" placeholder="Nome do tipo">
        <button class="action" onclick="salvarTipoFerramenta()">Salvar</button>
      </div>
      <div class="card">
        <h3>Tipos Cadastrados</h3>
        <div id="lista_tipos"></div>
      </div>
    </div>

    <div id="cadastros_equipamento" class="subtab-content">
      <div class="card">
        <h3>Equipamento</h3>
        <input id="eq_tag" placeholder="TAG (patrimônio)">
        <input id="eq_nome" placeholder="Nome">
        <select id="eq_tipo"></select>
        <select id="eq_fornecedor"></select>
        <button class="action" onclick="salvarEquipamento()">Salvar</button>
      </div>
    <div class="card">
        <h3>Equipamentos Cadastrados</h3>
        <div id="lista_equipamentos"></div>
      </div>
    </div>


    <div id="cadastros_epi" class="subtab-content">
      <div class="card">
        <h3>EPI</h3>
        <input id="ep_nome" placeholder="Nome">
        <input id="ep_estoque" placeholder="Estoque" type="number">
        <input id="ep_min" placeholder="Estoque mínimo" type="number">
        <label><input id="ep_retornavel" type="checkbox"> É retornável? (ex: capacete, bota, avental)</label>
        <button class="action" onclick="salvarEpi()">Salvar</button>
      </div>
      <div class="card">
        <h3>EPIs Cadastrados</h3>
        <div id="lista_epis"></div>
      </div>
    </div>

    <div id="cadastros_consumivel" class="subtab-content">
      <div class="card">
        <h3>Consumível</h3>
        <input id="co_nome" placeholder="Nome">
        <select id="co_unidade"></select>
        <input id="co_estoque" placeholder="Estoque" type="number">
        <input id="co_min" placeholder="Estoque mínimo" type="number">
        <button class="action" onclick="salvarConsumivel()">Salvar</button>
      </div>
      <div class="card">
        <h3>Consumíveis Cadastrados</h3>
        <div id="lista_consumiveis"></div>
      </div>
    </div>

<div id="cadastros_produto" class="subtab-content">
  <div class="card">
    <h3>Produto</h3>
    <input id="pr_nome" placeholder="Nome">
    <select id="pr_fornecedor"></select>
    <select id="pr_unidade"></select>
    <input id="pr_estoque" placeholder="Estoque" type="number">
    <input id="pr_min" placeholder="Estoque mínimo" type="number">
    <button class="action" onclick="salvarProduto()">Salvar</button>
  </div>
  <div class="card">
    <h3>Produtos Cadastrados</h3>
    <div id="lista_produtos"></div>
  </div>
</div>

<div id="cadastros_unidade" class="subtab-content">
  <div class="card">
    <h3>Unidade de Medida</h3>
    <input id="un_nome" placeholder="Nome (ex: Quilograma)">
    <input id="un_sigla" placeholder="Sigla (ex: kg)">
    <button class="action" onclick="salvarUnidade()">Salvar</button>
  </div>
  <div class="card">
    <h3>Unidades Cadastradas</h3>
    <div id="lista_unidades"></div>
  </div>
</div>

  `;
  preencherSelects();
  carregarListaFuncionarios();
  carregarFornecedores();
  carregarListaTipos();
  carregarListaEquipamentos();
  carregarListaEpis();
  carregarListaConsumiveis();
  carregarListaProdutos();
  carregarListaUnidades();
}

async function preencherSelects() {
  const tf = await api('/api/tipos-ferramentas');
  document.getElementById('eq_tipo').innerHTML = tf.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  const fo = await api('/api/fornecedores');
  document.getElementById('pr_fornecedor').innerHTML = fo.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  document.getElementById('eq_fornecedor').innerHTML = '<option value="">Sem fornecedor</option>' +
    fo.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

  const un = await api('/api/unidades');
  const opcoesUnidade = '<option value="">Sem unidade</option>' +
    un.map(u => `<option value="${u.id}">${u.nome} (${u.sigla})</option>`).join('');
  document.getElementById('co_unidade').innerHTML = opcoesUnidade;
  document.getElementById('pr_unidade').innerHTML = opcoesUnidade;
}


// ---- Funcionário ----
let editandoFuncionario = null;

async function salvarFuncionario() {
  const dados = {
    nome: document.getElementById('f_nome').value,
    data_nascimento: document.getElementById('f_nascimento').value,
    cargo: document.getElementById('f_cargo').value,
    data_admissao: document.getElementById('f_admissao').value,
    data_demissao: document.getElementById('f_demissao').value
  };

  if (editandoFuncionario) {
    await api('/api/funcionarios/' + editandoFuncionario, 'PUT', dados);
    editandoFuncionario = null;
    document.querySelector('#cadastros_funcionario button.action').textContent = 'Salvar';
  } else {
    await api('/api/funcionarios', 'POST', dados);
  }

  ['f_nome','f_cargo','f_nascimento','f_admissao','f_demissao'].forEach(id => document.getElementById(id).value = '');
  alert('Salvo com sucesso');
  carregarListaFuncionarios();
}

function editarFuncionario(f) {
  editandoFuncionario = f.codigo;
  document.getElementById('f_nome').value = f.nome;
  document.getElementById('f_cargo').value = f.cargo || '';
  document.getElementById('f_nascimento').value = f.data_nascimento || '';
  document.getElementById('f_admissao').value = f.data_admissao || '';
  document.getElementById('f_demissao').value = f.data_demissao || '';
  document.querySelector('#cadastros_funcionario button.action').textContent = 'Atualizar';
  document.getElementById('f_nome').scrollIntoView({ behavior: 'smooth' });
}

async function carregarListaFuncionarios() {
  const lista = await api('/api/funcionarios');
  document.getElementById('lista_funcionarios').innerHTML = `
    <table>
      <tr><th>Código</th><th>Nome</th><th>Cargo</th><th>Admissão</th><th>Demissão</th><th></th></tr>
      ${lista.map(f => `<tr>
        <td>${f.codigo}</td><td>${f.nome}</td><td>${f.cargo || '-'}</td>
        <td>${formatarDataBR(f.data_admissao)}</td><td>${formatarDataBR(f.data_demissao)}</td>
        <td>
          <button class="action" onclick='editarFuncionario(${JSON.stringify(f)})'>Editar</button>
          <button class="action" style="background:#c0392b" onclick="excluirFuncionario('${f.codigo}')">Excluir</button>
        </td>
      </tr>`).join('')}
    </table>`;
}


async function excluirFuncionario(codigo) {
  if (!confirm('Confirma exclusão do funcionário ' + codigo + '?')) return;
  const res = await api('/api/funcionarios/' + codigo, 'DELETE');
  if (res.ok) carregarListaFuncionarios();
}

// ---- Fornecedor ----
let editandoFornecedor = null;

async function salvarFornecedor() {
  const dados = {
    nome: document.getElementById('fo_nome').value,
    contato: document.getElementById('fo_contato').value
  };
  if (editandoFornecedor) {
    await api('/api/fornecedores/' + editandoFornecedor, 'PUT', dados);
    editandoFornecedor = null;
    document.querySelector('#cadastros_fornecedor button.action').textContent = 'Salvar';
  } else {
    await api('/api/fornecedores', 'POST', dados);
  }
  document.getElementById('fo_nome').value = '';
  document.getElementById('fo_contato').value = '';
  alert('Salvo com sucesso');
  preencherSelects();
  carregarFornecedores();
}

function editarFornecedor(id, nome, contato) {
  editandoFornecedor = id;
  document.getElementById('fo_nome').value = nome;
  document.getElementById('fo_contato').value = contato || '';
  document.querySelector('#cadastros_fornecedor button.action').textContent = 'Atualizar';
}

async function carregarFornecedores() {
  const res = await fetch('/api/fornecedores');
  const fornecedores = await res.json();
  const tbody = document.getElementById('lista-fornecedores');
  tbody.innerHTML = '';

  fornecedores.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.nome}</td>
      <td>${f.contato || '-'}</td>
      <td>
        <button class="btn-editar" data-id="${f.id}" data-nome="${f.nome}" data-contato="${f.contato || ''}">Editar</button>
        <button class="btn-excluir" data-id="${f.id}">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => editarFornecedor(btn.dataset.id, btn.dataset.nome, btn.dataset.contato));
  });
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', () => excluirFornecedor(btn.dataset.id));
  });
}


async function excluirFornecedor(id) {
  if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

  const res = await fetch(`/api/fornecedores/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Erro ao excluir fornecedor');
    return;
  }

  carregarFornecedores();
}

// ---- Tipo de Ferramenta ----
let editandoTipo = null;

async function salvarTipoFerramenta() {
  const dados = { nome: document.getElementById('tf_nome').value };
  if (editandoTipo) {
    await api('/api/tipos-ferramentas/' + editandoTipo, 'PUT', dados);
    editandoTipo = null;
    document.querySelector('#cadastros_tipoferramenta button.action').textContent = 'Salvar';
  } else {
    await api('/api/tipos-ferramentas', 'POST', dados);
  }
  document.getElementById('tf_nome').value = '';
  alert('Salvo com sucesso');
  preencherSelects();
  carregarListaTipos();
}

function editarTipoFerramenta(id, nome) {
  editandoTipo = id;
  document.getElementById('tf_nome').value = nome;
  document.querySelector('#cadastros_tipoferramenta button.action').textContent = 'Atualizar';
}

async function carregarListaTipos() {
  const lista = await api('/api/tipos-ferramentas');
  document.getElementById('lista_tipos').innerHTML = `
    <table><tr><th>Nome</th><th></th></tr>
    ${lista.map(t => `<tr>
      <td>${t.nome}</td>
      <td>
        <button class="action" onclick="editarTipoFerramenta(${t.id}, '${t.nome.replace(/'/g,"\\'")}')">Editar</button>
        <button class="action" style="background:#c0392b" onclick="excluirTipoFerramenta(${t.id})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}


async function excluirTipoFerramenta(id) {
  if (!confirm('Excluir tipo de ferramenta?')) return;
  const res = await api('/api/tipos-ferramentas/' + id, 'DELETE');
  if (res.ok) { carregarListaTipos(); preencherSelects(); }
}

// ---- Unidade de Medida ----
let editandoUnidade = null;

async function salvarUnidade() {
  const dados = {
    nome: document.getElementById('un_nome').value,
    sigla: document.getElementById('un_sigla').value
  };
  if (editandoUnidade) {
    await api('/api/unidades/' + editandoUnidade, 'PUT', dados);
    editandoUnidade = null;
    document.querySelector('#cadastros_unidade button.action').textContent = 'Salvar';
  } else {
    await api('/api/unidades', 'POST', dados);
  }
  document.getElementById('un_nome').value = '';
  document.getElementById('un_sigla').value = '';
  alert('Salvo com sucesso');
  preencherSelects();
  carregarListaUnidades();
}

function editarUnidade(u) {
  editandoUnidade = u.id;
  document.getElementById('un_nome').value = u.nome;
  document.getElementById('un_sigla').value = u.sigla;
  document.querySelector('#cadastros_unidade button.action').textContent = 'Atualizar';
}

async function carregarListaUnidades() {
  const lista = await api('/api/unidades');
  document.getElementById('lista_unidades').innerHTML = `
    <table><tr><th>Nome</th><th>Sigla</th><th></th></tr>
    ${lista.map(u => `<tr>
      <td>${u.nome}</td><td>${u.sigla}</td>
      <td>
        <button class="action" onclick='editarUnidade(${JSON.stringify(u)})'>Editar</button>
        <button class="action" style="background:#c0392b" onclick="excluirUnidade(${u.id})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}


async function excluirUnidade(id) {
  if (!confirm('Excluir unidade?')) return;
  const res = await api('/api/unidades/' + id, 'DELETE');
  if (res.ok) { carregarListaUnidades(); preencherSelects(); }
}

// ---- Equipamento ----

let editandoEquipamento = null;

async function salvarEquipamento() {
  const dados = {
    tag: document.getElementById('eq_tag').value,
    nome: document.getElementById('eq_nome').value,
    tipo_id: document.getElementById('eq_tipo').value,
    fornecedor_id: document.getElementById('eq_fornecedor').value || null
  };
  if (editandoEquipamento) {
    await api('/api/equipamentos/' + editandoEquipamento, 'PUT', dados);
    editandoEquipamento = null;
    document.getElementById('eq_tag').disabled = false;
    document.querySelector('#cadastros_equipamento button.action').textContent = 'Salvar';
  } else {
    await api('/api/equipamentos', 'POST', dados);
  }
  document.getElementById('eq_tag').value = '';
  document.getElementById('eq_nome').value = '';
  document.getElementById('eq_fornecedor').value = '';
  alert('Salvo com sucesso');
  carregarListaEquipamentos();
}

function editarEquipamento(eq) {
  editandoEquipamento = eq.tag;
  document.getElementById('eq_tag').value = eq.tag;
  document.getElementById('eq_tag').disabled = true; // tag travada
  document.getElementById('eq_nome').value = eq.nome;
  document.getElementById('eq_tipo').value = eq.tipo_id || '';
  document.getElementById('eq_fornecedor').value = eq.fornecedor_id || '';
  document.querySelector('#cadastros_equipamento button.action').textContent = 'Atualizar';
}

async function carregarListaEquipamentos() {
  const lista = await api('/api/equipamentos');
  document.getElementById('lista_equipamentos').innerHTML = `
    <table><tr><th>Tag</th><th>Nome</th><th>Tipo</th><th>Fornecedor</th><th>Status</th><th></th></tr>
    ${lista.map(e => {
      const baixado = e.status === 'baixado';
      const estiloLinha = baixado ? 'style="opacity:0.5;text-decoration:line-through;background:#f5f5f5;"' : '';
      const badge = baixado
        ? '<span style="background:#c0392b;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">BAIXADO</span>'
        : (e.status === 'emprestado'
            ? '<span style="background:#e67e22;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">EMPRESTADO</span>'
            : '<span style="background:#27ae60;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">DISPONÍVEL</span>');

      return `<tr ${estiloLinha}>
        <td>${e.tag}</td><td>${e.nome}</td><td>${e.tipo_nome || '-'}</td><td>${e.fornecedor_nome || '-'}</td>
        <td>${badge}</td>
        <td>
          ${baixado ? '' : `<button class="action" onclick='editarEquipamento(${JSON.stringify(e)})'>Editar</button>`}
          <button class="action" style="background:#c0392b" onclick="excluirEquipamento('${e.tag}')">Excluir</button>
        </td>
      </tr>`;
    }).join('')}
    </table>`;
}


//--------- Excluir equipamento ----------

async function excluirEquipamento(tag) {
  if (!confirm('Excluir equipamento ' + tag + '?')) return;
  const res = await api('/api/equipamentos/' + tag, 'DELETE');
  if (res.ok) carregarListaEquipamentos();
}

// ---- EPI ----
let editandoEpi = null;

async function salvarEpi() {
  const dados = {
    nome: document.getElementById('ep_nome').value,
    estoque_minimo: Number(document.getElementById('ep_min').value),
    retornavel: document.getElementById('ep_retornavel').checked
  };
  if (editandoEpi) {
    await api('/api/epis/' + editandoEpi, 'PUT', dados);
    editandoEpi = null;
    document.getElementById('ep_estoque').disabled = false;
    document.querySelector('#cadastros_epi button.action').textContent = 'Salvar';
  } else {
    dados.estoque = Number(document.getElementById('ep_estoque').value);
    await api('/api/epis', 'POST', dados);
  }
  document.getElementById('ep_nome').value = '';
  document.getElementById('ep_estoque').value = '';
  document.getElementById('ep_min').value = '';
  document.getElementById('ep_retornavel').checked = false;
  alert('Salvo com sucesso');
  carregarListaEpis();
}

function editarEpi(e) {
  editandoEpi = e.codigo;
  document.getElementById('ep_nome').value = e.nome;
  document.getElementById('ep_estoque').value = e.estoque;
  document.getElementById('ep_estoque').disabled = true; // estoque travado
  document.getElementById('ep_min').value = e.estoque_minimo;
  document.getElementById('ep_retornavel').checked = !!e.retornavel;
  document.querySelector('#cadastros_epi button.action').textContent = 'Atualizar';
}

async function carregarListaEpis() {
  const lista = await api('/api/epis');
  document.getElementById('lista_epis').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Retornável</th><th>Estoque</th><th>Status</th><th></th></tr>
    ${lista.map(e => {
      const baixado = e.estoque === 0;
      const estiloLinha = baixado ? 'style="opacity:0.5;text-decoration:line-through;background:#f5f5f5;"' : '';
      const badge = baixado
        ? '<span style="background:#c0392b;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">BAIXADO</span>'
        : '<span style="background:#27ae60;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">DISPONÍVEL</span>';

      return `<tr ${estiloLinha}>
        <td>${e.codigo}</td><td>${e.nome}</td><td>${e.retornavel ? 'Sim' : 'Não'}</td><td>${e.estoque}</td>
        <td>${badge}</td>
        <td>
          ${baixado ? '' : `<button class="action" onclick='editarEpi(${JSON.stringify(e)})'>Editar</button>`}
          <button class="action" style="background:#c0392b" onclick="excluirEpi('${e.codigo}')">Excluir</button>
        </td>
      </tr>`;
    }).join('')}
    </table>`;
}


// -------- Excluir EPI ----------

async function excluirEpi(codigo) {
  if (!confirm('Excluir EPI ' + codigo + '?')) return;
  const res = await api('/api/epis/' + codigo, 'DELETE');
  if (res.ok) carregarListaEpis();
}

// ---- Consumível ----
let editandoConsumivel = null;

async function salvarConsumivel() {
  const dados = {
    nome: document.getElementById('co_nome').value,
    unidade_id: document.getElementById('co_unidade').value || null,
    estoque_minimo: Number(document.getElementById('co_min').value)
  };
  if (editandoConsumivel) {
    await api('/api/consumiveis/' + editandoConsumivel, 'PUT', dados);
    editandoConsumivel = null;
    document.getElementById('co_estoque').disabled = false;
    document.querySelector('#cadastros_consumivel button.action').textContent = 'Salvar';
  } else {
    dados.estoque = Number(document.getElementById('co_estoque').value);
    await api('/api/consumiveis', 'POST', dados);
  }
  document.getElementById('co_nome').value = '';
  document.getElementById('co_estoque').value = '';
  document.getElementById('co_min').value = '';
  alert('Salvo com sucesso');
  carregarListaConsumiveis();
}

function editarConsumivel(c) {
  editandoConsumivel = c.codigo;
  document.getElementById('co_nome').value = c.nome;
  document.getElementById('co_unidade').value = c.unidade_id || '';
  document.getElementById('co_estoque').value = c.estoque;
  document.getElementById('co_estoque').disabled = true; // estoque travado
  document.getElementById('co_min').value = c.estoque_minimo;
  document.querySelector('#cadastros_consumivel button.action').textContent = 'Atualizar';
}

async function carregarListaConsumiveis() {
  const lista = await api('/api/consumiveis');
  document.getElementById('lista_consumiveis').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Estoque</th><th>Status</th><th></th></tr>
    ${lista.map(c => {
      const baixado = c.estoque === 0;
      const estiloLinha = baixado ? 'style="opacity:0.5;text-decoration:line-through;background:#f5f5f5;"' : '';
      const badge = baixado
        ? '<span style="background:#c0392b;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">BAIXADO</span>'
        : '<span style="background:#27ae60;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">DISPONÍVEL</span>';

      return `<tr ${estiloLinha}>
        <td>${c.codigo}</td><td>${c.nome}</td><td>${c.estoque}</td>
        <td>${badge}</td>
        <td>
          ${baixado ? '' : `<button class="action" onclick='editarConsumivel(${JSON.stringify(c)})'>Editar</button>`}
          <button class="action" style="background:#c0392b" onclick="excluirConsumivel('${c.codigo}')">Excluir</button>
        </td>
      </tr>`;
    }).join('')}
    </table>`;
}


//------- Excluir Consumível ---------

async function excluirConsumivel(codigo) {
  if (!confirm('Excluir consumível ' + codigo + '?')) return;
  const res = await api('/api/consumiveis/' + codigo, 'DELETE');
  if (res.ok) carregarListaConsumiveis();
}

// ---- Produto ----
let editandoProduto = null;

async function salvarProduto() {
  const dados = {
    nome: document.getElementById('pr_nome').value,
    fornecedor_id: document.getElementById('pr_fornecedor').value,
    unidade_id: document.getElementById('pr_unidade').value || null,
    estoque_minimo: Number(document.getElementById('pr_min').value)
  };
  if (editandoProduto) {
    await api('/api/produtos/' + editandoProduto, 'PUT', dados);
    editandoProduto = null;
    document.getElementById('pr_estoque').disabled = false;
    document.querySelector('#cadastros_produto button.action').textContent = 'Salvar';
  } else {
    dados.estoque = Number(document.getElementById('pr_estoque').value);
    await api('/api/produtos', 'POST', dados);
  }
  document.getElementById('pr_nome').value = '';
  document.getElementById('pr_estoque').value = '';
  document.getElementById('pr_min').value = '';
  alert('Salvo com sucesso');
  carregarListaProdutos();
}

function editarProduto(p) {
  editandoProduto = p.codigo;
  document.getElementById('pr_nome').value = p.nome;
  document.getElementById('pr_fornecedor').value = p.fornecedor_id || '';
  document.getElementById('pr_unidade').value = p.unidade_id || '';
  document.getElementById('pr_estoque').value = p.estoque;
  document.getElementById('pr_estoque').disabled = true; // estoque travado
  document.getElementById('pr_min').value = p.estoque_minimo;
  document.querySelector('#cadastros_produto button.action').textContent = 'Atualizar';
}

async function carregarListaProdutos() {
  const lista = await api('/api/produtos');
  document.getElementById('lista_produtos').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Estoque</th><th>Status</th><th></th></tr>
    ${lista.map(p => {
      const baixado = p.estoque === 0;
      const estiloLinha = baixado ? 'style="opacity:0.5;text-decoration:line-through;background:#f5f5f5;"' : '';
      const badge = baixado
        ? '<span style="background:#c0392b;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">BAIXADO</span>'
        : '<span style="background:#27ae60;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">DISPONÍVEL</span>';

      return `<tr ${estiloLinha}>
        <td>${p.codigo}</td><td>${p.nome}</td><td>${p.estoque}</td>
        <td>${badge}</td>
        <td>
          ${baixado ? '' : `<button class="action" onclick='editarProduto(${JSON.stringify(p)})'>Editar</button>`}
          <button class="action" style="background:#c0392b" onclick="excluirProduto('${p.codigo}')">Excluir</button>
        </td>
      </tr>`;
    }).join('')}
    </table>`;
}


// -------- Excluir Produto ---------

async function excluirProduto(codigo) {
  if (!confirm('Excluir produto ' + codigo + '?')) return;
  const res = await api('/api/produtos/' + codigo, 'DELETE');
  if (res.ok) carregarListaProdutos();
}

// abre um modal simples pedindo a data de devolução (não permite data futura)

function pedirDataDevolucao() {
  return new Promise((resolve) => {
    const hoje = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;';

    overlay.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:8px;min-width:280px;">
        <h3 style="margin-top:0;">Data da Devolução</h3>
        <input type="date" id="modal_data_devolucao" max="${hoje}" value="${hoje}" style="width:100%;padding:8px;margin-bottom:12px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="modal_cancelar">Cancelar</button>
          <button id="modal_confirmar" class="action">Confirmar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#modal_data_devolucao');

    overlay.querySelector('#modal_cancelar').onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };

    overlay.querySelector('#modal_confirmar').onclick = () => {
      const valor = input.value;
      if (!valor) { alert('Selecione uma data'); return; }
      if (valor > hoje) { alert('Data não pode ser futura'); return; }
      document.body.removeChild(overlay);
      resolve(valor);
    };
  });
}


// ---------- CACHE DE FUNCIONÁRIOS ----------
let _funcionariosCache = null;
async function getFuncionarios(forcarReload = false) {
  if (!_funcionariosCache || forcarReload) _funcionariosCache = await api('/api/funcionarios');
  return _funcionariosCache;
}

// ---------- CACHE GENÉRICO DE ITENS (EPI, CONSUMÍVEL, PRODUTO) ----------
let _itensCache = {};
async function getItens(tipo, url, forcarReload = false) {
  if (!_itensCache[tipo] || forcarReload) _itensCache[tipo] = await api(url);
  return _itensCache[tipo];
}

// ---------- AUTOCOMPLETE GENÉRICO DE FUNCIONÁRIO ----------


function criarDropdown(input) {
  // evita duplicar wrapper se a função rodar de novo no mesmo input
  if (input.dataset.acWrapped) {
    return input.nextSibling;
  }
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const div = document.createElement('div');
  div.className = 'ac-dropdown';
  div.style.cssText = 'display:none;border:1px solid #ccc;background:#fff;max-height:160px;overflow:auto;position:absolute;left:0;top:100%;width:100%;z-index:100;box-shadow:0 2px 6px rgba(0,0,0,.15);';
  wrapper.appendChild(div);

  input.dataset.acWrapped = 'true';
  return div;
}


function renderDropdown(div, lista, onSelect) {
  if (!lista.length) { div.style.display = 'none'; div.innerHTML = ''; return; }
  div.style.display = 'block';
  div.innerHTML = lista.map(f =>
    `<div class="ac-item" data-codigo="${f.codigo}" style="padding:6px 10px;cursor:pointer;">${String(f.codigo).padStart(3,'0')} - ${f.nome}</div>`
  ).join('');
  div.querySelectorAll('.ac-item').forEach(item => {
    item.onmouseenter = () => item.style.background = '#eee';
    item.onmouseleave = () => item.style.background = '';
    item.onclick = () => { onSelect(item.dataset.codigo); div.style.display = 'none'; };
  });
}

// ---------- AUTOCOMPLETE GENÉRICO DE FUNCIONÁRIO ----------

async function setupFuncionarioAutocomplete(codigoId, nomeId) {
  const codigoInput = document.getElementById(codigoId);
  const nomeInput = document.getElementById(nomeId);
  if (!codigoInput || !nomeInput) return;

  codigoInput.removeAttribute('disabled');
  nomeInput.removeAttribute('disabled');
  codigoInput.setAttribute('autocomplete', 'nope');
  nomeInput.setAttribute('autocomplete', 'nope');

  const dropCodigo = criarDropdown(codigoInput);
  const dropNome = criarDropdown(nomeInput);
  const lista = await getFuncionarios(true); // <- força reload

  function selecionar(codigo) {
    const f = lista.find(x => String(x.codigo) === String(codigo));
    if (f) { codigoInput.value = f.codigo; nomeInput.value = f.nome; }
  }

  codigoInput.addEventListener('focus', () => renderDropdown(dropCodigo, lista, selecionar));
  codigoInput.addEventListener('input', () => {
    const termo = codigoInput.value.toLowerCase();
    renderDropdown(dropCodigo, lista.filter(f => String(f.codigo).includes(termo)), selecionar);
  });

  nomeInput.addEventListener('focus', () => renderDropdown(dropNome, lista, selecionar));
  nomeInput.addEventListener('input', () => {
    const termo = nomeInput.value.toLowerCase();
    renderDropdown(dropNome, lista.filter(f => f.nome.toLowerCase().includes(termo)), selecionar);
  });

  document.addEventListener('click', (e) => {
    if (!codigoInput.contains(e.target) && !dropCodigo.contains(e.target)) dropCodigo.style.display = 'none';
    if (!nomeInput.contains(e.target) && !dropNome.contains(e.target)) dropNome.style.display = 'none';
  });
}

// ---------- AUTOCOMPLETE GENÉRICO DE ITEM (EPI, CONSUMÍVEL, PRODUTO) ----------

async function setupItemAutocomplete(inputId, tipo, apiUrl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.setAttribute('autocomplete', 'nope');
  const drop = criarDropdown(input);
  const lista = await getItens(tipo, apiUrl, true); // <- força reload

  function selecionar(codigo) {
    input.value = codigo;
    drop.style.display = 'none';
  }

  input.addEventListener('focus', () => renderDropdown(drop, lista, selecionar));
  input.addEventListener('input', () => {
    const termo = input.value.toLowerCase();
    const filtrados = lista.filter(i =>
      String(i.codigo).includes(termo) || i.nome.toLowerCase().includes(termo)
    );
    renderDropdown(drop, filtrados, selecionar);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.style.display = 'none';
  });
}


// ---------- MOVIMENTAÇÃO ----------

function loadMovimentacao() {
  const el = document.getElementById('movimentacao');
  el.innerHTML = `
    <div class="subtabs">
      <button class="subtab-btn active" data-subtab="emprestimo" onclick="ativarSubtab('movimentacao','emprestimo')">Empréstimo de Equipamento</button>
      <button class="subtab-btn" data-subtab="epi" onclick="ativarSubtab('movimentacao','epi')">Retirada de EPI</button>
      <button class="subtab-btn" data-subtab="consumivel" onclick="ativarSubtab('movimentacao','consumivel')">Retirada de Consumível</button>
      <button class="subtab-btn" data-subtab="produto" onclick="ativarSubtab('movimentacao','produto')">Retirada de Produto</button>
    </div>

  <div id="movimentacao_emprestimo" class="subtab-content active">
  <div class="card">
    <h3>Empréstimo de Equipamento</h3>
    <input id="m_func" placeholder="Código Funcionário">
    <input id="m_nome" placeholder="Nome Funcionário">
    <input id="m_tag" placeholder="TAG do equipamento">
    <input id="m_obs" placeholder="Observação">
    <button class="action" onclick="emprestar()">Emprestar</button>
  </div>
  <div class="card">
    <h3>Empréstimos em Aberto</h3>
    <div id="lista_emprestimos"></div>
  </div>
</div>


    <div id="movimentacao_epi" class="subtab-content">
      <div class="card">
        <h3>Retirada de EPI</h3>
        <input id="epi_func" placeholder="Código Funcionário">
        <input id="epi_nome" placeholder="Nome Funcionário">
        <input id="epi_codigo" placeholder="Código ou Nome do EPI">
        <input id="epi_obs" placeholder="Observação">
        <button class="action" onclick="retirarEpi()">Retirar</button>
      </div>
      <div class="card">
        <h3>EPIs Retornáveis Pendentes (capacete, bota, avental...)</h3>
        <div id="lista_epis_pendentes"></div>
      </div>
    </div>

    <div id="movimentacao_consumivel" class="subtab-content">
      <div class="card">
        <h3>Retirada de Consumível</h3>
        <input id="cons_func" placeholder="Código Funcionário">
        <input id="cons_nome" placeholder="Nome Funcionário">
        <input id="cons_codigo" placeholder="Código ou Nome do Consumível">
        <input id="cons_qtd" placeholder="Quantidade" type="number" value="1">
        <input id="cons_obs" placeholder="Observação">
        <button class="action" onclick="retirarConsumivel()">Retirar</button>
      </div>

      <div class="card">
    <h3>Últimas Retiradas de Consumível</h3>
    <div id="lista_retiradas_consumivel"></div>
    </div>
    </div>

    <div id="movimentacao_produto" class="subtab-content">
      <div class="card">
        <h3>Retirada de Produto</h3>
        <input id="prod_func" placeholder="Código Funcionário">
        <input id="prod_nome" placeholder="Nome Funcionário">
        <input id="prod_codigo" placeholder="Código ou Nome do Produto">
        <input id="prod_qtd" placeholder="Quantidade" type="number" value="1">
        <input id="prod_obs" placeholder="Observação">
        <button class="action" onclick="retirarProduto()">Retirar</button>
      </div>
      <div class="card">
    <h3>Últimas Retiradas de Produto</h3>
    <div id="lista_retiradas_produto"></div>
    </div>
    </div>
  `;

  setupFuncionarioAutocomplete('m_func', 'm_nome');
  setupFuncionarioAutocomplete('epi_func', 'epi_nome');
  setupFuncionarioAutocomplete('cons_func', 'cons_nome');
  setupFuncionarioAutocomplete('prod_func', 'prod_nome');

  setupItemAutocomplete('epi_codigo', 'epis', '/api/epis');
  setupItemAutocomplete('cons_codigo', 'consumiveis', '/api/consumiveis');
  setupItemAutocomplete('prod_codigo', 'produtos', '/api/produtos');

  carregarEmprestimosAtivos();
  carregarEpisPendentes();
  carregarRetiradasConsumivel();
  carregarRetiradasProduto();
}

async function emprestar() {
  await api('/api/emprestimos', 'POST', {
    funcionario_codigo: document.getElementById('m_func').value,
    equipamento_tag: document.getElementById('m_tag').value,
    observacao: document.getElementById('m_obs').value
  });
  carregarEmprestimosAtivos();
}

async function carregarEmprestimosAtivos() {
  const lista = await api('/api/emprestimos?ativo=true');
  document.getElementById('lista_emprestimos').innerHTML = `
    <table><tr><th>Tag</th><th>Equipamento</th><th>Fornecedor</th><th>Funcionário</th><th>Data</th><th>Observação</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.equipamento_tag}</td><td>${e.equipamento_nome}</td><td>${e.fornecedor_nome || '-'}</td>
      <td>${e.funcionario_nome}</td>
      <td>${new Date(e.data_emprestimo).toLocaleString()}</td>
      <td>${e.observacao || '-'}</td>
      <td><button class="action" onclick="devolver(${e.id})">Devolver</button></td>
    </tr>`).join('')}
    </table>`;
}




async function devolver(id) {
  const data = await pedirDataDevolucao();
  if (!data) return; // cancelou
  await api(`/api/emprestimos/${id}/devolver`, 'PUT', { data_devolucao: data });
  carregarEmprestimosAtivos();
}


async function retirarEpi() {
  await api('/api/retiradas-epi', 'POST', {
    funcionario_codigo: document.getElementById('epi_func').value,
    epi_codigo: document.getElementById('epi_codigo').value,
    observacao: document.getElementById('epi_obs').value
  });
  alert('Retirada registrada');
  carregarEpisPendentes();
}

async function carregarEpisPendentes() {
  const lista = await api('/api/retiradas-epi?pendente=true');
  document.getElementById('lista_epis_pendentes').innerHTML = `
    <table><tr><th>EPI</th><th>Funcionário</th><th>Data Retirada</th><th>Observação</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.epi_nome}</td><td>${e.funcionario_nome}</td>
      <td>${new Date(e.data_retirada).toLocaleString()}</td>
      <td>${e.observacao || '-'}</td>
      <td>
        <button class="action" onclick="devolverEpi(${e.id})">Devolver</button>
        <button class="action" style="background:#c0392b" onclick="excluirRetiradaEpi(${e.id})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}

async function excluirRetiradaEpi(id) {
  if (!confirm('Excluir esta retirada e devolver o EPI ao estoque?')) return;
  const res = await api('/api/retiradas-epi/' + id, 'DELETE');
  if (res.ok) carregarEpisPendentes();
}

async function devolverEpi(id) {
  const data = await pedirDataDevolucao();
  if (!data) return; // cancelou
  await api(`/api/retiradas-epi/${id}/devolver`, 'PUT', { data_devolucao: data });
  carregarEpisPendentes();
}


async function retirarConsumivel() {
  await api('/api/retiradas-consumivel', 'POST', {
    funcionario_codigo: document.getElementById('cons_func').value,
    consumivel_codigo: document.getElementById('cons_codigo').value,
    quantidade: Number(document.getElementById('cons_qtd').value),
    observacao: document.getElementById('cons_obs').value
  });
  alert('Retirada registrada');
  carregarRetiradasConsumivel();
}

async function retirarProduto() {
  await api('/api/retiradas-produto', 'POST', {
    funcionario_codigo: document.getElementById('prod_func').value,
    produto_codigo: document.getElementById('prod_codigo').value,
    quantidade: Number(document.getElementById('prod_qtd').value),
    observacao: document.getElementById('prod_obs').value
  });
  alert('Retirada registrada');
  carregarRetiradasProduto();
}

async function carregarRetiradasConsumivel() {
  const lista = await api('/api/retiradas-consumivel');
  document.getElementById('lista_retiradas_consumivel').innerHTML = `
    <table><tr><th>Consumível</th><th>Funcionário</th><th>Qtd</th><th>Data</th><th>Observação</th><th></th></tr>
    ${lista.map(r => `<tr>
      <td>${r.consumivel_nome}</td><td>${r.funcionario_nome}</td>
      <td>${r.quantidade}</td><td>${new Date(r.data_retirada).toLocaleString()}</td>
      <td>${r.observacao || '-'}</td>
      <td>
        <button class="action" onclick="editarRetiradaConsumivel(${r.id}, ${r.quantidade}, '${(r.observacao||'').replace(/'/g,"\\'")}')">Editar</button>
        <button class="action" style="background:#c0392b" onclick="excluirRetiradaConsumivel(${r.id})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}

async function editarRetiradaConsumivel(id, qtdAtual, obsAtual) {
  const novaQtd = prompt('Nova quantidade:', qtdAtual);
  if (novaQtd === null) return;
  const novaObs = prompt('Nova observação:', obsAtual);
  const res = await api('/api/retiradas-consumivel/' + id, 'PUT', {
    quantidade: Number(novaQtd),
    observacao: novaObs
  });
  if (res.ok) carregarRetiradasConsumivel();
}


async function excluirRetiradaConsumivel(id) {
  if (!confirm('Excluir esta retirada e devolver a quantidade ao estoque?')) return;
  const res = await api('/api/retiradas-consumivel/' + id, 'DELETE');
  if (res.ok) carregarRetiradasConsumivel();
}

async function carregarRetiradasProduto() {
  const lista = await api('/api/retiradas-produto');
  document.getElementById('lista_retiradas_produto').innerHTML = `
    <table><tr><th>Produto</th><th>Funcionário</th><th>Qtd</th><th>Data</th><th>Observação</th><th></th></tr>
    ${lista.map(r => `<tr>
      <td>${r.produto_nome}</td><td>${r.funcionario_nome}</td>
      <td>${r.quantidade}</td><td>${new Date(r.data_retirada).toLocaleString()}</td>
      <td>${r.observacao || '-'}</td>
      <td>
        <button class="action" onclick="editarRetiradaProduto(${r.id}, ${r.quantidade}, '${(r.observacao||'').replace(/'/g,"\\'")}')">Editar</button>
        <button class="action" style="background:#c0392b" onclick="excluirRetiradaProduto(${r.id})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}


async function editarRetiradaProduto(id, qtdAtual, obsAtual) {
  const novaQtd = prompt('Nova quantidade:', qtdAtual);
  if (novaQtd === null) return;
  const novaObs = prompt('Nova observação:', obsAtual);
  const res = await api('/api/retiradas-produto/' + id, 'PUT', {
    quantidade: Number(novaQtd),
    observacao: novaObs
  });
  if (res.ok) carregarRetiradasProduto();
}

async function excluirRetiradaProduto(id) {
  if (!confirm('Excluir esta retirada e devolver a quantidade ao estoque?')) return;
  const res = await api('/api/retiradas-produto/' + id, 'DELETE');
  if (res.ok) carregarRetiradasProduto();
}


// ---------- FICHA ----------
function loadFicha() {
  document.getElementById('ficha').innerHTML = `
    <div class="card">
      <input id="fi_codigo" placeholder="Código Funcionário">
      <input id="fi_nome" placeholder="Nome Funcionário">
      <button class="action" onclick="buscarFicha()">Buscar</button>
    </div>
    <div id="ficha_resultado"></div>
  `;
  setupFuncionarioAutocomplete('fi_codigo', 'fi_nome');
}

async function buscarFicha() {
  const codigo = document.getElementById('fi_codigo').value;
  const res = await fetch('/api/ficha/' + codigo);
  const data = await res.json();
  if (!res.ok) { document.getElementById('ficha_resultado').innerHTML = data.error; return; }

  document.getElementById('ficha_resultado').innerHTML = `
    <div class="card">
      <h3>${data.funcionario.nome} (Código ${data.funcionario.codigo})</h3>
      <p>Cargo: ${data.funcionario.cargo || '-'}</p>
      <p>Data de Nascimento: ${formatarDataBR(data.funcionario.data_nascimento)}</p>
      <p>Admissão: ${formatarDataBR(data.funcionario.data_admissao)}</p>
      <p>Demissão: ${formatarDataBR(data.funcionario.data_demissao)}</p>
      <p>Status: ${data.funcionario.ativo ? 'Ativo' : 'Baixado em ' + formatarDataBR(data.funcionario.data_baixa)}</p>
      ${data.funcionario.ativo ? `<button class="action" onclick="darBaixaFuncionario('${data.funcionario.codigo}')">Dar Baixa</button>` : ''}
    </div>
    <div class="card"><h4>Equipamentos</h4>
    <table><tr><th>Tag</th><th>Equipamento</th><th>Empréstimo</th><th>Devolução</th><th>Observação</th></tr>
      ${data.equipamentos.map(e => `<tr>
      <td>${e.equipamento_tag}</td>
      <td>${e.equipamento_nome}</td>
      <td>${new Date(e.data_emprestimo).toLocaleString()}</td>
      <td>${e.data_devolucao ? new Date(e.data_devolucao).toLocaleString() : '-'}</td>
      <td>${e.observacao || '-'}</td>
    </tr>`).join('')}
    </table>
  </div>

    <div class="card"><h4>EPIs</h4>
      <table><tr><th>EPI</th><th>Data Retirada</th><th>Devolução</th><th>Observação</th></tr>
      ${data.epis.map(e => `<tr><td>${e.epi_nome}</td><td>${new Date(e.data_retirada).toLocaleString()}</td><td>${e.data_devolucao ? new Date(e.data_devolucao).toLocaleString() : '-'}</td><td>${e.observacao || '-'}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card"><h4>Consumíveis</h4>
      <table><tr><th>Consumível</th><th>Qtd</th><th>Data</th><th>Observação</th></tr>
      ${data.consumiveis.map(e => `<tr><td>${e.consumivel_nome}</td><td>${e.quantidade}</td><td>${new Date(e.data_retirada).toLocaleString()}</td><td>${e.observacao || '-'}</td></tr>`).join('')}
      </table>
    </div>
  `;
}

async function darBaixaFuncionario(codigo) {
  await api(`/api/funcionarios/${codigo}/baixa`, 'PUT');
  buscarFicha();
}


// ---------- BAIXA DE ESTOQUE ----------

function loadBaixa() {
  document.getElementById('baixa').innerHTML = `
    <div class="card">
      <select id="b_tipo" onchange="setupBaixaAutocomplete()">
        <option value="equipamento">Equipamento</option>
        <option value="epi">EPI</option>
        <option value="consumivel">Consumível</option>
        <option value="produto">Produto</option>
      </select>
      <input id="b_codigo" placeholder="Código do item">
      <input id="b_nome" placeholder="Nome do item">
      <input id="b_quantidade" placeholder="Quantidade" type="number" min="1" value="1">
      <input id="b_motivo" placeholder="Motivo da baixa">
      <button class="action" onclick="registrarBaixa()">Registrar Baixa</button>
    </div>
    <div id="lista_baixas"></div>
  `;
  carregarBaixas();
  setupBaixaAutocomplete();
}


function baixaConfig(tipo) {
  return {
    equipamento: { url: '/api/equipamentos', key: 'tag' },
    epi:         { url: '/api/epis',         key: 'codigo' },
    consumivel:  { url: '/api/consumiveis',  key: 'codigo' },
    produto:     { url: '/api/produtos',     key: 'codigo' }
  }[tipo];
}

async function setupBaixaAutocomplete() {

  const tipo = document.getElementById('b_tipo').value;

  // Esconde quantidade se for equipamento

  const campoQtd = document.getElementById('b_quantidade');
  campoQtd.style.display = tipo === 'equipamento' ? 'none' : 'inline-block';

  const { url, key } = baixaConfig(tipo);

  const codigoInput = document.getElementById('b_codigo');
  const nomeInput = document.getElementById('b_nome');

  codigoInput.setAttribute('autocomplete', 'nope');
  nomeInput.setAttribute('autocomplete', 'nope');

  codigoInput.value = '';
  nomeInput.value = '';

  const dropCodigo = criarDropdown(codigoInput);
  const dropNome = criarDropdown(nomeInput);
  const lista = await api(url);

  function render(div, filtrados) {
    if (!filtrados.length) { div.style.display = 'none'; div.innerHTML = ''; return; }
    div.style.display = 'block';
    div.innerHTML = filtrados.map(item =>
      `<div class="ac-item" data-chave="${item[key]}" style="padding:6px 10px;cursor:pointer;">${item[key]} - ${item.nome}</div>`
    ).join('');
    div.querySelectorAll('.ac-item').forEach(el => {
      el.onmouseenter = () => el.style.background = '#eee';
      el.onmouseleave = () => el.style.background = '';
      el.onclick = () => {
        const item = filtrados.find(i => String(i[key]) === el.dataset.chave);
        codigoInput.value = item[key];
        nomeInput.value = item.nome;
        dropCodigo.style.display = 'none';
        dropNome.style.display = 'none';
      };
    });
  }

  codigoInput.oninput = () => {
    const termo = codigoInput.value.toLowerCase();
    render(dropCodigo, lista.filter(i => String(i[key]).toLowerCase().includes(termo)));
  };
  codigoInput.onfocus = () => render(dropCodigo, lista);

  nomeInput.oninput = () => {
    const termo = nomeInput.value.toLowerCase();
    render(dropNome, lista.filter(i => i.nome.toLowerCase().includes(termo)));
  };
  nomeInput.onfocus = () => render(dropNome, lista);

  document.addEventListener('click', (e) => {
    if (!codigoInput.contains(e.target) && !dropCodigo.contains(e.target)) dropCodigo.style.display = 'none';
    if (!nomeInput.contains(e.target) && !dropNome.contains(e.target)) dropNome.style.display = 'none';
  });
}

async function registrarBaixa() {
  const tipo = document.getElementById('b_tipo').value;
  const quantidade = tipo === 'equipamento' ? 1 : Number(document.getElementById('b_quantidade').value);

  await api('/api/baixas-estoque', 'POST', {
    item_tipo: tipo,
    item_codigo: document.getElementById('b_codigo').value,
    item_nome: document.getElementById('b_nome').value,
    quantidade: quantidade,
    motivo: document.getElementById('b_motivo').value
  });

  document.getElementById('b_codigo').value = '';
  document.getElementById('b_nome').value = '';
  document.getElementById('b_quantidade').value = '1';
  document.getElementById('b_motivo').value = '';
  carregarBaixas();
}


async function carregarBaixas() {
  const lista = await api('/api/baixas-estoque');
  document.getElementById('lista_baixas').innerHTML = `
    <table><tr><th>Tipo</th><th>Código</th><th>Nome</th><th>Qtd</th><th>Data</th><th>Motivo</th></tr>
    ${lista.map(b => `<tr>
      <td>${b.item_tipo}</td><td>${b.item_codigo}</td><td>${b.item_nome}</td>
      <td>${b.quantidade || 1}</td>
      <td>${new Date(b.data_baixa).toLocaleString()}</td><td>${b.motivo || ''}</td>
    </tr>`).join('')}
    </table>`;
  loadDashboard();
}
/*
function abrirModalBaixa(item, tipo) {
  const precisaQuantidade = ['epi', 'consumivel', 'produto'].includes(tipo);
  const html = `
    <label>Item: ${item.nome} (Estoque atual: ${item.estoque ?? '-'})</label>
    ${precisaQuantidade ? `
      <label>Quantidade a dar baixa:</label>
      <input type="number" id="baixa_quantidade" min="1" max="${item.estoque}" value="1">
    ` : ''}
    <label>Motivo:</label>
    <textarea id="baixa_motivo"></textarea>
    <button onclick="confirmarBaixa('${tipo}', '${item.codigo || item.tag}', '${item.nome}')">Confirmar Baixa</button>
  `;
  document.getElementById('modal_baixa_conteudo').innerHTML = html;
  abrirModal('modal_baixa');
}

async function confirmarBaixa(tipo, codigo, nome) {
  const quantidade = document.getElementById('baixa_quantidade')
    ? parseInt(document.getElementById('baixa_quantidade').value)
    : null;
  const motivo = document.getElementById('baixa_motivo').value;

  const res = await api('/api/baixas-estoque', 'POST', {
    item_tipo: tipo, item_codigo: codigo, item_nome: nome, quantidade, motivo
  });
  if (res) { fecharModal('modal_baixa'); recarregarListasAtuais(); }
}
*/

loadDashboard();
