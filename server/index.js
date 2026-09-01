import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { pool } from './db.js';
import { comparePassword, hashPassword, optionalAuth, requireAuth, signToken } from './auth.js';
import { sendEmail, verificationEmailHtml, resetPasswordEmailHtml } from './email.js';

if (process.env.NODE_ENV === 'production') {
  const requiredSettings = [
    'JWT_SECRET',
    'ADMIN_SECRET',
    'ALLOWED_ORIGINS',
    'BREVO_API_KEY',
    'BREVO_SENDER_EMAIL',
  ];
  const missingSettings = requiredSettings.filter((name) => !process.env[name]);
  if (missingSettings.length) {
    throw new Error(`Missing required production environment variables: ${missingSettings.join(', ')}`);
  }
  const shortSecrets = ['JWT_SECRET', 'ADMIN_SECRET'].filter((name) => process.env[name].length < 32);
  if (shortSecrets.length) {
    throw new Error(`Production secrets must be at least 32 characters: ${shortSecrets.join(', ')}`);
  }
}

const app = express();
const IMAGE_CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';
app.set('trust proxy', 1); // needed for correct client IPs behind a reverse proxy (Render, Railway, etc.)
// crossOriginResourcePolicy is relaxed to "cross-origin" because the
// frontend runs on a different origin (different port/domain) than this
// API, and needs to load images from it directly via <img> tags. Helmet's
// default ("same-origin") blocks exactly that.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

// CORS: locked to ALLOWED_ORIGINS (comma-separated) in production. If unset,
// allows any origin - fine for local dev, NOT safe for a live deployment.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!allowedOrigins.length) {
  console.warn('WARNING: ALLOWED_ORIGINS is not set - CORS is open to any origin. Set it before deploying publicly.');
}
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));

app.use(express.json({ limit: '10mb' }));

// General limiter: caps request volume per IP across the API. Image-serving
// routes are excluded - a single page load fires off many image requests at
// once (one per listing shown), and refreshing a page a few times while
// browsing normally would otherwise trip this. The limiter still applies to
// every JSON/data endpoint, which is where abuse actually matters.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' && (
    req.path.endsWith('/image') ||
    req.path.endsWith('/logo') ||
    req.path.endsWith('/menu') ||
    req.path.includes('/image/')
  ),
});
app.use('/api/', generalLimiter);

// Tighter limiter for auth endpoints - these are the ones worth protecting
// against brute-force / credential-stuffing / spam-account creation.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Login specifically: brute-forcing a password is the highest-value target,
// so this stays tighter than the general auth limiter.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// Registration/resend-code: protects against spamming the email-sending
// endpoints (which cost real money per send via Brevo).
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a while and try again.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a while and try again.' },
});

// Constant-time string comparison, so checking the admin code can't leak
// timing information about how much of it was guessed correctly.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------- Admin auth ----------
function requireAdmin(req, res, next) {
  const code = req.headers['x-admin-code'];
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'Server has no ADMIN_SECRET configured' });
  }
  if (!code || !safeEqual(code, process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'Invalid admin code' });
  }
  next();
}

app.post('/api/admin/verify', authLimiter, (req, res) => {
  const { code } = req.body;
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'Server has no ADMIN_SECRET configured' });
  }
  if (safeEqual(code, process.env.ADMIN_SECRET)) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid admin code' });
});

// ---------- User auth ----------
function generateCardCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function generateUniqueCardCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCardCode();
    const { rows } = await pool.query('SELECT 1 FROM users WHERE sour_card_code = $1', [code]);
    if (!rows.length) return code;
  }
  throw new Error('Could not generate a unique card code');
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MS = 15 * 60 * 1000;

