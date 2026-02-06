// api/token.js
// Módulo interno para obtener y cachear el token de SpecParts
// NO se expone como endpoint público

const fetch = require('node-fetch');

const AUTH_URL = 'https://auth.specparts.ai/oauth';
const CLIENT_ID = process.env.SPECPARTS_CLIENT_ID;
const CLIENT_SECRET = process.env.SPECPARTS_CLIENT_SECRET;

// Cache en memoria (persiste mientras la function está caliente)
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  const now = Math.floor(Date.now() / 1000);

  // Si el token es válido (con 5 min de margen), devolver el cacheado
  if (cachedToken && tokenExpiry > now + 300) {
    return cachedToken;
  }

  // Solicitar nuevo token
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = data.ttl; // TTL ya viene como timestamp Unix

  return cachedToken;
}

module.exports = { getToken };
