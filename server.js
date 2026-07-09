require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();

// CORS para desenvolvimento com Live Server (qualquer porta em localhost/127.0.0.1)
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (isLocal) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
// Session secret: prefer env var, fallback to a generated secret (for dev)
const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set in .env — using a generated secret (development only)');
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    sameSite: 'lax'   // 'lax' funciona em HTTP local; para HTTPS em produção use 'strict'
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Não autenticado' });
  next();
}

// ---------- AUTH ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

// Rotas públicas - servir sem proteção
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use('/api', requireLogin); // protege tudo abaixo


// ---------- Validar Data Devolução -----------

function validarDataDevolucao(dataInformada) {
  if (!dataInformada) {
    return { iso: new Date().toISOString() };
  }
  const data = new Date(dataInformada + 'T23:59:59');
  if (isNaN(data.getTime())) {
    return { erro: 'Data inválida' };
  }
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (data > hoje) {
    return { erro: 'A data de devolução não pode ser futura' };
  }
  return { iso: data.toISOString() };
}


// ---------- CADASTROS ----------

app.get('/api/funcionarios', (req, res) => {
  const lista = db.prepare('SELECT * FROM funcionarios ORDER BY nome').all();
  res.json(lista);
});

app.get('/api/funcionarios/:codigo', (req, res) => {
  const f = db.prepare('SELECT * FROM funcionarios WHERE codigo = ?').get(req.params.codigo);
  if (!f) return res.status(404).json({ error: 'Funcionário não encontrado' });
  res.json(f);
});

app.post('/api/funcionarios', (req, res) => {
  const { nome, data_nascimento, cargo, data_admissao, data_demissao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const r = db.prepare(`
    INSERT INTO funcionarios (nome, data_nascimento, cargo, data_admissao, data_demissao)
    VALUES (?, ?, ?, ?, ?)
  `).run(nome, data_nascimento || null, cargo || null, data_admissao || null, data_demissao || null);

  res.json({ ok: true, codigo: r.lastInsertRowid });
});

app.put('/api/funcionarios/:codigo/baixa', (req, res) => {
  const info = db.prepare('UPDATE funcionarios SET ativo = 0, data_baixa = ? WHERE codigo = ?')
    .run(new Date().toISOString(), req.params.codigo);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Funcionário não encontrado' });
  }
  res.json({ ok: true });
});

app.delete('/api/funcionarios/:codigo', (req, res) => {
  const codigo = req.params.codigo;

  const emprestimoAtivo = db.prepare(
    'SELECT * FROM emprestimos WHERE funcionario_codigo = ? AND data_devolucao IS NULL'
  ).get(codigo);

  const epiRetornavelPendente = db.prepare(`
    SELECT re.* FROM retiradas_epi re
    JOIN epis e ON e.codigo = re.epi_codigo
    WHERE re.funcionario_codigo = ? 
      AND re.data_devolucao IS NULL 
      AND e.retornavel = 1
  `).get(codigo);

  if (emprestimoAtivo) {
    return res.status(400).json({ error: 'Funcionário possui equipamento emprestado. Devolva antes de excluir.' });
  }
  if (epiRetornavelPendente) {
    return res.status(400).json({ error: 'Funcionário possui EPI retornável (ex: capacete, bota) não devolvido. Registre a devolução antes de excluir.' });
  }

  const info = db.prepare('DELETE FROM funcionarios WHERE codigo = ?').run(codigo);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Funcionário não encontrado' });
  }
  res.json({ ok: true });
});


app.get('/api/fornecedores', (req, res) => res.json(db.prepare('SELECT * FROM fornecedores').all()));

app.post('/api/fornecedores', (req, res) => {
  const { nome, contato } = req.body;
  db.prepare('INSERT INTO fornecedores (nome, contato) VALUES (?, ?)').run(nome, contato);
  res.json({ ok: true });
});

app.delete('/api/fornecedores/:id', (req, res) => {
  const id = req.params.id;
  const emUso = db.prepare('SELECT 1 FROM produtos WHERE fornecedor_id = ?').get(id);

  if (emUso) {
    return res.status(400).json({ error: 'Não é possível excluir: fornecedor vinculado a um ou mais produtos.' });
  }

  const info = db.prepare('DELETE FROM fornecedores WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Fornecedor não encontrado' });
  }
  res.json({ ok: true });
});

app.get('/api/unidades', (req, res) => res.json(db.prepare('SELECT * FROM unidades ORDER BY nome').all()));

app.post('/api/unidades', (req, res) => {
  const { nome, sigla } = req.body;
  if (!nome || !sigla) return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
  const r = db.prepare('INSERT INTO unidades (nome, sigla) VALUES (?, ?)').run(nome, sigla);
  res.json({ ok: true, id: r.lastInsertRowid });
});