// Registration is two steps: submit details -> emailed code -> confirm code.
// Nothing is written to the users table until the code is confirmed.
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const { firstName, lastName, username, email, address, dateOfBirth, password } = req.body;
  if (!firstName || !lastName || !username || !email || !address || !dateOfBirth || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscores only.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  try {
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existingUsername.rows.length) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingEmail.rows.length) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    const passwordHash = await hashPassword(password);
    const code = generateCardCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await pool.query('DELETE FROM pending_signups WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    await pool.query(
      `INSERT INTO pending_signups (email, username, password_hash, first_name, last_name, address, date_of_birth, code, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [email.toLowerCase(), username.toLowerCase(), passwordHash, firstName, lastName, address, dateOfBirth, code, expiresAt]
    );

    await sendEmail({ to: email, subject: 'Confirm your email - Where To Go Sour', html: verificationEmailHtml(code) });
    res.status(201).json({ pending: true, email: email.toLowerCase() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start registration. Please try again.' });
  }
});

app.post('/api/auth/resend-code', registerLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const { rows } = await pool.query('SELECT id FROM pending_signups WHERE email = $1 ORDER BY id DESC LIMIT 1', [email.toLowerCase()]);
    if (!rows.length) return res.status(404).json({ error: 'No pending registration found for that email.' });
    const code = generateCardCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await pool.query('UPDATE pending_signups SET code = $2, expires_at = $3 WHERE id = $1', [rows[0].id, code, expiresAt]);
    await sendEmail({ to: email, subject: 'Your new code - Where To Go Sour', html: verificationEmailHtml(code) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend code.' });
  }
});

app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });
  try {
    const { rows } = await pool.query('SELECT * FROM pending_signups WHERE email = $1 ORDER BY id DESC LIMIT 1', [email.toLowerCase()]);
    const pending = rows[0];
    if (!pending) return res.status(404).json({ error: 'No pending registration found for that email.' });
    if (new Date(pending.expires_at) < new Date()) return res.status(400).json({ error: 'That code has expired. Request a new one.' });
    if (pending.code !== String(code)) return res.status(400).json({ error: 'Incorrect code.' });

    const cardCode = await generateUniqueCardCode();
    const { rows: userRows } = await pool.query(
      `INSERT INTO users (username, password_hash, email, email_verified, first_name, last_name, address, date_of_birth, sour_card_code)
       VALUES ($1,$2,$3,true,$4,$5,$6,$7,$8)
       RETURNING id, username, email, email_verified AS "emailVerified", first_name AS "firstName", last_name AS "lastName", address, date_of_birth AS "dateOfBirth", sour_card_code AS "sourCardCode"`,
      [pending.username, pending.password_hash, pending.email, pending.first_name, pending.last_name, pending.address, pending.date_of_birth, cardCode]
    );
    await pool.query('DELETE FROM pending_signups WHERE id = $1', [pending.id]);
    const user = userRows[0];
    res.status(201).json({ token: signToken(user.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, username, password_hash, email, email_verified AS "emailVerified",
              first_name AS "firstName", last_name AS "lastName",
              address, date_of_birth AS "dateOfBirth", sour_card_code AS "sourCardCode"
       FROM users WHERE username = $1`,
      [username.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    delete user.password_hash;
    res.json({ token: signToken(user.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Enter your username.' });
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE username = $1', [username.toLowerCase()]);
    // Always respond the same way whether or not the account exists, so
    // this endpoint can't be used to check which usernames are registered.
    if (!rows.length || !rows[0].email) {
      return res.json({ ok: true });
    }
    const user = rows[0];
    const code = generateCardCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await pool.query('INSERT INTO password_resets (user_id, code, expires_at) VALUES ($1,$2,$3)', [user.id, code, expiresAt]);
    await sendEmail({ to: user.email, subject: 'Reset your password - Where To Go Sour', html: resetPasswordEmailHtml(code) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) return res.status(400).json({ error: 'All fields are required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!rows.length) return res.status(400).json({ error: 'Incorrect or expired code.' });
    const userId = rows[0].id;
    const { rows: resetRows } = await pool.query(
      'SELECT * FROM password_resets WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
      [userId]
    );
    const reset = resetRows[0];
    if (!reset || reset.code !== String(code) || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Incorrect or expired code.' });
    }
    const passwordHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, email_verified AS "emailVerified",
              first_name AS "firstName", last_name AS "lastName",
              address, date_of_birth AS "dateOfBirth", sour_card_code AS "sourCardCode"
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load account' });
  }
});

app.put('/api/account', requireAuth, async (req, res) => {
  const { firstName, lastName, address, dateOfBirth } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         address = COALESCE($4, address),
         date_of_birth = COALESCE($5, date_of_birth)
       WHERE id = $1
       RETURNING id, username, email, email_verified AS "emailVerified",
                 first_name AS "firstName", last_name AS "lastName",
                 address, date_of_birth AS "dateOfBirth", sour_card_code AS "sourCardCode"`,
      [req.userId, firstName, lastName, address, dateOfBirth]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

app.put('/api/account', requireAuth, async (req, res) => {
  // ...existing account update code...
});

// ---------- Categories ----------

const CATEGORY_SELECT = 'id, name';
const CATEGORIES_CACHE_TTL_MS = 30 * 1000;
const PUBLIC_JSON_CACHE_CONTROL = 'public, max-age=30, s-maxage=30, stale-while-revalidate=60';
let categoriesCache = null;

function invalidateCategoriesCache() {
  categoriesCache = null;
}

function sendPublicJson(res, body) {
  res.set('Cache-Control', PUBLIC_JSON_CACHE_CONTROL);
  res.json(body);
}

app.get('/api/categories', async (_req, res) => {
  if (categoriesCache && categoriesCache.expiresAt > Date.now()) {
    return sendPublicJson(res, categoriesCache.rows);
  }
  try {
    const { rows } = await pool.query(
      `SELECT ${CATEGORY_SELECT} FROM categories ORDER BY name ASC`
    );
    categoriesCache = { rows, expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS };
    sendPublicJson(res, rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name)
       VALUES ($1)
       RETURNING ${CATEGORY_SELECT}`,
      [name]
    );

    invalidateCategoriesCache();
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.patch('/api/categories/:id', requireAdmin, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      'SELECT id, name FROM categories WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Category not found.' });
    }

    const oldName = current.rows[0].name;

    const updated = await client.query(
      `UPDATE categories
       SET name = $2
       WHERE id = $1
       RETURNING ${CATEGORY_SELECT}`,
      [req.params.id, name]
    );

    await client.query(
      'UPDATE listings SET category = $2, updated_at = now() WHERE category = $1',
      [oldName, name]
    );

    await client.query('COMMIT');
  invalidateCategoriesCache();
  invalidateListingsCache();
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    console.error(err);
    res.status(500).json({ error: 'Failed to rename category' });
  } finally {
    client.release();
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const categoryResult = await client.query(
      'SELECT id, name FROM categories WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!categoryResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Category not found.' });
    }

    const category = categoryResult.rows[0];

    const listingCountResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM listings WHERE category = $1',
      [category.name]
    );

    const listingCount = listingCountResult.rows[0].count;

    if (listingCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `This category has ${listingCount} listing(s). Reassign them before deleting the category.`,
      });
    }

    await client.query('DELETE FROM categories WHERE id = $1', [category.id]);

    await client.query('COMMIT');
    invalidateCategoriesCache();
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  } finally {
    client.release();
  }
});


