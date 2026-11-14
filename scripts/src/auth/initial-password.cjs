const { randomBytes } = require("node:crypto")

function generateInitialPassword() {
  return randomBytes(24).toString("base64url")
}

module.exports = { generateInitialPassword }
