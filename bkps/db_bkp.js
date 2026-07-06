const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('almoxarifado.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS funcionarios (
  codigo INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  data_baixa TEXT
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  contato TEXT
);

CREATE TABLE IF NOT EXISTS tipos_ferramentas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tipos_epis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS unidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipamentos (
  tag TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_id INTEGER,
  status TEXT DEFAULT 'disponivel', -- disponivel | emprestado | baixado
  FOREIGN KEY (tipo_id) REFERENCES tipos_ferramentas(id)
);

CREATE TABLE IF NOT EXISTS epis (
  codigo INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo_id INTEGER,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  FOREIGN KEY (tipo_id) REFERENCES tipos_epis(id)
);

CREATE TABLE IF NOT EXISTS consumiveis (
  codigo INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produtos (
  codigo INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  fornecedor_id INTEGER,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

CREATE TABLE IF NOT EXISTS emprestimos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_codigo INTEGER NOT NULL,
  equipamento_tag TEXT NOT NULL,
  data_emprestimo TEXT NOT NULL,
  data_devolucao TEXT,
  observacao TEXT,
  FOREIGN KEY (funcionario_codigo) REFERENCES funcionarios(codigo),
  FOREIGN KEY (equipamento_tag) REFERENCES equipamentos(tag)
);

CREATE TABLE IF NOT EXISTS retiradas_epi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_codigo INTEGER NOT NULL,
  epi_codigo INTEGER NOT NULL,
  data_retirada TEXT NOT NULL,
  observacao TEXT,
  FOREIGN KEY (funcionario_codigo) REFERENCES funcionarios(codigo),
  FOREIGN KEY (epi_codigo) REFERENCES epis(codigo)
);

CREATE TABLE IF NOT EXISTS retiradas_consumivel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_codigo INTEGER NOT NULL,
  consumivel_codigo INTEGER NOT NULL,
  quantidade INTEGER DEFAULT 1,
  data_retirada TEXT NOT NULL,
  observacao TEXT,
  FOREIGN KEY (funcionario_codigo) REFERENCES funcionarios(codigo),
  FOREIGN KEY (consumivel_codigo) REFERENCES consumiveis(codigo)
);

CREATE TABLE IF NOT EXISTS retiradas_produto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_codigo INTEGER NOT NULL,
  produto_codigo INTEGER NOT NULL,
  quantidade INTEGER DEFAULT 1,
  data_retirada TEXT NOT NULL,
  observacao TEXT,
  FOREIGN KEY (funcionario_codigo) REFERENCES funcionarios(codigo),
  FOREIGN KEY (produto_codigo) REFERENCES produtos(codigo)
);

CREATE TABLE IF NOT EXISTS baixas_estoque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_tipo TEXT NOT NULL,
  item_codigo TEXT NOT NULL,
  item_nome TEXT NOT NULL,
  data_baixa TEXT NOT NULL,
  motivo TEXT
);

`);

// Migração: garantir que funcionarios use AUTOINCREMENT (evita reciclagem de código)
const infoFuncionarios = db.prepare(`
  SELECT sql FROM sqlite_master WHERE type='table' AND name='funcionarios'
`).get();

if (infoFuncionarios && !infoFuncionarios.sql.includes('AUTOINCREMENT')) {
  db.exec(`
    ALTER TABLE funcionarios RENAME TO funcionarios_old;

    CREATE TABLE funcionarios (
      codigo INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      data_baixa TEXT
    );

    INSERT INTO funcionarios (codigo, nome, ativo, data_baixa)
    SELECT codigo, nome, ativo, data_baixa FROM funcionarios_old;

    DROP TABLE funcionarios_old;
  `);
  console.log('Migração: tabela funcionarios convertida para AUTOINCREMENT.');
}

// Migração: novas colunas em funcionarios
const colunasFuncionario = [
  'ALTER TABLE funcionarios ADD COLUMN data_nascimento TEXT',
  'ALTER TABLE funcionarios ADD COLUMN cargo TEXT',
  'ALTER TABLE funcionarios ADD COLUMN data_admissao TEXT',
  'ALTER TABLE funcionarios ADD COLUMN data_demissao TEXT'
];
colunasFuncionario.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* coluna já existe, ignora */ }
});

const colunasEpi = [
  'ALTER TABLE tipos_epis ADD COLUMN retornavel INTEGER DEFAULT 0',
  'ALTER TABLE retiradas_epi ADD COLUMN data_devolucao TEXT'
];
colunasEpi.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* já existe */ }
});
const colunasUnidade = [
  'ALTER TABLE consumiveis ADD COLUMN unidade_id INTEGER REFERENCES unidades(id)',
  'ALTER TABLE produtos ADD COLUMN unidade_id INTEGER REFERENCES unidades(id)'
];
colunasUnidade.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* já existe */ }
});

const colunasEquipamento = [
  'ALTER TABLE equipamentos ADD COLUMN marca TEXT',
  'ALTER TABLE equipamentos ADD COLUMN data_cadastro TEXT'
];
colunasEquipamento.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* já existe */ }
});
const colunasEquipamentoFornecedor = [
  'ALTER TABLE equipamentos ADD COLUMN fornecedor_id INTEGER REFERENCES fornecedores(id)'
];
colunasEquipamentoFornecedor.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* já existe */ }
});

const colunasEpiCadastro = [
  'ALTER TABLE epis ADD COLUMN retornavel INTEGER DEFAULT 0'
];
colunasEpiCadastro.forEach(sql => {
  try { db.exec(sql); } catch (e) { /* já existe */ }
});

// Migração: remover coluna órfã tipos_epis.retornavel (não é mais usada)
const infoTiposEpis = db.prepare(`
  SELECT sql FROM sqlite_master WHERE type='table' AND name='tipos_epis'
`).get();

if (infoTiposEpis && infoTiposEpis.sql.includes('retornavel')) {
  db.exec(`
    ALTER TABLE tipos_epis RENAME TO tipos_epis_old;

    CREATE TABLE tipos_epis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    INSERT INTO tipos_epis (id, nome)
    SELECT id, nome FROM tipos_epis_old;

    DROP TABLE tipos_epis_old;
  `);
  console.log('Migração: coluna tipos_epis.retornavel removida.');
}

// Limpeza de artefatos de schema antigo (tabela tipos_epis foi migrada e deixou trigger/tabela órfã)
db.exec(`
  DROP TRIGGER IF EXISTS trg_epis_algo;  -- troque pelo nome real que aparecer no check_triggers.js
  DROP TABLE IF EXISTS tipos_epis_old;
`);


// Seed usuário admin
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

module.exports = db;