// ---------- Listings ----------
// Each listing's main image can be EITHER an uploaded file OR a URL -
// imageUrl takes priority for display when both happen to be set.

// Catches the common mistake of pasting degrees-minutes-seconds (e.g.
// "33 16 13.3") or a DMS string without converting to decimal degrees -
// those produce numbers wildly outside valid ranges, which then point
// Google Maps at the wrong place (or nowhere at all).
function invalidCoordinate(latitude, longitude) {
  if (latitude == null && longitude == null) return null;
  if (latitude == null || longitude == null) return 'Both latitude and longitude are required together, or leave both blank.';
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return 'Latitude and longitude must be numbers.';
  }
  if (latitude < -90 || latitude > 90) {
    return `Latitude ${latitude} is out of range (-90 to 90). Use decimal degrees, e.g. 33.2704 - not degrees/minutes/seconds like 33°16'13".`;
  }
  if (longitude < -180 || longitude > 180) {
    return `Longitude ${longitude} is out of range (-180 to 180). Use decimal degrees, e.g. 35.1952 - not degrees/minutes/seconds like 35°11'42".`;
  }
  return null;
}

const LISTING_SELECT = `l.id, l.name, l.category, l.area, l.description, l.hours, l.phone, l.rating, l.price, l.tag,
              (l.image_data IS NOT NULL) AS "hasImage", l.image_url AS "imageUrl",
              (l.logo_data IS NOT NULL) AS "hasLogo", l.logo_url AS "logoUrl",
              (l.menu_data IS NOT NULL) AS "hasMenu", l.menu_url AS "menuUrl",
              l.instagram_url AS "instagramUrl", l.website_url AS "websiteUrl",
              l.latitude, l.longitude`;

