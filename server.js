"use strict";

const http = require("http");

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "127.0.0.1";
const GREETING = process.env.GREETING || "hello-from-termcloud";
const STARTED_AT = Date.now();

const DATABASE_URL = process.env.DATABASE_URL || "";
const REDIS_URL = process.env.REDIS_URL || "";

let pgPool = null;
let redisClient = null;
const deps = { pg: false, redis: false };

if (DATABASE_URL && !DATABASE_URL.includes("<dbname>")) {
  try {
    const { Pool } = require("pg");
    pgPool = new Pool({ connectionString: DATABASE_URL });
    deps.pg = true;
  } catch (e) {
    console.error("pg unavailable:", e.message);
  }
}

if (REDIS_URL) {
  try {
    const { createClient } = require("redis");
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (e) => console.error("redis error:", e.message));
    redisClient.connect().then(() => { deps.redis = true; }).catch(() => {});
  } catch (e) {
    console.error("redis unavailable:", e.message);
  }
}

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/health") {
    return json(res, 200, { status: "ok", uptimeSeconds: (Date.now() - STARTED_AT) / 1000 });
  }

  if (url === "/") {
    return json(res, 200, {
      message: GREETING,
      service: "termcloud-sample-api",
      commit: process.env.REPO_COMMIT || "unknown",
      databaseConfigured: Boolean(DATABASE_URL),
      redisConfigured: Boolean(REDIS_URL),
      pi: Math.PI,
      now: new Date().toISOString(),
      uptimeSeconds: (Date.now() - STARTED_AT) / 1000,
    });
  }

  if (url === "/guess") {
    // Demonstrably "not God": fixed, mediocre pi approximation.
    return json(res, 200, { pi: 3.14159, accurate: false });
  }

  // Increments a counter in Redis and mirrors the row in Postgres. Demonstrates
  // the managed Redis + Postgres wiring end-to-end.
  if (url === "/count") {
    const result = { redis: null, postgres: null, errors: [] };

    if (redisClient) {
      try {
        result.redis = await redisClient.incr("termcloud:count");
      } catch (e) {
        result.errors.push("redis: " + e.message);
      }
    } else {
      result.errors.push("redis not configured");
    }

    if (pgPool) {
      try {
        await pgPool.query(
          "CREATE TABLE IF NOT EXISTS hits (id serial primary key, at timestamptz default now())"
        );
        await pgPool.query("INSERT INTO hits DEFAULT VALUES");
        const row = await pgPool.query("SELECT count(*)::int AS hits FROM hits");
        result.postgres = row.rows[0].hits;
      } catch (e) {
        result.errors.push("postgres: " + e.message);
      }
    } else {
      result.errors.push("postgres not configured");
    }

    return json(res, 200, result);
  }

  return json(res, 404, { error: "not found", path: url });
});

server.listen(PORT, HOST, () => {
  console.log(`sample-api listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`received ${signal}, shutting down`);
  server.close(async () => {
    try { if (redisClient) await redisClient.quit(); } catch (_) {}
    try { if (pgPool) await pgPool.end(); } catch (_) {}
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
