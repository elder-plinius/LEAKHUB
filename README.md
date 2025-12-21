# 🔓 LeakHub

> The community hub for crowd-sourced system prompt leak verification. **CL4R1T4S!**

LeakHub is an open-source platform where the community can submit, verify, and browse leaked AI system prompts. The platform uses a consensus-based verification system to ensure authenticity and rewards contributors with a points-based leaderboard.

---

## ✨ Features

- **🔍 System Prompt Library** - Browse verified AI system prompts organized by provider
- **📝 Submit Leaks** - Contribute system prompts for AI models, apps, tools, agents, and plugins
- **✅ Community Verification** - Leaks require 2 unique users to verify before becoming "verified"
- **🏆 Leaderboard & Points System** - Earn points for contributions and climb the rankings
- **🎯 Requests System** - Request specific AI system prompts from the community
- **🔐 GitHub OAuth** - Secure authentication via GitHub
- **⚡ Real-time Updates** - Instant updates powered by Convex

### Points System

| Action                                             | Points |
| -------------------------------------------------- | ------ |
| Submit a leak that gets verified (first submitter) | +100   |
| Verify someone else's leak                         | +50    |
| Create a request that gets verified                | +20    |

---

## 🛠️ Tech Stack

### Frontend

- **[React 19](https://react.dev/)** - UI library
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[React Router v7](https://reactrouter.com/)** - Client-side routing
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend

- **[Convex](https://convex.dev/)** - Real-time backend (database, server functions, file storage)
- **[Convex Auth](https://labs.convex.dev/auth)** - Authentication with GitHub OAuth

### Deployment

- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Edge deployment via Wrangler

---

## 📁 Project Structure

```
leakhub/
├── convex/                    # Convex backend
│   ├── _generated/            # Auto-generated types and API
│   ├── auth.config.ts         # Auth configuration
│   ├── auth.ts                # Auth handlers
│   ├── github.ts              # GitHub API integration
│   ├── http.ts                # HTTP endpoints
│   ├── leaderboard.ts         # Leaderboard queries
│   ├── leaks.ts               # Leak mutations and queries
│   ├── requests.ts            # Request mutations and queries
│   ├── schema.ts              # Database schema
│   └── users.ts               # User mutations and queries
├── src/                       # React frontend
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Shadcn/Radix UI components
│   │   ├── leakLibrary.tsx    # Leak browser component
│   │   ├── navbar.tsx         # Navigation bar
│   │   └── submitLeakForm.tsx # Leak submission form
│   ├── pages/                 # Page components
│   │   ├── Dashboard.tsx      # User dashboard
│   │   ├── Leaderboard.tsx    # Points leaderboard
│   │   └── Requests.tsx       # Leak requests page
│   ├── lib/                   # Utility functions
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── dist/                      # Production build output
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── wrangler.jsonc             # Cloudflare deployment config
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- A [Convex](https://convex.dev/) account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/leakhub.git
   cd leakhub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Convex**

   ```bash
   npx convex dev
   ```

   This will prompt you to log in and create a new Convex project.

4. **Configure GitHub OAuth**

   Set up GitHub OAuth credentials in your Convex dashboard and configure the environment variables.

5. **Start the development server**
   ```bash
   npm run dev
   ```
   This runs both the Vite frontend and Convex backend concurrently.

### Available Scripts

| Script                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start frontend and backend in development mode |
| `npm run dev:frontend` | Start only the Vite dev server                 |
| `npm run dev:backend`  | Start only the Convex dev server               |
| `npm run build`        | Build for production                           |
| `npm run preview`      | Preview production build locally               |
| `npm run deploy`       | Build and deploy to Cloudflare Pages           |
| `npm run lint`         | Run TypeScript and ESLint checks               |

---

## 🗄️ Database Schema

### Tables

#### `leaks`

Stores system prompt leaks with verification status.

| Field             | Type           | Description                                   |
| ----------------- | -------------- | --------------------------------------------- |
| `targetName`      | `string`       | Name of the AI system                         |
| `provider`        | `string`       | Provider/company name                         |
| `targetType`      | `enum`         | Type: model, app, tool, agent, plugin, custom |
| `leakText`        | `string`       | The actual system prompt                      |
| `leakContext`     | `string?`      | Additional context                            |
| `url`             | `string?`      | Source URL                                    |
| `isFullyVerified` | `boolean`      | Verification status                           |
| `submittedBy`     | `Id<users>?`   | Submitter reference                           |
| `verifiedBy`      | `Id<users>[]?` | Verifiers references                          |
| `requiresLogin`   | `boolean?`     | Access requirements                           |
| `isPaid`          | `boolean?`     | Paid service flag                             |
| `hasToolPrompts`  | `boolean?`     | Has tool/function prompts                     |

#### `requests`

Stores community requests for specific system prompts.

| Field         | Type          | Description                                   |
| ------------- | ------------- | --------------------------------------------- |
| `targetName`  | `string`      | Requested AI system name                      |
| `provider`    | `string`      | Provider/company name                         |
| `targetType`  | `enum`        | Type: model, app, tool, agent, plugin, custom |
| `targetUrl`   | `string`      | URL to the target                             |
| `closed`      | `boolean`     | Whether request is fulfilled                  |
| `leaks`       | `Id<leaks>[]` | Associated leak submissions                   |
| `submittedBy` | `Id<users>`   | Requester reference                           |

#### `users`

User profiles with points tracking.

| Field      | Type              | Description         |
| ---------- | ----------------- | ------------------- |
| `name`     | `string`          | Display name        |
| `image`    | `string`          | Profile picture URL |
| `email`    | `string`          | Email address       |
| `points`   | `number`          | Accumulated points  |
| `leaks`    | `Id<leaks>[]?`    | Submitted leaks     |
| `requests` | `Id<requests>[]?` | Created requests    |

---

## 🔒 Verification Algorithm

LeakHub uses a consensus-based verification system:

1. **Submission** - Users submit leaks linked to requests
2. **Similarity Detection** - Text similarity is calculated using:
   - Shingle-based cosine similarity (fast filter)
   - Levenshtein distance (precise matching)
3. **Consensus** - When 2+ unique users submit similar content (≥85% similarity), the leak is verified
4. **Rewards** - Points are distributed to submitter, verifiers, and request creator

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE.txt](LICENSE.txt) file for details.

---

## 🙏 Acknowledgments

- Built with [Convex](https://convex.dev/) - The fullstack TypeScript development platform
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
