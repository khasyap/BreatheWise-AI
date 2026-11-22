import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import {
  db,
  DEFAULT_HOUSEHOLD_PROFILE,
  DEFAULT_NOTIFICATION_SETTINGS,
  ensureUserDefaults,
  initDatabase,
} from './server/db';
import {
  hashPassword,
  resolveSessionMiddleware,
  signAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth';
import {
  getAirQualityAndWeather,
  getLocalWeather,
  getYearOverYearAirQuality,
  reverseGeocodeApproximate,
  searchLocations,
} from './server/services/airQualityService';
import { generateAssistantAdvice, generateDailyAiBrief } from './server/services/aiService';
import {
  aggregateImpactRecords,
  calculateActionImpact,
  EMISSION_ACTION_CATALOG,
  getPersonalizedSustainableAlternatives,
} from './src/lib/impactCalculator';
import { generateIndoorOptimizationPlan } from './src/lib/indoorOptimizer';
import { generatePersonalizedDailyRoutine } from './src/lib/plannerEngine';
import { evaluateSmartAlerts } from './src/lib/alertEngine';
import { computeDailyGoalStreak } from './src/lib/dashboardWidgets';
import { sanitizePlainText } from './src/lib/security';
import type {
  DailyGoalStatus,
  DailySustainabilityGoal,
  HouseholdProfile,
  LocationInfo,
  NotificationSettings,
  SustainabilityActivityRecord,
} from './src/types/breathewise';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Required for AI Studio preview iframe
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '512kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI assistant rate limit reached. Please pause briefly before sending another question.' },
});

app.use('/api', apiLimiter);
app.use('/api', resolveSessionMiddleware);

function getUserProfile(userId: number): HouseholdProfile {
  ensureUserDefaults(userId);
  const row = db
    .prepare('SELECT profile_json FROM household_profiles WHERE user_id = ?')
    .get(userId) as { profile_json: string } | undefined;
  if (!row) return DEFAULT_HOUSEHOLD_PROFILE;
  try {
    return {
      ...DEFAULT_HOUSEHOLD_PROFILE,
      ...JSON.parse(row.profile_json),
      indoorProfile: {
        ...DEFAULT_HOUSEHOLD_PROFILE.indoorProfile,
        ...(JSON.parse(row.profile_json).indoorProfile ?? {}),
      },
    };
  } catch {
    return DEFAULT_HOUSEHOLD_PROFILE;
  }
}

function getUserNotificationSettings(userId: number): NotificationSettings {
  ensureUserDefaults(userId);
  const row = db
    .prepare('SELECT settings_json FROM notification_settings WHERE user_id = ?')
    .get(userId) as { settings_json: string } | undefined;
  if (!row) return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(row.settings_json) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

function getPrimaryLocation(userId: number): LocationInfo {
  ensureUserDefaults(userId);
  const row = db
    .prepare(
      'SELECT id, name, admin1, country, country_code, latitude, longitude, is_primary FROM saved_locations WHERE user_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1',
    )
    .get(userId) as
    | {
        id: number;
        name: string;
        admin1: string;
        country: string;
        country_code: string;
        latitude: number;
        longitude: number;
        is_primary: number;
      }
    | undefined;

  if (row) {
    return {
      id: row.id,
      name: row.name,
      admin1: row.admin1,
      country: row.country,
      countryCode: row.country_code,
      latitude: row.latitude,
      longitude: row.longitude,
      isPrimary: Boolean(row.is_primary),
    };
  }
  return {
    name: 'New Delhi',
    admin1: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
    isPrimary: true,
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'BreatheWise AI', timestamp: new Date().toISOString() });
});