// Same columns, without the "l." alias - for use in INSERT/UPDATE
// RETURNING clauses, where the table has no alias (unlike the SELECT
// queries above, which join as "listings l").
const LISTING_RETURNING = `id, name, category, area, description, hours, phone, rating, price, tag,
              (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl",
              (logo_data IS NOT NULL) AS "hasLogo", logo_url AS "logoUrl",
              (menu_data IS NOT NULL) AS "hasMenu", menu_url AS "menuUrl",
              instagram_url AS "instagramUrl", website_url AS "websiteUrl",
              latitude, longitude`;

const LISTINGS_CACHE_TTL_MS = 30 * 1000;
let listingsCache = null;

function invalidateListingsCache() {
  listingsCache = null;
}

app.get('/api/listings', async (_req, res) => {
  if (listingsCache && listingsCache.expiresAt > Date.now()) {
    return sendPublicJson(res, listingsCache.rows);
  }
  try {
    const { rows } = await pool.query(
      `SELECT ${LISTING_SELECT},
              r.avg_rating AS "avgRating", COALESCE(r.rating_count, 0) AS "ratingCount"
       FROM listings l
       LEFT JOIN (
         SELECT listing_id, ROUND(AVG(stars)::numeric, 1) AS avg_rating, COUNT(*) AS rating_count
         FROM ratings GROUP BY listing_id
       ) r ON r.listing_id = l.id
       ORDER BY l.category, l.name`
    );
     listingsCache = { rows, expiresAt: Date.now() + LISTINGS_CACHE_TTL_MS };
    sendPublicJson(res, rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

app.get('/api/listings/:id/image', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT image_data, image_mime FROM listings WHERE id = $1', [req.params.id]);
    if (!rows.length || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/jpeg');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.get('/api/listings/:id/logo', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT logo_data, logo_mime FROM listings WHERE id = $1', [req.params.id]);
    if (!rows.length || !rows[0].logo_data) return res.status(404).end();
    res.set('Content-Type', rows[0].logo_mime || 'image/png');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].logo_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load logo' });
  }
});

app.get('/api/listings/:id/menu', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT menu_data, menu_mime FROM listings WHERE id = $1', [req.params.id]);
    if (!rows.length || !rows[0].menu_data) return res.status(404).end();
    res.set('Content-Type', rows[0].menu_mime || 'application/pdf');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].menu_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${LISTING_SELECT} FROM listings l WHERE l.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load listing' });
  }
});

