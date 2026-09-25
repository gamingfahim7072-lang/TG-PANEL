import { db } from './db.js';
import { TelegramService, TelegramPollingManager } from './telegram.js';

export interface SelfPingState {
  enabled: boolean;
  targetUrl: string;
  intervalMinutes: number;
  lastPingAt?: string;
  lastPingStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastPingDurationMs?: number;
  totalPings: number;
}

export class CronService {
  private static timer: NodeJS.Timeout | null = null;
  private static totalRuns: number = 0;
  private static lastRunAt?: string;
  private static cycleCount: number = 0;

  private static selfPingState: SelfPingState = {
    enabled: true,
    targetUrl: process.env.APP_URL || 'http://localhost:3000',
    intervalMinutes: 5,
    lastPingAt: undefined,
    lastPingStatus: undefined,
    lastPingDurationMs: undefined,
    totalPings: 0
  };

  public static start() {
    if (this.timer) return;
    console.log('[24/7 Engine] Starting SaaS background automated cron workers & keep-alive engine...');

    // Run every 60 seconds
    this.timer = setInterval(() => {
      this.runAutomatedTasks().catch(err => console.error('[Cron] Error in automated tasks:', err));
    }, 60000);

    // Initial run
    this.runAutomatedTasks().catch(err => console.error('[Cron] Initial run error:', err));
  }

  public static getSelfPingState(): SelfPingState {
    return { ...this.selfPingState };
  }

  public static updateSelfPingConfig(enabled: boolean, targetUrl?: string): SelfPingState {
    this.selfPingState.enabled = enabled;
    if (targetUrl) {
      this.selfPingState.targetUrl = targetUrl.replace(/\/$/, '');
    }
    return { ...this.selfPingState };
  }

  public static async executeManualPing(overrideUrl?: string): Promise<{
    success: boolean;
    statusCode?: number;
    durationMs: number;
    targetUrl: string;
    error?: string;
  }> {
    const url = (overrideUrl || this.selfPingState.targetUrl || 'http://localhost:3000').replace(/\/$/, '');
    const pingEndpoint = `${url}/api/health`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(pingEndpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'TeleSell-24-7-KeepAlive/1.0 (+https://telesell.io)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const durationMs = Date.now() - start;
      const success = response.ok;

      this.selfPingState.lastPingAt = new Date().toISOString();
      this.selfPingState.lastPingStatus = success ? 'SUCCESS' : 'FAILED';
      this.selfPingState.lastPingDurationMs = durationMs;
      this.selfPingState.totalPings++;

      return {
        success,
        statusCode: response.status,
        durationMs,
        targetUrl: pingEndpoint
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      this.selfPingState.lastPingAt = new Date().toISOString();
      this.selfPingState.lastPingStatus = 'FAILED';
      this.selfPingState.lastPingDurationMs = durationMs;
      this.selfPingState.totalPings++;

      return {
        success: false,
        durationMs,
        targetUrl: pingEndpoint,
        error: err.message || 'Connection timed out or host unreachable'
      };
    }
  }

  private static async runAutomatedTasks() {
    this.totalRuns++;
    this.cycleCount++;
    this.lastRunAt = new Date().toISOString();
    const now = new Date();
    let changesMade = false;

    // 1. Subscription Expiration Automation
    for (const sub of db.subscriptions) {
      if (sub.status === 'ACTIVE' && sub.expiry_date) {
        if (new Date(sub.expiry_date) < now) {
          sub.status = 'EXPIRED';
          sub.updated_at = now.toISOString();
          changesMade = true;

          // Push expiry notification to user
          db.notifications.unshift({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            user_id: sub.user_id,
            title: '⚠️ Subscription Expired',
            message: 'Your subscription plan has expired. Please renew to restore live bot selling and broadcast services.',
            type: 'WARNING',
            is_read: false,
            created_at: now.toISOString()
          });
        }
      }
    }

    // 2. Broadcast Queue Poller
    const queuedBroadcast = db.broadcasts.find(b => b.status === 'QUEUED');
    if (queuedBroadcast) {
      TelegramService.executeBroadcast(queuedBroadcast.id).catch(err =>
        console.error(`Failed executing broadcast ${queuedBroadcast.id}:`, err)
      );
    }

    // 3. 24/7 Keep-Alive Self-Ping Worker (runs every 5 cycles / 5 minutes)
    if (this.cycleCount % (this.selfPingState.intervalMinutes || 5) === 0) {
      if (this.selfPingState.enabled && this.selfPingState.targetUrl) {
        this.executeManualPing().catch(err => {
          console.warn('[24/7 KeepAlive] Background ping warning:', err.message);
        });
      }
    }

    // 4. Poller Self-Healing & Health Check
    // Re-verify that connected bots have their long-polling worker active
    const connectedBots = db.telegram_bots.filter(b => b.status === 'CONNECTED' && b.is_active !== false);
    for (const bot of connectedBots) {
      const poller = TelegramPollingManager.getStatus(bot.id);
      if (!poller || !poller.isRunning) {
        // Automatically attempt to resurrect dead poller
        TelegramPollingManager.startBot(bot).catch(() => {});
      }
    }

    if (changesMade) {
      db.saveImmediately();
    }
  }

  public static getStatus() {
    return {
      isRunning: !!this.timer,
      totalRuns: this.totalRuns,
      lastRunAt: this.lastRunAt,
      cycleCount: this.cycleCount,
      selfPing: this.getSelfPingState()
    };
  }

  public static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