app.delete('/api/unidades/:id', (req, res) => {
  const id = req.params.id;
  const emUsoConsumivel = db.prepare('SELECT 1 FROM consumiveis WHERE unidade_id = ?').get(id);
  const emUsoProduto = db.prepare('SELECT 1 FROM produtos WHERE unidade_id = ?').get(id);
  if (emUsoConsumivel || emUsoProduto) {
    return res.status(400).json({ error: 'Não é possível excluir: unidade vinculada a consumível ou produto.' });
  }
  const info = db.prepare('DELETE FROM unidades WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Unidade não encontrada' });
  res.json({ ok: true });
});

app.delete('/api/tipos-ferramentas/:id', (req, res) => {
  const id = req.params.id;
  const emUso = db.prepare('SELECT 1 FROM equipamentos WHERE tipo_id = ?').get(id);
  if (emUso) return res.status(400).json({ error: 'Não é possível excluir: tipo vinculado a equipamento.' });
  const info = db.prepare('DELETE FROM tipos_ferramentas WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Tipo não encontrado' });
  res.json({ ok: true });
});


app.get('/api/tipos-ferramentas', (req, res) => res.json(db.prepare('SELECT * FROM tipos_ferramentas').all()));
app.post('/api/tipos-ferramentas', (req, res) => {
  db.prepare('INSERT INTO tipos_ferramentas (nome) VALUES (?)').run(req.body.nome);
  res.json({ ok: true });
});


app.get('/api/equipamentos', (req, res) => {
  const lista = db.prepare(`
    SELECT eq.*, tf.nome as tipo_nome, fo.nome as fornecedor_nome
    FROM equipamentos eq
    LEFT JOIN tipos_ferramentas tf ON tf.id = eq.tipo_id
    LEFT JOIN fornecedores fo ON fo.id = eq.fornecedor_id
    ORDER BY eq.nome
  `).all();
  res.json(lista);
});

app.post('/api/equipamentos', (req, res) => {
  const { tag, nome, tipo_id, fornecedor_id } = req.body;
  if (!tag || !nome) return res.status(400).json({ error: 'Tag e nome são obrigatórios' });
  db.prepare('INSERT INTO equipamentos (tag, nome, tipo_id, fornecedor_id) VALUES (?, ?, ?, ?)')
    .run(tag, nome, tipo_id || null, fornecedor_id || null);
  res.json({ ok: true });
});

app.delete('/api/equipamentos/:tag', (req, res) => {
  const tag = req.params.tag;
  const emprestimoAtivo = db.prepare('SELECT 1 FROM emprestimos WHERE equipamento_tag = ? AND data_devolucao IS NULL').get(tag);
  if (emprestimoAtivo) return res.status(400).json({ error: 'Equipamento está emprestado. Devolva antes de excluir.' });
  const info = db.prepare('DELETE FROM equipamentos WHERE tag = ?').run(tag);
  if (info.changes === 0) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json({ ok: true });
});


app.get('/api/epis', (req, res) => res.json(db.prepare('SELECT * FROM epis').all()));
app.post('/api/epis', (req, res) => {
  const { nome, estoque, estoque_minimo, retornavel } = req.body;
  const r = db.prepare('INSERT INTO epis (nome, estoque, estoque_minimo, retornavel) VALUES (?, ?, ?, ?)')
    .run(nome, estoque || 0, estoque_minimo || 0, retornavel ? 1 : 0);
  res.json({ ok: true, codigo: r.lastInsertRowid });
});

