const Database = require('better-sqlite3');
const db = new Database('almoxarifado.db');

// 1. Ver todas as tabelas
console.log('--- Tabelas ---');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

// 2. Ver colunas da tabela equipamentos
console.log('--- Colunas de equipamentos ---');
console.log(db.prepare("PRAGMA table_info(equipamentos)").all());

db.close();
