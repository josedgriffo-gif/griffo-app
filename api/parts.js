const fetch = require('node-fetch');
const { getToken } = require('./_token');
const API_BASE = 'https://external-api.specparts.ai';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, search, vehicle_id, page = 1, limit = 20, debug } = req.query;

  try {
    const token = await getToken();
    const params = new URLSearchParams();
    params.set('lang', '1');
    params.set('output', 'v1');
    params.set('page', page);
    params.set('limit', Math.min(limit, 100));

    if (code) {
      var cleanCode = code.toUpperCase().replace(/^GR-?/, '');
      params.append('code[]', cleanCode);
      params.append('code[]', 'GR-' + cleanCode);
      params.append('code[]', 'GR ' + cleanCode);
    }

    if (search) {
      params.set('search', search);
    }

    if (vehicle_id) {
      params.set('vehicle_id[]', vehicle_id);
    }

    var url = API_BASE + '/part/list?' + params.toString();
    console.log('Parts URL:', url);

    var response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!response.ok) {
      var errText = await response.text();
      console.log('Parts API error:', response.status, errText);
      throw new Error('Parts API: ' + response.status);
    }

    var rawText = await response.text();
    var data = JSON.parse(rawText);
    var rawParts = data.data || data || [];
    if (!Array.isArray(rawParts)) rawParts = [];

    console.log('Parts total:', data.paging ? data.paging.total : 'no paging');
    if (rawParts.length > 0) {
      console.log('First part brand:', rawParts[0].brand, 'code:', rawParts[0].code, 'product:', rawParts[0].product);
    }

    var parts = rawParts.map(function(part) {
      return {
        slug: part.slug,
        code: part.code,
        safe_code: part.safe_code,
        brand: part.brand,
        product: part.product,
        category: part.category,
        description: part.description,
        is_kit: part.is_kit,
        discontinued: part.discontinued,
        pictures: (part.pictures || []).map(function(p) {
          return { url: p.image_url, is_blueprint: p.is_blueprint };
        }),
        attributes: part.attributes || [],
        vehicles: (part.vehicles || []).map(function(v) {
          return {
            id: v.id || v.vehicle_id,
            brand: v.brand,
            model: v.master_model || v.model,
            version: v.version,
            year_from: v.sold_from_year,
            year_until: v.sold_until_year
          };
        }),
        cross_references: part.cross || [],
        links: part.links || [],
        components: part.components || []
      };
    });

    return res.status(200).json({
      total: data.paging ? data.paging.total : parts.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: parts
    });

  } catch (error) {
    console.error('Parts search error:', error);
    return res.status(500).json({ error: 'Error al buscar productos.' });
  }
};
