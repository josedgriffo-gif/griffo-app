// api/patent.js
// GET /api/patent?plate=AB123CD
// Busca vehículo por patente en SpecParts

const fetch = require('node-fetch');
const { getToken } = require('./_token');

const API_BASE = 'https://external-api.specparts.ai';

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plate } = req.query;

  if (!plate || plate.length < 6) {
    return res.status(400).json({ error: 'Patente inválida. Mínimo 6 caracteres.' });
  }

  try {
    const token = await getToken();

    // 1. Identificar vehículo por patente
    const vehResponse = await fetch(
      `${API_BASE}/vehicle/identification?plate=${encodeURIComponent(plate.toUpperCase())}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!vehResponse.ok) {
      if (vehResponse.status === 404) {
        return res.status(404).json({ error: 'Patente no encontrada' });
      }
      throw new Error(`Vehicle API: ${vehResponse.status}`);
    }

    const vehicle = await vehResponse.json();

    // 2. Buscar productos para ese vehículo
    let products = [];
    if (vehicle.id) {
      const partsResponse = await fetch(
        `${API_BASE}/part/list?lang=1&output=v1&vehicle_id[]=${vehicle.id}&brand[]=GRIFFO&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (partsResponse.ok) {
        const partsData = await partsResponse.json();
        products = partsData.data || partsData || [];
      }
    }

    return res.status(200).json({
      vehicle: {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.master_model || vehicle.model,
        version: vehicle.version,
        year: vehicle.reference_year || vehicle.sold_from_year,
        engine: vehicle.engine_displacement,
        transmission: vehicle.transmission,
        segment: vehicle.segment,
      },
      products: products,
    });

  } catch (error) {
    console.error('Patent search error:', error);
    return res.status(500).json({ error: 'Error al consultar la API. Intentá de nuevo.' });
  }
};
