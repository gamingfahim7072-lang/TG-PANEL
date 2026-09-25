import {
  User,
  SubscriptionPlan,
  Subscription,
  TelegramBot,
  BotSettings,
  BotMenu,
  BotButton,
  Product,
  ProductCategory,
  LicenseKey,
  Order,
  Customer,
  Broadcast,
  Coupon,
  Notification,
  AuditLog,
  ResellerApplication,
  DashboardStats,
  BotFaq,
  BotCommand,
  BotVersion,
  BotPaymentConfig,
  MediaItem,
  PaymentProof,
  ProductPackage,
  TelegramBotStatusResponse,
  PollerStats,
  SystemHostingStatus,
  SelfPingState,
  PingTestResult
} from './types';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('telesell_token');
  }

  public setToken(token: string) {
    localStorage.setItem('telesell_token', token);
  }

  public clearToken() {
    localStorage.removeItem('telesell_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned status ${response.status} with invalid JSON`);
    }

    if (!response.ok || data.success === false) {
      let errorMessage = 'An unexpected error occurred.';
      if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (data.error && typeof data.error === 'object') {
        errorMessage = data.error.message || data.error.code || JSON.stringify(data.error);
      } else if (data.message) {
        errorMessage = data.message;
      }
      throw new Error(errorMessage);
    }

    return data;
  }

  // Auth
  public async register(payload: { email: string; password: string; full_name: string; referral_code?: string }) {
    const res = await this.request<{ success: boolean; token: string; user: User }>(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{ success: boolean; token: string; user: User; subscription: Subscription | null }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  public async getMe() {
    return this.request<{
      success: boolean;
      user: User;
      subscription: Subscription | null;
      usage: { bots: number; max_bots: number; products: number; max_products: number };
    }>(`/auth/me`);
  }

  public async changePassword(payload: { current_password: string; new_password: string }) {
    return this.request<{ success: boolean; message: string }>(`/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Dashboard Stats
  public async getDashboardStats() {
    return this.request<{ success: boolean; stats: DashboardStats }>(`/dashboard/stats`);
  }

  // Subscription & Plans
  public async getPlans() {
    return this.request<{ success: boolean; plans: SubscriptionPlan[] }>(`/subscription/plans`);
  }

  public async createSubscriptionOrder(payload: { planId: string; billingCycle: 'MONTHLY' | 'YEARLY'; provider?: string }) {
    return this.request<{ success: boolean; payment: any; gatewayConfig: any }>(`/subscription/create-order`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async verifyPayment(payload: { paymentId: string; gatewayPaymentId?: string; signature?: string; provider?: string }) {
    return this.request<{ success: boolean; subscription: Subscription }>(`/subscription/verify-payment`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async getPaymentHistory() {
    return this.request<{ success: boolean; payments: any[] }>(`/subscription/payments-history`);
  }

  // Bots
  public async getBots() {
    return this.request<{ success: boolean; bots: TelegramBot[] }>(`/bots`);
  }

  public async connectBot(payload: { token: string; display_name?: string; support_username?: string }) {
    return this.request<{ success: boolean; bot: TelegramBot }>(`/bots/connect`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async testBotConnection(botId: string) {
    return this.request<{ success: boolean; message: string }>(`/bots/${botId}/test`, {
      method: 'POST'
    });
  }

  public async getBotTelegramStatus(botId: string) {
    return this.request<TelegramBotStatusResponse>(`/bots/${botId}/telegram-status`);
  }

  public async startBotPolling(botId: string) {
    return this.request<{ success: boolean; started: boolean; status: PollerStats | null }>(`/bots/${botId}/polling/start`, {
      method: 'POST'
    });
  }

  public async stopBotPolling(botId: string) {
    return this.request<{ success: boolean; stopped: boolean }>(`/bots/${botId}/polling/stop`, {
      method: 'POST'
    });
  }

  public async setBotWebhook(botId: string, webhookUrl: string) {
    return this.request<{ success: boolean; webhookInfo?: any }>(`/bots/${botId}/webhook/set`, {
      method: 'POST',
      body: JSON.stringify({ webhookUrl })
    });
  }

  public async deleteBotWebhook(botId: string) {
    return this.request<{ success: boolean; polling?: PollerStats }>(`/bots/${botId}/webhook/delete`, {
      method: 'POST'
    });
  }

  public async deleteBot(botId: string) {
    return this.request<{ success: boolean; message: string }>(`/bots/${botId}`, {
      method: 'DELETE'
    });
  }

  public async getBotSettings(botId: string) {
    return this.request<{
      success: boolean;
      settings: BotSettings | null;
      buttons: BotButton[];
      faqs?: BotFaq[];
      commands?: BotCommand[];
      paymentConfig?: BotPaymentConfig;
    }>(`/bots/${botId}/settings`);
  }

  public async updateBotSettings(botId: string, settings: Partial<BotSettings>) {
    return this.request<{ success: boolean; settings: BotSettings }>(`/bots/${botId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Multi-Level Bot Menus
  public async getBotMenus(botId: string) {
    return this.request<{ success: boolean; menus: BotMenu[] }>(`/bots/${botId}/menus`);
  }

  public async createBotMenu(botId: string, menu: Partial<BotMenu>) {
    return this.request<{ success: boolean; menu: BotMenu }>(`/bots/${botId}/menus`, {
      method: 'POST',
      body: JSON.stringify(menu)
    });
  }

  public async updateBotMenu(botId: string, menuId: string, menu: Partial<BotMenu>) {
    return this.request<{ success: boolean; menu: BotMenu }>(`/bots/${botId}/menus/${menuId}`, {
      method: 'PUT',
      body: JSON.stringify(menu)
    });
  }

  public async deleteBotMenu(botId: string, menuId: string) {
    return this.request<{ success: boolean; message: string }>(`/bots/${botId}/menus/${menuId}`, {
      method: 'DELETE'
    });
  }

  public async saveBotMenus(botId: string, menus: BotMenu[]) {
    return this.request<{ success: boolean; menus: BotMenu[] }>(`/bots/${botId}/menus`, {
      method: 'PUT',
      body: JSON.stringify({ menus })
    });
  }

  public async updateBotButtons(botId: string, buttons: BotButton[]) {
    return this.request<{ success: boolean; buttons: BotButton[] }>(`/bots/${botId}/buttons`, {
      method: 'POST',
      body: JSON.stringify({ buttons })
    });
  }

  // Telegram Command Builder
  public async getBotCommands(botId: string) {
    return this.request<{ success: boolean; commands: BotCommand[] }>(`/bots/${botId}/commands`);
  }

  public async createBotCommand(botId: string, command: Partial<BotCommand>) {
    return this.request<{ success: boolean; command: BotCommand }>(`/bots/${botId}/commands`, {
      method: 'POST',
      body: JSON.stringify(command)
    });
  }

  public async updateBotCommand(botId: string, cmdId: string, command: Partial<BotCommand>) {
    return this.request<{ success: boolean; command: BotCommand }>(`/bots/${botId}/commands/${cmdId}`, {
      method: 'PUT',
      body: JSON.stringify(command)
    });
  }

  public async toggleBotCommand(botId: string, cmdId: string) {
    return this.request<{ success: boolean; is_enabled: boolean; message: string }>(`/bots/${botId}/commands/${cmdId}/toggle`, {
      method: 'PATCH'
    });
  }

  public async reorderBotCommands(botId: string, commandIds: string[]) {
    return this.request<{ success: boolean; commands: BotCommand[] }>(`/bots/${botId}/commands/reorder`, {
      method: 'POST',
      body: JSON.stringify({ commandIds })
    });
  }

  public async duplicateBotCommand(botId: string, cmdId: string) {
    return this.request<{ success: boolean; command: BotCommand }>(`/bots/${botId}/commands/${cmdId}/duplicate`, {
      method: 'POST'
    });
  }

  public async deleteBotCommand(botId: string, cmdId: string) {
    return this.request<{ success: boolean; message: string }>(`/bots/${botId}/commands/${cmdId}`, {
      method: 'DELETE'
    });
  }

  // Atomic Full Save for Bot Management
  public async fullSaveBot(botId: string, payload: {
    settings?: Partial<BotSettings>;
    menus?: BotMenu[];
    buttons?: BotButton[];
    faqs?: BotFaq[];
    commands?: BotCommand[];
    paymentConfig?: Partial<BotPaymentConfig>;
  }) {
    return this.request<{ success: boolean; message: string }>(`/bots/${botId}/full-save`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async deployBot(botId: string, payload: { createVersionSnapshot?: boolean; versionLabel?: string } = {}) {
    return this.request<{
      success: boolean;
      deployed: boolean;
      message: string;
      version?: BotVersion;
      syncDetails?: { webhookSet: boolean; commandsSet: boolean; descriptionSet: boolean };
    }>(`/bots/${botId}/deploy`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async reconnectBot(botId: string, token: string) {
    return this.request<{ success: boolean; bot: TelegramBot }>(`/bots/${botId}/reconnect`, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  // FAQs
  public async getBotFaqs(botId: string) {
    return this.request<{ success: boolean; faqs: BotFaq[] }>(`/bots/${botId}/faqs`);
  }

  public async updateBotFaqs(botId: string, faqs: BotFaq[]) {
    return this.request<{ success: boolean; faqs: BotFaq[] }>(`/bots/${botId}/faqs`, {
      method: 'PUT',
      body: JSON.stringify({ faqs })
    });
  }

  // Versions
  public async getBotVersions(botId: string) {
    return this.request<{ success: boolean; versions: BotVersion[] }>(`/bots/${botId}/versions`);
  }

  public async restoreBotVersion(botId: string, versionId: string) {
    return this.request<{ success: boolean; settings: BotSettings; buttons: BotButton[]; message: string }>(
      `/bots/${botId}/versions/${versionId}/restore`,
      { method: 'POST' }
    );
  }

  // Bot Payment Configurations
  public async getBotPaymentConfig(botId: string) {
    return this.request<{ success: boolean; config: BotPaymentConfig }>(`/bots/${botId}/payment-config`);
  }

  public async updateBotPaymentConfig(botId: string, config: Partial<BotPaymentConfig>) {
    return this.request<{ success: boolean; config: BotPaymentConfig }>(`/bots/${botId}/payment-config`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  // Media Manager
  public async getMediaItems(botId?: string) {
    const q = botId ? `?bot_id=${botId}` : '';
    return this.request<{ success: boolean; items: MediaItem[] }>(`/media${q}`);
  }

  public async uploadMedia(file: File, botId?: string, mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT') {
    const formData = new FormData();
    formData.append('file', file);
    if (botId) formData.append('bot_id', botId);
    if (mediaType) formData.append('media_type', mediaType);
    return this.request<{ success: boolean; item: MediaItem }>(`/media/upload`, {
      method: 'POST',
      body: formData
    });
  }

  public async deleteMedia(id: string) {
    return this.request<{ success: boolean; message: string }>(`/media/${id}`, {
      method: 'DELETE'
    });
  }

  // Payment Proofs
  public async getPaymentProofs(botId?: string, status?: string) {
    const query = new URLSearchParams();
    if (botId) query.append('bot_id', botId);
    if (status) query.append('status', status);
    return this.request<{ success: boolean; proofs: PaymentProof[] }>(`/payment-proofs?${query.toString()}`);
  }

  public async uploadPaymentProof(orderId: string, file: File, note?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', orderId);
    if (note) formData.append('customer_note', note);
    return this.request<{ success: boolean; proof: PaymentProof }>(`/payment-proofs/upload`, {
      method: 'POST',
      body: formData
    });
  }

  public async reviewPaymentProof(proofId: string, action: 'APPROVE' | 'REJECT', notes?: string) {
    return this.request<{ success: boolean; proof: PaymentProof; order: Order }>(`/payment-proofs/${proofId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });
  }

  public async simulateBot(botId: string, payload: { text?: string; callback_data?: string; customer_name?: string }) {
    return this.request<{ success: boolean; result: { responseText: string; keyboard?: any[]; deliveredContent?: string } }>(
      `/bots/${botId}/simulate`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }

  // Products
  public async getProducts(params: { bot_id?: string; category_id?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.bot_id) query.append('bot_id', params.bot_id);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.search) query.append('search', params.search);
    return this.request<{ success: boolean; products: Product[] }>(`/products?${query.toString()}`);
  }

  public async createProduct(payload: any) {
    return this.request<{ success: boolean; product: Product }>(`/products`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async updateProduct(id: string, payload: Partial<Product>) {
    return this.request<{ success: boolean; product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  public async deleteProduct(id: string) {
    return this.request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  // Product Packages / Variants
  public async getProductPackages(productId: string) {
    return this.request<{ success: boolean; packages: ProductPackage[] }>(`/products/${productId}/packages`);
  }

  public async createProductPackage(productId: string, pkg: Partial<ProductPackage>) {
    return this.request<{ success: boolean; package: ProductPackage }>(`/products/${productId}/packages`, {
      method: 'POST',
      body: JSON.stringify(pkg)
    });
  }

  public async updateProductPackage(productId: string, pkgId: string, pkg: Partial<ProductPackage>) {
    return this.request<{ success: boolean; package: ProductPackage }>(`/products/${productId}/packages/${pkgId}`, {
      method: 'PUT',
      body: JSON.stringify(pkg)
    });
  }

  public async deleteProductPackage(productId: string, pkgId: string) {
    return this.request<{ success: boolean; message: string }>(`/products/${productId}/packages/${pkgId}`, {
      method: 'DELETE'
    });
  }

  // Dynamic Payment QR Generator
  public async generatePaymentQr(payload: {
    upi_id: string;
    upi_name?: string;
    business_name?: string;
    amount?: number;
    order_id?: string;
    note?: string;
    currency?: string;
  }) {
    return this.request<{
      success: boolean;
      upiUri: string;
      qrImageUrl: string;
      details: { upi_id: string; payee_name: string; amount?: number; currency: string; note: string };
    }>(`/payments/generate-qr`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async getProductLicenses(productId: string) {
    return this.request<{ success: boolean; keys: LicenseKey[] }>(`/products/${productId}/licenses`);
  }

  public async addBulkLicenses(productId: string, rawKeys: string) {
    return this.request<{ success: boolean; addedCount: number; totalAvailable: number }>(`/products/${productId}/licenses/bulk`, {
      method: 'POST',
      body: JSON.stringify({ rawKeys })
    });
  }

  public async uploadProductFile(productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ success: boolean; file: any }>(`/products/${productId}/upload-file`, {
      method: 'POST',
      body: formData
    });
  }

  // Categories
  public async getCategories(botId?: string) {
    const q = botId ? `?bot_id=${botId}` : '';
    return this.request<{ success: boolean; categories: ProductCategory[] }>(`/categories${q}`);
  }

  public async createCategory(payload: { bot_id: string; name: string; description?: string }) {
    return this.request<{ success: boolean; category: ProductCategory }>(`/categories`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async updateCategory(id: string, payload: Partial<ProductCategory>) {
    return this.request<{ success: boolean; category: ProductCategory }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  public async deleteCategory(id: string) {
    return this.request<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE'
    });
  }

  // Orders
  public async getOrders(params: { bot_id?: string; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.bot_id) query.append('bot_id', params.bot_id);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request<{ success: boolean; orders: Order[] }>(`/orders?${query.toString()}`);
  }

  public async refundOrder(orderId: string) {
    return this.request<{ success: boolean; message: string; order: Order }>(`/orders/${orderId}/refund`, {
      method: 'POST'
    });
  }

  // Customers CRM
  public async getCustomers(botId?: string) {
    const q = botId ? `?bot_id=${botId}` : '';
    return this.request<{ success: boolean; customers: Customer[] }>(`/customers${q}`);
  }

  public async adjustCustomerWallet(customerId: string, amount: number, action: 'ADD' | 'DEDUCT') {
    return this.request<{ success: boolean; customer: Customer }>(`/customers/${customerId}/wallet`, {
      method: 'POST',
      body: JSON.stringify({ amount, action })
    });
  }

  // Broadcasts
  public async getBroadcasts(botId?: string) {
    const q = botId ? `?bot_id=${botId}` : '';
    return this.request<{ success: boolean; broadcasts: Broadcast[] }>(`/broadcasts${q}`);
  }

  public async createBroadcast(payload: any) {
    return this.request<{ success: boolean; broadcast: Broadcast }>(`/broadcasts`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async cancelBroadcast(id: string) {
    return this.request<{ success: boolean; message: string }>(`/broadcasts/${id}/cancel`, {
      method: 'POST'
    });
  }

  // Coupons
  public async getCoupons() {
    return this.request<{ success: boolean; coupons: Coupon[] }>(`/coupons`);
  }

  public async createCoupon(payload: any) {
    return this.request<{ success: boolean; coupon: Coupon }>(`/coupons`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async deleteCoupon(id: string) {
    return this.request<{ success: boolean; message: string }>(`/coupons/${id}`, {
      method: 'DELETE'
    });
  }

  // Referrals & Resellers
  public async getReferralStats() {
    return this.request<{ success: boolean; code: string; link: string; count: number; totalEarnings: number; referrals: any[] }>(
      `/referrals/stats`
    );
  }

  public async applyReseller(payload: { business_name: string; telegram_handle: string; experience_info?: string }) {
    return this.request<{ success: boolean; application: ResellerApplication; message: string }>(`/reseller/apply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Notifications
  public async getNotifications() {
    return this.request<{ success: boolean; notifications: Notification[] }>(`/notifications`);
  }

  public async markNotificationsRead() {
    return this.request<{ success: boolean }>(`/notifications/read-all`, { method: 'PUT' });
  }

  // Admin
  public async getAdminStats() {
    return this.request<{ success: boolean; stats: any }>(`/admin/stats`);
  }

  public async getAdminUsers() {
    return this.request<{ success: boolean; users: any[] }>(`/admin/users`);
  }

  public async updateAdminUserRole(userId: string, payload: { role?: string; reseller_status?: string; reseller_commission_rate?: number }) {
    return this.request<{ success: boolean; user: any }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  public async getAdminResellers() {
    return this.request<{ success: boolean; applications: ResellerApplication[] }>(`/admin/resellers`);
  }

  public async updateAdminResellerStatus(id: string, payload: { status: string; commission_rate?: number; notes?: string }) {
    return this.request<{ success: boolean; application: ResellerApplication }>(`/admin/resellers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  public async getAdminAuditLogs(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{ success: boolean; logs: AuditLog[] }>(`/admin/audit-logs${q}`);
  }

  public async getAdminSettings() {
    return this.request<{ success: boolean; settings: any[] }>(`/admin/settings`);
  }

  public async updateAdminSettings(settings: Array<{ key: string; value: string }>) {
    return this.request<{ success: boolean; settings: any[] }>(`/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
  }

  // 24/7 Cloud Hosting & System Health
  public async getHostingStatus() {
    return this.request<SystemHostingStatus & { success: boolean }>(`/hosting/status`);
  }

  public async toggleSelfPing(payload: { enabled: boolean; targetUrl?: string }) {
    return this.request<{ success: boolean; selfPing: SelfPingState }>(`/hosting/self-ping`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async testPing(payload?: { targetUrl?: string }) {
    return this.request<{ success: boolean; result: PingTestResult }>(`/hosting/test-ping`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  public async restartBotPoller(botId: string) {
    return this.request<{ success: boolean; message: string; poller: PollerStats }>(
      `/hosting/restart-poller/${botId}`,
      { method: 'POST' }
    );
  }
}

export const api = new ApiClient();
