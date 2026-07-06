const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'almoxarifado.db'));
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
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  retornavel INTEGER DEFAULT 0
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

// Migração: adiciona colunas novas em equipamentos se não existirem

const colunas = db.prepare("PRAGMA table_info(equipamentos)").all().map(c => c.name);
if (!colunas.includes('fornecedor_id')) {
  db.exec('ALTER TABLE equipamentos ADD COLUMN fornecedor_id INTEGER REFERENCES fornecedores(id)');
}

// Migração: adiciona coluna quantidade em baixas_estoque se não existir
const colunasBaixas = db.prepare("PRAGMA table_info(baixas_estoque)").all().map(c => c.name);
if (!colunasBaixas.includes('quantidade')) {
  db.exec('ALTER TABLE baixas_estoque ADD COLUMN quantidade INTEGER DEFAULT 1');
}


// Seed usuário admin
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

module.exports = db;
