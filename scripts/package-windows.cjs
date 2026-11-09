/**
 * Create the Windows x64 standalone payload.
 * This script never opens or migrates application databases.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const projectRoot = path.resolve(__dirname, '..')
const standaloneSource = path.join(projectRoot, '.next', 'standalone')
const distRoot = path.join(projectRoot, 'dist', 'windows')
const payloadRoot = path.join(distRoot, 'TASEETY')
const appStandalone = path.join(payloadRoot, 'app', 'standalone')
const nodeExecutable = process.execPath

function fail(message) {
  console.error(`\n[package-windows] ERROR: ${message}\n`)
  process.exit(1)
}

function assertContained(parent, child) {
  const relative = path.relative(parent, child)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`Refusing unsafe output path: ${child}`)
  }
}

function isForbiddenName(name) {
  return (
    /^\.env(?:$|\.)/i.test(name) ||
    /\.env(?:$|\.)/i.test(name) ||
    /^\.credentials(?:\.|$)/i.test(name) ||
    /^credentials(?:\.|$)/i.test(name) ||
    /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/i.test(name) ||
    /^school_\d+\.db(?:-(?:wal|shm|journal))?$/i.test(name) ||
    /\.(?:pem|p8|p12|pfx|key|jks|keystore)$/i.test(name) ||
    /^(?:id_rsa|id_ed25519|\.npmrc|\.yarnrc)$/i.test(name)
  )
}

const excludedRootDirectories = new Set([
  'backups', 'databases', 'uploads', 'central-data', 'logs', 'config',
  'tests', 'test-results', 'playwright-report', 'performance-results',
])

function shouldCopy(source) {
  const relative = path.relative(standaloneSource, source)
  const parts = relative.split(path.sep).filter(Boolean)
  if (parts.length === 1 && excludedRootDirectories.has(parts[0].toLowerCase())) return false
  if (parts.some((part) => isForbiddenName(part))) return false
  try {
    const stat = fs.lstatSync(source)
    if (stat.isSymbolicLink()) fail(`Symbolic links are not allowed in standalone payload: ${source}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return true
}

function copyFileIfPresent(source, destination, required = false) {
  if (!fs.existsSync(source)) {
    if (required) fail(`Required file is missing: ${source}`)
    console.warn(`[package-windows] Optional file missing: ${source}`)
    return false
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, dereference: false, errorOnExist: false })
  return true
}

if (process.platform !== 'win32') fail('Run this packaging step on Windows x64.')
if (process.arch !== 'x64') fail(`Expected x64 Node.js; received ${process.arch}.`)
const major = Number(process.versions.node.split('.')[0])
if (major !== 22) fail(`Node.js 22.x x64 is required for reproducible native-module packaging; received ${process.version}.`)
if (path.basename(nodeExecutable).toLowerCase() !== 'node.exe') fail(`Expected node.exe, received ${nodeExecutable}.`)
if (!fs.existsSync(path.join(standaloneSource, 'server.js'))) {
  fail('Missing .next/standalone/server.js. Run npm run build first and ensure output: standalone is enabled.')
}

assertContained(path.join(projectRoot, 'dist'), payloadRoot)
for (const directory of [path.join(projectRoot, 'dist'), distRoot, payloadRoot]) {
  if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) {
    fail(`Refusing to write through a symbolic link: ${directory}`)
  }
}
fs.mkdirSync(distRoot, { recursive: true })
if (fs.existsSync(payloadRoot)) {
  const existing = fs.lstatSync(payloadRoot)
  if (existing.isSymbolicLink() || !existing.isDirectory()) fail(`Refusing to replace non-directory payload path: ${payloadRoot}`)
  fs.rmSync(payloadRoot, { recursive: true, force: true })
}
fs.mkdirSync(appStandalone, { recursive: true })

fs.cpSync(standaloneSource, appStandalone, {
  recursive: true,
  dereference: false,
  filter: shouldCopy,
})

copyFileIfPresent(path.join(projectRoot, '.next', 'static'), path.join(appStandalone, '.next', 'static'), true)
const publicSource = path.join(projectRoot, 'public')
if (fs.existsSync(publicSource)) {
  const publicDestination = path.join(appStandalone, 'public')
  fs.mkdirSync(publicDestination, { recursive: true })
  fs.cpSync(publicSource, publicDestination, {
    recursive: true,
    dereference: false,
    filter(source) {
      const relative = path.relative(publicSource, source)
      const parts = relative.split(path.sep).filter(Boolean)
      if (parts.some((part) => ['uploads', 'backups', 'databases', 'config'].includes(part.toLowerCase()))) return false
      if (parts.some((part) => isForbiddenName(part))) return false
      const stat = fs.lstatSync(source)
      if (stat.isSymbolicLink()) fail(`Symbolic links are not allowed in public assets: ${source}`)
      return true
    },
  })
  console.log('[package-windows] Included public assets (runtime data excluded)')
} else {
  console.log('[package-windows] No public directory; continuing because this project has no public asset folder.')
}
copyFileIfPresent(path.join(projectRoot, 'drizzle', 'central'), path.join(appStandalone, 'drizzle', 'central'), true)
copyFileIfPresent(path.join(projectRoot, 'drizzle', 'school'), path.join(appStandalone, 'drizzle', 'school'), true)
copyFileIfPresent(path.join(projectRoot, 'scripts', 'migrate-central.cjs'), path.join(appStandalone, 'scripts', 'migrate-central.cjs'), true)

// Maintenance scripts run outside Next's traced server graph, so include
// their runtime packages explicitly.
copyFileIfPresent(
  path.join(projectRoot, 'node_modules', 'drizzle-orm'),
  path.join(appStandalone, 'node_modules', 'drizzle-orm'),
  true
)

// One canonical runtime location: <InstallDir>\\node.exe.
fs.copyFileSync(nodeExecutable, path.join(payloadRoot, 'node.exe'))
for (const dll of ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll', 'concrt140.dll']) {
  const candidates = [
    path.join(path.dirname(nodeExecutable), dll),
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', dll),
  ]
  const candidate = candidates.find((item) => fs.existsSync(item))
  if (candidate) fs.copyFileSync(candidate, path.join(payloadRoot, dll))
}
for (const notice of ['LICENSE', 'LICENSE.txt', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
  const source = path.join(path.dirname(nodeExecutable), notice)
  if (fs.existsSync(source) && fs.statSync(source).isFile()) {
    fs.copyFileSync(source, path.join(payloadRoot, `NODE-${notice}`))
  }
}

// Native module smoke test uses an in-memory database only.
const payloadRequire = createRequire(path.join(appStandalone, 'server.js'))
try {
  const Database = payloadRequire('better-sqlite3')
  const db = new Database(':memory:')
  const result = db.prepare('SELECT sqlite_version() AS version').get()
  db.close()
  if (!result || !result.version) throw new Error('SQLite smoke test returned no version.')
  console.log(`[package-windows] better-sqlite3 OK (SQLite ${result.version})`)
} catch (error) {
  fail(`Standalone native SQLite module could not be loaded.\n${error.stack || error}`)
}

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (isForbiddenName(entry.name)) fail(`Sensitive/runtime data file found in payload: ${full}`)
    if (entry.isSymbolicLink()) fail(`Symbolic link found in payload: ${full}`)
    if (entry.isDirectory()) scan(full)
  }
}
scan(payloadRoot)

const manifest = {
  product: 'TASEETY',
  packageVersion: require(path.join(projectRoot, 'package.json')).version,
  createdAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  architecture: process.arch,
  entryPoint: 'app/standalone/server.js',
  runtimeExecutable: 'node.exe',
  databaseFilesIncluded: false,
  uploadsIncluded: false,
  backupsIncluded: false,
  migrationsExecuted: false,
}
fs.writeFileSync(path.join(payloadRoot, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
console.log(`[package-windows] Payload created: ${payloadRoot}`)
console.log('[package-windows] No application database was opened or modified.')
