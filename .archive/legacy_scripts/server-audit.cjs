const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('/api/audit')) {
  code = code.replace(
    'app.get("/api/health"',
    `app.use(express.json({limit: '50mb'}));
app.post("/api/audit", (req, res) => {
  console.log("\\n\\n[AUDIT FROM BROWSER]:\\n", req.body.msg, "\\n\\n");
  res.json({ok:true});
});
app.get("/api/health"`
  );
  fs.writeFileSync('server.ts', code);
  console.log("Added /api/audit to server.ts");
}
