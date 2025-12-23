const express = require("express");
const path = require("path");

const app = express();

const distPath = path.join(__dirname, "..", "dist");

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL;

function requireFirebaseDbUrl() {
  if (!firebaseDatabaseUrl) {
    throw new Error("Missing FIREBASE_DATABASE_URL env var");
  }
  return firebaseDatabaseUrl.replace(/\/+$/, "");
}

async function firebaseFetchJson(url, options) {
  const res = await fetch(url, {
    headers: {
      "content-type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Firebase request failed (${res.status}): ${msg}`);
  }
  return data;
}

app.use(express.json());
app.use(express.static(distPath));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { owner } = req.body || {};
    if (!owner || typeof owner !== "string") {
      return res.status(400).json({ error: "owner is required" });
    }

    const baseUrl = requireFirebaseDbUrl();
    const created = await firebaseFetchJson(`${baseUrl}/rooms.json`, {
      method: "POST",
      body: JSON.stringify({ owner, messages: {} }),
    });

    const roomId = created && created.name;
    if (!roomId) {
      return res.status(500).json({ error: "Failed to create room" });
    }
    res.status(201).json({ roomId });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const baseUrl = requireFirebaseDbUrl();
    const room = await firebaseFetchJson(`${baseUrl}/rooms/${roomId}.json`, {
      method: "GET",
    });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ roomId, ...room });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const baseUrl = requireFirebaseDbUrl();
    const messages = await firebaseFetchJson(
      `${baseUrl}/rooms/${roomId}/messages.json`,
      { method: "GET" }
    );
    res.json({ messages: messages || [] });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { from, message } = req.body || {};
    if (!from || typeof from !== "string") {
      return res.status(400).json({ error: "from is required" });
    }
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const baseUrl = requireFirebaseDbUrl();
    const created = await firebaseFetchJson(
      `${baseUrl}/rooms/${roomId}/messages.json`,
      {
        method: "POST",
        body: JSON.stringify({
          from,
          message,
          timestamp: Date.now(),
        }),
      }
    );

    res.status(201).json({ id: created && created.name });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port);
}

module.exports = app;