// ================= AUTHENTICATION =================
const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/register', async (req: AuthenticatedRequest, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
  }
  const email = parsed.data.email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name, is_guest) VALUES (?, ?, ?, 0)')
    .run(email, passwordHash, sanitizePlainText(parsed.data.name, 80));

  const userId = Number(info.lastInsertRowid);

  // Carry over guest household profile if currently in guest session
  if (req.user?.isGuest) {
    const guestProfile = getUserProfile(req.user.id);
    db.prepare('INSERT OR REPLACE INTO household_profiles (user_id, profile_json) VALUES (?, ?)').run(
      userId,
      JSON.stringify(guestProfile),
    );
  }
  ensureUserDefaults(userId);

  const user = { id: userId, email, name: parsed.data.name, isGuest: false };
  const token = signAuthToken(user);
  res.status(201).json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid login credentials' });
  }
  const email = parsed.data.email.toLowerCase();
  const row = db
    .prepare('SELECT id, email, name, password_hash, is_guest FROM users WHERE email = ? AND is_guest = 0')
    .get(email) as { id: number; email: string; name: string; password_hash: string; is_guest: number } | undefined;

  if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = { id: row.id, email: row.email, name: row.name, isGuest: false };
  const token = signAuthToken(user);
  res.json({ user, token });
});

// ================= LOCATIONS & AIR QUALITY =================
app.get('/api/locations/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ results: [] });
  }
  try {
    const results = await searchLocations(q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Location search failed', results: [] });
  }
});

app.get('/api/locations/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }
  const location = await reverseGeocodeApproximate(lat, lon);
  res.json({ location });
});

app.get('/api/locations', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  ensureUserDefaults(userId);
  const rows = db
    .prepare(
      'SELECT id, name, admin1, country, country_code, latitude, longitude, is_primary FROM saved_locations WHERE user_id = ? ORDER BY is_primary DESC, id ASC',
    )
    .all(userId) as Array<{
    id: number;
    name: string;
    admin1: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    is_primary: number;
  }>;

  res.json({
    locations: rows.map((r) => ({
      id: r.id,
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      latitude: r.latitude,
      longitude: r.longitude,
      isPrimary: Boolean(r.is_primary),
    })),
  });
});

const SaveLocationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  admin1: z.string().trim().max(100).optional().default(''),
  country: z.string().trim().min(1).max(100),
  countryCode: z.string().trim().min(2).max(4),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  makePrimary: z.boolean().optional().default(true),
});

app.post('/api/locations', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const parsed = SaveLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid location payload.' });
  }
  const loc = parsed.data;
  if (loc.makePrimary) {
    db.prepare('UPDATE saved_locations SET is_primary = 0 WHERE user_id = ?').run(userId);
  }

  // Deduplicate by approximate coordinates
  const existing = db
    .prepare(
      'SELECT id FROM saved_locations WHERE user_id = ? AND ABS(latitude - ?) < 0.05 AND ABS(longitude - ?) < 0.05',
    )
    .get(userId, loc.latitude, loc.longitude) as { id: number } | undefined;

  let id: number;
  if (existing) {
    id = existing.id;
    if (loc.makePrimary) {
      db.prepare('UPDATE saved_locations SET is_primary = 1 WHERE id = ?').run(id);
    }
  } else {
    const info = db
      .prepare(
        'INSERT INTO saved_locations (user_id, name, admin1, country, country_code, latitude, longitude, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        userId,
        sanitizePlainText(loc.name, 100),
        sanitizePlainText(loc.admin1, 100),
        sanitizePlainText(loc.country, 100),
        loc.countryCode.toUpperCase(),
        loc.latitude,
        loc.longitude,
        loc.makePrimary ? 1 : 0,
      );
    id = Number(info.lastInsertRowid);
  }

  res.status(201).json({
    location: {
      id,
      name: loc.name,
      admin1: loc.admin1,
      country: loc.country,
      countryCode: loc.countryCode.toUpperCase(),
      latitude: loc.latitude,
      longitude: loc.longitude,
      isPrimary: loc.makePrimary,
    },
  });
});

app.patch('/api/locations/:id/primary', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const locId = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM saved_locations WHERE id = ? AND user_id = ?').get(locId, userId);
  if (!exists) {
    return res.status(404).json({ error: 'Location not found.' });
  }
  db.prepare('UPDATE saved_locations SET is_primary = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE saved_locations SET is_primary = 1 WHERE id = ? AND user_id = ?').run(locId, userId);
  res.json({ ok: true });
});

app.delete('/api/locations/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const locId = Number(req.params.id);
  const count = (db.prepare('SELECT COUNT(*) as c FROM saved_locations WHERE user_id = ?').get(userId) as { c: number }).c;
  if (count <= 1) {
    return res.status(400).json({ error: 'Keep at least one saved location.' });
  }
  db.prepare('DELETE FROM saved_locations WHERE id = ? AND user_id = ?').run(locId, userId);
  res.json({ ok: true });
});

