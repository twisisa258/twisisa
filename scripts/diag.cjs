const fs = require("fs");
const { Client } = require("pg");
if (fs.existsSync(".env")) {
  for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
(async () => {
  const dir = process.argv[2];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query('select id, name from "_migrations" order by id');
  const names = new Set(rows.map(r => r.name));
  console.log("\n== Ficheiros sem registo (por nome) ==");
  for (const f of files) if (!names.has(f)) console.log("PENDENTE:", f);
  console.log("\n== Linhas de 38 a 42 na tabela ==");
  for (const r of rows.filter(r => r.id >= 38)) console.log(r.id, r.name);
  console.log("\n== Registos sem ficheiro ==");
  for (const r of rows) if (!files.includes(r.name)) console.log("SEM FICHEIRO:", r.id, r.name);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
