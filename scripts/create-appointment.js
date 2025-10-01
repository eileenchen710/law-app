#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });
const http = require("http");
const { parse } = require("url");
const handler = require("../api/appointments/index.js");

function enhanceResponse(res) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.json = function json(payload) {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json");
    }
    res.end(JSON.stringify(payload));
  };

  res.send = function send(payload) {
    if (typeof payload === "object" && payload !== null) {
      return res.json(payload);
    }
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    res.end(String(payload ?? ""));
  };
}

function attachQuery(req, parsedUrl, segments) {
  req.query = { ...parsedUrl.query };
  if (segments[2]) {
    req.query.id = segments[2];
  }
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve();
        return;
      }
      const raw = Buffer.concat(chunks).toString();
      req.rawBody = raw;
      if (req.headers["content-type"] && req.headers["content-type"].includes("application/json")) {
        try {
          req.body = JSON.parse(raw);
        } catch (error) {
          req.body = raw;
        }
      } else {
        req.body = raw;
      }
      resolve();
    });
  });
}

async function main() {
  const server = http.createServer(async (req, res) => {
    enhanceResponse(res);
    const parsedUrl = parse(req.url, true);
    const segments = parsedUrl.pathname.split("/").filter(Boolean);

    if (segments.length < 2 || segments[0] !== "api" || segments[1] !== "appointments") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    attachQuery(req, parsedUrl, segments);

    try {
      await readRequestBody(req);
      await handler(req, res);
    } catch (error) {
      console.error("Function execution error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
      } else {
        res.end();
      }
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const payload = {
      name: `API Created Appointment ${Date.now()}`,
      contact: "13800138000",
      description: "Created via local Vercel function runner.",
    };

    const response = await fetch(`http://127.0.0.1:${port}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(data)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log("Created appointment via API:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to create appointment via API:", error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

main();
