// api/vehicles.js
// GET /api/vehicles                           → Listar marcas
// GET /api/vehicles?brand=Volkswagen          → Listar modelos de una marca
// GET /api/vehicles?brand=Volkswagen&model=Vento → Listar años
// GET /api/vehicles?code=VEH123               → Buscar vehículo por código

const fetch = require('node-fetch');
const { getToken } = require('./_token');

const API_BASE = 'https://external-api.specparts.ai';

// Columnas que necesitamos
const SHOW_COLUMNS = [
  'brand', 'master_model', 'version', 'sold_from_year', 'sold_until_year',
  'engine_displacement_liters', 'transmission', 'fuel_type', 'code',
  'bosch_segment', 'model_range',
].map(c => `show_column=${c}`).join('&');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, model, page = 1, limit = 100 } = req.query;

  try {
    const token = await getToken();

    // Construir URL
    const params = new URLSearchParams();
    params.set('lang', '1');
    params.set('page', page);
    params.set('limit', Math.min(limit, 100));
    params.set('market_id', '1'); // Argentina

    // Filtros: solo traer vehículos que tienen productos GRIFFO
    params.set('category[]', 'SUSPENSION');

    let url = `${API_BASE}/vehicle/list?${params.toString()}&${SHOW_COLUMNS}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Vehicles API: ${response.status}`);
    }

    const data = await response.json();
    const vehicles = data.data || data || [];

    // Si piden marcas (sin filtro)
    if (!brand && !model) {
      const brands = [...new Set(vehicles.map(v => v.brand))].sort();
      return res.status(200).json({
        type: 'brands',
        data: brands.map(b => ({
          name: b,
          count: vehicles.filter(v => v.brand === b).length,
        })),
      });
    }

    // Si piden modelos de una marca
    if (brand && !model) {
      const filtered = vehicles.filter(v =>
        v.brand && v.brand.toLowerCase() === brand.toLowerCase()
      );
      const models = [...new Set(filtered.map(v => v.master_model || v.model_range))].filter(Boolean).sort();
      return res.status(200).json({
        type: 'models',
        brand: brand,
        data: models.map(m => {
          const modelVehs = filtered.filter(v => (v.master_model || v.model_range) === m);
          const years = modelVehs.map(v => v.sold_from_year).filter(Boolean);
          return {
            name: m,
            year_from: years.length ? Math.min(...years) : null,
            year_until: years.length ? Math.max(...years) : null,
            count: modelVehs.length,
          };
        }),
      });
    }

    // Si piden años de un modelo
    if (brand && model) {
      const filtered = vehicles.filter(v =>
        v.brand && v.brand.toLowerCase() === brand.toLowerCase() &&
        (v.master_model || v.model_range || '').toLowerCase() === model.toLowerCase()
      );

      // Agrupar por año, devolver versiones disponibles
      const yearMap = {};
      filtered.forEach(v => {
        const y = v.sold_from_year;
        if (!y) return;
        if (!yearMap[y]) yearMap[y] = [];
        yearMap[y].push({
          id: v.id || v.code,
          version: v.version,
          engine: v.engine_displacement_liters,
          transmission: v.transmission,
          fuel: v.fuel_type,
        });
      });

      const years = Object.keys(yearMap).map(Number).sort((a, b) => b - a); // Más nuevo primero

      return res.status(200).json({
        type: 'years',
        brand: brand,
        model: model,
        data: years.map(y => ({
          year: y,
          versions: yearMap[y],
        })),
      });
    }

  } catch (error) {
    console.error('Vehicles error:', error);
    return res.status(500).json({ error: 'Error al consultar vehículos. Intentá de nuevo.' });
  }
};
