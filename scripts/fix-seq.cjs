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
  const { rows: [r] } = await c.query(
    "select coalesce(max(id),0) as max, count(*) as n, pg_get_serial_sequence('_migrations','id') as seq from _migrations"
  );
  console.log("max id:", r.max, "| linhas:", r.n, "| sequência:", r.seq);
  if (r.seq) {
    await c.query("select setval($1, $2)", [r.seq, Number(r.max)]);
    console.log("Sequência ajustada para", r.max);
  } else {
    console.log("Sem sequência: o id vem do migrate.ts (linha ~57).");
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
