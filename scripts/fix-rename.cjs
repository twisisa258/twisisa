const fs = require("fs");
const { Client } = require("pg");
if (fs.existsSync(".env")) {
  for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("BEGIN");
  try {
    const { rows } = await c.query('select id, name from "_migrations" where id in (41, 42)');
    const r41 = rows.find(r => r.id === 41);
    const r42 = rows.find(r => r.id === 42);
    if (r42) { console.log("id 42 já existe:", r42.name, "- nada a fazer"); await c.query("ROLLBACK"); }
    else if (!r41 || r41.name !== "0041_plus_sugestoes.sql") {
      console.log("id 41 não é 0041_plus_sugestoes.sql:", r41 && r41.name, "- abortado"); await c.query("ROLLBACK");
    } else {
      await c.query('update "_migrations" set id = 42, name = $1 where id = 41', ["0042_plus_sugestoes.sql"]);
      await c.query("COMMIT");
      console.log("Registo 41 -> 42 (0042_plus_sugestoes.sql)");
    }
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
