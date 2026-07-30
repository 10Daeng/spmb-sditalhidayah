# PRD SISTER 1.0 — Next.js + Prisma + Supabase

## 1. Executive Summary
Sistem Informasi Sekolah Terpadu (SISTER) versi 1.0 dibangun dengan stack modern: Next.js App Router, React Server Components, Tailwind CSS, Prisma ORM, dan Supabase.

## 2. Tech Stack
- **Framework:** Aston 6+ 
- **UI Library:** React 18+
- **UI Components:** shadcn/ui (Button, Dialog, Table, Form, Tabs, Card, Select, Alert, Toast, dll.)
- **Styling:** Tailwind CSS
- **Database ORM:** Prisma
- **Database & Auth:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(SISWA)
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  posts    Post[]
  student  Student?
  teacher  Teacher?
}

enum Role {
  SUPER_ADMIN
  ADMIN_TU
  GURU
  SISWA
  WALI_MURID
}

model Post {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  excerpt     String?
  content     String
  category    String
  status      String   @default("draft")
  publishedAt DateTime?
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Student {
  id          String    @id @default(uuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id])
  classId     String?
  nisn        String?
  name        String
  gender      String?
  address     String?
  status      String    @default("active")
  createdAt   DateTime  @default(now())
}

model Teacher {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  nip       String?
  name      String
  position  String?
  createdAt DateTime @default(now())
}

model Classroom {
  id        String   @id @default(uuid())
  name      String
  level     Int
  createdAt DateTime @default(now())
}

model Subject {
  id        String   @id @default(uuid())
  name      String
  code      String?
  createdAt DateTime @default(now())
}

model Schedule {
  id        String   @id @default(uuid())
  classId   String
  subjectId String
  teacherId String
  day       String
  startTime String
  endTime   String
  createdAt DateTime @default(now())
}

model Registration {
  id                 String   @id @default(uuid())
  registrationNumber String   @unique
  name               String
  email              String?
  nisn               String?
  nik                String?
  track              String
  status             String   @default("Pending")
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Document {
  id        String   @id @default(uuid())
  title     String
  type      String
  classId   String?
  subjectId String?
  fileUrl   String?
  status    String   @default("published")
  createdAt DateTime @default(now())
}

model Achievement {
  id        String   @id @default(uuid())
  studentId String
  title     String
  level     String
  category  String
  date      DateTime
  createdAt DateTime @default(now())
}

model AcademicCalendar {
  id          String   @id @default(uuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime?
  type        String
  status      String   @default("published")
  createdAt   DateTime @default(now())
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  group     String   @default("general")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 4. Supabase Setup

### 4.1 Auth
- Supabase Auth dengan Email/Password
- Row Level Security (RLS) untuk setiap tabel
- Role-based access via `user_metadata`

### 4.2 Storage
- Bucket: `public` (galeri, berita)
- Bucket: `private` (dokumen SPMB)

### 4.3 Realtime (Opsional)
- Status SPMB realtime
- Notifikasi admin saat ada pendaftar baru

## 5. Next.js App Router Structure

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    admin/
      page.tsx (Admin Dashboard)
      ppdb/page.tsx
      berita/page.tsx
      pengaturan/page.tsx
    guru/
      page.tsx (Guru Dashboard)
    siswa/
      page.tsx (Siswa Dashboard)
  api/
    auth/
      [...nextauth]/route.ts (atau Supabase Auth)
    ppdb/route.ts
    berita/route.ts
  page.tsx (Home)
  layout.tsx
  globals.css
components/
  ui/ (shadcn/ui components — auto-generated)
    button.tsx, card.tsx, dialog.tsx, table.tsx, form.tsx, dll.
  layout/
    Navbar.tsx
    Sidebar.tsx
    Footer.tsx
  custom/
    StatCard.tsx
    DataTable.tsx
    FileUpload.tsx
    StatusBadge.tsx
lib/
  prisma.ts
  supabase.ts
  utils.ts
prisma/
  schema.prisma
public/
```

## 6. Fitur Utama

### Modul Publik
- SSR Home Page (highlight berita, statistik)
- ISR Berita (Incremental Static Regeneration)
- Dynamic Routing untuk detail berita

### Modul SPMB
- Server Actions untuk form submission
- Supabase Storage untuk upload berkas
- Realtime status tracking

### Modul Akademik
- Prisma queries untuk jadwal, materi, prestasi
- React Server Components untuk data fetching

### Admin Panel
- Route Groups untuk layout terpisah
- Server Actions untuk CRUD
- Prisma untuk complex queries

## 7. Environment Variables (.env)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Prisma)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 8. Commands

```bash
# 1. Setup Next.js + Tailwind + shadcn/ui
npx create-next-app@latest sist --typescript --tailwind --app
npx shadcn-ui@latest init --yes

# 2. Install shadcn/ui components yang dibutuhkan
npx shadcn-ui@latest add button card dialog table tabs form select alert toast badge avatar dropdown-menu sheet input label textarea separator skeleton

# 3. Install Prisma + Supabase
npm install @prisma/client @supabase/supabase-js
npm install -D prisma

# 4. Prisma setup
npx prisma init
npx prisma db push
npx prisma generate
npx prisma studio

# 5. Dev
npm run dev

# 6. Build
npm run build
```

## 9. Deployment (Vercel)

1. Push ke GitHub
2. Import ke Vercel
3. Add Environment Variables
4. Add Build Command: `prisma generate && next build`
5. Deploy

## 10. Keunggulan Stack Ini

- **Next.js App Router:** SSR, ISR, Server Components = performa tinggi
- **shadcn/ui:** Komponen UI siap pakai, copy-paste (bukan npm install), 100% customizable, aksesibilitas built-in
- **Prisma:** Type-safe database queries
- **Supabase:** Database + Auth + Storage dalam satu platform
- **Tailwind:** Utility-first styling cepat
- **Vercel:** Deploy Next.js paling seamless

## 11. Roadmap

1. **Setup:** Next.js + Prisma + Supabase
2. **Auth:** Supabase Auth integration
3. **Database:** Prisma schema + seed
4. **Publik:** Home, Berita, SPMB
5. **Admin:** Dashboard, CRUD
6. **Guru/Siswa:** Role-based dashboards
7. **Polish:** ISR, caching, image optimization
8. **Deploy:** Vercel + Supabase
