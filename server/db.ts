import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { HouseholdProfile, NotificationSettings } from '../src/types/breathewise';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'breathewise.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  personaType: 'family_children',
  householdSize: 4,
  hasInfants: false,
  hasChildren: true,
  hasElderly: true,
  hasOutdoorWorkers: false,
  hasRespiratorySensitivity: true,
  commuteMode: 'petrol_car',
  dailyCommuteKm: 18,
  budgetTier: 'moderate',
  currency: 'INR',
  indoorProfile: {
    rooms: 3,
    primaryRoomAreaSqFt: 240,
    ceilingHeightFt: 10,
    ventilationType: 'single_side',
    hasAirPurifier: true,
    purifierCadrM3h: 350,
    cookingFuel: 'lpg',
    hasKitchenExhaust: true,
    concerns: ['winter_smog', 'traffic_dust', 'cooking_smoke'],
  },
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  severeAqiThreshold: 300,
  pm25SpikeThreshold: 120,
  notifyChildren: true,
  notifyElderly: true,
  notifyOutdoorWorker: true,
  notifyGeneral: true,
  quietHoursStart: '22:30',
  quietHoursEnd: '06:30',
};

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      is_guest INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS household_profiles (
      user_id INTEGER PRIMARY KEY,
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      admin1 TEXT DEFAULT '',
      country TEXT NOT NULL,
      country_code TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_saved_locations_user ON saved_locations(user_id);

    CREATE TABLE IF NOT EXISTS air_quality_records (
      location_key TEXT PRIMARY KEY,
      fetched_at TEXT NOT NULL,
      standard TEXT NOT NULL,
      aqi INTEGER,
      category TEXT NOT NULL,
      primary_pollutant TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_date TEXT NOT NULL,
      task_key TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      reminder_time TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, plan_date, task_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_routine_tasks_user_date ON routine_tasks(user_id, plan_date);

    CREATE TABLE IF NOT EXISTS indoor_checklist_states (
      user_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sustainability_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      action_key TEXT NOT NULL,
      title TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      co2_saved_kg REAL NOT NULL,
      fuel_saved_l REAL NOT NULL,
      energy_saved_kwh REAL NOT NULL,
      cost_saved REAL NOT NULL,
      logged_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sustainability_user_date ON sustainability_activities(user_id, logged_date);

    CREATE TABLE IF NOT EXISTS notification_settings (
      user_id INTEGER PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dismissed_alerts (
      user_id INTEGER NOT NULL,
      alert_id TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, alert_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      target_participants INTEGER NOT NULL,
      base_participants INTEGER NOT NULL DEFAULT 0,
      base_co2_kg REAL NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_participations (
      campaign_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      actions_logged INTEGER NOT NULL DEFAULT 1,
      co2_logged_kg REAL NOT NULL DEFAULT 2.4,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (campaign_id, user_id),
      FOREIGN KEY (campaign_id) REFERENCES community_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      structured_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at);

    CREATE TABLE IF NOT EXISTS user_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, conversation_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_sustainability_goals (
      user_id INTEGER NOT NULL,
      goal_date TEXT NOT NULL,
      preset_id TEXT NOT NULL DEFAULT 'custom',
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, goal_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_sustainability_goals(user_id, goal_date);
  `);

  // Seed privacy-preserving community campaigns once
  const campaignCount = (db.prepare('SELECT COUNT(*) as c FROM community_campaigns').get() as { c: number }).c;
  if (campaignCount === 0) {
    const insert = db.prepare(`
      INSERT INTO community_campaigns (slug, title, category, description, neighborhood, target_participants, base_participants, base_co2_kg, duration_days, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seeds = [
      [
        'seven-days-public-transport',
        'Seven Days of Public Transport',
        'Transport',
        'Replace solo petrol/diesel office commutes with metro, electric bus, or verified neighborhood carpools for 7 consecutive weekdays.',
        'NCR & Metro Transit Corridors (Aggregated)',
        500,
        342,
        4120.5,
        7,
        'Active',
      ],
      [
        'one-week-without-open-burning',
        'One Week Without Open Burning',
        'Anti-Burning',
        'Coordinate with residential welfare associations (RWAs) to compost winter garden leaves and provide safe electric heaters for night security staff.',
        'Participating Residential Blocks',
        300,
        218,
        1890.0,
        7,
        'Active',
      ],
      [
        'energy-saving-household-challenge',
        'Energy-Saving Household Challenge',
        'Energy',
        'Cut idle phantom loads, seal winter window drafts for thermal efficiency, and switch to lidded pressure/induction cooking across 14 days.',
        'Citywide Household Coalition',
        600,
        409,
        2945.2,
        14,
        'Active',
      ],
      [
        'community-clean-air-awareness-drive',
        'Community Clean-Air Awareness Drive',
        'Awareness',
        'Share verified CPCB/EPA health guidance, school indoor-recess checklists, and N95 mask fit demonstrations with local families and schools.',
        'School & Apartment Communities',
        400,
        276,
        920.0,
        21,
        'Active',
      ],
      [
        'zero-plastic-waste-segregation',
        'Zero-Burn Waste Segregation Drive',
        'Waste',
        'Maintain strict wet/dry waste separation and neighborhood composting bins to stop landfill fires and localized winter trash smoke.',
        'Ward-Level Eco Volunteers',
        350,
        164,
        1180.4,
        30,
        'Upcoming',
      ],
    ];
    for (const s of seeds) {
      insert.run(...s);
    }
  }
}

export function ensureUserDefaults(userId: number): void {
  const existingProfile = db.prepare('SELECT user_id FROM household_profiles WHERE user_id = ?').get(userId);
  if (!existingProfile) {
    db.prepare('INSERT INTO household_profiles (user_id, profile_json) VALUES (?, ?)').run(
      userId,
      JSON.stringify(DEFAULT_HOUSEHOLD_PROFILE),
    );
  }

  const existingNotif = db.prepare('SELECT user_id FROM notification_settings WHERE user_id = ?').get(userId);
  if (!existingNotif) {
    db.prepare('INSERT INTO notification_settings (user_id, settings_json) VALUES (?, ?)').run(
      userId,
      JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS),
    );
  }

  const locCount = (db.prepare('SELECT COUNT(*) as c FROM saved_locations WHERE user_id = ?').get(userId) as { c: number }).c;
  if (locCount === 0) {
    const insertLoc = db.prepare(`
      INSERT INTO saved_locations (user_id, name, admin1, country, country_code, latitude, longitude, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertLoc.run(userId, 'New Delhi', 'Delhi', 'India', 'IN', 28.6139, 77.209, 1);
    insertLoc.run(userId, 'Bengaluru', 'Karnataka', 'India', 'IN', 12.9716, 77.5946, 0);
    insertLoc.run(userId, 'London', 'England', 'United Kingdom', 'GB', 51.5072, -0.1276, 0);
  }
}
