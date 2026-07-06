const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'almoxarifado.db'));

const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger'").all();
console.log('--- TRIGGERS ---');
console.log(triggers);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
console.log('--- TABELAS ---');
console.log(tables);