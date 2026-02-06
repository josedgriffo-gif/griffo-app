// api/parts.js
// GET /api/parts?code=GR-2035        → Buscar por código
// GET /api/parts?search=fuelle+vento  → Buscar por palabra
// GET /api/parts?vehicle_id=123       → Buscar por vehículo
// GET /api/parts?page=2               → Paginación

const fetch = require('node-fetch');
const { getToken } = require('./_token');

const API_BASE = 'https://external-api.specparts.ai';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, search, vehicle_id, page = 1, limit = 20 } = req.query;

  // Necesita al menos un criterio de búsqueda
  if (!code && !search && !vehicle_id) {
    return res.status(400).json({ error: 'Parámetro requerido: code, search o vehicle_id' });
  }

  try {
    const token = await getToken();

    // Construir URL con parámetros
    const params = new URLSearchParams();
    params.set('lang', '1');
    params.set('output', 'v1');
    params.set('page', page);
    params.set('limit', Math.min(limit, 100));
    params.set('brand[]', 'GRIFFO');

    if (code) {
      // Limpiar el código: aceptar "GR-2035", "2035", "gr-2035"
      const cleanCode = code.toUpperCase().replace(/^GR-?/, '');
      params.append('code[]', cleanCode);
      // También buscar con prefijo por si la API lo necesita
      params.append('code[]', 'GR-' + cleanCode);
    }

    if (search) {
      params.set('search', search);
    }

    if (vehicle_id) {
      params.set('vehicle_id[]', vehicle_id);
    }

    const response = await fetch(
      `${API_BASE}/part/list?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Parts API: ${response.status}`);
    }

    const data = await response.json();

    // Normalizar respuesta
    const parts = (data.data || data || []).map(part => ({
      slug: part.slug,
      code: part.code,
      safe_code: part.safe_code,
      brand: part.brand,
      product: part.product,
      category: part.category,
      description: part.description,
      is_kit: part.is_kit,
      discontinued: part.discontinued,
      pictures: (part.pictures || []).map(p => ({
        url: p.image_url,
        is_blueprint: p.is_blueprint,
      })),
      attributes: part.attributes || [],
      vehicles: (part.vehicles || []).map(v => ({
        id: v.id || v.vehicle_id,
        brand: v.brand,
        model: v.master_model || v.model,
        version: v.version,
        year_from: v.sold_from_year,
        year_until: v.sold_until_year,
        engine: v.engine_displacement,
        transmission: v.transmission,
      })),
      cross_references: part.cross || [],
      links: part.links || [],
      components: part.components || [],
    }));

    return res.status(200).json({
      total: data.total || parts.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: parts,
    });

  } catch (error) {
    console.error('Parts search error:', error);
    return res.status(500).json({ error: 'Error al buscar productos. Intentá de nuevo.' });
  }
};
