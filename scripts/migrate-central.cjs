'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const Database = require('better-sqlite3')
const { drizzle } = require('drizzle-orm/better-sqlite3')
const { migrate } = require('drizzle-orm/better-sqlite3/migrator')

const configuredPath = process.env.CENTRAL_DATABASE_PATH || './central.db'
const databasePath = path.resolve(configuredPath)
// Works both from <project>/scripts and from <install>/app/standalone/scripts.
const migrationsFolder = path.resolve(__dirname, '..', 'drizzle', 'central')
const lockPath = `${databasePath}.migration-lock`
const lockOwnerPath = path.join(lockPath, 'owner.json')
const lockToken = crypto.randomUUID()

if (!fs.existsSync(migrationsFolder)) {
  throw new Error(`Central migrations folder is missing: ${migrationsFolder}`)
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true }
  catch (error) {
    if (error.code === 'ESRCH') return false
    if (error.code === 'EPERM') return true
    throw error
  }
}
function readOwner() {
  try { return JSON.parse(fs.readFileSync(lockOwnerPath, 'utf8')) }
  catch { return null }
}
function removeStaleLock() {
  let stat
  try { stat = fs.statSync(lockPath) }
  catch (error) { if (error.code === 'ENOENT') return; throw error }
  const owner = readOwner()
  if (owner && Number.isInteger(owner.pid)) {
    if (processAlive(owner.pid)) return
    const current = readOwner()
    if (!current || current.pid !== owner.pid || current.token !== owner.token) return
  } else {
    if (Date.now() - stat.mtimeMs < 60_000) return
    const currentStat = fs.statSync(lockPath)
    if (currentStat.mtimeMs !== stat.mtimeMs) return
  }
  fs.rmSync(lockPath, { recursive: true, force: true })
}
async function acquireLock() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(lockPath)
      try {
        fs.writeFileSync(lockOwnerPath, JSON.stringify({ pid: process.pid, token: lockToken, createdAt: Date.now() }), { flag: 'wx' })
      } catch (error) {
        try { fs.rmdirSync(lockPath) } catch {}
        throw error
      }
      return
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      removeStaleLock()
      await sleep(250)
    }
  }
  throw new Error('Timed out waiting for the central database migration lock.')
}
function verifySchema(db) {
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name))
  const requiredTables = ['schools', 'user', 'session', 'account', 'verification', 'account_audit_log', 'twoFactor', 'school_feature_flags', 'school_registration_operations']
  const missingTables = requiredTables.filter((name) => !tables.has(name))
  if (missingTables.length) throw new Error(`Central schema missing tables: ${missingTables.join(', ')}`)

  const requiredColumns = {
    user: ['must_change_password', 'provisioning_status', 'provisioning_type', 'provisioning_reference_id', 'provisioning_metadata', 'provisioning_stage', 'provisioning_failure_stage', 'provisioning_attempts', 'provisioning_lease_until', 'provisioning_operation_id', 'provisioning_lease_token', 'two_factor_enabled'],
    school_registration_operations: ['id', 'school_id', 'admin_user_id', 'school_slug', 'admin_email', 'status', 'stage', 'failure_stage', 'attempts', 'lease_until', 'lease_token', 'metadata', 'last_error', 'created_at', 'updated_at'],
    school_feature_flags: ['school_id', 'timetable_enabled', 'timetable_attendance_grace_minutes', 'created_at', 'updated_at'],
  }
  for (const [table, required] of Object.entries(requiredColumns)) {
    const actual = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name))
    const missing = required.filter((column) => !actual.has(column))
    if (missing.length) throw new Error(`Central schema missing columns in ${table}: ${missing.join(', ')}`)
  }
  const requiredIndexes = ['user_provisioning_status_idx', 'user_provisioning_operation_id_unique', 'user_provisioning_recovery_idx', 'two_factor_user_id_unique', 'school_registration_operations_school_slug_unique', 'school_registration_admin_user_unique', 'school_registration_recovery_idx']
  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name))
  const missingIndexes = requiredIndexes.filter((name) => !indexes.has(name))
  if (missingIndexes.length) throw new Error(`Central schema missing indexes: ${missingIndexes.join(', ')}`)
}

async function main() {
  await acquireLock()
  let db
  try {
    const existed = fs.existsSync(databasePath)
    db = new Database(databasePath)
    db.pragma('busy_timeout = 15000')
    db.pragma('foreign_keys = ON')
    if (existed) {
      const integrity = db.pragma('quick_check', { simple: true })
      if (integrity !== 'ok') throw new Error(`Central database failed quick_check before migration: ${integrity}`)
    }
    db.pragma('journal_mode = WAL')
    migrate(drizzle(db), { migrationsFolder })
    const integrity = db.pragma('quick_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`Central database failed quick_check after migration: ${integrity}`)
    verifySchema(db)
    console.log(`Central database migrations verified: ${databasePath}`)
  } finally {
    if (db) db.close()
    const owner = readOwner()
    if (owner && owner.token === lockToken) fs.rmSync(lockPath, { recursive: true, force: true })
  }
}
main().catch((error) => {
  console.error('Central database migration failed; refusing to start:', error)
  process.exitCode = 1
})
