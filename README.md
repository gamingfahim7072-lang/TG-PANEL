# TeleSell SaaS — Automated Telegram E-Commerce & Bot Management Engine

TeleSell is a production-grade Telegram store builder and automated digital delivery SaaS platform. Build, manage, and monetize Telegram stores with real-time Telegram Bot API synchronization, UPI payments with instant UTR verification, serial/license key generator, digital file downloads, customer wallets, broadcasts, discount coupons, and multi-tenant admin dashboards.

---

## 📱 Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons, Motion, Recharts
- **Backend:** Node.js (v20+), Express 4, TypeScript, tsx / esbuild
- **Database & Persistence:** Atomically persisted JSON database with real-time write locks (`data/db.json`)
- **Telegram Engine:** Dual-mode engine supporting both **24/7 Long Polling** and **HTTPS Webhooks**
- **Mobile / Android:** Android WebView native wrapper & Capacitor ready (Package: `com.telesell.app`, Min SDK: 24, Target SDK: 34)
- **CI/CD:** GitHub Actions workflow for automated Android APK builds

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ (Node 20 LTS recommended)
- npm or pnpm or bun

### 2. Installation
```bash
git clone <your-repo-url>
cd telesell-saas
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your configuration in `.env`:
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
JWT_SECRET=YOUR_RANDOM_SECURE_JWT_SECRET_32_CHARS
ENCRYPTION_KEY=YOUR_HEX_ENCRYPTION_KEY_64_CHARS
ADMIN_EMAIL=admin@telesell.com
ADMIN_PASSWORD=adminpassword
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🤖 Telegram Bot Configuration

1. Open Telegram and message `@BotFather`.
2. Create a new bot with `/newbot` and copy the API Token.
3. In TeleSell Dashboard, click **"Connect Bot"** and paste your API Token.
4. The bot automatically activates via **24/7 Long Polling** (or Webhook if an HTTPS domain is configured).
5. Open your bot in Telegram and send `/start`!

---

## 📦 Building Android APK

### Option A: GitHub Actions (Recommended - No Android Studio Required)
1. Push this repository to GitHub.
2. Go to the **Actions** tab in your GitHub repository.
3. The **"Build Android APK"** workflow runs automatically on push.
4. Download the generated `TeleSell-Debug-APK` directly from the workflow artifacts.

### Option B: Local Android Studio Build
1. Open the `android/` directory in Android Studio.
2. Let Gradle sync dependencies.
3. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. The APK is generated in `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📄 License
MIT License. Created with Google AI Studio.
