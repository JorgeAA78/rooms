const express = require("express");
const path = require("path");

const app = express();

const distPath = path.join(__dirname, "..", "dist");

app.use(express.json());
app.use(express.static(distPath));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port);
}

module.exports = app;