app.get('/api/air-quality', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const forceRefresh = req.query.refresh === '1';

  let location: LocationInfo;
  if (req.query.lat && req.query.lon && req.query.name) {
    location = {
      name: sanitizePlainText(String(req.query.name), 100),
      admin1: sanitizePlainText(String(req.query.admin1 || ''), 100),
      country: sanitizePlainText(String(req.query.country || 'India'), 100),
      countryCode: sanitizePlainText(String(req.query.countryCode || 'IN'), 4).toUpperCase(),
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
    };
  } else {
    location = getPrimaryLocation(userId);
  }

  const data = await getAirQualityAndWeather(location, forceRefresh);
  res.json(data);
});

app.get('/api/air-quality/trends', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const forceRefresh = req.query.refresh === '1';

  let location: LocationInfo;
  if (req.query.lat && req.query.lon && req.query.name) {
    location = {
      name: sanitizePlainText(String(req.query.name), 100),
      admin1: sanitizePlainText(String(req.query.admin1 || ''), 100),
      country: sanitizePlainText(String(req.query.country || 'India'), 100),
      countryCode: sanitizePlainText(String(req.query.countryCode || 'IN'), 4).toUpperCase(),
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
    };
  } else {
    location = getPrimaryLocation(userId);
  }

  const data = await getAirQualityAndWeather(location, forceRefresh);
  res.json({
    location: data.location,
    standard: data.standard,
    standardLabel: data.standardLabel,
    daily7d: data.daily7d,
    fetchedAt: data.fetchedAt,
    dataQuality: data.dataQuality,
    sourceAttribution: data.sourceAttribution,
  });
});

app.get('/api/air-quality/year-over-year', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const forceRefresh = req.query.refresh === '1';

  let location: LocationInfo;
  if (req.query.lat && req.query.lon && req.query.name) {
    location = {
      name: sanitizePlainText(String(req.query.name), 100),
      admin1: sanitizePlainText(String(req.query.admin1 || ''), 100),
      country: sanitizePlainText(String(req.query.country || 'India'), 100),
      countryCode: sanitizePlainText(String(req.query.countryCode || 'IN'), 4).toUpperCase(),
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
    };
  } else {
    location = getPrimaryLocation(userId);
  }

  const yoy = await getYearOverYearAirQuality(location, forceRefresh);
  res.json(yoy);
});

app.get('/api/weather', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const forceRefresh = req.query.refresh === '1';

  let location: LocationInfo;
  if (req.query.lat && req.query.lon) {
    location = {
      name: sanitizePlainText(String(req.query.name || 'Local Area'), 100),
      admin1: sanitizePlainText(String(req.query.admin1 || ''), 100),
      country: sanitizePlainText(String(req.query.country || ''), 100),
      countryCode: sanitizePlainText(String(req.query.countryCode || 'IN'), 4).toUpperCase(),
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
    };
  } else {
    location = getPrimaryLocation(userId);
  }

  const result = await getLocalWeather(location, forceRefresh);
  res.json(result);
});

// ================= HOUSEHOLD PROFILE =================
app.get('/api/profile', (req: AuthenticatedRequest, res) => {
  const profile = getUserProfile(req.user!.id);
  res.json({ profile, user: req.user });
});

