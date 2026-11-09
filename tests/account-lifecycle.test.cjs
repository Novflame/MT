const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const ts = require("typescript")
const { generateInitialPassword } = require("../src/auth/initial-password.cjs")

const root = path.resolve(__dirname, "..")

function loadPureTypeScript(relativePath) {
  const filename = path.join(root, relativePath)
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const compiledModule = new Module(filename, module.parent)
  compiledModule.filename = filename
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename))
  compiledModule._compile(output, filename)
  return compiledModule.exports
}

test("initial passwords use independent cryptographic randomness and safe printable characters", () => {
  const values = Array.from({ length: 500 }, generateInitialPassword)
  assert.equal(new Set(values).size, values.length, "all generated initial passwords must be unique in the sample")
  for (const value of values) {
    assert.equal(value.length, 32)
    assert.match(value, /^[A-Za-z0-9_-]+$/)
  }
})

test("actual role-assignment policy prevents deputy privilege escalation", () => {
  const { canAssignStaffRole } = loadPureTypeScript("src/auth/role-assignment.ts")
  assert.equal(canAssignStaffRole("principal", "deputy"), true)
  assert.equal(canAssignStaffRole("principal", "teacher"), true)
  assert.equal(canAssignStaffRole("deputy", "teacher"), true)
  assert.equal(canAssignStaffRole("deputy", "head_of_class"), true)
  assert.equal(canAssignStaffRole("deputy", "deputy"), false)
  assert.equal(canAssignStaffRole("deputy", "principal"), false)
  assert.equal(canAssignStaffRole("teacher", "teacher"), false)
  assert.equal(canAssignStaffRole("principal", "student"), false)
})

test("actual permission map denies account creation to portal and limited staff roles", () => {
  const { hasPermission } = loadPureTypeScript("src/auth/permissions.ts")
  assert.equal(hasPermission("principal", "users.create"), true)
  assert.equal(hasPermission("deputy", "users.create"), true)
  assert.equal(hasPermission("teacher", "users.create"), false)
  assert.equal(hasPermission("head_of_class", "users.create"), false)
  assert.equal(hasPermission("head_of_department", "users.create"), false)
  assert.equal(hasPermission("parent", "users.create"), false)
  assert.equal(hasPermission("student", "users.create"), false)
  assert.equal(hasPermission("untrusted-role", "users.create"), false)
})

test("account API keeps initial passwords out of request logs and stores lifecycle flags in central schema", () => {
  const schema = fs.readFileSync(path.join(root, "src/db/centeral-schema.ts"), "utf8")
  const provisioning = fs.readFileSync(path.join(root, "src/auth/account-provisioning.ts"), "utf8")
  const changeRoute = fs.readFileSync(path.join(root, "src/app/api/account/change-initial-password/route.ts"), "utf8")
  assert.match(schema, /mustChangePassword: integer\("must_change_password"/)
  assert.match(schema, /provisioningStatus: text\("provisioning_status"/)
  assert.match(provisioning, /password: initialPassword/)
  assert.doesNotMatch(provisioning, /console\.(?:log|error).*initialPassword/s)
  assert.match(changeRoute, /await auth\.api\.changePassword/)
  assert.match(changeRoute, /set\(\{ mustChangePassword: false \}\)/)
})
