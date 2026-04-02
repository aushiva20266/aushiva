
-- Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  batch TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  expiry TEXT NOT NULL,
  "manufacturingDate" TEXT NOT NULL,
  hospital TEXT NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT NOT NULL,
  excess BOOLEAN NOT NULL DEFAULT FALSE,
  "reorderLevel" INTEGER,
  "addedAt" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barcode, hospital)
);

-- Exchange Requests Table
CREATE TABLE IF NOT EXISTS exchange_requests (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  "fromHospital" TEXT NOT NULL,
  "targetHospital" TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  "requestedAt" TEXT NOT NULL,
  "declineReason" TEXT NOT NULL DEFAULT '',
  "declinedBy" JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  hospital TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  hospital TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
