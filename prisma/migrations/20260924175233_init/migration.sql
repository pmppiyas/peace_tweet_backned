-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "DuaStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('QURAN', 'HADITH', 'OTHER');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fadilah" TEXT NOT NULL,
    "duaBangla" TEXT NOT NULL,
    "meaningBangla" TEXT NOT NULL,
    "arabicText" TEXT,
    "transliteration" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "DuaStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dua_audios" (
    "id" TEXT NOT NULL,
    "duaId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "reciterName" TEXT,
    "duration" INTEGER,
    "language" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dua_audios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dua_references" (
    "id" TEXT NOT NULL,
    "duaId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dua_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_duas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duaId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_duas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_sortOrder_idx" ON "categories"("sortOrder");

-- CreateIndex
CREATE INDEX "duas_categoryId_idx" ON "duas"("categoryId");

-- CreateIndex
CREATE INDEX "duas_createdById_idx" ON "duas"("createdById");

-- CreateIndex
CREATE INDEX "duas_status_idx" ON "duas"("status");

-- CreateIndex
CREATE INDEX "duas_createdAt_idx" ON "duas"("createdAt");

-- CreateIndex
CREATE INDEX "duas_status_categoryId_idx" ON "duas"("status", "categoryId");

-- CreateIndex
CREATE INDEX "dua_audios_duaId_idx" ON "dua_audios"("duaId");

-- CreateIndex
CREATE INDEX "dua_references_duaId_idx" ON "dua_references"("duaId");

-- CreateIndex
CREATE INDEX "dua_references_sourceId_idx" ON "dua_references"("sourceId");

-- CreateIndex
CREATE INDEX "saved_duas_userId_idx" ON "saved_duas"("userId");

-- CreateIndex
CREATE INDEX "saved_duas_duaId_idx" ON "saved_duas"("duaId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_duas_userId_duaId_key" ON "saved_duas"("userId", "duaId");

-- CreateIndex
CREATE INDEX "sources_type_idx" ON "sources"("type");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- AddForeignKey
ALTER TABLE "duas" ADD CONSTRAINT "duas_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duas" ADD CONSTRAINT "duas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dua_audios" ADD CONSTRAINT "dua_audios_duaId_fkey" FOREIGN KEY ("duaId") REFERENCES "duas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dua_references" ADD CONSTRAINT "dua_references_duaId_fkey" FOREIGN KEY ("duaId") REFERENCES "duas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dua_references" ADD CONSTRAINT "dua_references_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_duas" ADD CONSTRAINT "saved_duas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_duas" ADD CONSTRAINT "saved_duas_duaId_fkey" FOREIGN KEY ("duaId") REFERENCES "duas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
