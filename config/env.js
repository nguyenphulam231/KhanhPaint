const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

function getEnv(name, fallbackValue, options = {}) {
  const value = process.env[name];

  if (value !== undefined && value !== "") return value;
  if (fallbackValue !== undefined) return fallbackValue;
  if (options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return undefined;
}

module.exports = { getEnv };
