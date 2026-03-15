# WasslChat 🚀

> Multi-Tenant WhatsApp Commerce & CRM Platform for Egyptian SMEs

Built by **HealthFlow Group** — Transforming WhatsApp into a complete e-commerce storefront.

---

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | NestJS 10 + TypeScript | API server with Swagger docs |
| Database | PostgreSQL 17 + Prisma | Multi-tenant with RLS |
| Cache | Redis 7 | Sessions, queues, caching |
| WhatsApp | Evolution API (Baileys) | Message gateway |
| Automation | n8n | Workflow automation |
| AI | OpenAI GPT-4o-mini | Smart replies, intent classification |

## Modules (27 Total)

| Module | Endpoints | Features |
|--------|-----------|----------|
| **Auth** | `/auth/*` | Register, Login, JWT, Refresh tokens, Password Reset |
| **Tenants** | `/tenant/*` | Dashboard stats, settings, branding |
| **Users** | `/users/*` | Team management, roles (Owner/Admin/Manager/Agent) |
| **Products** | `/products/*` | CRUD, inventory, SKU, Arabic/English, search, filters, Bulk Update |
| **Categories** | `/categories/*` | Tree structure, reorder, bilingual |
| **Contacts** | `/contacts/*` | CRM, tags, order history, block/unblock, Import/Export |
| **Orders** | `/orders/*` | Full lifecycle, status tracking, notes, inventory deduction |
| **Conversations** | `/conversations/*` | Inbox, assign agent, status management |
| **Messages** | `/conversations/:id/messages/*` | Send text/media via WhatsApp, message history |
| **Payments** | `/payments/*` | HealthPay, Fawry, Vodafone Cash, COD + webhooks, Refunds |
| **WhatsApp** | `/whatsapp/*` | Connect (QR), send text/media/catalog, webhooks |
| **Chatbots** | `/chatbots/*` | Keyword/regex triggers, Typebot/n8n integration |
| **Broadcasts** | `/broadcasts/*` | Campaign management, audience targeting, send/cancel, Stats |
| **Analytics** | `/analytics/*` | Dashboard, sales reports, top products, customer insights |
| **AI** | `/ai/*` | Reply suggestions, intent classification, sentiment, translation |
| **Integrations** | `/integrations/*` | WooCommerce, Shopify sync + WasslBox, Bosta shipping |
| **Health** | `/health/*` | Liveness/readiness probes for K8s |
| **Notifications** | `/notifications/*` | In-app alerts, unread counts, broadcast messages |
| **Coupons** | `/coupons/*` | Discounts, free shipping, usage limits, validation |
| **Audit Log** | `/audit-logs/*` | Activity tracking with resource/user/action filters |
| **WA Templates** | `/whatsapp-templates/*` | Cloud API template management, approval sync |
| **Webhooks** | `/webhooks/*` | Tenant-registered endpoints, HMAC signatures, auto-retry |
| **Automation** | `/automation/*` | Event-based rules, conditions, actions, execution counts |
| **Tags** | `/tags/*` | Contact categorization and segmentation |
| **Quick Replies** | `/quick-replies/*` | Pre-saved agent responses |
| **Websocket** | (WS Gateway) | Real-time events for chat and notifications |
| **Uploads** | `/uploads/*` | File handling for media and documents |

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/healthflow-group/wasslchat.git
cd wasslchat
cp .env.example .env
cp dashboard/.env.example dashboard/.env

# 2. Start infrastructure
docker compose up -d

# 3. Install and setup backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 4. Install frontend
cd dashboard
npm install
cd ..

# 5. Run backend (Terminal 1)
npm run dev

# 6. Run frontend (Terminal 2)
cd dashboard
npm run dev

# API:       http://localhost:3001/api/v1
# Swagger:   http://localhost:3001/docs
# Dashboard: http://localhost:3000
# n8n:       http://localhost:5678
# Evolution: http://localhost:8080
```

**Demo login:** `demo@wasslchat.com` / `demo2026`

## Pricing Tiers

| Plan | Price/mo | Conversations | Team | Products |
|------|----------|---------------|------|----------|
| Starter | 499 EGP | 500 | 2 | 100 |
| Growth | 999 EGP | 2,000 | 5 | 500 |
| Business | 1,999 EGP | 5,000 | 10 | Unlimited |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

## Database Schema

30+ tables including: Plans, Tenants, Users, Contacts, Tags, Categories, Products, ProductVariants, Orders, OrderItems, OrderNotes, PaymentTransactions, WhatsappSessions, Conversations, Messages, QuickReplies, ChatbotFlows, AutomationRules, Broadcasts, Integrations, Notifications, Coupons, AuditLogs, WhatsappTemplates, WebhookEndpoints.

All tables enforce multi-tenancy via `tenantId` with PostgreSQL Row-Level Security.

## Payment Gateways

- **HealthPay** — Digital wallet + card payments (HealthFlow ecosystem)
- **Fawry** — Reference code payments at 200K+ retail points
- **Vodafone Cash** — Mobile money for 15M+ subscribers
- **COD** — Cash on Delivery with National ID verification

## Shipping Providers

- **WasslBox** — Same-day & next-day delivery (HealthFlow ecosystem)
- **Bosta** — Nationwide coverage across all governorates

## Project Structure

```
wasslchat/
├── src/                           # Backend
│   ├── main.ts                    # Entry point + Swagger
│   ├── app.module.ts              # Root module
│   ├── common/                    # Shared utilities
│   └── modules/                   # 27 Feature modules
├── dashboard/                     # Next.js Frontend
│   ├── src/
│   │   ├── app/                   # App router pages
│   │   ├── components/            # UI components
│   │   └── lib/                   # API clients & utils
├── prisma/                        # DB schema & migrations
├── n8n-workflows/                 # Pre-built automations
├── docker/                        # Docker config
├── .github/workflows/             # CI/CD pipelines
├── docker-compose.yml             # Full dev stack
└── package.json                   # Dependencies
```

---

**Built with ❤️ for Egypt's SMEs** 🇪🇬

HealthFlow Group © 2026
