const { getEnv } = require("./env");

const JWT_SECRET = getEnv("JWT_SECRET", undefined, { required: true });
const JWT_EXPIRES_IN = getEnv("JWT_EXPIRES_IN", "2h");

if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
