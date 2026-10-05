# clips. — Sell your work directly

clips. is the creator marketplace for selling digital work with pay-to-unlock links.

## Features

- Upload photos, videos, PDFs or any file
- Set a price and share a link
- Fans pay to unlock your content
- You keep 70% of revenue

## Tech Stack

- **Next.js 16** - React framework
- **Supabase** - Database and authentication
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **shadcn/ui** - UI components

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/feranmiviber/mobile-only-clips.git
cd mobile-only-clips
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   └── layout.tsx    # Root layout
├── components/       # React components
├── lib/              # Utility functions
├── public/           # Static assets
└── middleware.ts     # Next.js middleware
```

## Deployment

This project can be deployed to Vercel, Netlify, or any Node.js hosting platform.

## License

MIT
