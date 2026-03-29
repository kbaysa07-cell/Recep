import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import httpGit from "isomorphic-git/http/node";
import { Server } from "socket.io";
import { createServer } from "http";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Recep AI Engine Server is running" });
  });

  // --- TERMINAL API ---
  app.post("/api/terminal", async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "Komut gerekli" });

    if (command.startsWith('git commit')) {
      try {
        const messageMatch = command.match(/-m\s+"([^"]+)"/);
        const message = messageMatch ? messageMatch[1] : 'Update';
        
        await git.commit({
          fs,
          dir: process.cwd(),
          author: {
            name: 'Recep AI Engine',
            email: 'ai@recepai.com',
          },
          message: message
        });
        return res.json({ stdout: `Commit başarılı: ${message}`, stderr: '' });
      } catch (err: any) {
        return res.json({ error: err.message, stdout: '', stderr: err.message });
      }
    } else if (command.startsWith('git push')) {
      try {
         exec('git push', (error, stdout, stderr) => {
            if (error) {
              return res.json({ error: error.message, stdout, stderr });
            }
            res.json({ stdout, stderr });
          });
          return;
      } catch (err: any) {
        return res.json({ error: err.message, stdout: '', stderr: err.message });
      }
    } else if (command.startsWith('git add')) {
       try {
          const file = command.split(' ')[2];
          if(file === '.') {
             exec('git add .', (error, stdout, stderr) => {
                if (error) {
                  return res.json({ error: error.message, stdout, stderr });
                }
                res.json({ stdout, stderr });
              });
              return;
          } else {
            await git.add({ fs, dir: process.cwd(), filepath: file });
            return res.json({ stdout: `Dosya eklendi: ${file}`, stderr: '' });
          }
       } catch (err: any) {
          return res.json({ error: err.message, stdout: '', stderr: err.message });
       }
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.json({ error: error.message, stdout, stderr });
      }
      res.json({ stdout, stderr });
    });
  });

  // --- FILE OPERATIONS API ---
  app.post("/api/files/read", (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Dosya yolu gerekli" });
    
    const absolutePath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "Dosya bulunamadı" });
    
    const content = fs.readFileSync(absolutePath, 'utf-8');
    res.json({ content });
  });

  app.post("/api/files/write", (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: "Dosya yolu ve içerik gerekli" });
    
    const absolutePath = path.join(process.cwd(), filePath);
    fs.writeFileSync(absolutePath, content, 'utf-8');
    res.json({ success: true });
  });

  app.post("/api/files/create", (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "Dosya yolu gerekli" });
    
    const absolutePath = path.join(process.cwd(), filePath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(absolutePath, content || '', 'utf-8');
    res.json({ success: true });
  });

  app.post("/api/files/delete", (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Dosya yolu gerekli" });
    
    const absolutePath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "Dosya bulunamadı" });
    
    fs.unlinkSync(absolutePath);
    res.json({ success: true });
  });

  // --- SOCKET.IO TERMINAL ---
  io.on("connection", (socket) => {
    console.log("Client connected to terminal socket");
    
    // Spawn an interactive shell
    const shell = process.env.SHELL || 'bash';
    const ptyProcess = spawn(shell, ['-i'], {
      env: process.env,
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    ptyProcess.stdout.on('data', (data) => {
      socket.emit('terminal:data', data.toString());
    });

    ptyProcess.stderr.on('data', (data) => {
      socket.emit('terminal:data', data.toString());
    });

    socket.on('terminal:write', (data) => {
      ptyProcess.stdin.write(data);
    });

    socket.on('disconnect', () => {
      console.log("Client disconnected from terminal socket");
      ptyProcess.kill();
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