app.post('/api/listings', requireAdmin, async (req, res) => {
  const {
    id, name, category, area, description, hours, phone, rating, price, tag,
    imageBase64, imageMime, imageUrl,
    logoBase64, logoMime, logoUrl,
    menuBase64, menuMime, menuUrl,
    instagramUrl, websiteUrl,
    latitude, longitude,
  } = req.body;
  if (!id || !name || !category) {
    return res.status(400).json({ error: 'id, name and category are required' });
  }
  const coordError = invalidCoordinate(latitude ?? null, longitude ?? null);
  if (coordError) return res.status(400).json({ error: coordError });
  const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
  const logoBuffer = logoBase64 ? Buffer.from(logoBase64, 'base64') : null;
  const menuBuffer = menuBase64 ? Buffer.from(menuBase64, 'base64') : null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO listings (
         id, name, category, area, description, hours, phone, rating, price, tag,
         image_data, image_mime, image_url,
         logo_data, logo_mime, logo_url,
         menu_data, menu_mime, menu_url,
         instagram_url, website_url, latitude, longitude
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category, area = EXCLUDED.area,
         description = EXCLUDED.description, hours = EXCLUDED.hours, phone = EXCLUDED.phone,
         rating = EXCLUDED.rating, price = EXCLUDED.price, tag = EXCLUDED.tag,
         image_data = COALESCE(EXCLUDED.image_data, listings.image_data),
         image_mime = COALESCE(EXCLUDED.image_mime, listings.image_mime),
         image_url = EXCLUDED.image_url,
         logo_data = COALESCE(EXCLUDED.logo_data, listings.logo_data),
         logo_mime = COALESCE(EXCLUDED.logo_mime, listings.logo_mime),
         logo_url = EXCLUDED.logo_url,
         menu_data = COALESCE(EXCLUDED.menu_data, listings.menu_data),
         menu_mime = COALESCE(EXCLUDED.menu_mime, listings.menu_mime),
         menu_url = EXCLUDED.menu_url,
         instagram_url = EXCLUDED.instagram_url, website_url = EXCLUDED.website_url,
         latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
         updated_at = now()
       RETURNING ${LISTING_RETURNING}`,
      [
        id, name, category, area, description, hours, phone, rating, price, tag,
        imageBuffer, imageMime || null, imageUrl || null,
        logoBuffer, logoMime || null, logoUrl || null,
        menuBuffer, menuMime || null, menuUrl || null,
        instagramUrl || null, websiteUrl || null, latitude ?? null, longitude ?? null,
      ]
    );
    invalidateListingsCache();
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save listing' });
  }
});

app.put('/api/listings/:id', requireAdmin, async (req, res) => {
  const {
    name, category, area, description, hours, phone, rating, price, tag,
    imageBase64, imageMime, imageUrl,
    logoBase64, logoMime, logoUrl,
    menuBase64, menuMime, menuUrl,
    instagramUrl, websiteUrl,
    latitude, longitude,
    clearImage, clearLogo, clearMenu,
  } = req.body;
  const coordError = invalidCoordinate(latitude ?? null, longitude ?? null);
  if (coordError) return res.status(400).json({ error: coordError });
  const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
  const logoBuffer = logoBase64 ? Buffer.from(logoBase64, 'base64') : null;
  const menuBuffer = menuBase64 ? Buffer.from(menuBase64, 'base64') : null;
  try {
    const { rows } = await pool.query(
      `UPDATE listings SET
         name = COALESCE($2, name), category = COALESCE($3, category), area = COALESCE($4, area),
         description = COALESCE($5, description), hours = COALESCE($6, hours), phone = COALESCE($7, phone),
         rating = COALESCE($8, rating), price = COALESCE($9, price), tag = COALESCE($10, tag),
         image_data = CASE WHEN $24 THEN NULL ELSE COALESCE($11, image_data) END,
         image_mime = CASE WHEN $24 THEN NULL ELSE COALESCE($12, image_mime) END,
         image_url = CASE WHEN $24 THEN NULL ELSE COALESCE($13, image_url) END,
         logo_data = CASE WHEN $25 THEN NULL ELSE COALESCE($14, logo_data) END,
         logo_mime = CASE WHEN $25 THEN NULL ELSE COALESCE($15, logo_mime) END,
         logo_url = CASE WHEN $25 THEN NULL ELSE COALESCE($16, logo_url) END,
         menu_data = CASE WHEN $26 THEN NULL ELSE COALESCE($17, menu_data) END,
         menu_mime = CASE WHEN $26 THEN NULL ELSE COALESCE($18, menu_mime) END,
         menu_url = CASE WHEN $26 THEN NULL ELSE COALESCE($19, menu_url) END,
         instagram_url = COALESCE($20, instagram_url), website_url = COALESCE($21, website_url),
         latitude = $22, longitude = $23,
         updated_at = now()
       WHERE id = $1
       RETURNING ${LISTING_RETURNING}`,
      [
        req.params.id, name, category, area, description, hours, phone, rating, price, tag,
        imageBuffer, imageMime || null, imageUrl || null,
        logoBuffer, logoMime || null, logoUrl || null,
        menuBuffer, menuMime || null, menuUrl || null,
        instagramUrl || null, websiteUrl || null, latitude ?? null, longitude ?? null,
        !!clearImage, !!clearLogo, !!clearMenu,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    invalidateListingsCache();
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

app.delete('/api/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    invalidateListingsCache();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// ---------- Listing photo gallery (up to 3 extra photos) ----------

app.get('/api/listings/:id/gallery', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT position, (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl"
       FROM listing_images WHERE listing_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    sendPublicJson(res, rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

app.get('/api/listings/:id/gallery/:position/image', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_data, image_mime FROM listing_images WHERE listing_id = $1 AND position = $2',
      [req.params.id, req.params.position]
    );
    if (!rows.length || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/jpeg');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.put('/api/listings/:id/gallery', requireAdmin, async (req, res) => {
  const { images } = req.body;
  if (!Array.isArray(images)) {
    return res.status(400).json({ error: 'images array is required' });
  }
  try {
    for (const img of images) {
      const { position, imageBase64, imageMime, imageUrl, clear } = img;
      if (!position || position < 1 || position > 3) continue;
      if (clear) {
        await pool.query('DELETE FROM listing_images WHERE listing_id = $1 AND position = $2', [req.params.id, position]);
        continue;
      }
      const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
      if (!imageBuffer && !imageUrl) continue;
      await pool.query(
        `INSERT INTO listing_images (listing_id, position, image_data, image_mime, image_url)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (listing_id, position) DO UPDATE SET
           image_data = CASE WHEN EXCLUDED.image_url IS NOT NULL THEN NULL ELSE COALESCE(EXCLUDED.image_data, listing_images.image_data) END,
           image_mime = CASE WHEN EXCLUDED.image_url IS NOT NULL THEN NULL ELSE COALESCE(EXCLUDED.image_mime, listing_images.image_mime) END,
           image_url = EXCLUDED.image_url,
           updated_at = now()`,
        [req.params.id, position, imageBuffer, imageMime || null, imageUrl || null]
      );
    }
    const { rows } = await pool.query(
      `SELECT position, (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl"
       FROM listing_images WHERE listing_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update gallery' });
  }
});

// ---------- Saved bookmarks ----------

app.get('/api/saved', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${LISTING_SELECT},
              r.avg_rating AS "avgRating", COALESCE(r.rating_count, 0) AS "ratingCount"
       FROM saved_bookmarks s
       JOIN listings l ON l.id = s.listing_id
       LEFT JOIN (
         SELECT listing_id, ROUND(AVG(stars)::numeric, 1) AS avg_rating, COUNT(*) AS rating_count
         FROM ratings GROUP BY listing_id
       ) r ON r.listing_id = l.id
       WHERE s.visitor_id = $1
       ORDER BY s.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load saved listings' });
  }
});