app.put('/api/profile', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const current = getUserProfile(userId);
  const incoming = req.body?.profile;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Profile object is required.' });
  }
  const merged: HouseholdProfile = {
    ...current,
    ...incoming,
    householdSize: Math.max(1, Math.min(20, Number(incoming.householdSize ?? current.householdSize) || 1)),
    dailyCommuteKm: Math.max(0, Math.min(250, Number(incoming.dailyCommuteKm ?? current.dailyCommuteKm) || 0)),
    indoorProfile: {
      ...current.indoorProfile,
      ...(incoming.indoorProfile ?? {}),
      rooms: Math.max(1, Math.min(20, Number(incoming.indoorProfile?.rooms ?? current.indoorProfile.rooms) || 1)),
      primaryRoomAreaSqFt: Math.max(
        60,
        Math.min(3000, Number(incoming.indoorProfile?.primaryRoomAreaSqFt ?? current.indoorProfile.primaryRoomAreaSqFt) || 200),
      ),
      ceilingHeightFt: Math.max(
        7,
        Math.min(20, Number(incoming.indoorProfile?.ceilingHeightFt ?? current.indoorProfile.ceilingHeightFt) || 10),
      ),
      purifierCadrM3h: Math.max(
        0,
        Math.min(1500, Number(incoming.indoorProfile?.purifierCadrM3h ?? current.indoorProfile.purifierCadrM3h) || 0),
      ),
    },
  };

  db.prepare(
    "INSERT INTO household_profiles (user_id, profile_json, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at",
  ).run(userId, JSON.stringify(merged));

  if (typeof req.body?.name === 'string' && req.body.name.trim().length >= 2) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(sanitizePlainText(req.body.name, 80), userId);
  }

  res.json({ profile: merged });
});

// ================= DAILY PLANNER =================
app.get('/api/planner', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const planDate = new Date().toISOString().slice(0, 10);
  const profile = getUserProfile(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);

  const generated = generatePersonalizedDailyRoutine(airData, profile);
  const savedStates = db
    .prepare('SELECT task_key, completed, reminder_time FROM routine_tasks WHERE user_id = ? AND plan_date = ?')
    .all(userId, planDate) as Array<{ task_key: string; completed: number; reminder_time: string }>;

  const stateMap = new Map(savedStates.map((s) => [s.task_key, s]));
  const tasks = generated.map((t) => {
    const saved = stateMap.get(t.id);
    return {
      ...t,
      completed: saved ? Boolean(saved.completed) : false,
      reminderTime: saved?.reminder_time || t.reminderTime,
    };
  });

  res.json({ planDate, location: airData.location, aqi: airData.aqi, category: airData.category, tasks });
});

app.patch('/api/planner/:taskKey', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const taskKey = sanitizePlainText(String(req.params.taskKey), 60);
  const planDate = new Date().toISOString().slice(0, 10);
  const completed = req.body?.completed ? 1 : 0;
  const reminderTime = sanitizePlainText(String(req.body?.reminderTime || ''), 16);

  db.prepare(`
    INSERT INTO routine_tasks (user_id, plan_date, task_key, completed, reminder_time, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, plan_date, task_key) DO UPDATE SET
      completed = excluded.completed,
      reminder_time = CASE WHEN excluded.reminder_time != '' THEN excluded.reminder_time ELSE routine_tasks.reminder_time END,
      updated_at = excluded.updated_at
  `).run(userId, planDate, taskKey, completed, reminderTime);

  res.json({ ok: true, taskKey, completed: Boolean(completed) });
});

// ================= INDOOR AIR OPTIMIZATION =================
app.get('/api/indoor', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const profile = getUserProfile(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);
  const plan = generateIndoorOptimizationPlan(
    profile.indoorProfile,
    profile.budgetTier,
    airData.aqi,
    airData.hourlyForecast24h,
  );

  const states = db
    .prepare('SELECT item_id, completed FROM indoor_checklist_states WHERE user_id = ?')
    .all(userId) as Array<{ item_id: string; completed: number }>;
  const checkedIds = states.filter((s) => s.completed === 1).map((s) => s.item_id);

  res.json({ plan, indoorProfile: profile.indoorProfile, checkedIds });
});

app.patch('/api/indoor/checklist/:itemId', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const itemId = sanitizePlainText(String(req.params.itemId), 40);
  const completed = req.body?.completed ? 1 : 0;
  db.prepare(`
    INSERT INTO indoor_checklist_states (user_id, item_id, completed, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, item_id) DO UPDATE SET completed = excluded.completed, updated_at = excluded.updated_at
  `).run(userId, itemId, completed);
  res.json({ ok: true, itemId, completed: Boolean(completed) });
});

