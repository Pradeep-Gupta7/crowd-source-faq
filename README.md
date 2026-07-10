# 🎓 Vidyā — Living FAQ Portal

A polished, AI-powered **student support & FAQ portal** built for the **Vicharanashala Internship (VINS)** at IIT Ropar. It combines a crowd-sourced FAQ knowledge base with a grounded AI assistant ("Yakṣa") that answers only from vetted content, while admins manage everything through a real-time analytics dashboard.

> **Calm. Focused. Trustworthy.** Semantic search, zero-hallucination AI answers, and a clean card-based UI — like a well-organized digital help desk.

🌐 **Live Demo:** [crowd-source-faq-seven.vercel.app](https://crowd-source-faq-seven.vercel.app)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Server Function Reference](#-server-function-reference)
- [Roles & Permissions](#-roles--permissions)
- [Advanced Features](#-advanced-features)
- [Deployment](#-deployment-vercel)
- [Contributing](#-contributing)

---

## ✨ Features

### For Students
- **Browse & Discover** — priority-sorted FAQ categories with view counts, upvotes/downvotes, and tag-based filtering
- **Semantic Search** — vector-powered search via pgvector + Gemini Embeddings, finds relevant answers even without exact keyword matches
- **Ask AI (Yakṣa)** — a grounded AI assistant that answers only from the FAQ knowledge base, with bracketed source citations `[1]`, `[2]`
- **Raise a Query** — submit unanswered questions for admin review
- **Community Hub** — see submitted queries, upvote important ones, track admin responses
- **Learning Modules** — chapter-based learning content with progress tracking and enrollment
- **Personal Dashboard** — activity stats, recent queries, bookmarked FAQs, learning progress

### For Admins & Moderators
- **FAQ CRUD** — create, edit, delete, and toggle publish state
- **Category Management** — add, edit, and reorder categories
- **Query Triage** — review, answer, and close student queries; promote to full FAQ entries
- **Analytics** — view counts, search logs, and trending topics
- **User & Role Management** — promote users to admin/moderator

### System-Wide
- **Google OAuth + Email/Password Auth** — via Supabase Auth
- **Row-Level Security** — every table enforces RLS; admins see everything, students see only published content and their own data
- **Zero-Hallucination AI** — retrieval-augmented generation with strict grounding instructions

---

## 🛠 Tech Stack

| Layer         | Technology                                                        |
|---------------|--------------------------------------------------------------------|
| Framework     | [TanStack Start](https://tanstack.com/start) (Vite + React 19 + TypeScript + Vinxi + Nitro) |
| Styling       | Tailwind CSS v4 + Radix UI primitives                              |
| Database      | Supabase (PostgreSQL + pgvector + Row-Level Security)              |
| Auth          | Supabase Auth (Google OAuth + Email/Password)                      |
| AI            | Google Gemini API — `gemini-embedding-001` + `gemini-3.1-flash-lite` |
| Animations    | Motion (Framer Motion v12)                                         |
| Charts        | Recharts                                                            |
| Icons         | Lucide React                                                        |
| Deployment    | Vercel (Nitro auto-preset)                                          |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (React 19)                │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐ │
│  │ Browse  │ │  Ask AI  │ │Queries │ │  Admin    │ │
│  │  FAQs   │ │ (Yakṣa)  │ │  Page  │ │ Dashboard │ │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘ │
│       │           │           │             │       │
│  ┌────▼───────────▼───────────▼─────────────▼─────┐ │
│  │         TanStack Server Functions              │ │
│  │        (createServerFn — Nitro/Vinxi)          │ │
│  └────┬───────────┬───────────────────────────────┘ │
└───────┼───────────┼─────────────────────────────────┘
        │           │
   ┌────▼────┐ ┌────▼──────────────┐
   │Supabase │ │   Gemini API      │
   │  (DB)   │ │  ┌──────────────┐ │
   │ ┌─────┐ │ │  │ Embeddings   │ │
   │ │pgvec│ │ │  │ (1536-dim)   │ │
   │ │ tor │ │ │  ├──────────────┤ │
   │ └─────┘ │ │  │ Chat (LLM)   │ │
   │  + RLS  │ │  │ Grounded Q&A │ │
   └─────────┘ │  └──────────────┘ │
               └───────────────────┘
```

### Key Design Decisions

- **Server Functions** — all database and AI calls run server-side via TanStack's `createServerFn`; API keys never reach the client
- **pgvector** — FAQ embeddings stored directly in PostgreSQL for fast cosine-similarity search via the `match_faqs` RPC
- **Grounded AI** — Ask AI retrieves relevant FAQ context first, then sends it to the LLM with strict grounding instructions to prevent hallucination
- **Row-Level Security** — enforced on every Supabase table

---

## 📁 Project Structure

```
vidya/
├── public/                  # Static assets (logo, screenshots)
├── src/
│   ├── components/          # Reusable UI components (shadcn/ui based)
│   ├── hooks/                # Custom React hooks
│   ├── integrations/         # Supabase client, types, auth middleware
│   ├── lib/                  # Server-side AI helpers, utilities
│   │   ├── ai.server.ts      # Gemini embed() and chat() functions
│   │   └── faq.functions.ts  # All TanStack Server Functions
│   └── routes/
│       ├── index.tsx          # Landing page
│       ├── browse.tsx         # FAQ browser with category filters
│       ├── ask.tsx            # AI-grounded Q&A page
│       ├── queries.tsx        # Community queries
│       ├── auth.tsx           # Login / Sign-up
│       └── _authenticated/    # Protected routes
│           ├── admin.tsx      # Admin dashboard
│           ├── dashboard.tsx  # User dashboard
│           ├── community.tsx  # Community hub
│           └── courses.tsx    # Learning modules
├── schema.sql                # Complete database schema (pgvector + RLS)
├── seed_data.sql              # FAQ seed data (150+ entries)
└── vercel.json                # Vercel configuration
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier works)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Pradeep-Gupta7/crowd-source-faq.git
cd crowd-source-faq
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up the database**

Copy and paste the contents of `schema.sql` into the Supabase SQL Editor and execute it, then do the same with `seed_data.sql` to load FAQ seed data.

**4. Configure environment variables**

Create a `.env` file in the project root (see [Environment Variables](#-environment-variables)).

**5. Start the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

**6. Create an admin user**

Sign up via the app (Google OAuth or email/password), then promote your user to admin in the Supabase SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'admin'
)
ON CONFLICT DO NOTHING;
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# Client-side (Vite requires VITE_ prefix)
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# AI (Google Gemini)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 🧪 Server Function Reference

All calls run server-side via TanStack's `createServerFn` — no public REST routes are exposed.

### Public

| Function         | Description                            |
|-------------------|-----------------------------------------|
| `listCategories`  | Fetch all FAQ categories                |
| `listFaqs`        | List FAQs with sorting & filtering      |
| `semanticSearch`  | Vector similarity search via pgvector   |
| `askAi`           | Grounded AI answer using Gemini LLM     |
| `submitQuery`     | Submit a student query                  |

### Authenticated

| Function     | Description                    |
|--------------|----------------------------------|
| `voteFaq`    | Upvote/downvote a FAQ entry     |

### Admin

| Function          | Description                     |
|--------------------|-----------------------------------|
| `adminCreateFaq`   | Create a new FAQ                |
| `adminUpdateFaq`   | Edit an existing FAQ            |
| `adminDeleteFaq`   | Delete a FAQ                    |
| `adminAnswerQuery` | Answer a student query          |

---

## 👥 Roles & Permissions

| Permission                    | Student | Moderator | Admin |
|--------------------------------|:-------:|:---------:|:-----:|
| Browse & search FAQs           | ✅      | ✅        | ✅    |
| Vote on FAQs                   | ✅      | ✅        | ✅    |
| Ask AI (Yakṣa)                 | ✅      | ✅        | ✅    |
| Raise & track queries          | ✅      | ✅        | ✅    |
| Participate in community hub   | ✅      | ✅        | ✅    |
| Answer / close queries         | ❌      | ✅        | ✅    |
| Create / edit / delete FAQs    | ❌      | ✅        | ✅    |
| Manage categories              | ❌      | ✅        | ✅    |
| View analytics dashboard       | ❌      | ❌        | ✅    |
| Manage users & roles           | ❌      | ❌        | ✅    |

---

## 🔬 Advanced Features

### 🤖 Grounded AI (Ask Yakṣa)
Retrieves the most relevant FAQ entries via pgvector similarity search, then passes them to Gemini with strict instructions to answer only from that context — citing sources with bracket references and refusing to answer when no relevant FAQ exists.

### 🔍 Semantic Search
FAQ content is embedded with `gemini-embedding-001` (1536-dim) and stored directly in PostgreSQL; queries are matched via cosine similarity through the `match_faqs` RPC, so results surface even when wording doesn't match exactly.

### 🛡️ Row-Level Security
Every Supabase table enforces RLS policies — students can only read published content and their own submissions, while admins have full visibility.

---

## 🌐 Deployment (Vercel)

Vidyā is fully optimized for **Vercel** via Nitro's auto-preset detection.

1. **Link** your GitHub repo on [vercel.com](https://vercel.com)
2. **Set environment variables** in the Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `GEMINI_API_KEY`
3. **Deploy** — framework is auto-detected as TanStack Start

> **Build Command:** `npm run build`
> **Output Directory:** `.output`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is part of the **Vicharanashala Internship (VINS)** at IIT Ropar.

---

<p align="center">
  Built with ❤️ using React, TanStack, Supabase & Gemini AI
</p>
