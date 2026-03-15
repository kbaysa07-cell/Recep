import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Recep AI Engine Server is running" });
  });

  app.post("/api/terminal", (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "Komut gerekli" });

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.json({ error: error.message, stdout, stderr });
      }
      res.json({ stdout, stderr });
    });
  });

  // --- VITE MIDDLEWARE (Must be after API routes) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
