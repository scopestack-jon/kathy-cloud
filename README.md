# Kathy Cloud 🚀

**Kathy** is a contextual payment and workflow assistant that seamlessly integrates with business applications like Practice Panther. It provides instant payment collection capabilities directly within your existing workflow through a Chrome extension and cloud backend.

[![Live Site](https://img.shields.io/badge/Live-kathy.dev-blue)](https://kathy.dev)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://kathy-cloud.vercel.app)

---

## ✨ Features

### 🎯 Core Capabilities
- **Contextual Payment Collection** - Detect invoice/payment contexts on web pages and enable instant payment links
- **Multi-Application Support** - Configure and support multiple business applications (e.g., Practice Panther)
- **Visual Configuration** - Point-and-click interface to configure table structures and payment workflows
- **Real-time Payment Tracking** - Track payment status and sync with your backend
- **Multi-tenant Architecture** - Organization-based data isolation with Row Level Security (RLS)

### 🔐 Authentication & Security
- **Supabase Authentication** - Email/password and Google OAuth support
- **JWT-based Sessions** - Secure token management across extension and web app
- **Row Level Security** - PostgreSQL RLS policies for tenant isolation
- **Secure Payment Processing** - Integration with RunPayments API

### 🎨 User Experience
- **Chrome Extension Popup** - Quick access to authentication and status
- **Content Script Integration** - Seamless UI injection into target applications
- **Marketing Landing Page** - Professional site at [kathy.dev](https://kathy.dev)
- **User Dashboard** - Manage settings, view payment history, configure applications

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Plasmo](https://www.plasmo.com/) - Chrome extension framework
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui

### Backend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Payments**: RunPayments API
- **Deployment**: Vercel

### Infrastructure
- **Database Hosting**: Supabase
- **Cloud Hosting**: Vercel
- **DNS/Domain**: kathy.dev
- **Version Control**: GitHub

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (Supabase recommended)
- RunPayments API account
- Chrome browser for extension testing

### 1. Clone the Repository

```bash
git clone https://github.com/scopestack-jon/kathy-cloud.git
cd kathy-cloud
```

### 2. Install Dependencies

#### Extension
```bash
npm install
```

#### Backend
```bash
cd kathy-cloud
npm install
```

### 3. Environment Configuration

#### Extension: `.env`
Create a `.env` file in the root:

```env
PLASMO_PUBLIC_SUPABASE_URL=your_supabase_url
PLASMO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PLASMO_PUBLIC_API_URL=https://kathy-cloud.vercel.app
```

#### Backend: `kathy-cloud/.env`
Create a `.env` file in the `kathy-cloud` directory:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

RUNPAYMENTS_API_KEY=your_runpayments_api_key
RUNPAYMENTS_BASE_URL=https://api.runpayments.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

```bash
cd kathy-cloud

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Run RLS policies (in Supabase SQL Editor)
# Execute: prisma/migrations/01_rls_policies.sql
```

### 5. Run Development Servers

#### Extension
```bash
npm run dev
```
Then load the extension from `build/chrome-mv3-dev` in Chrome.

#### Backend
```bash
cd kathy-cloud
npm run dev
```
Access at `http://localhost:3000`

---

## 📁 Project Structure

```
kathy-cloud/
├── src/                          # Chrome Extension
│   ├── popup.tsx                 # Extension popup UI
│   ├── background.ts             # Service worker
│   ├── contents/                 # Content scripts
│   │   ├── universal.tsx         # Global content script
│   │   ├── practice-panther.tsx  # App-specific integration
│   │   └── auth-callback.ts      # Auth flow handler
│   └── lib/                      # Shared utilities
│       └── supabase.ts           # Supabase client
│
├── kathy-cloud/                  # Next.js Backend
│   ├── app/                      # App router
│   │   ├── (marketing)/          # Public marketing pages
│   │   │   └── page.tsx          # Landing page (kathy.dev)
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/            # Login/signup page
│   │   │   └── callback/         # OAuth callback
│   │   ├── dashboard/            # Protected dashboard
│   │   └── api/                  # API routes
│   │       ├── auth/             # Auth endpoints
│   │       ├── payments/         # Payment processing
│   │       ├── config/           # App configuration
│   │       └── webhooks/         # Payment webhooks
│   │
│   ├── prisma/                   # Database
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # SQL migrations & RLS
│   │
│   ├── lib/                      # Backend utilities
│   │   ├── prisma.ts             # Prisma client
│   │   ├── supabase-server.ts    # Supabase server client
│   │   └── runpayments-real.ts   # Payment API
│   │
│   └── components/               # Shared UI components
│       └── ui/                   # Shadcn components
│
├── assets/                       # Extension assets
│   └── icon.png                  # Extension icon
│
└── README.md                     # This file
```

---

## 🔧 Configuration

### Application Setup

1. **Sign up** at [kathy.dev/signup](https://kathy.dev/signup)
2. **Install the extension** and authenticate
3. **Navigate** to your target application (e.g., Practice Panther)
4. **Click "Configure Application"** in the extension
5. **Follow the visual flow** to map invoice tables and payment fields
6. **Save configuration** - it's stored per organization

### Supported Applications

Currently integrated:
- **Practice Panther** - Law practice management
- _(More coming soon!)_

---

## 💳 Payment Processing

Kathy uses **RunPayments** for secure payment processing:

1. User clicks "Collect Payment" on an invoice
2. Backend creates a payment session via RunPayments API
3. Customer receives a secure payment link
4. Payment status syncs back via webhooks
5. Invoice status updates in real-time

### Webhook Setup

Configure RunPayments webhook:
```
URL: https://kathy-cloud.vercel.app/api/webhooks/runpayments
Events: payment.completed
```

---

## 🚀 Deployment

### Extension (Chrome Web Store)

```bash
npm run build
npm run package
# Upload build/chrome-mv3-prod.zip to Chrome Web Store
```

### Backend (Vercel)

```bash
cd kathy-cloud
vercel --prod
```

**Environment Variables** must be configured in Vercel dashboard.

### Database (Supabase)

- Migrations are applied manually via Supabase SQL Editor
- RLS policies ensure multi-tenant security
- Connection pooling enabled for production

---

## 🔐 Security

### Authentication Flow

1. User clicks "Sign In / Sign Up" in extension
2. Opens web app in new tab
3. Authenticates via Supabase (email/password or Google)
4. Session stored in `chrome.storage.local`
5. All API calls use JWT bearer tokens

### Data Isolation

- **Row Level Security (RLS)** enforces tenant boundaries
- Users can only access their organization's data
- Helper functions validate `organization_id` on all queries

---

## 📊 Database Schema

### Core Models

- **Organization** - Tenant container
- **User** - User profiles linked to organizations
- **ApplicationConfig** - Per-org app configurations
- **PaymentSession** - Payment tracking
- **AuditLog** - Activity logging

See `kathy-cloud/prisma/schema.prisma` for full schema.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

- **Documentation**: See `*.md` files in the repo
- **Issues**: [GitHub Issues](https://github.com/scopestack-jon/kathy-cloud/issues)
- **Email**: support@kathy.dev

---

## 🎯 Roadmap

- [ ] Google OAuth integration
- [ ] Additional payment provider support
- [ ] More application integrations (QuickBooks, FreshBooks, etc.)
- [ ] Advanced payment scheduling
- [ ] Analytics dashboard
- [ ] Mobile app

---

## 🙏 Acknowledgments

Built with:
- [Plasmo](https://www.plasmo.com/) - Extension framework
- [Next.js](https://nextjs.org/) - Web framework
- [Supabase](https://supabase.com/) - Auth & database
- [Prisma](https://www.prisma.io/) - ORM
- [Vercel](https://vercel.com/) - Hosting
- [RunPayments](https://runpayments.com/) - Payment processing
- [Shadcn/ui](https://ui.shadcn.com/) - UI components

---

**Made with ❤️ by the Kathy team**

🌐 [kathy.dev](https://kathy.dev) | 📧 hello@kathy.dev