// ================= SUSTAINABLE LIVING & IMPACT TRACKER =================
app.get('/api/impact', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const profile = getUserProfile(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);

  const rows = db
    .prepare(
      'SELECT id, category, action_key, title, quantity, unit, co2_saved_kg, fuel_saved_l, energy_saved_kwh, cost_saved, logged_date, notes FROM sustainability_activities WHERE user_id = ? ORDER BY logged_date DESC, id DESC LIMIT 100',
    )
    .all(userId) as Array<{
    id: number;
    category: SustainabilityActivityRecord['category'];
    action_key: string;
    title: string;
    quantity: number;
    unit: string;
    co2_saved_kg: number;
    fuel_saved_l: number;
    energy_saved_kwh: number;
    cost_saved: number;
    logged_date: string;
    notes: string;
  }>;

  const records: SustainabilityActivityRecord[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    actionKey: r.action_key,
    title: r.title,
    quantity: r.quantity,
    unit: r.unit,
    co2SavedKg: r.co2_saved_kg,
    fuelSavedL: r.fuel_saved_l,
    energySavedKwh: r.energy_saved_kwh,
    costSaved: r.cost_saved,
    loggedDate: r.logged_date,
    notes: r.notes,
  }));

  const aggregated = aggregateImpactRecords(records);
  const personalizedAlternatives = getPersonalizedSustainableAlternatives(profile, airData.aqi);

  // Community aggregate (privacy-preserving total across campaigns)
  const commTotals = db
    .prepare(
      'SELECT SUM(base_co2_kg) as baseCo2, SUM(base_participants) as baseParticipants FROM community_campaigns',
    )
    .get() as { baseCo2: number; baseParticipants: number };
  const userComm = db
    .prepare('SELECT COALESCE(SUM(co2_logged_kg), 0) as userCo2, COUNT(*) as userJoins FROM community_participations')
    .get() as { userCo2: number; userJoins: number };

  res.json({
    currency: profile.currency,
    catalog: EMISSION_ACTION_CATALOG,
    personalizedAlternatives,
    records,
    aggregated,
    communityContribution: {
      collectiveCo2Kg: Number(((commTotals.baseCo2 || 0) + (userComm.userCo2 || 0)).toFixed(1)),
      activeParticipants: (commTotals.baseParticipants || 0) + (userComm.userJoins || 0),
    },
  });
});

const LogActivitySchema = z.object({
  actionKey: z.string().min(2),
  quantity: z.number().positive().max(10000),
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(240).optional().default(''),
});

