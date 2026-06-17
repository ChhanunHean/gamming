-- Run on VM2 (PostgreSQL) before starting the backend
-- sudo -u postgres psql -d gaming_center -f schema.sql

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager', 'staff')),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  station_id INTEGER NOT NULL REFERENCES stations(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'completed')),
  check_in_staff_id INTEGER NOT NULL REFERENCES staff(id),
  check_out_staff_id INTEGER REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL
    CHECK(payment_method IN ('cash', 'card', 'qr', 'ewallet')),
  receipt_number TEXT NOT NULL UNIQUE,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id INTEGER NOT NULL REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('hourly_rate', '5.00'),
  ('center_name', 'Nexus Gaming Center'),
  ('center_address', '123 Gaming Street, Phnom Penh, Cambodia'),
  ('center_phone', '+855 12 345 678'),
  ('center_email', 'info@nexusgaming.com'),
  ('center_hours', 'Open 24/7'),
  ('inactivity_timeout_minutes', '30')
ON CONFLICT (key) DO NOTHING;
