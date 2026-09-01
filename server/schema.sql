-- Run this once against your Neon database before seeding.
-- In the Neon console: open the SQL editor for your project and paste this in,
-- or run: psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  email           TEXT UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  address         TEXT NOT NULL,
  date_of_birth   DATE NOT NULL,
  sour_card_code  TEXT UNIQUE NOT NULL, -- 6-digit code, generated once at signup, never changes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

-- A registration is held here, unverified, until the emailed code is
-- confirmed - the real users row is only created at that point.
CREATE TABLE IF NOT EXISTS pending_signups (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  address        TEXT NOT NULL,
  date_of_birth  DATE NOT NULL,
  code           TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to re-run: migrates an existing users table from the earlier
-- email-based login to username-based login with a full profile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sour_card_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sour_card_code ON users (sour_card_code);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categories (name)
SELECT name
FROM (
  VALUES
    ('Restaurants'),
    ('Cafes'),
    ('Hotels'),
    ('Pharmacies'),
    ('Hospitals'),
    ('Shops'),
    ('Home appliances')
) AS default_categories(name)
WHERE NOT EXISTS (SELECT 1 FROM categories);

CREATE TABLE IF NOT EXISTS listings (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  area           TEXT NOT NULL,
  description    TEXT NOT NULL,
  hours          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  rating         TEXT NOT NULL,
  price          TEXT NOT NULL,
  tag            TEXT,
  image_data     BYTEA,
  image_mime     TEXT,
  image_url      TEXT, -- alternative to uploading a file - either can be set
  logo_data      BYTEA,
  logo_mime      TEXT,
  logo_url       TEXT,
  menu_data      BYTEA, -- menu photo or PDF - restaurants & cafes only, optional
  menu_mime      TEXT,
  menu_url       TEXT,
  instagram_url  TEXT,
  website_url    TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to re-run: adds columns if you already created this table before
-- these existed, and drops the old featured columns now that "A few
-- places we love" / "Where to go nature" live in gallery_items instead.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_mime TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS logo_mime TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS menu_data BYTEA;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS menu_mime TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS menu_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE listings DROP COLUMN IF EXISTS featured;
ALTER TABLE listings DROP COLUMN IF EXISTS featured_order;
ALTER TABLE listings DROP COLUMN IF EXISTS image; -- superseded by image_data/image_url

-- Up to 3 extra photos per listing, shown as a small gallery in the
-- place's detail view. Each of the 3 slots can be a file upload or a URL.
CREATE TABLE IF NOT EXISTS listing_images (
  id           SERIAL PRIMARY KEY,
  listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  image_data   BYTEA,
  image_mime   TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, position)
);

-- Lightweight admin-managed gallery entries: just a name, a location,
-- and an optional photo. Used for two sections, distinguished by "kind":
--   'featured' -> "A few places we love" on the homepage (up to 3, ordered)
--   'nature'   -> the "Where to go nature" gallery page (any number)
-- Deliberately separate from listings - no hours/phone/rating/etc.
CREATE TABLE IF NOT EXISTS gallery_items (
  id           SERIAL PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('featured', 'nature', 'history')),
  name         TEXT NOT NULL,
  location     TEXT NOT NULL,
  details      TEXT,
  name_ar      TEXT,
  name_fr      TEXT,
  location_ar  TEXT,
  location_fr  TEXT,
  details_ar   TEXT,
  details_fr   TEXT,
  image_data   BYTEA,
  image_mime   TEXT,
  image_url    TEXT, -- alternative to uploading a file - either can be set
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  sort_order   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS location_ar TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS location_fr TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS details_ar TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS details_fr TEXT;
ALTER TABLE gallery_items DROP CONSTRAINT IF EXISTS gallery_items_kind_check;
ALTER TABLE gallery_items ADD CONSTRAINT gallery_items_kind_check CHECK (kind IN ('featured', 'nature', 'history'));
CREATE INDEX IF NOT EXISTS idx_gallery_items_kind ON gallery_items (kind);

-- Up to 3 extra photos per gallery item (currently used by "Where to go
-- nature" entries), same shape and rules as listing_images above.
CREATE TABLE IF NOT EXISTS gallery_item_images (
  id               SERIAL PRIMARY KEY,
  gallery_item_id  INTEGER NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  image_data       BYTEA,
  image_mime       TEXT,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gallery_item_id, position)
);

CREATE TABLE IF NOT EXISTS saved_bookmarks (
  id           SERIAL PRIMARY KEY,
  visitor_id   TEXT NOT NULL, -- holds the logged-in user's id (as text)
  listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_visitor ON saved_bookmarks (visitor_id);

CREATE TABLE IF NOT EXISTS ratings (
  id           SERIAL PRIMARY KEY,
  visitor_id   TEXT NOT NULL, -- holds the logged-in user's id (as text)
  listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  stars        INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_listing ON ratings (listing_id);