app.post('/api/impact/log', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const parsed = LogActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid impact entry.' });
  }

  const profile = getUserProfile(userId);
  try {
    const calc = calculateActionImpact(parsed.data.actionKey, parsed.data.quantity, profile.currency);
    const loggedDate = parsed.data.loggedDate || new Date().toISOString().slice(0, 10);
    const info = db
      .prepare(
        `INSERT INTO sustainability_activities
        (user_id, category, action_key, title, quantity, unit, co2_saved_kg, fuel_saved_l, energy_saved_kwh, cost_saved, logged_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        calc.definition.category,
        calc.definition.actionKey,
        calc.definition.title,
        parsed.data.quantity,
        calc.definition.unitLabel,
        calc.co2SavedKg,
        calc.fuelSavedL,
        calc.energySavedKwh,
        calc.costSaved,
        loggedDate,
        sanitizePlainText(parsed.data.notes, 240),
      );

    res.status(201).json({
      record: {
        id: Number(info.lastInsertRowid),
        category: calc.definition.category,
        actionKey: calc.definition.actionKey,
        title: calc.definition.title,
        quantity: parsed.data.quantity,
        unit: calc.definition.unitLabel,
        co2SavedKg: calc.co2SavedKg,
        fuelSavedL: calc.fuelSavedL,
        energySavedKwh: calc.energySavedKwh,
        costSaved: calc.costSaved,
        loggedDate,
        notes: parsed.data.notes,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to log activity.' });
  }
});

app.delete('/api/impact/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  db.prepare('DELETE FROM sustainability_activities WHERE id = ? AND user_id = ?').run(Number(req.params.id), userId);
  res.json({ ok: true });
});

// ================= DAILY SUSTAINABILITY GOAL =================
function buildDailyGoalStatus(userId: number, todayIso: string): DailyGoalStatus {
  const rows = db
    .prepare(
      `SELECT goal_date, preset_id, title, completed, completed_at, updated_at
       FROM daily_sustainability_goals
       WHERE user_id = ?
       ORDER BY goal_date DESC
       LIMIT 60`,
    )
    .all(userId) as Array<{
    goal_date: string;
    preset_id: string;
    title: string;
    completed: number;
    completed_at: string | null;
    updated_at: string;
  }>;

  const todayRow = rows.find((r) => r.goal_date === todayIso) ?? null;
  const goal: DailySustainabilityGoal | null = todayRow
    ? {
        goalDate: todayRow.goal_date,
        presetId: todayRow.preset_id,
        title: todayRow.title,
        completed: Boolean(todayRow.completed),
        completedAt: todayRow.completed_at,
        updatedAt: todayRow.updated_at,
      }
    : null;

  const history = rows.map((r) => ({ goalDate: r.goal_date, completed: Boolean(r.completed) }));
  const streakDays = computeDailyGoalStreak(history, todayIso);

  const cutoffDt = new Date(`${todayIso}T12:00:00Z`);
  cutoffDt.setUTCDate(cutoffDt.getUTCDate() - 6);
  const cutoffIso = cutoffDt.toISOString().slice(0, 10);
  const completedCount7d = rows.filter((r) => r.completed === 1 && r.goal_date >= cutoffIso && r.goal_date <= todayIso).length;

  return { goalDate: todayIso, goal, streakDays, completedCount7d };
}

const SaveDailyGoalSchema = z.object({
  title: z.string().min(2).max(100),
  presetId: z.string().max(40).optional().default('custom'),
  completed: z.boolean().optional().default(false),
});

app.get('/api/daily-goal', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const todayIso = new Date().toISOString().slice(0, 10);
  res.json(buildDailyGoalStatus(userId, todayIso));
});

app.put('/api/daily-goal', (req: AuthenticatedRequest, res) => {
  const parsed = SaveDailyGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please provide a valid daily goal title (2–100 characters).' });
  }
  const userId = req.user!.id;
  const todayIso = new Date().toISOString().slice(0, 10);
  const cleanTitle = sanitizePlainText(parsed.data.title, 100);
  const cleanPreset = sanitizePlainText(parsed.data.presetId || 'custom', 40) || 'custom';
  const completedInt = parsed.data.completed ? 1 : 0;
  const completedAt = parsed.data.completed ? new Date().toISOString() : null;

  db.prepare(
    `INSERT INTO daily_sustainability_goals (user_id, goal_date, preset_id, title, completed, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, goal_date) DO UPDATE SET
       preset_id = excluded.preset_id,
       title = excluded.title,
       completed = excluded.completed,
       completed_at = excluded.completed_at,
       updated_at = excluded.updated_at`,
  ).run(userId, todayIso, cleanPreset, cleanTitle, completedInt, completedAt);

  res.json(buildDailyGoalStatus(userId, todayIso));
});

app.patch('/api/daily-goal/toggle', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const todayIso = new Date().toISOString().slice(0, 10);
  const completed = Boolean(req.body?.completed);
  const completedInt = completed ? 1 : 0;
  const completedAt = completed ? new Date().toISOString() : null;

  const existing = db
    .prepare('SELECT goal_date FROM daily_sustainability_goals WHERE user_id = ? AND goal_date = ?')
    .get(userId, todayIso);
  if (!existing) {
    return res.status(404).json({ error: 'No daily goal is set for today yet.' });
  }

  db.prepare(
    `UPDATE daily_sustainability_goals
     SET completed = ?, completed_at = ?, updated_at = datetime('now')
     WHERE user_id = ? AND goal_date = ?`,
  ).run(completedInt, completedAt, userId, todayIso);

  res.json(buildDailyGoalStatus(userId, todayIso));
});

// ================= FAMILY SMART ALERTS & NOTIFICATIONS =================
app.get('/api/alerts', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const profile = getUserProfile(userId);
  const settings = getUserNotificationSettings(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);

  const dismissed = new Set(
    (
      db.prepare('SELECT alert_id FROM dismissed_alerts WHERE user_id = ?').all(userId) as Array<{
        alert_id: string;
      }>
    ).map((r) => r.alert_id),
  );

  const alerts = evaluateSmartAlerts(airData, profile, settings).map((a) => ({
    ...a,
    isRead: dismissed.has(a.id),
  }));

  res.json({ alerts, settings });
});

app.put('/api/alerts/settings', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const current = getUserNotificationSettings(userId);
  const incoming = req.body?.settings;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Notification settings required.' });
  }
  const merged: NotificationSettings = {
    ...current,
    ...incoming,
    severeAqiThreshold: Math.max(50, Math.min(450, Number(incoming.severeAqiThreshold ?? current.severeAqiThreshold) || 300)),
    pm25SpikeThreshold: Math.max(25, Math.min(350, Number(incoming.pm25SpikeThreshold ?? current.pm25SpikeThreshold) || 120)),
  };
  db.prepare(
    "INSERT INTO notification_settings (user_id, settings_json, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at",
  ).run(userId, JSON.stringify(merged));

  res.json({ settings: merged });
});

app.post('/api/alerts/:alertId/read', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const alertId = sanitizePlainText(String(req.params.alertId), 120);
  db.prepare('INSERT OR IGNORE INTO dismissed_alerts (user_id, alert_id) VALUES (?, ?)').run(userId, alertId);
  res.json({ ok: true });
});

// ================= COMMUNITY CLEAN AIR HUB (PRIVACY-PRESERVING) =================
app.get('/api/community', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM community_participations p WHERE p.campaign_id = c.id) as extra_participants,
        (SELECT COALESCE(SUM(p.co2_logged_kg), 0) FROM community_participations p WHERE p.campaign_id = c.id) as extra_co2,
        (SELECT actions_logged FROM community_participations p WHERE p.campaign_id = c.id AND p.user_id = ?) as my_actions
       FROM community_campaigns c ORDER BY c.id ASC`,
    )
    .all(userId) as Array<{
    id: number;
    slug: string;
    title: string;
    category: 'Transport' | 'Anti-Burning' | 'Energy' | 'Awareness' | 'Waste';
    description: string;
    neighborhood: string;
    target_participants: number;
    base_participants: number;
    base_co2_kg: number;
    duration_days: number;
    status: 'Active' | 'Upcoming';
    extra_participants: number;
    extra_co2: number;
    my_actions: number | null;
  }>;

  const campaigns = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    description: r.description,
    neighborhood: r.neighborhood,
    targetParticipants: r.target_participants,
    currentParticipants: r.base_participants + r.extra_participants,
    durationDays: r.duration_days,
    collectiveCo2Kg: Number((r.base_co2_kg + r.extra_co2).toFixed(1)),
    status: r.status,
    joinedByMe: r.my_actions !== null,
    myActionsLogged: r.my_actions ?? 0,
  }));

  // Aggregated neighborhood leaderboard (strictly anonymized ward-level clusters)
  const leaderboard = [
    { cluster: 'South-Central Metro Corridor', participants: 412, estimatedCo2Kg: 3840, primaryDrive: 'Public Transit' },
    { cluster: 'East Park Residential Associations', participants: 339, estimatedCo2Kg: 2910, primaryDrive: 'Zero Open Burning' },
    { cluster: 'West University & School Zone', participants: 287, estimatedCo2Kg: 2340, primaryDrive: 'Carpool & Indoor Health' },
    { cluster: 'North-West Apartment Coalition', participants: 224, estimatedCo2Kg: 1785, primaryDrive: 'Household Energy Savings' },
  ];

  res.json({ campaigns, leaderboard });
});

