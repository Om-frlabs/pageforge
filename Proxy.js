const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 3001;

// Allow requests from React dev server
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key", "anthropic-version", "anthropic-dangerous-direct-browser-access"],
}));

// Proxy /claude/* → https://api.anthropic.com/*
app.use(
  "/claude",
  createProxyMiddleware({
    target: "https://api.anthropic.com",
    changeOrigin: true,
    pathRewrite: { "^/claude": "" },
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward the api key header if present
        if (req.headers["x-api-key"]) {
          proxyReq.setHeader("x-api-key", req.headers["x-api-key"]);
        }
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`\n✅  Claude proxy running at http://localhost:${PORT}`);
  console.log(`   Forwarding /claude/* → https://api.anthropic.com/*\n`);
});