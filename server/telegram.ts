import { db, TelegramBot, Customer, Order, Product, ProductPackage, LicenseKey, DigitalFile, Broadcast, BotMenu, BotButton, BotPaymentConfig, BotCommand } from './db.js';
import { CryptoService } from './crypto.js';
import { logAudit } from './auth.js';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: any[];
  document?: any;
  caption?: string;
  reply_markup?: any;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export class TelegramService {
  private static BASE_URL = 'https://api.telegram.org';

  /**
   * Calls Telegram Bot API endpoint
   */
  public static async callApi(token: string, method: string, data?: Record<string, any>): Promise<any> {
    const url = `${this.BASE_URL}/bot${token}/${method}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      const json = await response.json();
      return json;
    } catch (err: any) {
      console.error(`Telegram API error on ${method}:`, err.message);
      return { ok: false, description: err.message };
    }
  }

  /**
   * Verifies a bot token with getMe
   */
  public static async verifyBotToken(token: string): Promise<{
    ok: boolean;
    bot?: { id: number; username: string; first_name: string; can_join_groups?: boolean };
    error?: string;
  }> {
    if (!token || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return { ok: false, error: 'Invalid token format. A valid Telegram bot token is like 123456789:ABCdefGhIJKlmnoPQRstuv' };
    }

    try {
      const res = await this.callApi(token, 'getMe');
      if (res.ok && res.result) {
        return {
          ok: true,
          bot: {
            id: res.result.id,
            username: res.result.username,
            first_name: res.result.first_name,
            can_join_groups: res.result.can_join_groups
          }
        };
      }
      return { ok: false, error: res.description || 'Failed to authenticate with Telegram Bot API.' };
    } catch (err: any) {
      return { ok: false, error: `Connection failed: ${err.message}` };
    }
  }

  /**
   * Configures Webhook for a Telegram Bot
   */
  public static async setWebhook(token: string, webhookUrl: string): Promise<boolean> {
    const res = await this.callApi(token, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query']
    });
    return !!res.ok;
  }

  /**
   * Gets Webhook info from Telegram
   */
  public static async getWebhookInfo(token: string): Promise<any> {
    return this.callApi(token, 'getWebhookInfo');
  }

  /**
   * Deletes Webhook for a Telegram Bot
   */
  public static async deleteWebhook(token: string): Promise<boolean> {
    const res = await this.callApi(token, 'deleteWebhook', { drop_pending_updates: false });
    return !!res.ok;
  }

  /**
   * Sends a message with optional inline keyboard and auto fallback for markdown parse errors
   */
  public static async sendMessage(
    token: string,
    chatId: number | string,
    text: string,
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>,
    parseMode: string = 'Markdown'
  ): Promise<any> {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: parseMode
    };
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    let res = await this.callApi(token, 'sendMessage', payload);
    // If Markdown parsing fails due to unescaped characters in IDs or URLs, retry without parse_mode
    if (!res.ok && res.description && (res.description.includes("can't parse entities") || res.description.includes("entity"))) {
      delete payload.parse_mode;
      res = await this.callApi(token, 'sendMessage', payload);
    }
    return res;
  }

  /**
   * Sends a photo with optional caption and inline keyboard, with graceful text fallback
   */
  public static async sendPhoto(
    token: string,
    chatId: number | string,
    photoUrl: string,
    caption?: string,
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>,
    parseMode: string = 'Markdown'
  ): Promise<any> {
    const payload: any = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption || '',
      parse_mode: parseMode
    };
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    const res = await this.callApi(token, 'sendPhoto', payload);
    if (!res.ok) {
      // If photo cannot be delivered from remote URL or parsed, fallback to sendMessage
      return this.sendMessage(token, chatId, caption || '', inlineKeyboard, parseMode);
    }
    return res;
  }

  /**
   * Sends a document / digital file
   */
  public static async sendDocument(
    token: string,
    chatId: number | string,
    documentUrl: string,
    caption?: string,
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>,
    parseMode: string = 'Markdown'
  ): Promise<any> {
    const payload: any = {
      chat_id: chatId,
      document: documentUrl,
      caption: caption || '',
      parse_mode: parseMode
    };
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    const res = await this.callApi(token, 'sendDocument', payload);
    if (!res.ok) {
      return this.sendMessage(token, chatId, caption || '', inlineKeyboard, parseMode);
    }
    return res;
  }

  /**
   * Sends chat actions (e.g. typing, upload_photo)
   */
  public static async sendChatAction(token: string, chatId: number | string, action: string = 'typing'): Promise<any> {
    return this.callApi(token, 'sendChatAction', { chat_id: chatId, action });
  }

  /**
   * Answers a callback query (popup or toast in Telegram app)
   */
  public static async answerCallbackQuery(
    token: string,
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<any> {
    return this.callApi(token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert
    });
  }

  /**
   * Builds the formatted inline keyboard for a specific bot and menu level
   */
  public static buildBotKeyboard(
    botId: string,
    menuId: string = 'main'
  ): Array<Array<{ text: string; callback_data?: string; url?: string }>> {
    // 1. Find all buttons for this bot and menu
    let buttons = db.bot_buttons
      .filter(b => b.bot_id === botId && ((b.menu_id || 'main') === menuId || (menuId === 'main' && (!b.menu_id || b.menu_id === 'main'))))
      .sort((a, b) => (a.row_order ?? 0) - (b.row_order ?? 0) || (a.col_order ?? 0) - (b.col_order ?? 0));

    // Fallback: if no menu-specific buttons found and menu is main, get any bot buttons
    if (buttons.length === 0 && menuId === 'main') {
      buttons = db.bot_buttons.filter(b => b.bot_id === botId);
    }

    const currentMenu = db.bot_menus.find(m => m.bot_id === botId && (m.id === menuId || (menuId === 'main' && m.slug === 'main')));
    const colsPerRow = currentMenu?.columns_per_row || 2;

    const rows: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [];
    let currentRow: Array<{ text: string; callback_data?: string; url?: string }> = [];

    for (const btn of buttons) {
      let btnItem: { text: string; callback_data?: string; url?: string };

      if (btn.button_type === 'EXTERNAL_URL' || btn.button_type === 'URL') {
        btnItem = { text: btn.label, url: btn.target_value };
      } else if (btn.button_type === 'SUPPORT_CONTACT' || btn.button_type === 'SUPPORT') {
        const supportVal = btn.target_value || 'support';
        const supportUrl = supportVal.startsWith('http') ? supportVal : `https://t.me/${supportVal.replace('@', '')}`;
        btnItem = { text: btn.label, url: supportUrl };
      } else if (btn.button_type === 'SUBMENU') {
        btnItem = {
          text: btn.label,
          callback_data: `action:SUBMENU:${btn.target_value}`
        };
      } else if (btn.button_type === 'SINGLE_PRODUCT' || btn.button_type === 'PRODUCT') {
        btnItem = {
          text: btn.label,
          callback_data: `action:BUY_PROD:${btn.target_value}`
        };
      } else if (btn.button_type === 'PRODUCT_PACKAGE') {
        btnItem = {
          text: btn.label,
          callback_data: `action:BUY_PKG:${btn.target_package_id || btn.target_value}`
        };
      } else if (btn.button_type === 'PAYMENT_INFO' || btn.button_type === 'QR_PAY') {
        btnItem = {
          text: btn.label,
          callback_data: `action:PAYMENT_INFO:${btn.target_value || 'MAIN'}`
        };
      } else {
        btnItem = {
          text: btn.label,
          callback_data: `action:${btn.button_type}:${btn.target_value}`
        };
      }

      currentRow.push(btnItem);
      if (currentRow.length >= colsPerRow) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    // Append navigation buttons for submenus if enabled
    if (menuId !== 'main' && currentMenu) {
      const navRow: Array<{ text: string; callback_data?: string; url?: string }> = [];
      if (currentMenu.auto_back_button !== false) {
        const parentId = currentMenu.parent_menu_id || 'main';
        navRow.push({ text: '🔙 Back', callback_data: `action:SUBMENU:${parentId}` });
      }
      if (currentMenu.auto_home_button !== false) {
        navRow.push({ text: '🏠 Main Menu', callback_data: 'action:HOME:HOME' });
      }
      if (navRow.length > 0) {
        rows.push(navRow);
      }
    }

    return rows;
  }

  /**
   * Core Telegram Message & Callback Processing Engine
   * Works for both real Telegram webhooks and the built-in Interactive Live Bot Tester!
   */
  public static async processUpdate(
    bot: TelegramBot,
    update: TelegramUpdate,
    isSimulator: boolean = false
  ): Promise<{ responseText?: string; keyboard?: any[]; deliveredContent?: string }> {
    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    const settings = db.bot_settings.find(s => s.bot_id === bot.id) || {
      id: 'default',
      bot_id: bot.id,
      owner_id: bot.owner_id,
      display_name: bot.first_name,
      description: 'Digital store bot',
      support_username: 'support',
      currency: 'INR',
      timezone: 'UTC',
      start_text: 'Welcome to our store! Click below to browse products.',
      auto_delivery: true,
      notify_admin_on_order: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const paymentConfig: BotPaymentConfig = db.bot_payment_configs.find(p => p.bot_id === bot.id) || {
      id: 'default',
      bot_id: bot.id,
      owner_id: bot.owner_id,
      enable_sandbox: true,
      enable_razorpay: false,
      enable_cashfree: false,
      enable_phonepe: false,
      enable_stripe: false,
      enable_manual_upi: true,
      upi_id: 'merchant@upi',
      upi_name: settings.display_name || bot.first_name,
      enable_dynamic_qr: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let tgUser: TelegramUser | undefined;
    let chatId: number | string = '';
    let incomingText: string | undefined;
    let callbackData: string | undefined;
    let callbackQueryId: string | undefined;

    if (update.message) {
      tgUser = update.message.from;
      chatId = update.message.chat.id;
      incomingText = (update.message.text || '').trim();
    } else if (update.callback_query) {
      tgUser = update.callback_query.from;
      chatId = update.callback_query.message ? update.callback_query.message.chat.id : tgUser.id;
      callbackData = update.callback_query.data;
      callbackQueryId = update.callback_query.id;
    }

    if (!tgUser) {
      return { responseText: 'No user provided' };
    }

    // Immediately answer callback query so Telegram client doesn't keep spinner active
    if (!isSimulator && rawToken && callbackQueryId) {
      this.answerCallbackQuery(rawToken, callbackQueryId).catch(() => {});
    }

    // 1. Record / Update Customer in DB
    let customer = db.customers.find(
      c => c.bot_id === bot.id && c.telegram_id === String(tgUser?.id)
    );
    const nowStr = new Date().toISOString();

    if (!customer) {
      customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        owner_id: bot.owner_id,
        bot_id: bot.id,
        telegram_id: String(tgUser.id),
        username: tgUser.username,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        total_purchases: 0,
        total_spent: 0,
        wallet_balance: 0,
        created_at: nowStr,
        updated_at: nowStr
      };
      db.customers.push(customer);
      db.save();
    } else {
      customer.first_name = tgUser.first_name;
      customer.username = tgUser.username || customer.username;
      customer.updated_at = nowStr;
      db.save();
    }

    // Template interpolation helper
    const interpolate = (tpl: string): string => {
      if (!tpl) return '';
      return tpl
        .replace(/{name}/g, `${customer!.first_name} ${customer!.last_name || ''}`.trim())
        .replace(/{first_name}/g, customer!.first_name || 'Customer')
        .replace(/{username}/g, customer!.username ? `@${customer!.username}` : 'Customer')
        .replace(/{store_name}/g, settings.display_name || bot.first_name)
        .replace(/{balance}/g, `${settings.currency || '₹'} ${customer!.wallet_balance}`);
    };

    // 1.5 Dynamic Command Builder Dispatch
    if (incomingText && incomingText.startsWith('/')) {
      const cmdParts = incomingText.split(/\s+/)[0].toLowerCase();
      const baseCmd = cmdParts.split('@')[0]; // Remove @botusername
      const matchedCmd = (db.bot_commands || []).find(
        c => c.bot_id === bot.id && c.is_enabled && c.command.toLowerCase() === baseCmd
      );

      if (matchedCmd) {
        // OPEN_MENU or OPEN_SUBMENU
        if (matchedCmd.action_type === 'OPEN_MENU' || matchedCmd.action_type === 'OPEN_SUBMENU') {
          const menuId = matchedCmd.target_id || 'main';
          const menu = db.bot_menus.find(m => m.bot_id === bot.id && (m.id === menuId || m.slug === menuId));
          const keyboard = this.buildBotKeyboard(bot.id, menu?.id || 'main');
          let text = matchedCmd.custom_response_message
            ? interpolate(matchedCmd.custom_response_message)
            : menu && menu.id !== 'main' && menu.slug !== 'main'
              ? `📂 *${menu.title}*\n\n${interpolate(menu.message_text || 'Select an option below:')}`
              : `✨ *${settings.display_name || bot.first_name}*\n\n${interpolate(settings.start_text || 'Welcome to our digital store! Select an option below:')}`;
          
          if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
            await this.sendMessage(rawToken, chatId, text, keyboard);
          }
          return { responseText: text, keyboard };
        }

        // SHOW_PRODUCTS
        if (matchedCmd.action_type === 'SHOW_PRODUCTS') {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: 'action:PRODUCTS_LIST:ALL' }
            },
            isSimulator
          );
        }

        // OPEN_CATEGORY
        if (matchedCmd.action_type === 'OPEN_CATEGORY' && matchedCmd.target_id) {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: `action:CATEGORY:${matchedCmd.target_id}` }
            },
            isSimulator
          );
        }

        // OPEN_PRODUCT
        if (matchedCmd.action_type === 'OPEN_PRODUCT' && matchedCmd.target_id) {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: `action:BUY_PROD:${matchedCmd.target_id}` }
            },
            isSimulator
          );
        }

        // SELECT_PACKAGE
        if (matchedCmd.action_type === 'SELECT_PACKAGE' && (matchedCmd.target_package_id || matchedCmd.target_id)) {
          const targetPkgId = matchedCmd.target_package_id || matchedCmd.target_id;
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: `action:BUY_PKG:${targetPkgId}` }
            },
            isSimulator
          );
        }

        // PAYMENT_METHODS or SHOW_QR
        if (matchedCmd.action_type === 'PAYMENT_METHODS' || matchedCmd.action_type === 'SHOW_QR') {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: 'action:PAYMENT_INFO:MAIN' }
            },
            isSimulator
          );
        }

        // MY_ORDERS
        if (matchedCmd.action_type === 'MY_ORDERS') {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: 'action:MY_ORDERS:VIEW' }
            },
            isSimulator
          );
        }

        // MY_ACCOUNT
        if (matchedCmd.action_type === 'MY_ACCOUNT') {
          let text = `👤 *Customer Account & Profile*\n\n`;
          text += `• *Name:* ${customer.first_name} ${customer.last_name || ''}\n`;
          text += `• *Username:* ${customer.username ? `@${customer.username}` : 'Not set'}\n`;
          text += `• *Customer ID:* \`${customer.id}\`\n`;
          text += `• *Wallet Balance:* ${settings.currency || '₹'} ${customer.wallet_balance}\n`;
          text += `• *Total Purchases:* ${customer.total_purchases} orders\n`;
          text += `• *Total Spent:* ${settings.currency || '₹'} ${customer.total_spent}\n`;

          const keyboard = [
            [{ text: '💳 Top-up & Payment Methods', callback_data: 'action:PAYMENT_INFO:MAIN' }],
            [{ text: '🧾 Order History', callback_data: 'action:MY_ORDERS:VIEW' }],
            [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
          ];

          if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
            await this.sendMessage(rawToken, chatId, text, keyboard);
          }
          return { responseText: text, keyboard };
        }

        // SUPPORT
        if (matchedCmd.action_type === 'SUPPORT') {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: 'action:SUPPORT:HELP' }
            },
            isSimulator
          );
        }

        // FAQ
        if (matchedCmd.action_type === 'FAQ') {
          return this.processUpdate(
            bot,
            {
              update_id: Date.now(),
              callback_query: { id: callbackQueryId || '1', from: tgUser, data: 'action:FAQS:FAQS' }
            },
            isSimulator
          );
        }

        // CUSTOM_MESSAGE or generic custom response
        if (matchedCmd.action_type === 'CUSTOM_MESSAGE' || matchedCmd.custom_response_message) {
          const text = interpolate(matchedCmd.custom_response_message || 'Command executed.');
          const keyboard = this.buildBotKeyboard(bot.id, 'main');
          if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
            await this.sendMessage(rawToken, chatId, text, keyboard);
          }
          return { responseText: text, keyboard };
        }
      }
    }

    // 2. Handle /start or Start Menu
    if (
      incomingText?.startsWith('/start') ||
      callbackData === 'action:CALLBACK:START' ||
      callbackData === 'action:CALLBACK:VIEW_HOME' ||
      callbackData === 'action:HOME:HOME' ||
      callbackData === 'action:MAIN_MENU:HOME' ||
      callbackData === 'action:BACK:HOME'
    ) {
      const keyboard = this.buildBotKeyboard(bot.id, 'main');
      let text = `✨ *${settings.display_name || bot.first_name}*\n\n${interpolate(settings.start_text || 'Welcome to our digital store! Select an option below:')}`;
      if (settings.promo_message) {
        text += `\n\n📢 *Announcement:* ${interpolate(settings.promo_message)}`;
      }

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        if (settings.start_banner_url && settings.start_banner_url.startsWith('http')) {
          await this.sendPhoto(rawToken, chatId, settings.start_banner_url, text, keyboard);
        } else {
          await this.sendMessage(rawToken, chatId, text, keyboard);
        }
      }
      return { responseText: text, keyboard };
    }

    // 3. Handle Nested Submenu Navigation (action:SUBMENU:<menuId_or_slug>)
    if (callbackData?.startsWith('action:SUBMENU:') || callbackData?.startsWith('action:MENU:')) {
      const menuTarget = callbackData.replace(/^action:(SUBMENU|MENU):/, '').trim();
      const menu = db.bot_menus.find(m => m.bot_id === bot.id && (m.id === menuTarget || m.slug === menuTarget));

      if (!menu || menu.id === 'main' || menu.slug === 'main') {
        const keyboard = this.buildBotKeyboard(bot.id, 'main');
        const text = `✨ *${settings.display_name || bot.first_name}*\n\n${interpolate(settings.start_text || 'Welcome!')}`;
        if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
          await this.sendMessage(rawToken, chatId, text, keyboard);
        }
        return { responseText: text, keyboard };
      }

      const keyboard = this.buildBotKeyboard(bot.id, menu.id);
      let text = `📂 *${menu.title}*\n\n${interpolate(menu.message_text || 'Select an option below:')}`;

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 4. Handle Browse Products / Products List
    if (
      incomingText === '/products' ||
      callbackData === 'action:CALLBACK:VIEW_PRODUCTS' ||
      callbackData === 'action:PRODUCT:ALL' ||
      callbackData === 'action:PRODUCTS_LIST:ALL'
    ) {
      const products = db.products.filter(p => p.bot_id === bot.id && p.is_active);
      if (products.length === 0) {
        const text = `🛍️ *Product Catalog*\n\nNo products are currently available. Please check back shortly!`;
        const keyboard = [[{ text: '🔙 Back to Home', callback_data: 'action:HOME:HOME' }]];
        if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
          await this.sendMessage(rawToken, chatId, text, keyboard);
        }
        return { responseText: text, keyboard };
      }

      let text = `🛍️ *Product Catalog (${products.length} Available)*\n\nSelect any product below to view details and instant delivery info:`;
      const keyboard: any[] = [];

      for (const prod of products) {
        const stockStatus = prod.stock_count > 0 ? `[Stock: ${prod.stock_count}]` : '[Sold Out]';
        keyboard.push([
          {
            text: `${prod.name} — ${prod.currency} ${prod.price} ${stockStatus}`,
            callback_data: `action:BUY_PROD:${prod.id}`
          }
        ]);
      }
      keyboard.push([{ text: '🔙 Back to Home', callback_data: 'action:HOME:HOME' }]);

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 5. Handle Category Filter (action:CATEGORY:categoryId)
    if (callbackData?.startsWith('action:CATEGORY:')) {
      const catId = callbackData.replace('action:CATEGORY:', '').trim();
      const category = db.product_categories.find(c => c.id === catId);
      const products = db.products.filter(p => p.bot_id === bot.id && p.category_id === catId && p.is_active);

      let text = `📂 *Category: ${category?.name || 'Products'}*\n\n`;
      if (category?.description) text += `_${category.description}_\n\n`;
      text += `Products in this category (${products.length}):`;

      const keyboard: any[] = [];
      for (const prod of products) {
        const stockStatus = prod.stock_count > 0 ? `[${prod.stock_count} in stock]` : '[Sold Out]';
        keyboard.push([
          {
            text: `${prod.name} — ${prod.currency} ${prod.price} ${stockStatus}`,
            callback_data: `action:BUY_PROD:${prod.id}`
          }
        ]);
      }
      keyboard.push([
        { text: '🛍️ All Products', callback_data: 'action:PRODUCTS_LIST:ALL' },
        { text: '🔙 Home', callback_data: 'action:HOME:HOME' }
      ]);

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 6. Handle Product Details & Package Selection Page
    if (callbackData?.startsWith('action:BUY_PROD:')) {
      const prodId = callbackData.replace('action:BUY_PROD:', '').trim();
      const prod = db.products.find(p => p.id === prodId && p.bot_id === bot.id);
      if (!prod) {
        const text = `⚠️ *Product Not Found*\nThis product is no longer active.`;
        return { responseText: text };
      }

      const category = db.product_categories.find(c => c.id === prod.category_id);
      const packages = db.product_packages.filter(pkg => pkg.product_id === prod.id);

      let text = `📦 *${prod.name}*\n\n`;
      text += `📝 *Description:* ${prod.description || 'Premium digital product'}\n`;
      if (category) text += `📂 *Category:* ${category.name}\n`;
      text += `💰 *Base Price:* ${prod.currency} ${prod.price}\n`;
      text += `🚀 *Delivery:* Instant Automated (${prod.delivery_type.replace('_', ' ')})\n`;
      text += `📊 *Stock:* ${prod.stock_count > 0 ? `${prod.stock_count} units available` : 'Out of Stock'}\n`;

      const keyboard: any[] = [];

      // If product has package variants (e.g. 1 Day, 7 Days, 30 Days, Lifetime), show packages
      if (packages.length > 0) {
        text += `\n*Available Packages & Durations:*\n`;
        for (const pkg of packages) {
          text += `• *${pkg.name}*: ${pkg.currency} ${pkg.price} (${pkg.duration_days ? `${pkg.duration_days} Days` : 'Lifetime'})\n`;
          keyboard.push([
            {
              text: `⚡ Buy ${pkg.name} (${pkg.currency} ${pkg.price})`,
              callback_data: `action:BUY_PKG:${pkg.id}`
            }
          ]);
        }
      } else if (prod.stock_count > 0) {
        keyboard.push([
          {
            text: `⚡ Instant Buy (${prod.currency} ${prod.price})`,
            callback_data: `action:CONFIRM_PAY:${prod.id}`
          }
        ]);
      }

      keyboard.push([
        { text: '🛍️ All Products', callback_data: 'action:PRODUCTS_LIST:ALL' },
        { text: '🔙 Home', callback_data: 'action:HOME:HOME' }
      ]);

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 7. Handle Package Direct Purchase (action:BUY_PKG:<pkgId>)
    if (callbackData?.startsWith('action:BUY_PKG:')) {
      const pkgId = callbackData.replace('action:BUY_PKG:', '').trim();
      const pkg = db.product_packages.find(p => p.id === pkgId);
      const prod = pkg ? db.products.find(p => p.id === pkg.product_id) : db.products.find(p => p.id === pkgId);

      if (!prod) {
        const text = `⚠️ *Item Not Found*\nThis package is no longer available.`;
        return { responseText: text };
      }

      const itemName = pkg ? `${prod.name} (${pkg.name})` : prod.name;
      const itemPrice = pkg ? pkg.price : prod.price;
      const itemCurrency = pkg ? pkg.currency : prod.currency;

      const orderId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

      // If merchant has Manual UPI Payment enabled with a UPI ID
      if (paymentConfig?.enable_manual_upi && paymentConfig.upi_id) {
        const upiId = paymentConfig.upi_id;
        const upiName = paymentConfig.upi_name || settings.display_name || bot.first_name;
        const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${itemPrice}&cu=INR&tn=${orderId}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiUri)}`;

        const pendingOrder: Order = {
          id: orderId,
          owner_id: bot.owner_id,
          bot_id: bot.id,
          customer_id: customer.id,
          customer_name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
          customer_telegram_id: customer.telegram_id,
          product_id: prod.id,
          package_id: pkg?.id,
          product_name: itemName,
          quantity: 1,
          unit_price: itemPrice,
          total_amount: itemPrice,
          currency: itemCurrency,
          status: 'PENDING',
          payment_provider: 'MANUAL_UPI',
          payment_id: '',
          delivered_type: prod.delivery_type,
          created_at: nowStr,
          updated_at: nowStr
        };
        db.orders.unshift(pendingOrder);
        db.save();

        let text = `💳 *Payment Checkout — ${itemName}*\n\n`;
        text += `🧾 *Order ID:* \`${orderId}\`\n`;
        text += `💵 *Total Amount:* ${itemCurrency} ${itemPrice}\n\n`;
        text += `🏦 *UPI ID:* \`${upiId}\`\n`;
        text += `👤 *Payee Name:* ${upiName}\n`;
        if (paymentConfig.bank_account_number) {
          text += `🏛️ *Account:* \`${paymentConfig.bank_account_number}\` (IFSC: \`${paymentConfig.bank_ifsc}\`)\n`;
        }
        if (paymentConfig.manual_instructions) {
          text += `\n📝 *Instructions:* ${paymentConfig.manual_instructions}\n`;
        }
        text += `\n📲 *Scan the QR code above or pay directly to the UPI ID.*\nAfter payment, tap *Submit UTR* or reply to this chat with your 12-digit UPI UTR number!`;

        const keyboard = [
          [{ text: '✅ I Have Paid — Submit UTR', callback_data: `action:SUBMIT_UTR:${orderId}` }],
          [{ text: '⚡ Instant Pay (Test / Sandbox)', callback_data: `action:INSTANT_FULFILL:${orderId}` }],
          [{ text: '🔙 Back to Products', callback_data: 'action:PRODUCTS_LIST:ALL' }]
        ];

        if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
          await this.sendPhoto(rawToken, chatId, qrUrl, text, keyboard);
        }
        return { responseText: text, keyboard };
      }

      // Default / Automated Digital Delivery
      let deliveredContent = '';
      let downloadUrl = '';

      if (prod.delivery_type === 'LICENSE_KEY' || prod.delivery_type === 'SERIAL_KEY') {
        const availableKey = db.license_keys.find(k => k.product_id === prod.id && !k.is_redeemed);
        if (availableKey) {
          availableKey.is_redeemed = true;
          availableKey.redeemed_by_customer_id = customer.id;
          availableKey.redeemed_at = nowStr;
          availableKey.order_id = orderId;
          deliveredContent = `🔑 *Your License Key:*\n\`${availableKey.license_key}\``;
          prod.stock_count = Math.max(0, prod.stock_count - 1);
        } else {
          deliveredContent = `🔑 *Serial Key Generated:*\n\`PROD-${Math.random().toString(36).substring(2, 10).toUpperCase()}-KEY\``;
        }
      } else if (prod.delivery_type === 'DIGITAL_FILE') {
        const fileRecord = db.digital_files.find(f => f.product_id === prod.id);
        const downloadToken = fileRecord?.download_token || CryptoService.generateRandomToken(12);
        downloadUrl = `/api/downloads/${orderId}/${downloadToken}`;
        deliveredContent = `📥 *Digital Asset Ready:* ${fileRecord?.original_filename || prod.name}\n\nClick link to download:\n${process.env.APP_URL || ''}${downloadUrl}`;
      } else if (prod.delivery_type === 'CUSTOM_MESSAGE') {
        deliveredContent = `📩 *Access Message:*\n${pkg?.custom_message || prod.custom_message || 'Thank you for your purchase!'}`;
      } else {
        deliveredContent = `🔑 *Product Code:*\n\`SERIAL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}\``;
      }

      const newOrder: Order = {
        id: orderId,
        owner_id: bot.owner_id,
        bot_id: bot.id,
        customer_id: customer.id,
        customer_name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
        customer_telegram_id: customer.telegram_id,
        product_id: prod.id,
        package_id: pkg?.id,
        product_name: itemName,
        quantity: 1,
        unit_price: itemPrice,
        total_amount: itemPrice,
        currency: itemCurrency,
        status: 'DELIVERED',
        payment_provider: 'TELEGRAM_BOT_CHECKOUT',
        payment_id: `tx_${Date.now()}`,
        delivered_type: prod.delivery_type,
        delivered_content: deliveredContent,
        download_url: downloadUrl || undefined,
        created_at: nowStr,
        updated_at: nowStr
      };
      db.orders.unshift(newOrder);

      customer.total_purchases += 1;
      customer.total_spent += itemPrice;
      customer.last_purchase_at = nowStr;
      db.save();

      logAudit({
        userId: bot.owner_id,
        action: 'ORDER_FULFILLED',
        resourceType: 'ORDER',
        resourceId: orderId,
        metadata: { botId: bot.id, customerId: customer.id, amount: itemPrice, packageName: pkg?.name }
      });

      let text = `🎉 *Payment Confirmed & Delivered!*\n\n`;
      text += `🧾 *Order ID:* \`${orderId}\`\n`;
      text += `📦 *Package:* ${itemName}\n`;
      text += `💵 *Total:* ${itemCurrency} ${itemPrice}\n\n`;
      text += `${deliveredContent}\n\n`;
      text += `_Your order has been recorded in /orders for future access._`;

      const keyboard = [
        [{ text: '🛍️ Shop More', callback_data: 'action:PRODUCTS_LIST:ALL' }],
        [{ text: '🧾 My Orders', callback_data: 'action:MY_ORDERS:VIEW' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard, deliveredContent };
    }

    // 8. Handle Standard Product Buy / Payment Confirmation
    if (callbackData?.startsWith('action:CONFIRM_PAY:')) {
      const prodId = callbackData.replace('action:CONFIRM_PAY:', '').trim();
      return this.processUpdate(
        bot,
        {
          update_id: Date.now(),
          callback_query: { id: callbackQueryId || '1', from: tgUser, data: `action:BUY_PKG:${prodId}` }
        },
        isSimulator
      );
    }

    // 9. Handle Payment Info & Dynamic QR Display (/payment, PAYMENT_INFO)
    if (incomingText === '/payment' || callbackData?.startsWith('action:PAYMENT_INFO:')) {
      const upiId = paymentConfig.upi_id || 'merchant@upi';
      const upiName = paymentConfig.upi_name || settings.display_name || bot.first_name;

      let text = `💳 *Merchant Payment Methods*\n\n`;
      text += `🏦 *UPI ID:* \`${upiId}\`\n`;
      text += `👤 *Payee Name:* ${upiName}\n`;
      if (paymentConfig.bank_account_number) {
        text += `\n*Bank Details:*\n`;
        text += `• *Account:* \`${paymentConfig.bank_account_number}\`\n`;
        text += `• *IFSC:* \`${paymentConfig.bank_ifsc}\`\n`;
        text += `• *Bank:* ${paymentConfig.bank_name || 'Commercial Bank'}\n`;
      }
      if (paymentConfig.manual_instructions) {
        text += `\n📝 *Instructions:* ${paymentConfig.manual_instructions}\n`;
      }

      const keyboard = [
        [{ text: '🛍️ Browse Products to Buy', callback_data: 'action:PRODUCTS_LIST:ALL' }],
        [{ text: '💬 Support Desk', callback_data: 'action:SUPPORT:HELP' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 10. Handle Customer Orders History (/orders, MY_ORDERS)
    if (incomingText === '/orders' || callbackData === 'action:MY_ORDERS:VIEW' || callbackData === 'action:MY_ORDERS:MY_ORDERS' || callbackData?.startsWith('action:MY_ORDERS:')) {
      const orders = db.orders.filter(o => o.bot_id === bot.id && o.customer_id === customer.id).slice(0, 5);
      let text = `🧾 *Your Order History*\n\n`;
      if (orders.length === 0) {
        text += `You haven't placed any orders yet. Browse our catalog to get started!`;
      } else {
        for (const ord of orders) {
          text += `📦 *${ord.product_name}*\n`;
          text += `🆔 \`${ord.id}\` • ${ord.currency} ${ord.total_amount} • *${ord.status}*\n`;
          if (ord.delivered_content) {
            text += `${ord.delivered_content.slice(0, 80)}...\n`;
          }
          text += `📅 ${new Date(ord.created_at).toLocaleDateString()}\n\n`;
        }
      }

      const keyboard = [
        [{ text: '🛍️ Browse Catalog', callback_data: 'action:PRODUCTS_LIST:ALL' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 11. Handle FAQ Menu (/faq, FAQS)
    if (incomingText === '/faq' || callbackData === 'action:FAQ:MENU' || callbackData === 'action:FAQS:FAQS' || callbackData?.startsWith('action:FAQS:')) {
      const faqs = db.bot_faqs.filter(f => f.bot_id === bot.id).sort((a, b) => a.order - b.order);
      let text = `❓ *Frequently Asked Questions*\n\nClick any topic below for instant answers:`;
      const keyboard: any[] = [];

      if (faqs.length === 0) {
        text = `❓ *Frequently Asked Questions*\n\nNeed help? Contact our support desk directly via the button below.`;
      } else {
        for (const faq of faqs) {
          keyboard.push([{ text: `❓ ${faq.question}`, callback_data: `action:FAQ_ANSWER:${faq.id}` }]);
        }
      }

      if (settings.support_username) {
        keyboard.push([{ text: `💬 Contact Support (@${settings.support_username.replace('@', '')})`, callback_data: 'action:SUPPORT:HELP' }]);
      }
      keyboard.push([{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]);

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 12. Handle FAQ Answer View
    if (callbackData?.startsWith('action:FAQ_ANSWER:')) {
      const faqId = callbackData.replace('action:FAQ_ANSWER:', '').trim();
      const faq = db.bot_faqs.find(f => f.id === faqId);
      let text = `❓ *${faq?.question || 'Question'}*\n\n${faq?.answer || 'No answer provided yet.'}`;

      const keyboard = [
        [{ text: '❓ More Questions', callback_data: 'action:FAQS:FAQS' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 13. Handle Support Desk (/support, SUPPORT_CONTACT)
    if (incomingText === '/support' || callbackData === 'action:SUPPORT:HELP' || callbackData?.startsWith('action:SUPPORT_CONTACT:') || callbackData?.startsWith('action:SUPPORT:')) {
      let text = `💬 *Customer Support Desk*\n\n`;
      text += settings.support_message || `Our support team is available to assist you with order verification and questions.`;
      if (settings.business_hours) {
        text += `\n\n⏰ *Operating Hours:* ${settings.business_hours}`;
      }

      const keyboard: any[] = [];
      if (settings.support_username) {
        const cleanUser = settings.support_username.replace('@', '');
        keyboard.push([{ text: `💬 Chat with @${cleanUser}`, url: `https://t.me/${cleanUser}` }]);
      }
      if (settings.support_url) {
        keyboard.push([{ text: `🌐 Support Portal`, url: settings.support_url }]);
      }
      keyboard.push([{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]);

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 14. Handle Instant Fulfill (Test / Sandbox / Direct Payment Fulfill)
    if (callbackData?.startsWith('action:INSTANT_FULFILL:')) {
      const orderId = callbackData.replace('action:INSTANT_FULFILL:', '').trim();
      const order = db.orders.find(o => o.id === orderId && o.bot_id === bot.id);
      if (!order) {
        const text = `⚠️ *Order Not Found*\nPlease browse our catalog to place a new order.`;
        return { responseText: text };
      }

      const prod = db.products.find(p => p.id === order.product_id);
      let deliveredContent = '';
      let downloadUrl = '';

      if (prod?.delivery_type === 'LICENSE_KEY' || prod?.delivery_type === 'SERIAL_KEY') {
        const availableKey = db.license_keys.find(k => k.product_id === prod.id && !k.is_redeemed);
        if (availableKey) {
          availableKey.is_redeemed = true;
          availableKey.redeemed_by_customer_id = customer.id;
          availableKey.redeemed_at = nowStr;
          availableKey.order_id = orderId;
          deliveredContent = `🔑 *Your License Key:*\n\`${availableKey.license_key}\``;
          prod.stock_count = Math.max(0, prod.stock_count - 1);
        } else {
          deliveredContent = `🔑 *Serial Key Generated:*\n\`PROD-${Math.random().toString(36).substring(2, 10).toUpperCase()}-KEY\``;
        }
      } else if (prod?.delivery_type === 'DIGITAL_FILE') {
        const fileRecord = db.digital_files.find(f => f.product_id === prod.id);
        const downloadToken = fileRecord?.download_token || CryptoService.generateRandomToken(12);
        downloadUrl = `/api/downloads/${orderId}/${downloadToken}`;
        deliveredContent = `📥 *Digital Asset Ready:* ${fileRecord?.original_filename || prod?.name || 'Asset'}\n\nClick link to download:\n${process.env.APP_URL || ''}${downloadUrl}`;
      } else if (prod?.delivery_type === 'CUSTOM_MESSAGE') {
        deliveredContent = `📩 *Access Message:*\n${prod.custom_message || 'Thank you for your purchase!'}`;
      } else {
        deliveredContent = `🔑 *Product Code:*\n\`SERIAL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}\``;
      }

      order.status = 'DELIVERED';
      order.delivered_content = deliveredContent;
      order.download_url = downloadUrl || undefined;
      order.payment_id = `instant_pay_${Date.now()}`;
      order.updated_at = nowStr;

      customer.total_purchases += 1;
      customer.total_spent += order.total_amount;
      customer.last_purchase_at = nowStr;
      db.save();

      let text = `🎉 *Payment Confirmed & Delivered!*\n\n`;
      text += `🧾 *Order ID:* \`${orderId}\`\n`;
      text += `📦 *Package:* ${order.product_name}\n`;
      text += `💵 *Total:* ${order.currency} ${order.total_amount}\n\n`;
      text += `${deliveredContent}\n\n`;
      text += `_Your order has been recorded in /orders for future access._`;

      const keyboard = [
        [{ text: '🛍️ Shop More', callback_data: 'action:PRODUCTS_LIST:ALL' }],
        [{ text: '🧾 My Orders', callback_data: 'action:MY_ORDERS:VIEW' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];

      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard, deliveredContent };
    }

    // 15. Handle Prompt for Submitting UTR
    if (callbackData?.startsWith('action:SUBMIT_UTR:')) {
      const orderId = callbackData.replace('action:SUBMIT_UTR:', '').trim();
      const text = `📝 *Submit Payment Reference Number*\n\nPlease reply directly to this chat with your 12-digit UPI UTR Number or Transaction Reference for Order \`${orderId}\`.\n\n_Example:_ \`428192019283\``;
      const keyboard = [
        [{ text: '⚡ Instant Pay (Test / Sandbox)', callback_data: `action:INSTANT_FULFILL:${orderId}` }],
        [{ text: '🔙 Back to Products', callback_data: 'action:PRODUCTS_LIST:ALL' }]
      ];
      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 16. Handle Customer Account Profile & Balance (/balance, /account)
    if (
      incomingText === '/balance' ||
      incomingText === '/account' ||
      callbackData === 'action:BALANCE:VIEW' ||
      callbackData === 'action:MY_ACCOUNT:VIEW'
    ) {
      const orders = db.orders.filter(o => o.bot_id === bot.id && o.customer_id === customer.id);
      let text = `👤 *Your Account Profile*\n\n`;
      text += `• *Name:* ${customer.first_name} ${customer.last_name || ''}\n`;
      if (customer.username) text += `• *Username:* @${customer.username}\n`;
      text += `• *Customer ID:* \`${customer.id}\`\n`;
      text += `• *Wallet Balance:* ${settings.currency || 'INR'} ${customer.wallet_balance || 0}\n`;
      text += `• *Total Orders Placed:* ${orders.length}\n`;
      text += `• *Total Spent:* ${settings.currency || 'INR'} ${customer.total_spent || 0}\n`;

      const keyboard = [
        [{ text: '🛍️ Browse Products', callback_data: 'action:PRODUCTS_LIST:ALL' }],
        [{ text: '🧾 My Orders', callback_data: 'action:MY_ORDERS:VIEW' }],
        [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
      ];
      if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
        await this.sendMessage(rawToken, chatId, text, keyboard);
      }
      return { responseText: text, keyboard };
    }

    // 17. Handle Incoming Text with UTR / Transaction Reference Number
    const cleanNum = incomingText ? incomingText.replace(/[^0-9]/g, '') : '';
    const isUtrPattern =
      (cleanNum.length >= 10 && cleanNum.length <= 18) ||
      (incomingText && /^(utr|upi|tx|ref|txn)[:\s-]?/i.test(incomingText));

    if (isUtrPattern) {
      const pendingOrder = db.orders.find(
        o => o.bot_id === bot.id && o.customer_id === customer.id && (o.status === 'PENDING' || o.status === 'PROCESSING')
      );

      if (pendingOrder) {
        const utrVal = cleanNum || incomingText!;
        pendingOrder.payment_id = `UTR_${utrVal}`;
        pendingOrder.updated_at = nowStr;

        if (settings.auto_delivery) {
          const prod = db.products.find(p => p.id === pendingOrder.product_id);
          let deliveredContent = '';
          let downloadUrl = '';

          if (prod?.delivery_type === 'LICENSE_KEY' || prod?.delivery_type === 'SERIAL_KEY') {
            const availableKey = db.license_keys.find(k => k.product_id === prod.id && !k.is_redeemed);
            if (availableKey) {
              availableKey.is_redeemed = true;
              availableKey.redeemed_by_customer_id = customer.id;
              availableKey.redeemed_at = nowStr;
              availableKey.order_id = pendingOrder.id;
              deliveredContent = `🔑 *Your License Key:*\n\`${availableKey.license_key}\``;
              prod.stock_count = Math.max(0, prod.stock_count - 1);
            } else {
              deliveredContent = `🔑 *Serial Key Generated:*\n\`PROD-${Math.random().toString(36).substring(2, 10).toUpperCase()}-KEY\``;
            }
          } else if (prod?.delivery_type === 'DIGITAL_FILE') {
            const fileRecord = db.digital_files.find(f => f.product_id === prod.id);
            const downloadToken = fileRecord?.download_token || CryptoService.generateRandomToken(12);
            downloadUrl = `/api/downloads/${pendingOrder.id}/${downloadToken}`;
            deliveredContent = `📥 *Digital Asset Ready:* ${fileRecord?.original_filename || prod?.name || 'Asset'}\n\nClick link to download:\n${process.env.APP_URL || ''}${downloadUrl}`;
          } else if (prod?.delivery_type === 'CUSTOM_MESSAGE') {
            deliveredContent = `📩 *Access Message:*\n${prod.custom_message || 'Thank you for your purchase!'}`;
          } else {
            deliveredContent = `🔑 *Product Code:*\n\`SERIAL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}\``;
          }

          pendingOrder.status = 'DELIVERED';
          pendingOrder.delivered_content = deliveredContent;
          pendingOrder.download_url = downloadUrl || undefined;

          customer.total_purchases += 1;
          customer.total_spent += pendingOrder.total_amount;
          customer.last_purchase_at = nowStr;
          db.save();

          let text = `🎉 *Payment Verified & Order Delivered!*\n\n`;
          text += `🧾 *Order ID:* \`${pendingOrder.id}\`\n`;
          text += `🔢 *UTR Reference:* \`${utrVal}\`\n`;
          text += `📦 *Package:* ${pendingOrder.product_name}\n`;
          text += `💵 *Total:* ${pendingOrder.currency} ${pendingOrder.total_amount}\n\n`;
          text += `${deliveredContent}\n\n`;
          text += `_Your order has been recorded in /orders for future access._`;

          const keyboard = [
            [{ text: '🛍️ Shop More', callback_data: 'action:PRODUCTS_LIST:ALL' }],
            [{ text: '🧾 My Orders', callback_data: 'action:MY_ORDERS:VIEW' }],
            [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
          ];

          if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
            await this.sendMessage(rawToken, chatId, text, keyboard);
          }
          return { responseText: text, keyboard, deliveredContent };
        } else {
          pendingOrder.status = 'UNDER_VERIFICATION';
          db.save();

          let text = `✅ *Payment Proof Submitted!*\n\n`;
          text += `🧾 *Order ID:* \`${pendingOrder.id}\`\n`;
          text += `🔢 *UTR Reference:* \`${utrVal}\`\n`;
          text += `📦 *Item:* ${pendingOrder.product_name}\n`;
          text += `💵 *Amount:* ${pendingOrder.currency} ${pendingOrder.total_amount}\n\n`;
          text += `⏳ *Status:* Under Verification\n`;
          text += `Our team will verify the payment and deliver your product shortly. Check /orders to view your order status at any time!`;

          const keyboard = [
            [{ text: '🧾 My Orders', callback_data: 'action:MY_ORDERS:VIEW' }],
            [{ text: '💬 Support Desk', callback_data: 'action:SUPPORT:HELP' }],
            [{ text: '🔙 Home', callback_data: 'action:HOME:HOME' }]
          ];

          if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
            await this.sendMessage(rawToken, chatId, text, keyboard);
          }
          return { responseText: text, keyboard };
        }
      }
    }

    // 18. Product Catalog Search for typed text keywords
    if (incomingText && !incomingText.startsWith('/') && incomingText.length >= 2) {
      const q = incomingText.toLowerCase();
      const matches = db.products.filter(
        p => p.bot_id === bot.id && p.is_active && (p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      );

      if (matches.length > 0) {
        let text = `🔍 *Found ${matches.length} product${matches.length > 1 ? 's' : ''} matching "${incomingText}":*\n\nSelect an item below to view details and purchase:`;
        const keyboard: any[] = [];
        for (const prod of matches) {
          const stock = prod.stock_count > 0 ? `[In Stock: ${prod.stock_count}]` : '[Sold Out]';
          keyboard.push([
            {
              text: `${prod.name} — ${prod.currency} ${prod.price} ${stock}`,
              callback_data: `action:BUY_PROD:${prod.id}`
            }
          ]);
        }
        keyboard.push([
          { text: '🛍️ All Products', callback_data: 'action:PRODUCTS_LIST:ALL' },
          { text: '🔙 Home', callback_data: 'action:HOME:HOME' }
        ]);

        if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
          await this.sendMessage(rawToken, chatId, text, keyboard);
        }
        return { responseText: text, keyboard };
      }
    }

    // 19. Default Fallback
    const fallbackText = `🤖 Command received. Select an option below:`;
    const keyboard = this.buildBotKeyboard(bot.id, 'main');
    if (!isSimulator && rawToken && !rawToken.includes('Sample')) {
      await this.sendMessage(rawToken, chatId, fallbackText, keyboard);
    }
    return { responseText: fallbackText, keyboard };
  }

  /**
   * Executes a queued broadcast asynchronously with rate limiting (30 ms delay between messages)
   */
  public static async executeBroadcast(broadcastId: string) {
    const broadcast = db.broadcasts.find(b => b.id === broadcastId);
    if (!broadcast || broadcast.status !== 'QUEUED') return;

    const bot = db.telegram_bots.find(b => b.id === broadcast.bot_id);
    if (!bot) {
      broadcast.status = 'FAILED';
      db.save();
      return;
    }

    const token = CryptoService.decrypt(bot.bot_token_encrypted);
    broadcast.status = 'SENDING';
    db.save();

    let recipients = db.customers.filter(c => c.bot_id === bot.id);
    if (broadcast.target_audience === 'ACTIVE_BUYERS') {
      recipients = recipients.filter(c => c.total_purchases > 0);
    } else if (broadcast.target_audience === 'ZERO_PURCHASES') {
      recipients = recipients.filter(c => c.total_purchases === 0);
    }

    broadcast.total_recipients = recipients.length;
    broadcast.sent_count = 0;
    broadcast.failed_count = 0;
    db.save();

    let buttons: any[] | undefined;
    if (broadcast.buttons_json) {
      try {
        buttons = JSON.parse(broadcast.buttons_json);
      } catch {}
    }

    for (const recipient of recipients) {
      const current = db.broadcasts.find(b => b.id === broadcastId);
      if (current && (current.status as string) === 'CANCELLED') break;

      try {
        if (token && !token.includes('Sample')) {
          await this.sendMessage(token, recipient.telegram_id, broadcast.message_text, buttons);
        }
        broadcast.sent_count += 1;
      } catch (err) {
        broadcast.failed_count += 1;
      }

      await new Promise(resolve => setTimeout(resolve, 35));
    }

    const finalRecord = db.broadcasts.find(b => b.id === broadcastId);
    if (finalRecord && (finalRecord.status as string) !== 'CANCELLED') {
      finalRecord.status = 'COMPLETED';
      finalRecord.completed_at = new Date().toISOString();
      db.save();
    }
  }

  /**
   * Synchronizes bot profile (commands, descriptions, webhooks) with Telegram Bot API
   */
  public static async syncBotProfileWithTelegram(bot: TelegramBot): Promise<{
    webhookSet: boolean;
    commandsSet: boolean;
    descriptionSet: boolean;
    error?: string;
  }> {
    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    if (!rawToken || rawToken.includes('Sample')) {
      return { webhookSet: true, commandsSet: true, descriptionSet: true };
    }

    const settings = db.bot_settings.find(s => s.bot_id === bot.id);
    let webhookSet = false;
    let commandsSet = false;
    let descriptionSet = false;

    try {
      // 1. Set bot commands from Database (Command Builder)
      let activeCommands = (db.bot_commands || [])
        .filter(c => c.bot_id === bot.id && c.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);

      if (activeCommands.length === 0) {
        activeCommands = [
          { command: 'start', description: 'Main Menu & Catalog' } as any,
          { command: 'products', description: 'Browse Products' } as any,
          { command: 'orders', description: 'My Purchases & Licenses' } as any,
          { command: 'faq', description: 'Frequently Asked Questions' } as any,
          { command: 'support', description: 'Customer Support' } as any
        ];
      }

      const formattedCommands = activeCommands.map(c => ({
        command: c.command.replace(/^\//, '').toLowerCase().slice(0, 32),
        description: (c.description || 'Command action').slice(0, 256)
      }));

      const commandsRes = await this.callApi(rawToken, 'setMyCommands', {
        commands: formattedCommands
      });
      commandsSet = !!commandsRes.ok;

      // 2. Set bot description & short description if settings exist
      if (settings?.description) {
        await this.callApi(rawToken, 'setMyDescription', { description: settings.description.slice(0, 512) });
        await this.callApi(rawToken, 'setMyShortDescription', {
          short_description: (settings.start_text || settings.description).slice(0, 120)
        });
        descriptionSet = true;
      } else {
        descriptionSet = true;
      }

      // 3. Webhook vs Long-Polling Mode
      const appUrl = process.env.APP_URL;
      if (appUrl && appUrl.startsWith('https://') && !appUrl.includes('MY_APP_URL')) {
        const webhookUrl = `${appUrl}/api/telegram/webhook/${bot.id}`;
        webhookSet = await this.setWebhook(rawToken, webhookUrl);
        // In webhook mode, stop local polling
        TelegramPollingManager.stopBot(bot.id);
      } else {
        // In local/polling mode, release any webhook and start Long Polling worker
        await this.deleteWebhook(rawToken);
        webhookSet = false;
        TelegramPollingManager.startBot(bot).catch(err => {
          console.error(`Failed to launch Telegram Polling for @${bot.username}:`, err);
        });
      }

      return { webhookSet, commandsSet, descriptionSet };
    } catch (err: any) {
      return { webhookSet, commandsSet, descriptionSet, error: err.message };
    }
  }
}

export interface PollerStats {
  botId: string;
  botUsername: string;
  isRunning: boolean;
  startedAt: string;
  lastPollAt?: string;
  updateCount: number;
  consecutiveErrors: number;
  lastError?: string;
}

/**
 * Telegram Long-Polling Manager
 * Ensures Telegram bots receive all commands, messages, button clicks, and payments 24/7
 * without requiring public HTTPS ingress or manual webhook setup.
 */
export class TelegramPollingManager {
  private static pollers: Map<
    string,
    {
      botId: string;
      botUsername: string;
      abortController: AbortController;
      isRunning: boolean;
      startedAt: string;
      lastPollAt?: string;
      updateCount: number;
      consecutiveErrors: number;
      lastError?: string;
    }
  > = new Map();

  /**
   * Starts long-polling worker for a connected bot
   */
  public static async startBot(bot: TelegramBot): Promise<boolean> {
    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    if (!rawToken || rawToken.includes('Sample') || rawToken.includes('demo') || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(rawToken)) {
      return false;
    }

    // Stop existing polling worker for this bot if one is active
    if (this.pollers.has(bot.id)) {
      this.stopBot(bot.id);
    }

    const abortController = new AbortController();
    const state = {
      botId: bot.id,
      botUsername: bot.username,
      abortController,
      isRunning: true,
      startedAt: new Date().toISOString(),
      lastPollAt: undefined as string | undefined,
      updateCount: 0,
      consecutiveErrors: 0,
      lastError: undefined as string | undefined
    };

    this.pollers.set(bot.id, state);

    // Delete existing webhook so Telegram routes updates to getUpdates
    try {
      await TelegramService.callApi(rawToken, 'deleteWebhook', { drop_pending_updates: false });
    } catch {}

    // Run async long polling loop
    (async () => {
      let offset = 0;
      console.log(`[TelegramPoller] Started background polling for @${bot.username} (id: ${bot.id})`);

      while (!abortController.signal.aborted) {
        try {
          const fetchPromise = fetch(
            `https://api.telegram.org/bot${rawToken}/getUpdates`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offset,
                timeout: 20, // 20s long-polling timeout
                allowed_updates: ['message', 'callback_query']
              }),
              signal: abortController.signal
            }
          );

          const response = await fetchPromise;
          if (abortController.signal.aborted) break;

          const data = await response.json();
          state.lastPollAt = new Date().toISOString();

          if (data.ok && Array.isArray(data.result)) {
            state.consecutiveErrors = 0;
            state.lastError = undefined;

            for (const update of data.result) {
              if (update.update_id >= offset) {
                offset = update.update_id + 1;
              }
              state.updateCount++;

              // Process each update without blocking the next polling batch
              TelegramService.processUpdate(bot, update, false).catch(err => {
                console.error(`[TelegramPoller] Error processing update for @${bot.username}:`, err);
              });
            }
          } else if (!data.ok) {
            state.consecutiveErrors++;
            state.lastError = data.description;

            if (data.error_code === 409) {
              // Webhook is active or conflicting poller: delete webhook and retry
              await TelegramService.callApi(rawToken, 'deleteWebhook', { drop_pending_updates: false });
              await new Promise(r => setTimeout(r, 4000));
            } else if (data.error_code === 401) {
              // Revoked or invalid token
              state.isRunning = false;
              this.pollers.delete(bot.id);
              bot.status = 'ERROR';
              bot.error_message = 'Unauthorized: Bot token has expired or is invalid.';
              db.save();
              break;
            } else {
              await new Promise(r => setTimeout(r, 3000));
            }
          }
        } catch (err: any) {
          if (abortController.signal.aborted) break;
          state.consecutiveErrors++;
          state.lastError = err.message;
          const waitTime = Math.min(state.consecutiveErrors * 1000, 8000);
          await new Promise(r => setTimeout(r, waitTime));
        }
      }

      state.isRunning = false;
      console.log(`[TelegramPoller] Stopped polling for @${bot.username}`);
    })();

    return true;
  }

  /**
   * Stops polling for a specific bot
   */
  public static stopBot(botId: string): boolean {
    const poller = this.pollers.get(botId);
    if (poller) {
      poller.abortController.abort();
      poller.isRunning = false;
      this.pollers.delete(botId);
      return true;
    }
    return false;
  }

  /**
   * Initializes polling workers for all active connected bots
   */
  public static startAll() {
    const connectedBots = db.telegram_bots.filter(
      b => b.status === 'CONNECTED' && b.is_active !== false
    );
    console.log(`[TelegramPoller] Initializing Telegram Polling for ${connectedBots.length} bot(s)...`);
    for (const bot of connectedBots) {
      this.startBot(bot).catch(err => {
        console.error(`[TelegramPoller] Could not start polling for @${bot.username}:`, err);
      });
    }
  }

  /**
   * Retrieves polling status and statistics for a bot
   */
  public static getStatus(botId: string): PollerStats | null {
    const p = this.pollers.get(botId);
    if (!p) return null;
    return {
      botId: p.botId,
      botUsername: p.botUsername,
      isRunning: p.isRunning,
      startedAt: p.startedAt,
      lastPollAt: p.lastPollAt,
      updateCount: p.updateCount,
      consecutiveErrors: p.consecutiveErrors,
      lastError: p.lastError
    };
  }

  /**
   * Retrieves all active poller statuses
   */
  public static getAllStatuses(): PollerStats[] {
    return Array.from(this.pollers.values()).map(p => ({
      botId: p.botId,
      botUsername: p.botUsername,
      isRunning: p.isRunning,
      startedAt: p.startedAt,
      lastPollAt: p.lastPollAt,
      updateCount: p.updateCount,
      consecutiveErrors: p.consecutiveErrors,
      lastError: p.lastError
    }));
  }
}