app.post('/api/community/:id/join', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const campaignId = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM community_campaigns WHERE id = ?').get(campaignId);
  if (!exists) return res.status(404).json({ error: 'Campaign not found.' });

  const already = db
    .prepare('SELECT actions_logged FROM community_participations WHERE campaign_id = ? AND user_id = ?')
    .get(campaignId, userId) as { actions_logged: number } | undefined;

  if (already) {
    db.prepare(
      'UPDATE community_participations SET actions_logged = actions_logged + 1, co2_logged_kg = co2_logged_kg + 1.8 WHERE campaign_id = ? AND user_id = ?',
    ).run(campaignId, userId);
  } else {
    db.prepare(
      'INSERT INTO community_participations (campaign_id, user_id, actions_logged, co2_logged_kg) VALUES (?, ?, 1, 2.4)',
    ).run(campaignId, userId);
  }

  res.json({ ok: true });
});

// ================= GENAI ASSISTANT =================
app.get('/api/ai/history', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT c.id, c.role, c.message, c.structured_json, c.created_at, f.rating
       FROM ai_conversations c
       LEFT JOIN user_feedback f ON f.conversation_id = c.id AND f.user_id = c.user_id
       WHERE c.user_id = ?
       ORDER BY c.id ASC LIMIT 40`,
    )
    .all(userId) as Array<{
    id: number;
    role: 'user' | 'assistant';
    message: string;
    structured_json: string | null;
    created_at: string;
    rating: number | null;
  }>;

  const messages = rows.map((r) => {
    const extra = r.structured_json ? JSON.parse(r.structured_json) : {};
    return {
      id: r.id,
      role: r.role,
      message: r.message,
      summary: extra.summary,
      recommendations: extra.recommendations,
      safetyDisclaimer: extra.safetyDisclaimer,
      dataContextUsed: extra.dataContextUsed,
      rating: r.rating,
      createdAt: r.created_at,
    };
  });

  res.json({ messages });
});

app.delete('/api/ai/history', (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

app.post('/api/ai/chat', aiLimiter, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const question = sanitizePlainText(String(req.body?.message || ''), 1000);
  if (question.length < 2) {
    return res.status(400).json({ error: 'Please enter a question about air quality, indoor air, or daily routines.' });
  }

  const profile = getUserProfile(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);

  const recentActionsRows = db
    .prepare('SELECT title FROM sustainability_activities WHERE user_id = ? ORDER BY id DESC LIMIT 5')
    .all(userId) as Array<{ title: string }>;

  const historyRows = db
    .prepare('SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 6')
    .all(userId) as Array<{ role: 'user' | 'assistant'; message: string }>;

  try {
    const aiResult = await generateAssistantAdvice({
      userQuestion: question,
      history: historyRows.reverse(),
      airData,
      profile,
      recentActions: recentActionsRows.map((r) => r.title),
    });

    db.prepare('INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)').run(
      userId,
      'user',
      question,
    );

    const structuredPayload = {
      summary: aiResult.summary,
      recommendations: aiResult.recommendations,
      safetyDisclaimer: aiResult.safetyDisclaimer,
      dataContextUsed: aiResult.dataContextUsed,
      modelUsed: aiResult.modelUsed,
    };

    const insertAsst = db
      .prepare('INSERT INTO ai_conversations (user_id, role, message, structured_json) VALUES (?, ?, ?, ?)')
      .run(userId, 'assistant', aiResult.summary, JSON.stringify(structuredPayload));

    res.json({
      reply: {
        id: Number(insertAsst.lastInsertRowid),
        role: 'assistant',
        message: aiResult.summary,
        ...structuredPayload,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to generate AI response right now.';
    const status = /safety boundary|invalid|question/i.test(msg) ? 400 : 503;
    res.status(status).json({
      error: msg,
      officialReferenceFallback: {
        label: `Official Reference Guidance (${airData.standardLabel})`,
        general: airData.healthGuidanceGeneral,
        sensitive: airData.healthGuidanceSensitive,
      },
    });
  }
});

app.post('/api/ai/daily-brief', aiLimiter, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const profile = getUserProfile(userId);
  const location = getPrimaryLocation(userId);
  const airData = await getAirQualityAndWeather(location);
  const recentActionsRows = db
    .prepare('SELECT title FROM sustainability_activities WHERE user_id = ? ORDER BY id DESC LIMIT 5')
    .all(userId) as Array<{ title: string }>;

  try {
    const brief = await generateDailyAiBrief({
      airData,
      profile,
      recentActions: recentActionsRows.map((r) => r.title),
    });
    res.json({ brief, dataContextUsed: `${airData.location.name} · AQI ${airData.aqi ?? 'Unavailable'}` });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'AI brief temporarily unavailable.',
    });
  }
});

app.post('/api/ai/feedback', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conversationId = Number(req.body?.conversationId);
  const rating = req.body?.rating === 1 ? 1 : -1;
  const comment = sanitizePlainText(String(req.body?.comment || ''), 300);

  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'Valid conversationId required.' });
  }

  db.prepare(`
    INSERT INTO user_feedback (user_id, conversation_id, rating, comment)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, conversation_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment
  `).run(userId, conversationId, rating, comment);

  res.json({ ok: true, rating });
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BreatheWise AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
