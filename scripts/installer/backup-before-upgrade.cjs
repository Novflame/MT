'use strict'

// Run only after the TASEETY service has stopped. Source databases are never modified.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const Database = require('better-sqlite3')

const required = ['CENTRAL_DATABASE_PATH', 'SCHOOL_DATABASE_DIR', 'SCHOOL_UPLOADS_DIR', 'BACKUP_DIRECTORY']
for (const key of required) if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
const centralConfigured = path.resolve(process.env.CENTRAL_DATABASE_PATH)
const schoolDir = path.resolve(process.env.SCHOOL_DATABASE_DIR)
const uploadsDir = path.resolve(process.env.SCHOOL_UPLOADS_DIR)
const backupRoot = path.resolve(process.env.BACKUP_DIRECTORY)
const dataRoot = path.resolve(path.dirname(path.dirname(centralConfigured)))
const legacyCentral = path.join(dataRoot, 'central.db')
const centralPath = fs.existsSync(centralConfigured) ? centralConfigured : legacyCentral
if (!fs.existsSync(centralPath)) throw new Error(`Central database is missing: ${centralConfigured}`)

function inside(parent, child) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}
function overlaps(a, b) { return inside(a, b) || inside(b, a) }
if (overlaps(uploadsDir, backupRoot) || overlaps(schoolDir, backupRoot) || overlaps(path.dirname(centralPath), backupRoot)) {
  throw new Error('Backup directory must not be inside uploads, school databases, or the central database directory.')
}

const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`
const preUpgradeRoot = path.join(backupRoot, 'pre-upgrade')
fs.mkdirSync(preUpgradeRoot, { recursive: true })
const target = path.join(preUpgradeRoot, stamp)
fs.mkdirSync(target, { recursive: false })
const manifest = {
  product: 'TASEETY', kind: 'pre-upgrade', status: 'incomplete', createdAt: new Date().toISOString(),
  sourceCentralDatabase: centralPath, databases: [], uploadsIncluded: false, uploads: [],
}

async function sha256(file) {
  const hash = crypto.createHash('sha256')
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', resolve)
  })
  return hash.digest('hex')
}
function assertRegularFile(file, label) {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} is not a regular file: ${file}`)
}
async function snapshot(source, destination, label) {
  assertRegularFile(source, `${label} database`)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  const sourceDb = new Database(source, { readonly: true, fileMustExist: true })
  try {
    const integrity = sourceDb.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`${label} source integrity_check failed: ${integrity}`)
    await sourceDb.backup(destination)
  } finally { sourceDb.close() }
  const backupDb = new Database(destination, { readonly: true, fileMustExist: true })
  try {
    const integrity = backupDb.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`${label} backup integrity_check failed: ${integrity}`)
  } finally { backupDb.close() }
  manifest.databases.push({ label, source, backup: path.relative(target, destination), sha256: await sha256(destination) })
}
function listFiles(root) {
  const result = []
  if (!fs.existsSync(root)) return result
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link found; refusing to back up uploads: ${full}`)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) result.push(full)
      else throw new Error(`Unsupported filesystem entry in uploads: ${full}`)
    }
  }
  walk(root)
  return result.sort()
}

async function main() {
  await snapshot(centralPath, path.join(target, 'central.db'), 'central')
  const central = new Database(centralPath, { readonly: true, fileMustExist: true })
  let schoolIds
  try {
    const hasSchools = central.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schools'").get()
    if (!hasSchools) throw new Error('Central database has no schools table; refusing an incomplete backup.')
    schoolIds = central.prepare('SELECT id FROM schools ORDER BY id').all().map((row) => String(row.id))
  } finally { central.close() }
  const knownIds = new Set()
  for (const id of schoolIds) {
    if (!/^\d+$/.test(id) || Number(id) < 1) throw new Error(`Invalid registered school id: ${id}`)
    if (knownIds.has(id)) throw new Error(`Duplicate registered school id: ${id}`)
    knownIds.add(id)
    await snapshot(path.join(schoolDir, `school_${id}.db`), path.join(target, 'databases', `school_${id}.db`), `school_${id}`)
  }
  if (fs.existsSync(schoolDir)) {
    for (const entry of fs.readdirSync(schoolDir, { withFileTypes: true })) {
      const match = /^school_(\d+)\.db$/i.exec(entry.name)
      if (match && (entry.isSymbolicLink() || !entry.isFile())) {
        throw new Error(`Unexpected tenant database filesystem entry (${entry.name}); refusing an incomplete backup.`)
      }
      if (match && !knownIds.has(match[1])) {
        throw new Error(`Unregistered tenant database found (${entry.name}); refusing an incomplete backup.`)
      }
    }
  }

  if (fs.existsSync(uploadsDir) && fs.lstatSync(uploadsDir).isSymbolicLink()) throw new Error(`Uploads root is a symbolic link; refusing backup: ${uploadsDir}`)
  const sourceFiles = listFiles(uploadsDir)
  const uploadsBackup = path.join(target, 'uploads')
  if (sourceFiles.length) fs.mkdirSync(uploadsBackup, { recursive: true })
  for (const source of sourceFiles) {
    const relative = path.relative(uploadsDir, source)
    const destination = path.join(uploadsBackup, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL)
    const [sourceHash, backupHash] = await Promise.all([sha256(source), sha256(destination)])
    if (sourceHash !== backupHash) throw new Error(`Upload backup hash mismatch: ${relative}`)
    manifest.uploads.push({ path: relative, sha256: backupHash })
  }
  manifest.uploadsIncluded = true
  manifest.status = 'complete'
  manifest.completedAt = new Date().toISOString()
  const manifestPath = path.join(target, 'manifest.json')
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  console.log(`Verified pre-upgrade backup created: ${target}`)
  console.log(`Databases backed up: ${manifest.databases.length}; uploads backed up: ${manifest.uploads.length}`)
}
main().catch((error) => {
  console.error('Pre-upgrade backup failed; setup must stop before migration:', error)
  process.exitCode = 1
})
