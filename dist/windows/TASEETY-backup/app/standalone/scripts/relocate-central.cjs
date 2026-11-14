'use strict'

// Copies a legacy <DataDir>\\central.db to <DataDir>\\central-data\\central.db.
// The original is never removed or overwritten.
const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

async function main() {
  const configured = process.env.CENTRAL_DATABASE_PATH
  if (!configured || !path.isAbsolute(configured)) throw new Error('CENTRAL_DATABASE_PATH must be an absolute path.')
  const target = path.resolve(configured)
  if (fs.existsSync(target)) {
    const existing = new Database(target, { readonly: true, fileMustExist: true })
    try {
      const integrity = existing.pragma('integrity_check', { simple: true })
      if (integrity !== 'ok') throw new Error(`Configured central database failed integrity_check: ${integrity}`)
    } finally { existing.close() }
    console.log(`Configured central database already exists and is valid: ${target}`)
    process.exit(0)
  }

  const dataRoot = path.dirname(path.dirname(target))
  const source = path.join(dataRoot, 'central.db')
  if (!fs.existsSync(source)) {
    console.log(`No legacy central database to relocate: ${source}`)
    process.exit(0)
  }
  const stat = fs.lstatSync(source)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Legacy central database is not a regular file: ${source}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const input = new Database(source, { readonly: true, fileMustExist: true })
  try {
    const integrity = input.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`Legacy central DB integrity_check failed: ${integrity}`)
    const temp = `${target}.relocating-${process.pid}-${Date.now()}`
    try {
      await input.backup(temp)
      const output = new Database(temp, { readonly: true, fileMustExist: true })
      try {
        const outputIntegrity = output.pragma('integrity_check', { simple: true })
        if (outputIntegrity !== 'ok') throw new Error(`Central DB copy integrity_check failed: ${outputIntegrity}`)
      } finally { output.close() }
      // Hard fail if another process created the destination during copy.
      if (fs.existsSync(target)) throw new Error(`Central database destination appeared during relocation; refusing overwrite: ${target}`)
      fs.renameSync(temp, target)
    } catch (error) {
      try { fs.rmSync(temp, { force: true }) } catch {}
      throw error
    }
  } finally { input.close() }
  console.log(`Central database copied and verified: ${target}`)
  console.log(`Original source left untouched: ${source}`)
}
main().catch((error) => { console.error('Central database relocation failed:', error); process.exitCode = 1 })
