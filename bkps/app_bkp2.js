// checa sessão
fetch('/api/session').then(r => r.json()).then(d => {
  if (!d.user) window.location.href = '/login.html';
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
  const d = await api('/api/dashboard');
  const el = document.getElementById('dashboard');
  el.innerHTML = `
    <div class="card">
      <h3>Equipamentos Disponíveis (${d.equipamentos_disponiveis.length})</h3>
      <table><tr><th>Tag</th><th>Nome</th></tr>
      ${d.equipamentos_disponiveis.map(e => `<tr><td>${e.tag}</td><td>${e.nome}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card">
      <h3>Equipamentos Não Devolvidos (${d.equipamentos_emprestados.length})</h3>
      <table><tr><th>Tag</th><th>Equipamento</th><th>Funcionário</th><th>Data Empréstimo</th></tr>
      ${d.equipamentos_emprestados.map(e => `<tr><td>${e.equipamento_tag}</td><td>${e.equipamento_nome}</td><td>${e.funcionario_nome}</td><td>${new Date(e.data_emprestimo).toLocaleString()}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card">
      <h3>Estoque Baixo</h3>
      <b>EPIs:</b> ${d.estoque_baixo.epis.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}<br>
      <b>Consumíveis:</b> ${d.estoque_baixo.consumiveis.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}<br>
      <b>Produtos:</b> ${d.estoque_baixo.produtos.map(i => i.nome + ' (' + i.estoque + ')').join(', ') || 'nenhum'}
    </div>
  `;
}

// ---------- CADASTROS ----------
function loadCadastros() {
  const el = document.getElementById('cadastros');
  el.innerHTML = `
    <div class="subtabs">
      <button class="subtab-btn active" data-subtab="funcionario" onclick="ativarSubtab('cadastros','funcionario')">Funcionário</button>
      <button class="subtab-btn" data-subtab="fornecedor" onclick="ativarSubtab('cadastros','fornecedor')">Fornecedor</button>
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
        <input id="pr_estoque" placeholder="Estoque" type="number">
        <input id="pr_min" placeholder="Estoque mínimo" type="number">
        <button class="action" onclick="salvarProduto()">Salvar</button>
      </div>
      <div class="card">
        <h3>Produtos Cadastrados</h3>
        <div id="lista_produtos"></div>
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
}

async function preencherSelects() {
  const tf = await api('/api/tipos-ferramentas');
  document.getElementById('eq_tipo').innerHTML = tf.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  const fo = await api('/api/fornecedores');
  document.getElementById('pr_fornecedor').innerHTML = fo.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
}

// ---- Funcionário ----
async function salvarFuncionario() {
  await api('/api/funcionarios', 'POST', {
    nome: document.getElementById('f_nome').value,
    data_nascimento: document.getElementById('f_nascimento').value,
    cargo: document.getElementById('f_cargo').value,
    data_admissao: document.getElementById('f_admissao').value,
    data_demissao: document.getElementById('f_demissao').value
  });
  document.getElementById('f_nome').value = '';
  document.getElementById('f_cargo').value = '';
  document.getElementById('f_nascimento').value = '';
  document.getElementById('f_admissao').value = '';
  document.getElementById('f_demissao').value = '';
  alert('Funcionário salvo');
  carregarListaFuncionarios();
}

async function carregarListaFuncionarios() {
  const lista = await api('/api/funcionarios');
  document.getElementById('lista_funcionarios').innerHTML = `
    <table>
      <tr><th>Código</th><th>Nome</th><th>Cargo</th><th>Admissão</th><th>Demissão</th><th></th></tr>
      ${lista.map(f => `<tr>
        <td>${f.codigo}</td><td>${f.nome}</td><td>${f.cargo || '-'}</td>
        <td>${formatarDataBR(f.data_admissao)}</td><td>${formatarDataBR(f.data_demissao)}</td>
        <td><button class="action" style="background:#c0392b" onclick="excluirFuncionario('${f.codigo}')">Excluir</button></td>
      </tr>`).join('')}
    </table>`;
}

async function excluirFuncionario(codigo) {
  if (!confirm('Confirma exclusão do funcionário ' + codigo + '?')) return;
  const res = await api('/api/funcionarios/' + codigo, 'DELETE');
  if (res.ok) carregarListaFuncionarios();
}

// ---- Fornecedor ----
async function salvarFornecedor() {
  await api('/api/fornecedores', 'POST', {
    nome: document.getElementById('fo_nome').value,
    contato: document.getElementById('fo_contato').value
  });
  alert('Fornecedor salvo');
  preencherSelects();
  carregarFornecedores();
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
        <button class="btn-excluir" data-id="${f.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
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
async function salvarTipoFerramenta() {
  await api('/api/tipos-ferramentas', 'POST', { nome: document.getElementById('tf_nome').value });
  document.getElementById('tf_nome').value = '';
  alert('Tipo salvo');
  preencherSelects();
  carregarListaTipos();
}

async function carregarListaTipos() {
  const lista = await api('/api/tipos-ferramentas');
  document.getElementById('lista_tipos').innerHTML = `
    <table><tr><th>Nome</th><th></th></tr>
    ${lista.map(t => `<tr>
      <td>${t.nome}</td>
      <td><button class="action" style="background:#c0392b" onclick="excluirTipoFerramenta(${t.id})">Excluir</button></td>
    </tr>`).join('')}
    </table>`;
}

async function excluirTipoFerramenta(id) {
  if (!confirm('Excluir tipo de ferramenta?')) return;
  const res = await api('/api/tipos-ferramentas/' + id, 'DELETE');
  if (res.ok) { carregarListaTipos(); preencherSelects(); }
}

// ---- Equipamento ----
async function salvarEquipamento() {
  await api('/api/equipamentos', 'POST', {
    tag: document.getElementById('eq_tag').value,
    nome: document.getElementById('eq_nome').value,
    tipo_id: document.getElementById('eq_tipo').value
  });
  document.getElementById('eq_tag').value = '';
  document.getElementById('eq_nome').value = '';
  alert('Equipamento salvo');
  carregarListaEquipamentos();
}

async function carregarListaEquipamentos() {
  const lista = await api('/api/equipamentos');
  document.getElementById('lista_equipamentos').innerHTML = `
    <table><tr><th>Tag</th><th>Nome</th><th>Tipo</th><th>Fornecedor</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.tag}</td><td>${e.nome}</td><td>${e.tipo_nome || '-'}</td><td>${e.fornecedor_nome || '-'}</td>
      <td><button class="action" style="background:#c0392b" onclick="excluirEquipamento('${e.tag}')">Excluir</button></td>
    </tr>`).join('')}
    </table>`;
}

async function excluirEquipamento(tag) {
  if (!confirm('Excluir equipamento ' + tag + '?')) return;
  const res = await api('/api/equipamentos/' + tag, 'DELETE');
  if (res.ok) carregarListaEquipamentos();
}

// ---- EPI ----
async function salvarEpi() {
  await api('/api/epis', 'POST', {
    nome: document.getElementById('ep_nome').value,
    estoque: Number(document.getElementById('ep_estoque').value),
    estoque_minimo: Number(document.getElementById('ep_min').value),
    retornavel: document.getElementById('ep_retornavel').checked
  });
  document.getElementById('ep_nome').value = '';
  document.getElementById('ep_estoque').value = '';
  document.getElementById('ep_min').value = '';
  document.getElementById('ep_retornavel').checked = false;
  alert('EPI salvo');
  carregarListaEpis();
}

async function carregarListaEpis() {
  const lista = await api('/api/epis');
  document.getElementById('lista_epis').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Estoque</th><th>Mín</th><th>Retornável</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.codigo}</td><td>${e.nome}</td><td>${e.estoque}</td><td>${e.estoque_minimo}</td>
      <td>${e.retornavel ? 'Sim' : 'Não'}</td>
      <td>
        <button class="action" onclick="entradaEstoque('epis', ${e.codigo}, carregarListaEpis)">+ Entrada</button>
        <button class="action" style="background:#c0392b" onclick="excluirEpi(${e.codigo})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}

async function excluirEpi(codigo) {
  if (!confirm('Excluir EPI ' + codigo + '?')) return;
  const res = await api('/api/epis/' + codigo, 'DELETE');
  if (res.ok) carregarListaEpis();
}

// ---- Consumível ----
async function salvarConsumivel() {
  await api('/api/consumiveis', 'POST', {
    nome: document.getElementById('co_nome').value,
    estoque: Number(document.getElementById('co_estoque').value),
    estoque_minimo: Number(document.getElementById('co_min').value)
  });
  document.getElementById('co_nome').value = '';
  document.getElementById('co_estoque').value = '';
  document.getElementById('co_min').value = '';
  alert('Consumível salvo');
  carregarListaConsumiveis();
}

async function entradaEstoque(tipo, codigo, callbackRecarregar) {
  const qtd = prompt('Quantidade que chegou:');
  if (qtd === null) return;
  const num = Number(qtd);
  if (!num || num <= 0) { alert('Quantidade inválida'); return; }

  const res = await api(`/api/${tipo}/${codigo}/entrada`, 'POST', { quantidade: num });
  if (res.ok) {
    alert('Estoque atualizado');
    callbackRecarregar();
    loadDashboard();
  }
}


async function carregarListaConsumiveis() {
  const lista = await api('/api/consumiveis');
  document.getElementById('lista_consumiveis').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Unidade</th><th>Estoque</th><th>Mín</th><th></th></tr>
    ${lista.map(c => `<tr>
      <td>${c.codigo}</td><td>${c.nome}</td><td>${c.unidade_sigla || '-'}</td>
      <td>${c.estoque}</td><td>${c.estoque_minimo}</td>
      <td>
        <button class="action" onclick="entradaEstoque('consumiveis', ${c.codigo}, carregarListaConsumiveis)">+ Entrada</button>
        <button class="action" style="background:#c0392b" onclick="excluirConsumivel(${c.codigo})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}

async function excluirConsumivel(codigo) {
  if (!confirm('Excluir consumível ' + codigo + '?')) return;
  const res = await api('/api/consumiveis/' + codigo, 'DELETE');
  if (res.ok) carregarListaConsumiveis();
}

// ---- Produto ----
async function salvarProduto() {
  await api('/api/produtos', 'POST', {
    nome: document.getElementById('pr_nome').value,
    fornecedor_id: document.getElementById('pr_fornecedor').value,
    estoque: Number(document.getElementById('pr_estoque').value),
    estoque_minimo: Number(document.getElementById('pr_min').value)
  });
  document.getElementById('pr_nome').value = '';
  document.getElementById('pr_estoque').value = '';
  document.getElementById('pr_min').value = '';
  alert('Produto salvo');
  carregarListaProdutos();
}

async function carregarListaProdutos() {
  const lista = await api('/api/produtos');
  document.getElementById('lista_produtos').innerHTML = `
    <table><tr><th>Código</th><th>Nome</th><th>Fornecedor</th><th>Estoque</th><th>Mín</th><th></th></tr>
    ${lista.map(p => `<tr>
      <td>${p.codigo}</td><td>${p.nome}</td><td>${p.fornecedor_nome || '-'}</td>
      <td>${p.estoque}</td><td>${p.estoque_minimo}</td>
      <td>
        <button class="action" onclick="entradaEstoque('produtos', ${p.codigo}, carregarListaProdutos)">+ Entrada</button>
        <button class="action" style="background:#c0392b" onclick="excluirProduto(${p.codigo})">Excluir</button>
      </td>
    </tr>`).join('')}
    </table>`;
}

async function excluirProduto(codigo) {
  if (!confirm('Excluir produto ' + codigo + '?')) return;
  const res = await api('/api/produtos/' + codigo, 'DELETE');
  if (res.ok) carregarListaProdutos();
}

// ---------- CACHE DE FUNCIONÁRIOS ----------
let _funcionariosCache = null;
async function getFuncionarios(forcarReload = false) {
  if (!_funcionariosCache || forcarReload) _funcionariosCache = await api('/api/funcionarios');
  return _funcionariosCache;
}

// ---------- AUTOCOMPLETE GENÉRICO DE FUNCIONÁRIO ----------
function criarDropdown(input) {
  input.parentNode.style.position = 'relative';
  const div = document.createElement('div');
  div.className = 'ac-dropdown';
  div.style.cssText = 'display:none;border:1px solid #ccc;background:#fff;max-height:160px;overflow:auto;position:absolute;left:0;top:100%;width:100%;z-index:100;box-shadow:0 2px 6px rgba(0,0,0,.15);';
  input.insertAdjacentElement('afterend', div);
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

async function setupFuncionarioAutocomplete(codigoId, nomeId) {
  const codigoInput = document.getElementById(codigoId);
  const nomeInput = document.getElementById(nomeId);
  if (!codigoInput || !nomeInput) return;

  codigoInput.removeAttribute('disabled');
  nomeInput.removeAttribute('disabled');
  codigoInput.autocomplete = 'off';
  nomeInput.autocomplete = 'off';

  const dropCodigo = criarDropdown(codigoInput);
  const dropNome = criarDropdown(nomeInput);
  const lista = await getFuncionarios();

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
        <input id="m_tag" placeholder="TAG do equipamento" onblur="buscarMarca()">
        <input id="m_marca" placeholder="Marca" disabled>
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
        <input id="epi_codigo" placeholder="Código do EPI">
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
        <input id="cons_codigo" placeholder="Código do Consumível">
        <input id="cons_qtd" placeholder="Quantidade" type="number" value="1">
        <input id="cons_obs" placeholder="Observação">
        <button class="action" onclick="retirarConsumivel()">Retirar</button>
      </div>
    </div>

    <div id="movimentacao_produto" class="subtab-content">
      <div class="card">
        <h3>Retirada de Produto</h3>
        <input id="prod_func" placeholder="Código Funcionário">
        <input id="prod_nome" placeholder="Nome Funcionário">
        <input id="prod_codigo" placeholder="Código do Produto">
        <input id="prod_qtd" placeholder="Quantidade" type="number" value="1">
        <input id="prod_obs" placeholder="Observação">
        <button class="action" onclick="retirarProduto()">Retirar</button>
      </div>
    </div>
  `;

  setupFuncionarioAutocomplete('m_func', 'm_nome');
  setupFuncionarioAutocomplete('epi_func', 'epi_nome');
  setupFuncionarioAutocomplete('cons_func', 'cons_nome');
  setupFuncionarioAutocomplete('prod_func', 'prod_nome');

  carregarEmprestimosAtivos();
  carregarEpisPendentes();
}

async function buscarMarca() {
  const tag = document.getElementById('m_tag').value.trim();
  const marcaInput = document.getElementById('m_marca');
  marcaInput.value = '';
  if (!tag) return;
  const res = await fetch('/api/equipamentos/' + tag);
  const data = await res.json();
  marcaInput.value = res.ok ? (data.marca || '-') : 'Equipamento não encontrado';
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
    <table><tr><th>Tag</th><th>Equipamento</th><th>Funcionário</th><th>Data</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.equipamento_tag}</td><td>${e.equipamento_nome}</td><td>${e.funcionario_nome}</td>
      <td>${new Date(e.data_emprestimo).toLocaleString()}</td>
      <td><button class="action" onclick="devolver(${e.id})">Devolver</button></td>
    </tr>`).join('')}
    </table>`;
}

async function devolver(id) {
  await api(`/api/emprestimos/${id}/devolver`, 'PUT');
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
    <table><tr><th>EPI</th><th>Funcionário</th><th>Data Retirada</th><th></th></tr>
    ${lista.map(e => `<tr>
      <td>${e.epi_nome}</td><td>${e.funcionario_nome}</td>
      <td>${new Date(e.data_retirada).toLocaleString()}</td>
      <td><button class="action" onclick="devolverEpi(${e.id})">Devolver</button></td>
    </tr>`).join('')}
    </table>`;
}

async function devolverEpi(id) {
  await api(`/api/retiradas-epi/${id}/devolver`, 'PUT');
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
}

async function retirarProduto() {
  await api('/api/retiradas-produto', 'POST', {
    funcionario_codigo: document.getElementById('prod_func').value,
    produto_codigo: document.getElementById('prod_codigo').value,
    quantidade: Number(document.getElementById('prod_qtd').value),
    observacao: document.getElementById('prod_obs').value
  });
  alert('Retirada registrada');
}

// ---------- FICHA ----------
function loadFicha() {
  document.getElementById('ficha').innerHTML = `
    <input id="fi_codigo" placeholder="Código do Funcionário">
    <button class="action" onclick="buscarFicha()">Buscar por Código</button>
    <br><br>
    <input id="fi_nome" placeholder="Buscar por nome do funcionário" oninput="buscarPorNome()">
    <div id="lista_busca_nome"></div>
    <div id="ficha_resultado"></div>
  `;
}

async function buscarPorNome() {
  const termo = document.getElementById('fi_nome').value.trim();
  const div = document.getElementById('lista_busca_nome');
  if (termo.length < 2) { div.innerHTML = ''; return; }

  const lista = await api('/api/funcionarios');
  const filtrados = lista.filter(f => f.nome.toLowerCase().includes(termo.toLowerCase()));

  div.innerHTML = filtrados.length
    ? `<ul>${filtrados.map(f => `<li style="cursor:pointer;color:blue" onclick="document.getElementById('fi_codigo').value='${f.codigo}';buscarFicha();document.getElementById('lista_busca_nome').innerHTML='';document.getElementById('fi_nome').value='';">${f.nome} (Código ${f.codigo})</li>`).join('')}</ul>`
    : '<p>Nenhum funcionário encontrado</p>';
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
      <table><tr><th>Equipamento</th><th>Empréstimo</th><th>Devolução</th></tr>
      ${data.equipamentos.map(e => `<tr><td>${e.equipamento_nome}</td><td>${new Date(e.data_emprestimo).toLocaleString()}</td><td>${e.data_devolucao ? new Date(e.data_devolucao).toLocaleString() : '-'}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card"><h4>EPIs</h4>
      <table><tr><th>EPI</th><th>Data Retirada</th><th>Devolução</th></tr>
      ${data.epis.map(e => `<tr><td>${e.epi_nome}</td><td>${new Date(e.data_retirada).toLocaleString()}</td><td>${e.data_devolucao ? new Date(e.data_devolucao).toLocaleString() : '-'}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card"><h4>Consumíveis</h4>
      <table><tr><th>Consumível</th><th>Qtd</th><th>Data</th></tr>
      ${data.consumiveis.map(e => `<tr><td>${e.consumivel_nome}</td><td>${e.quantidade}</td><td>${new Date(e.data_retirada).toLocaleString()}</td></tr>`).join('')}
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
      <select id="b_tipo">
        <option value="equipamento">Equipamento</option>
        <option value="epi">EPI</option>
        <option value="consumivel">Consumível</option>
        <option value="produto">Produto</option>
      </select>
      <input id="b_codigo" placeholder="Código do item">
      <input id="b_nome" placeholder="Nome do item">
      <input id="b_motivo" placeholder="Motivo da baixa">
      <button class="action" onclick="registrarBaixa()">Registrar Baixa</button>
    </div>
    <div id="lista_baixas"></div>
  `;
  carregarBaixas();
}

async function registrarBaixa() {
  await api('/api/baixas-estoque', 'POST', {
    item_tipo: document.getElementById('b_tipo').value,
    item_codigo: document.getElementById('b_codigo').value,
    item_nome: document.getElementById('b_nome').value,
    motivo: document.getElementById('b_motivo').value
  });
  carregarBaixas();
}

async function carregarBaixas() {
  const lista = await api('/api/baixas-estoque');
  document.getElementById('lista_baixas').innerHTML = `
    <table><tr><th>Tipo</th><th>Código</th><th>Nome</th><th>Data</th><th>Motivo</th></tr>
    ${lista.map(b => `<tr><td>${b.item_tipo}</td><td>${b.item_codigo}</td><td>${b.item_nome}</td><td>${new Date(b.data_baixa).toLocaleString()}</td><td>${b.motivo || ''}</td></tr>`).join('')}
    </table>`;
  loadDashboard();
}

loadDashboard();
