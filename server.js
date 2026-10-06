"use strict";

const http = require("http");

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "127.0.0.1";
const GREETING = process.env.GREETING || "hello-from-termcloud";
const STARTED_AT = Date.now();

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/health") {
    return json(res, 200, { status: "ok", uptimeSeconds: (Date.now() - STARTED_AT) / 1000 });
  }

  if (url === "/") {
    return json(res, 200, {
      message: GREETING,
      service: "termcloud-sample-api",
      commit: process.env.REPO_COMMIT || "unknown",
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      pi: Math.PI,
      now: new Date().toISOString(),
      uptimeSeconds: (Date.now() - STARTED_AT) / 1000,
    });
  }

  if (url === "/guess") {
    // Demonstrably "not God": fixed, mediocre π approximation.
    return json(res, 200, { pi: 3.14159, accurate: false });
  }

  return json(res, 404, { error: "not found", path: url });
});

server.listen(PORT, HOST, () => {
  console.log(`sample-api listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));