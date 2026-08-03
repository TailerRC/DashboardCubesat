import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    {
      name: 'save-capture-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-capture' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { image } = JSON.parse(body);
                if (!image) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'No image data provided' }));
                  return;
                }
                const base64Data = image.replace(/^data:image\/png;base64,/, "");
                const folderPath = path.join(process.cwd(), 'public', 'captures');
                if (!fs.existsSync(folderPath)) {
                  fs.mkdirSync(folderPath, { recursive: true });
                }
                const filename = `capture_${Date.now()}.png`;
                const filePath = path.join(folderPath, filename);
                fs.writeFileSync(filePath, base64Data, 'base64');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename }));
              } catch (error) {
                console.error('Error saving image:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            });
          } else if (req.url === '/api/list-captures' && req.method === 'GET') {
            try {
              const folderPath = path.join(process.cwd(), 'public', 'captures');
              if (!fs.existsSync(folderPath)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ captures: [] }));
                return;
              }
              const files = fs.readdirSync(folderPath)
                .filter(file => file.startsWith('capture_') && file.endsWith('.png'))
                .sort((a, b) => b.localeCompare(a));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ captures: files }));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          } else if (req.url === '/api/delete-capture' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { filename } = JSON.parse(body);
                if (!filename) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'No filename provided' }));
                  return;
                }
                if (!/^capture_\d+\.png$/.test(filename)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Invalid filename format' }));
                  return;
                }
                const folderPath = path.join(process.cwd(), 'public', 'captures');
                const filePath = path.join(folderPath, filename);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                } else {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'File not found' }));
                }
              } catch (error) {
                console.error('Error deleting image:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
