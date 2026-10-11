# Stokika — B2B Marketplace Platform

> A security-hardened B2B marketplace platform built for the Kenyan market, featuring M-Pesa payment integration, multi-role user management, and a comprehensive vendor ecosystem.

---

## 🚀 Overview

Stokika is a B2B e-commerce marketplace connecting suppliers, vendors, and field agents. The platform streamlines inventory management, order processing, and mobile-first payments via M-Pesa (Safaricom).

## ✨ Key Features

- **Multi-Role Dashboard** — Separate interfaces for Admin, Supervisor, Vendor, Field Agent, and Supplier roles
- **M-Pesa Integration** — STK Push payments for kit purchases, vendor registration, and order processing
- **Vendor Registration** — Multi-step onboarding with document verification and payment flow
- **Inventory Management** — Real-time stock tracking, stock requests, and supplier coordination
- **Revenue Dashboard** — Analytics and reporting for business performance
- **GPS & Activity Tracking** — Field agent location analytics and activity logs
- **Security-Hardened** — XSS mitigation, CSRF protection, input sanitization, rate limiting, and RLS policies

## 🛠️ Tech Stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Frontend    | HTML5, Vanilla CSS, JavaScript (ES6+) |
| Backend     | Supabase (PostgreSQL, Auth, Edge Functions) |
| Payments    | M-Pesa Daraja API (STK Push)         |
| Hosting     | cPanel / HostPinnacle                |
| Build Tools | esbuild, TypeScript, Vitest          |
| Linting     | ESLint, Prettier, Husky              |

## 📁 Project Structure

```
stokika/
├── css/                    # Stylesheets
├── js/                     # JavaScript modules
│   ├── features/           # Feature-specific JS (activity logs, etc.)
│   └── ...                 # Core JS files (auth, config, vendor, etc.)
├── html/                   # Shared HTML partials
├── config/                 # SQL schemas & database configuration
├── supabase/               # Supabase Edge Functions & migrations
│   ├── functions/          # Edge Functions (payment, callbacks, etc.)
│   └── migrations/         # Database migration files
├── server/                 # Backend API (Express config server)
├── assets/                 # Images, icons, media
├── scripts/                # Utility scripts
├── docs/                   # Internal documentation
├── md/                     # Markdown notes
└── *.html                  # Page-level HTML files
```

## ⚙️ Setup & Installation

### Prerequisites

- Node.js ≥ 18.0.0
- A [Supabase](https://supabase.com) project
- M-Pesa Daraja API credentials (for payment features)

### 1. Clone the Repository

```bash
git clone https://github.com/wapewe/stokika.git
cd stokika
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase URL, keys, M-Pesa credentials, and security secrets.  
See `.env.mpesa.example` for M-Pesa-specific configuration.

### 4. Database Setup

Run the SQL migration files in Supabase Dashboard (SQL Editor) in the order specified in `config/SQL_FILES_INVENTORY.md`.

### 5. Run Locally

For local development, use a local HTTP server (e.g., Live Server in VS Code) or:

```bash
npm run build:dev
```

## 🔐 Security

This project implements multiple layers of security:

- **Row Level Security (RLS)** — Enforced at database level via Supabase
- **XSS Protection** — Input sanitization and output encoding
- **CSRF Tokens** — Request verification on state-changing operations
- **Rate Limiting** — Login attempts, API requests, and OTP verification
- **Encrypted Secrets** — Environment-based credential management
- **Content Security Policy** — Configured via `.htaccess`

> **⚠️ Important:** Never commit `.env`, `private/`, or `config.json` files. See `.gitignore` for the full exclusion list.

## 📦 Build & Deploy

```bash
# Production build
npm run build

# Type checking
npm run typecheck

# Run tests
npm test
```

For cPanel deployment, refer to `CPANEL_DEPLOYMENT_GUIDE.md` and `DEPLOYMENT_GUIDE.md` in the project root.

## 📄 License

**UNLICENSED** — This is a private, proprietary project. All rights reserved.

---

Built with ❤️ by the Stokika Development Team