app.delete('/api/epis/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const emUso = db.prepare(`
    SELECT f.nome as funcionario FROM retiradas_epi re
    JOIN funcionarios f ON f.codigo = re.funcionario_codigo
    WHERE re.epi_codigo = ? AND re.data_devolucao IS NULL
  `).all(codigo);

  if (emUso.length > 0) {
    const nomes = emUso.map(e => e.funcionario).join(', ');
    return res.status(400).json({ error: `Este EPI está com os funcionários: ${nomes}. Não pode ser excluído.` });
  }

  const info = db.prepare('DELETE FROM epis WHERE codigo = ?').run(codigo);
  if (info.changes === 0) return res.status(404).json({ error: 'EPI não encontrado' });
  res.json({ ok: true });
});

// ---------- Checagem Consumíveis e Produtos ---------- 

app.delete('/api/consumiveis/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const emUso = db.prepare(`
    SELECT f.nome as funcionario FROM retiradas_consumivel r
    JOIN funcionarios f ON f.codigo = r.funcionario_codigo
    WHERE r.consumivel_codigo = ?
  `).all(codigo);

  if (emUso.length > 0) {
    const nomes = [...new Set(emUso.map(e => e.funcionario))].join(', ');
    return res.status(400).json({ error: `Este consumível possui histórico de retirada por: ${nomes}. Não pode ser excluído.` });
  }

  const info = db.prepare('DELETE FROM consumiveis WHERE codigo = ?').run(codigo);
  if (info.changes === 0) return res.status(404).json({ error: 'Consumível não encontrado' });
  res.json({ ok: true });
});

app.delete('/api/produtos/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const emUso = db.prepare(`
    SELECT f.nome as funcionario FROM retiradas_produto r
    JOIN funcionarios f ON f.codigo = r.funcionario_codigo
    WHERE r.produto_codigo = ?
  `).all(codigo);

  if (emUso.length > 0) {
    const nomes = [...new Set(emUso.map(e => e.funcionario))].join(', ');
    return res.status(400).json({ error: `Este produto possui histórico de retirada por: ${nomes}. Não pode ser excluído.` });
  }

  const info = db.prepare('DELETE FROM produtos WHERE codigo = ?').run(codigo);
  if (info.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ ok: true });
});




// ---------- EDIÇÃO DE CADASTROS ----------

app.put('/api/funcionarios/:codigo', (req, res) => {
  const { nome, data_nascimento, cargo, data_admissao, data_demissao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare(`
    UPDATE funcionarios
    SET nome = ?, data_nascimento = ?, cargo = ?, data_admissao = ?, data_demissao = ?
    WHERE codigo = ?
  `).run(nome, data_nascimento || null, cargo || null, data_admissao || null, data_demissao || null, req.params.codigo);

  if (info.changes === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
  res.json({ ok: true });
});

app.put('/api/fornecedores/:id', (req, res) => {
  const { nome, contato } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE fornecedores SET nome = ?, contato = ? WHERE id = ?')
    .run(nome, contato || null, req.params.id);

  if (info.changes === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json({ ok: true });
});

app.put('/api/unidades/:id', (req, res) => {
  const { nome, sigla } = req.body;
  if (!nome || !sigla) return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });

  const info = db.prepare('UPDATE unidades SET nome = ?, sigla = ? WHERE id = ?')
    .run(nome, sigla, req.params.id);

  if (info.changes === 0) return res.status(404).json({ error: 'Unidade não encontrada' });
  res.json({ ok: true });
});

app.put('/api/tipos-ferramentas/:id', (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE tipos_ferramentas SET nome = ? WHERE id = ?')
    .run(nome, req.params.id);

  if (info.changes === 0) return res.status(404).json({ error: 'Tipo não encontrado' });
  res.json({ ok: true });
});

app.put('/api/equipamentos/:tag', (req, res) => {
  const { nome, tipo_id, fornecedor_id } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE equipamentos SET nome = ?, tipo_id = ?, fornecedor_id = ? WHERE tag = ?')
    .run(nome, tipo_id || null, fornecedor_id || null, req.params.tag);

  if (info.changes === 0) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json({ ok: true });
});

app.put('/api/epis/:codigo', (req, res) => {
  const { nome, estoque_minimo, retornavel } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE epis SET nome = ?, estoque_minimo = ?, retornavel = ? WHERE codigo = ?')
    .run(nome, estoque_minimo || 0, retornavel ? 1 : 0, req.params.codigo);

  if (info.changes === 0) return res.status(404).json({ error: 'EPI não encontrado' });
  res.json({ ok: true });
});

app.put('/api/consumiveis/:codigo', (req, res) => {
  const { nome, unidade_id, estoque_minimo } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE consumiveis SET nome = ?, unidade_id = ?, estoque_minimo = ? WHERE codigo = ?')
    .run(nome, unidade_id || null, estoque_minimo || 0, req.params.codigo);

  if (info.changes === 0) return res.status(404).json({ error: 'Consumível não encontrado' });
  res.json({ ok: true });
});

app.put('/api/produtos/:codigo', (req, res) => {
  const { nome, fornecedor_id, unidade_id, estoque_minimo } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db.prepare('UPDATE produtos SET nome = ?, fornecedor_id = ?, unidade_id = ?, estoque_minimo = ? WHERE codigo = ?')
    .run(nome, fornecedor_id || null, unidade_id || null, estoque_minimo || 0, req.params.codigo);

  if (info.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ ok: true });
});


// ---------- ENTRADA DE ESTOQUE ----------
app.post('/api/epis/:codigo/entrada', (req, res) => {
  const { quantidade } = req.body;
  const qtd = Number(quantidade);
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

  const item = db.prepare('SELECT * FROM epis WHERE codigo = ?').get(req.params.codigo);
  if (!item) return res.status(404).json({ error: 'EPI não encontrado' });

  db.prepare('UPDATE epis SET estoque = estoque + ? WHERE codigo = ?').run(qtd, req.params.codigo);
  res.json({ ok: true });
});

app.post('/api/consumiveis/:codigo/entrada', (req, res) => {
  const { quantidade } = req.body;
  const qtd = Number(quantidade);
  if (!qtd || qtd <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

  const item = db.prepare('SELECT * FROM consumiveis WHERE codigo = ?').get(req.params.codigo);
  if (!item) return res.status(404).json({ error: 'Consumível não encontrado' });

  db.prepare('UPDATE consumiveis SET estoque = estoque + ? WHERE codigo = ?').run(qtd, req.params.codigo);
  res.json({ ok: true });
});

app.get('/api/consumiveis', (req, res) => {
  const lista = db.prepare(`
    SELECT c.*, u.sigla as unidade_sigla, u.nome as unidade_nome
    FROM consumiveis c
    LEFT JOIN unidades u ON u.id = c.unidade_id
    ORDER BY c.nome
  `).all();
  res.json(lista);
});

app.post('/api/consumiveis', (req, res) => {
  const { nome, unidade_id, estoque, estoque_minimo } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare('INSERT INTO consumiveis (nome, unidade_id, estoque, estoque_minimo) VALUES (?, ?, ?, ?)')
    .run(nome, unidade_id || null, estoque || 0, estoque_minimo || 0);
  res.json({ ok: true, codigo: r.lastInsertRowid });
});

app.get('/api/produtos', (req, res) => {
  const lista = db.prepare(`
    SELECT p.*, f.nome as fornecedor_nome, u.sigla as unidade_sigla, u.nome as unidade_nome
    FROM produtos p
    LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
    LEFT JOIN unidades u ON u.id = p.unidade_id
    ORDER BY p.nome
  `).all();
  res.json(lista);
});

app.post('/api/produtos', (req, res) => {
  const { nome, fornecedor_id, unidade_id, estoque, estoque_minimo } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare('INSERT INTO produtos (nome, fornecedor_id, unidade_id, estoque, estoque_minimo) VALUES (?, ?, ?, ?, ?)')
    .run(nome, fornecedor_id || null, unidade_id || null, estoque || 0, estoque_minimo || 0);
  res.json({ ok: true, codigo: r.lastInsertRowid });
});

// ---------- MOVIMENTAÇÃO: EMPRÉSTIMO DE EQUIPAMENTO ----------

app.get('/api/emprestimos', (req, res) => {
  const ativos = req.query.ativo === 'true';
  const sql = ativos
    ? `SELECT e.*, f.nome as funcionario_nome, eq.nome as equipamento_nome, fo.nome as fornecedor_nome
       FROM emprestimos e
       JOIN funcionarios f ON f.codigo = e.funcionario_codigo
       JOIN equipamentos eq ON eq.tag = e.equipamento_tag
       LEFT JOIN fornecedores fo ON fo.id = eq.fornecedor_id
       WHERE e.data_devolucao IS NULL
       ORDER BY e.data_emprestimo DESC`
    : `SELECT e.*, f.nome as funcionario_nome, eq.nome as equipamento_nome, fo.nome as fornecedor_nome
       FROM emprestimos e
       JOIN funcionarios f ON f.codigo = e.funcionario_codigo
       JOIN equipamentos eq ON eq.tag = e.equipamento_tag
       LEFT JOIN fornecedores fo ON fo.id = eq.fornecedor_id
       ORDER BY e.data_emprestimo DESC`;
  res.json(db.prepare(sql).all());
});



app.post('/api/emprestimos', (req, res) => {
  const { funcionario_codigo, equipamento_tag, observacao } = req.body;

  const equipamento = db.prepare('SELECT * FROM equipamentos WHERE tag = ?').get(equipamento_tag);
  if (!equipamento) return res.status(404).json({ error: 'Equipamento não encontrado' });
  if (equipamento.status === 'emprestado') {
    return res.status(400).json({ error: 'Equipamento já está emprestado e não foi devolvido' });
  }
  if (equipamento.status === 'baixado') {
    return res.status(400).json({ error: 'Equipamento foi baixado do estoque' });
  }

  const funcionario = db.prepare('SELECT * FROM funcionarios WHERE codigo = ?').get(funcionario_codigo);
  if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const agora = new Date().toISOString();
  db.prepare('INSERT INTO emprestimos (funcionario_codigo, equipamento_tag, data_emprestimo, observacao) VALUES (?, ?, ?, ?)')
    .run(funcionario_codigo, equipamento_tag, agora, observacao || null);
  db.prepare('UPDATE equipamentos SET status = ? WHERE tag = ?').run('emprestado', equipamento_tag);

  res.json({ ok: true });
});

app.put('/api/emprestimos/:id/devolver', (req, res) => {
  const emp = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Empréstimo não encontrado' });
  if (emp.data_devolucao) return res.status(400).json({ error: 'Já devolvido' });

  const dataFinal = validarDataDevolucao(req.body.data_devolucao);
  if (dataFinal.erro) return res.status(400).json({ error: dataFinal.erro });

  db.prepare('UPDATE emprestimos SET data_devolucao = ? WHERE id = ?').run(dataFinal.iso, req.params.id);
  db.prepare('UPDATE equipamentos SET status = ? WHERE tag = ?').run('disponivel', emp.equipamento_tag);
  res.json({ ok: true });
});


// buscar 1 equipamento (usado pra exibir marca no empréstimo)
app.get('/api/equipamentos/:tag', (req, res) => {
  const eq = db.prepare(`
    SELECT eq.*, tf.nome as tipo_nome, fo.nome as fornecedor_nome
    FROM equipamentos eq
    LEFT JOIN tipos_ferramentas tf ON tf.id = eq.tipo_id
    LEFT JOIN fornecedores fo ON fo.id = eq.fornecedor_id
    WHERE eq.tag = ?
  `).get(req.params.tag);
  if (!eq) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json(eq);
});


// ---------- MOVIMENTAÇÃO: EPI ----------
app.get('/api/retiradas-epi', (req, res) => {
  const { pendente } = req.query;

  let sql = `
    SELECT re.*, e.nome as epi_nome, f.nome as funcionario_nome
    FROM retiradas_epi re
    JOIN epis e ON e.codigo = re.epi_codigo
    JOIN funcionarios f ON f.codigo = re.funcionario_codigo
  `;

  if (pendente === 'true') {
    sql += ' WHERE re.data_devolucao IS NULL AND e.retornavel = 1';
  }

  sql += ' ORDER BY re.data_retirada DESC';

  const lista = db.prepare(sql).all();
  res.json(lista);
});

app.post('/api/retiradas-epi', (req, res) => {
  const { funcionario_codigo, epi_codigo, observacao } = req.body;
  const epi = db.prepare('SELECT * FROM epis WHERE codigo = ?').get(epi_codigo);
  if (!epi) return res.status(404).json({ error: 'EPI não encontrado' });
  if (epi.estoque <= 0) return res.status(400).json({ error: 'Estoque zerado' });

  db.prepare('INSERT INTO retiradas_epi (funcionario_codigo, epi_codigo, data_retirada, observacao) VALUES (?, ?, ?, ?)')
    .run(funcionario_codigo, epi_codigo, new Date().toISOString(), observacao || null);
  db.prepare('UPDATE epis SET estoque = estoque - 1 WHERE codigo = ?').run(epi_codigo);
  res.json({ ok: true });
});

app.put('/api/retiradas-epi/:id/devolver', (req, res) => {
  const retirada = db.prepare('SELECT * FROM retiradas_epi WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });
  if (retirada.data_devolucao) return res.status(400).json({ error: 'Já devolvido' });

  const dataFinal = validarDataDevolucao(req.body.data_devolucao);
  if (dataFinal.erro) return res.status(400).json({ error: dataFinal.erro });

  db.prepare('UPDATE retiradas_epi SET data_devolucao = ? WHERE id = ?').run(dataFinal.iso, req.params.id);
  db.prepare('UPDATE epis SET estoque = estoque + 1 WHERE codigo = ?').run(retirada.epi_codigo);

  res.json({ ok: true });
});



// ---------- MOVIMENTAÇÃO: CONSUMÍVEL ----------

app.get('/api/retiradas-consumivel', (req, res) => {
  const lista = db.prepare(`
    SELECT r.*, c.nome as consumivel_nome, f.nome as funcionario_nome
    FROM retiradas_consumivel r
    JOIN consumiveis c ON c.codigo = r.consumivel_codigo
    JOIN funcionarios f ON f.codigo = r.funcionario_codigo
    ORDER BY r.data_retirada DESC
  `).all();
  res.json(lista);
});

app.post('/api/retiradas-consumivel', (req, res) => {
  const { funcionario_codigo, consumivel_codigo, quantidade, observacao } = req.body;
  const qtd = quantidade || 1;
  const item = db.prepare('SELECT * FROM consumiveis WHERE codigo = ?').get(consumivel_codigo);
  if (!item) return res.status(404).json({ error: 'Consumível não encontrado' });
  if (item.estoque < qtd) return res.status(400).json({ error: 'Estoque insuficiente' });

  db.prepare('INSERT INTO retiradas_consumivel (funcionario_codigo, consumivel_codigo, quantidade, data_retirada, observacao) VALUES (?, ?, ?, ?, ?)')
    .run(funcionario_codigo, consumivel_codigo, qtd, new Date().toISOString(), observacao || null);
  db.prepare('UPDATE consumiveis SET estoque = estoque - ? WHERE codigo = ?').run(qtd, consumivel_codigo);
  res.json({ ok: true });
});

// ---------- MOVIMENTAÇÃO: PRODUTO ----------
app.get('/api/retiradas-produto', (req, res) => {
  const lista = db.prepare(`
    SELECT r.*, p.nome as produto_nome, f.nome as funcionario_nome
    FROM retiradas_produto r
    JOIN produtos p ON p.codigo = r.produto_codigo
    JOIN funcionarios f ON f.codigo = r.funcionario_codigo
    ORDER BY r.data_retirada DESC
  `).all();
  res.json(lista);
});

app.post('/api/retiradas-produto', (req, res) => {
  const { funcionario_codigo, produto_codigo, quantidade, observacao } = req.body;
  const qtd = quantidade || 1;
  const item = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(produto_codigo);
  if (!item) return res.status(404).json({ error: 'Produto não encontrado' });
  if (item.estoque < qtd) return res.status(400).json({ error: 'Estoque insuficiente' });

  db.prepare('INSERT INTO retiradas_produto (funcionario_codigo, produto_codigo, quantidade, data_retirada, observacao) VALUES (?, ?, ?, ?, ?)')
    .run(funcionario_codigo, produto_codigo, qtd, new Date().toISOString(), observacao || null);
  db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE codigo = ?').run(qtd, produto_codigo);
  res.json({ ok: true });
});

// ---------- EXCLUSÃO DE RETIRADAS (devolve ao estoque) ----------

app.delete('/api/retiradas-epi/:id', (req, res) => {
  const retirada = db.prepare('SELECT * FROM retiradas_epi WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });

  db.prepare('UPDATE epis SET estoque = estoque + 1 WHERE codigo = ?').run(retirada.epi_codigo);
  db.prepare('DELETE FROM retiradas_epi WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/retiradas-consumivel/:id', (req, res) => {
  const retirada = db.prepare('SELECT * FROM retiradas_consumivel WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });

  db.prepare('UPDATE consumiveis SET estoque = estoque + ? WHERE codigo = ?')
    .run(retirada.quantidade, retirada.consumivel_codigo);
  db.prepare('DELETE FROM retiradas_consumivel WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/retiradas-produto/:id', (req, res) => {
  const retirada = db.prepare('SELECT * FROM retiradas_produto WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });

  db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE codigo = ?')
    .run(retirada.quantidade, retirada.produto_codigo);
  db.prepare('DELETE FROM retiradas_produto WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- EDIÇÃO DE RETIRADAS (corrige sem excluir) ----------

app.put('/api/retiradas-consumivel/:id', (req, res) => {
  const { quantidade, observacao } = req.body;
  const retirada = db.prepare('SELECT * FROM retiradas_consumivel WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });

  const novaQtd = Number(quantidade);
  if (!novaQtd || novaQtd <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

  const diferenca = retirada.quantidade - novaQtd; // se reduziu a retirada, devolve a diferença
  const item = db.prepare('SELECT * FROM consumiveis WHERE codigo = ?').get(retirada.consumivel_codigo);
  if (item.estoque + diferenca < 0) return res.status(400).json({ error: 'Estoque insuficiente para essa alteração' });

  db.prepare('UPDATE consumiveis SET estoque = estoque + ? WHERE codigo = ?')
    .run(diferenca, retirada.consumivel_codigo);
  db.prepare('UPDATE retiradas_consumivel SET quantidade = ?, observacao = ? WHERE id = ?')
    .run(novaQtd, observacao || null, req.params.id);

  res.json({ ok: true });
});

app.put('/api/retiradas-produto/:id', (req, res) => {
  const { quantidade, observacao } = req.body;
  const retirada = db.prepare('SELECT * FROM retiradas_produto WHERE id = ?').get(req.params.id);
  if (!retirada) return res.status(404).json({ error: 'Retirada não encontrada' });

  const novaQtd = Number(quantidade);
  if (!novaQtd || novaQtd <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

  const diferenca = retirada.quantidade - novaQtd;
  const item = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(retirada.produto_codigo);
  if (item.estoque + diferenca < 0) return res.status(400).json({ error: 'Estoque insuficiente para essa alteração' });

  db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE codigo = ?')
    .run(diferenca, retirada.produto_codigo);
  db.prepare('UPDATE retiradas_produto SET quantidade = ?, observacao = ? WHERE id = ?')
    .run(novaQtd, observacao || null, req.params.id);

  res.json({ ok: true });
});



// ---------- FICHA DO FUNCIONÁRIO ----------
app.get('/api/ficha/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const funcionario = db.prepare('SELECT * FROM funcionarios WHERE codigo = ?').get(codigo);
  if (!funcionario) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const equipamentos = db.prepare(`
    SELECT e.*, eq.nome as equipamento_nome, eq.tag as equipamento_tag FROM emprestimos e
    JOIN equipamentos eq ON eq.tag = e.equipamento_tag
    WHERE e.funcionario_codigo = ?`).all(codigo);


  const epis = db.prepare(`
    SELECT r.*, ep.nome as epi_nome FROM retiradas_epi r
    JOIN epis ep ON ep.codigo = r.epi_codigo
    WHERE r.funcionario_codigo = ?`).all(codigo);

  const consumiveis = db.prepare(`
    SELECT r.*, c.nome as consumivel_nome FROM retiradas_consumivel r
    JOIN consumiveis c ON c.codigo = r.consumivel_codigo
    WHERE r.funcionario_codigo = ?`).all(codigo);

  res.json({ funcionario, equipamentos, epis, consumiveis });
});

// ---------- BAIXA DE ESTOQUE ----------
app.get('/api/baixas-estoque', (req, res) => {
  res.json(db.prepare('SELECT * FROM baixas_estoque ORDER BY id DESC').all());
});

app.post('/api/baixas-estoque', (req, res) => {
  const { item_tipo, item_codigo, item_nome, quantidade, motivo } = req.body;
  const agora = new Date().toISOString();

  // --- VALIDAÇÃO: impedir baixa de item em uso ---
  if (item_tipo === 'equipamento') {
    const emprestimoAtivo = db.prepare(
      'SELECT 1 FROM emprestimos WHERE equipamento_tag = ? AND data_devolucao IS NULL'
    ).get(item_codigo);
    if (emprestimoAtivo) {
      return res.status(400).json({ error: 'Equipamento em uso, faça a devolução primeiro!' });
    }
  }

  if (item_tipo === 'epi') {
    const retiradaAtiva = db.prepare(`
      SELECT re.* FROM retiradas_epi re
      JOIN epis e ON e.codigo = re.epi_codigo
      WHERE re.epi_codigo = ? AND re.data_devolucao IS NULL AND e.retornavel = 1
    `).get(item_codigo);
    if (retiradaAtiva) {
      return res.status(400).json({ error: 'EPI retornável em uso, faça a devolução primeiro!' });
    }
  }
  // --- FIM VALIDAÇÃO ---

  // --- NOVO: baixa por quantidade (epi, consumivel, produto usam estoque) ---
  if (['epi', 'consumivel', 'produto'].includes(item_tipo)) {
    const tabela = item_tipo === 'epi' ? 'epis' : item_tipo === 'consumivel' ? 'consumiveis' : 'produtos';
    const registro = db.prepare(`SELECT estoque FROM ${tabela} WHERE codigo = ?`).get(item_codigo);

    if (!registro) return res.status(404).json({ error: 'Item não encontrado.' });

    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      return res.status(400).json({ error: 'Informe uma quantidade válida para a baixa.' });
    }
    if (qtd > registro.estoque) {
      return res.status(400).json({ error: `Quantidade maior que o estoque disponível (${registro.estoque}).` });
    }

    db.prepare(`UPDATE ${tabela} SET estoque = estoque - ? WHERE codigo = ?`).run(qtd, item_codigo);
  } else if (item_tipo === 'equipamento') {
    db.prepare('UPDATE equipamentos SET status = ? WHERE tag = ?').run('baixado', item_codigo);
  } else {
    return res.status(400).json({ error: 'Tipo de item inválido.' });
  }

  db.prepare(`
    INSERT INTO baixas_estoque (item_tipo, item_codigo, item_nome, quantidade, data_baixa, motivo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(item_tipo, item_codigo, item_nome, quantidade || 1, agora, motivo || null);

  res.json({ ok: true });
});



