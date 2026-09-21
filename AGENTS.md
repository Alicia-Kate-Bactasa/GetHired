# GetHired - Next.js App

React 19 + Next.js App Router + Tailwind CSS v4 project.

## Development Server

Start the development server with:

```bash
npm run dev
```

- Local URL: `http://localhost:3000`
- Hot reload: Changes to source files are reflected immediately

## Project Structure

- `src/app/layout.tsx` - Root layout with fonts, metadata, and global styles
- `src/app/globals.css` - Global CSS entrypoint with Tailwind CSS v4 theme customization
- `src/app/page.tsx` - Landing page route (`/`)
- `src/app/login/page.tsx` - Login page route (`/login`)
- `src/app/dashboard/page.tsx` - Student dashboard page route (`/dashboard`)
- `src/app/admin/page.tsx` - Administrator dashboard route (`/admin`)
- `src/components/` - View components:
  - `Landing.tsx` - Public landing page view
  - `Login.tsx` - Authentication view with 3-step OTP password reset
  - `Dashboard.tsx` - Student workspace, company exploration, bookmarking, and mock interview practice
  - `AdminDashboard.tsx` - DCISM admin console for company management, student registry, and question bank
  - `CompanyCard.tsx` - Reusable company display card with activate/deactivate states
  - `CategoryCard.tsx` - Reusable interview category card
- `src/data.ts` - Centralized mock data and TypeScript interfaces (`Student`, `Company`, `InterviewCategory`, `InterviewQuestion`, `CodingChallenge`)
- `public/` - Static assets:
  - `getHiredLogo.png` - App brand logo
  - `loginPageDesign.png` - Login screen illustration
- `next.config.ts` - Next.js configuration with remote Unsplash images support
- `postcss.config.mjs` - PostCSS configuration with `@tailwindcss/postcss`
- `tsconfig.json` - TypeScript configuration with `@/*` path aliases

## Dependencies

- Runtime: Next.js 16 (App Router), React 19, React DOM 19
- Styling: Tailwind CSS v4 with `@tailwindcss/postcss` and `postcss`
- Formatting: oxfmt

## Code Quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
