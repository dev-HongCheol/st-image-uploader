# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server  
- `pnpm lint` - Run ESLint

## Project Architecture

This is a Next.js 15 image uploader application with Supabase authentication and self-hosted backend.

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Self-hosted Supabase (Docker)
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **UI**: Radix UI primitives, Lucide icons, Sonner toasts

### Key Architecture Patterns

**Route Protection**: Middleware at `src/middleware.ts` handles auth session updates. The `(auth)` route group requires authentication - users are redirected to Google login if not authenticated.

**Supabase Integration**: 
- Server-side client: `src/utils/supabase/server.ts` 
- Client-side client: `src/utils/supabase/client.ts`
- Middleware integration: `src/utils/supabase/middleware.ts`

**Layout Structure**:
- Root layout provides theme system and global toasts
- Auth layout (`src/app/(auth)/layout.tsx`) includes sidebar navigation and user authentication checks
- Uses shadcn/ui Sidebar component for navigation

**Component Organization**:
- Global components: `src/components/ui/` (shadcn/ui components)
- Route-specific components: `src/app/(route)/_components/`
- Hooks: `src/hooks/`
- Constants: `src/constants/`

### Environment Setup

The project uses self-hosted Supabase with Docker. See README.md for setup details including:
- Docker configuration for Supabase
- Google OAuth setup requirements
- Password configuration issues and workarounds

### Development Notes

- Korean language support (html lang="ko")
- Uses Geist fonts (sans and mono)
- File upload functionality is in development
- Access restricted to specific users (owner's Gmail only)


### Code Generation Rules

- 모든 함수에 JSDoc 주석 추가 필수
- TypeScript 타입 정의 포함
- 에러 핸들링 코드 포함
- 한국어 주석으로 복잡한 로직 설명