// ---------- DASHBOARD ----------
app.get('/api/dashboard', (req, res) => {
  try {
    const disponiveis = db.prepare("SELECT * FROM equipamentos WHERE status = 'disponivel'").all();
    const emprestados = db.prepare(`
      SELECT e.*, f.nome as funcionario_nome, eq.nome as equipamento_nome, fo.nome as fornecedor_nome
      FROM emprestimos e
      JOIN funcionarios f ON f.codigo = e.funcionario_codigo
      JOIN equipamentos eq ON eq.tag = e.equipamento_tag
      LEFT JOIN fornecedores fo ON fo.id = eq.fornecedor_id
      WHERE e.data_devolucao IS NULL`).all();
    const epiBaixo = db.prepare('SELECT * FROM epis WHERE estoque_minimo > 0 AND estoque <= estoque_minimo').all();
    const consumivelBaixo = db.prepare('SELECT * FROM consumiveis WHERE estoque_minimo > 0 AND estoque <= estoque_minimo').all();
    const produtoBaixo = db.prepare('SELECT * FROM produtos WHERE estoque_minimo > 0 AND estoque <= estoque_minimo').all();
    res.json({
      equipamentos_disponiveis: disponiveis,
      equipamentos_emprestados: emprestados,
      estoque_baixo: { epis: epiBaixo, consumiveis: consumivelBaixo, produtos: produtoBaixo }
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});


// ---------- SUPORTE IA ----------

const SYSTEM_PROMPT = `Você é o assistente de suporte do sistema Almoxarifado. Responda APENAS perguntas sobre o uso deste sistema, de forma clara, objetiva e em português brasileiro.

O sistema possui as seguintes seções:

1. DASHBOARD: Exibe um resumo geral — equipamentos disponíveis, equipamentos não devolvidos (emprestados) e itens com estoque baixo (EPI, Consumível, Produto abaixo do mínimo cadastrado).

2. CADASTROS:
   - Funcionário: cadastre nome, cargo, datas de nascimento/admissão/demissão. O código é gerado automaticamente. Use os botões Editar e Excluir na lista. Não é possível excluir funcionário com empréstimo ou EPI retornável em aberto.
   - Fornecedor: nome e contato.
   - Unidade de Medida: nome (ex: Quilograma) e sigla (ex: kg). Usada em Consumíveis e Produtos.
   - Tipo de Ferramenta: categorias para agrupar equipamentos (ex: Furadeira, Serra).
   - Equipamento: TAG/patrimônio, nome, tipo e fornecedor. Status pode ser Disponível, Emprestado ou Baixado.
   - EPI: nome, estoque inicial, estoque mínimo (alerta de baixo estoque) e se é retornável (ex: capacete, bota, avental) ou descartável (ex: luva, protetor auricular).
   - Consumível: nome, unidade, estoque e mínimo (ex: parafuso, graxa).
   - Produto: nome, fornecedor, unidade, estoque e mínimo.

3. MOVIMENTAÇÃO:
   - Empréstimo de Equipamento: selecione o funcionário (busca por código ou nome) e informe a TAG do equipamento. Clique em Devolver para registrar a devolução (escolha a data, não pode ser futura).
   - Retirada de EPI: selecione o funcionário e o EPI. EPIs retornáveis ficam como "pendentes" até serem devolvidos.
   - Retirada de Consumível: selecione funcionário, consumível e informe a quantidade.
   - Retirada de Produto: igual ao consumível.

4. FICHA DO FUNCIONÁRIO: busque por código ou nome para ver todo o histórico de empréstimos, EPIs e consumíveis do funcionário. Também é possível dar baixa no funcionário por aqui.

5. BAIXA DE ESTOQUE: selecione o tipo (Equipamento, EPI, Consumível ou Produto), busque o item e informe a quantidade e motivo. Para equipamento, não há quantidade (baixa total). Não é possível dar baixa em item com empréstimo ativo.

REGRAS GERAIS:
- Autocomplete: nos campos de código/nome do funcionário ou item, basta digitar para aparecer a lista.
- Datas de devolução não podem ser futuras.
- Estoque não pode ficar negativo.
- Para entradas de estoque (reposição), edite o item no cadastro ou registre via entrada no próprio cadastro.

Se a pergunta não for sobre este sistema, diga educadamente que só pode ajudar com dúvidas do Almoxarifado.`;

app.post('/api/suporte', async (req, res) => {
  const { mensagens } = req.body;
  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    return res.status(400).json({ error: 'Mensagens inválidas' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'A chave do Google Gemini não está configurada. Adicione GEMINI_API_KEY no arquivo .env para ativar o suporte IA.'
    });
  }

  try {
    // Gemini usa "model" para o papel do assistente (não "assistant")
    const contents = mensagens.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.5 }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || 'Erro ao contatar o Gemini';
      return res.status(502).json({ error: msg });
    }

    const data = await response.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sem resposta da IA.';
    res.json({ resposta });
  } catch (err) {
    console.error('Erro no suporte IA:', err.message);
    res.status(500).json({ error: 'Erro interno ao processar sua mensagem.' });
  }
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