app.post('/api/saved', requireAuth, async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    return res.status(400).json({ error: 'listingId is required' });
  }
  try {
    await pool.query(
      `INSERT INTO saved_bookmarks (visitor_id, listing_id)
       VALUES ($1, $2)
       ON CONFLICT (visitor_id, listing_id) DO NOTHING`,
      [req.userId, listingId]
    );
    res.status(201).json({ saved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

app.delete('/api/saved', requireAuth, async (req, res) => {
  const { listingId } = req.body;
  try {
    await pool.query(
      'DELETE FROM saved_bookmarks WHERE visitor_id = $1 AND listing_id = $2',
      [req.userId, listingId]
    );
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// ---------- Ratings ----------

app.get('/api/ratings/:listingId', optionalAuth, async (req, res) => {
  try {
    const agg = await pool.query(
      `SELECT ROUND(AVG(stars)::numeric, 1) AS "avgRating", COUNT(*) AS "ratingCount"
       FROM ratings WHERE listing_id = $1`,
      [req.params.listingId]
    );
    let yourRating = null;
    if (req.userId) {
      const mine = await pool.query(
        'SELECT stars FROM ratings WHERE listing_id = $1 AND visitor_id = $2',
        [req.params.listingId, req.userId]
      );
      yourRating = mine.rows[0]?.stars ?? null;
    }
    res.json({
      avgRating: agg.rows[0].avgRating ? Number(agg.rows[0].avgRating) : null,
      ratingCount: Number(agg.rows[0].ratingCount),
      yourRating,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load rating' });
  }
});

app.post('/api/ratings', requireAuth, async (req, res) => {
  const { listingId, stars } = req.body;
  const starsNum = Number(stars);
  if (!listingId || !Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
    return res.status(400).json({ error: 'listingId and stars (1-5) are required' });
  }
  try {
    await pool.query(
      `INSERT INTO ratings (visitor_id, listing_id, stars)
       VALUES ($1, $2, $3)
       ON CONFLICT (visitor_id, listing_id) DO UPDATE SET stars = EXCLUDED.stars, updated_at = now()`,
      [req.userId, listingId, starsNum]
    );
    const agg = await pool.query(
      `SELECT ROUND(AVG(stars)::numeric, 1) AS "avgRating", COUNT(*) AS "ratingCount"
       FROM ratings WHERE listing_id = $1`,
      [listingId]
    );
    invalidateListingsCache();
    res.status(201).json({
      avgRating: agg.rows[0].avgRating ? Number(agg.rows[0].avgRating) : null,
      ratingCount: Number(agg.rows[0].ratingCount),
      yourRating: starsNum,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// ---------- Gallery items ----------
// Lightweight admin-managed entries (name + location + optional photo)
// for the homepage/nature-page galleries. Separate from listings.

const GALLERY_ITEM_SELECT = `id, name, location, (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl",
              latitude, longitude, sort_order AS "sortOrder"`;

app.get('/api/gallery/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!['featured', 'nature'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be "featured" or "nature"' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT ${GALLERY_ITEM_SELECT} FROM gallery_items WHERE kind = $1
       ORDER BY sort_order ASC NULLS LAST, id ASC`,
      [kind]
    );
    sendPublicJson(res, rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

app.get('/api/gallery/image/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT image_data, image_mime FROM gallery_items WHERE id = $1', [req.params.id]);
    if (!rows.length || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/jpeg');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.post('/api/gallery', requireAdmin, async (req, res) => {
  const { kind, name, location, imageBase64, imageMime, imageUrl, latitude, longitude, sortOrder } = req.body;
  if (!['featured', 'nature'].includes(kind) || !name || !location) {
    return res.status(400).json({ error: 'kind ("featured" or "nature"), name and location are required' });
  }
  const coordError = invalidCoordinate(latitude ?? null, longitude ?? null);
  if (coordError) return res.status(400).json({ error: coordError });
  const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO gallery_items (kind, name, location, image_data, image_mime, image_url, latitude, longitude, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING ${GALLERY_ITEM_SELECT}`,
      [kind, name, location, imageBuffer, imageMime || null, imageUrl || null, latitude ?? null, longitude ?? null, sortOrder ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save gallery item' });
  }
});

app.put('/api/gallery/:id', requireAdmin, async (req, res) => {
  const { name, location, imageBase64, imageMime, imageUrl, latitude, longitude, sortOrder } = req.body;
  const coordError = invalidCoordinate(latitude ?? null, longitude ?? null);
  if (coordError) return res.status(400).json({ error: coordError });
  const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
  try {
    const { rows } = await pool.query(
      `UPDATE gallery_items SET
         name = COALESCE($2, name), location = COALESCE($3, location),
         image_data = COALESCE($4, image_data), image_mime = COALESCE($5, image_mime),
         image_url = COALESCE($6, image_url),
         latitude = $7, longitude = $8,
         sort_order = $9, updated_at = now()
       WHERE id = $1
       RETURNING ${GALLERY_ITEM_SELECT}`,
      [req.params.id, name, location, imageBuffer, imageMime || null, imageUrl || null, latitude ?? null, longitude ?? null, sortOrder ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update gallery item' });
  }
});

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM gallery_items WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete gallery item' });
  }
});

// ---------- Gallery item photo gallery (up to 3 extra photos) ----------
// Same idea as the listing gallery above, currently used by nature entries.

app.get('/api/gallery/:id/gallery', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT position, (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl"
       FROM gallery_item_images WHERE gallery_item_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    sendPublicJson(res, rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

app.get('/api/gallery/:id/gallery/:position/image', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_data, image_mime FROM gallery_item_images WHERE gallery_item_id = $1 AND position = $2',
      [req.params.id, req.params.position]
    );
    if (!rows.length || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/jpeg');
    res.set('Cache-Control', IMAGE_CACHE_CONTROL);
    res.send(rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.put('/api/gallery/:id/gallery', requireAdmin, async (req, res) => {
  const { images } = req.body;
  if (!Array.isArray(images)) {
    return res.status(400).json({ error: 'images array is required' });
  }
  try {
    for (const img of images) {
      const { position, imageBase64, imageMime, imageUrl, clear } = img;
      if (!position || position < 1 || position > 3) continue;
      if (clear) {
        await pool.query('DELETE FROM gallery_item_images WHERE gallery_item_id = $1 AND position = $2', [req.params.id, position]);
        continue;
      }
      const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
      if (!imageBuffer && !imageUrl) continue;
      await pool.query(
        `INSERT INTO gallery_item_images (gallery_item_id, position, image_data, image_mime, image_url)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (gallery_item_id, position) DO UPDATE SET
           image_data = CASE WHEN EXCLUDED.image_url IS NOT NULL THEN NULL ELSE COALESCE(EXCLUDED.image_data, gallery_item_images.image_data) END,
           image_mime = CASE WHEN EXCLUDED.image_url IS NOT NULL THEN NULL ELSE COALESCE(EXCLUDED.image_mime, gallery_item_images.image_mime) END,
           image_url = EXCLUDED.image_url,
           updated_at = now()`,
        [req.params.id, position, imageBuffer, imageMime || null, imageUrl || null]
      );
    }
    const { rows } = await pool.query(
      `SELECT position, (image_data IS NOT NULL) AS "hasImage", image_url AS "imageUrl"
       FROM gallery_item_images WHERE gallery_item_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update gallery' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
