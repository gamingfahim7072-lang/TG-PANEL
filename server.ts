import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { db } from './server/db.js';
import { seedInitialUsers } from './server/auth.js';
import { apiRouter } from './server/routes.js';
import { TelegramService, TelegramPollingManager } from './server/telegram.js';
import { CronService } from './server/cron.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Seed DB with production & demo accounts
  await seedInitialUsers();

  // Start background cron jobs
  CronService.start();

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'TeleSell SaaS API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Telegram Official Webhook Endpoint for connected bots
  app.post('/api/telegram/webhook/:botId', async (req: Request, res: Response) => {
    try {
      const { botId } = req.params;
      const update = req.body;
      const bot = db.telegram_bots.find(b => b.id === botId || b.bot_id === botId);

      if (!bot) {
        return res.status(404).json({ ok: false, error: 'Bot not registered' });
      }

      await TelegramService.processUpdate(bot, update, false);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error('Webhook error:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Mount main API router
  app.use('/api', apiRouter);

  // Vite middleware for development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 TeleSell SaaS Engine running on port ${PORT}`);
    console.log(`🌐 Live URL: http://0.0.0.0:${PORT}`);
    console.log(`=========================================`);

    // Start 24/7 background Long-Polling workers for all connected Telegram bots
    TelegramPollingManager.startAll();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
