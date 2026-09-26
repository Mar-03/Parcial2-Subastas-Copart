/**
 * Cargador de variables de entorno (.env) en modo CommonJS.
 *
 * Next.js ya carga el archivo .env en `next dev` / `next build` / cuando se
 * usa `next()`. Este modulo lo carga para los procesos que corren con Node
 * puro:  `node server.js`, `npm run db:init` y `npm run db:seed`.
 *
 * No sobreescribe variables ya definidas en el entorno (Render, Docker, etc).
 */

const fs = require('fs');
const path = require('path');

function parseEnvFile(contents) {
  const result = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key) continue;

    let value = line.slice(separatorIndex + 1).trim();

    // Quita comillas envolventes
    const firstChar = value[0];
    if (
      (firstChar === '"' || firstChar === "'" || firstChar === '`') &&
      value.length > 1 &&
      value[value.length - 1] === firstChar
    ) {
      value = value.slice(1, -1);
    } else {
      // Comentario al final de la linea (fuera de comillas)
      const commentIndex = value.indexOf(' #');
      if (commentIndex > -1) value = value.slice(0, commentIndex).trim();
    }

    result[key] = value;
  }

  return result;
}

function loadEnv(rootDir = path.resolve(__dirname, '..')) {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return false;

  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  Object.entries(parsed).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
  return true;
}

module.exports = { loadEnv, parseEnvFile };
