const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const ts = require("typescript")

const projectRoot = path.resolve(__dirname, "..")

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath)
  const source = require("node:fs").readFileSync(sourcePath, "utf8")
  const output = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const modulePath = path.join(os.tmpdir(), `school-test-${path.basename(relativePath, ".ts")}-${process.pid}.cjs`)
  require("node:fs").writeFileSync(modulePath, output)
  delete require.cache[modulePath]
  return { module: require(modulePath), cleanup: () => require("node:fs").rmSync(modulePath, { force: true }) }
}

test("school database path uses the configured directory and rejects unsafe identifiers", () => {
  const old = process.env.SCHOOL_DATABASE_DIR
  process.env.SCHOOL_DATABASE_DIR = path.join(os.tmpdir(), "school-database-test")
  const loaded = loadTypeScriptModule("src/db/database-path.ts")
  try {
    assert.equal(loaded.module.getSchoolDatabasePath(12), path.join(process.env.SCHOOL_DATABASE_DIR, "school_12.db"))
    assert.throws(() => loaded.module.getSchoolDatabasePath("../other"), /Invalid school id/)
    assert.throws(() => loaded.module.getSchoolDatabasePath("0"), /Invalid school id/)
  } finally {
    loaded.cleanup()
    if (old === undefined) delete process.env.SCHOOL_DATABASE_DIR
    else process.env.SCHOOL_DATABASE_DIR = old
  }
})

test("upload directory checksum is stable and detects file changes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "school-upload-integrity-"))
  const loaded = loadTypeScriptModule("src/backup/file-integrity.ts")
  try {
    await fs.mkdir(path.join(directory, "schools", "1"), { recursive: true })
    const file = path.join(directory, "schools", "1", "logo.png")
    await fs.writeFile(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const first = await loaded.module.sha256Directory(directory)
    const second = await loaded.module.sha256Directory(directory)
    assert.equal(first, second)
    await fs.appendFile(file, Buffer.from([0x00]))
    const changed = await loaded.module.sha256Directory(directory)
    assert.notEqual(first, changed)
  } finally {
    loaded.cleanup()
    await fs.rm(directory, { recursive: true, force: true })
  }
})
