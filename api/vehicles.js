const fetch = require('node-fetch');
const { getToken } = require('./_token');

const API_BASE = 'https://external-api.specparts.ai';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, model } = req.query;

  try {
    const token = await getToken();
    var url = API_BASE + '/vehicle/list?lang=1&page=1&limit=100&market_id=1&show_column=brand&show_column=master_model&show_column=model_range&show_column=version&show_column=sold_from_year&show_column=sold_until_year&show_column=engine_displacement_liters&show_column=transmission&show_column=fuel_type&show_column=code';

    console.log('Vehicles URL:', url);

    var response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!response.ok) {
      var errText = await response.text();
      console.log('Vehicles API error:', response.status, errText);
      throw new Error('Vehicles API: ' + response.status);
    }

    var data = await response.json();
    console.log('Vehicles response keys:', Object.keys(data));
    var vehicles = data.data || data || [];
    if (!Array.isArray(vehicles)) vehicles = [];
    console.log('Vehicles count:', vehicles.length);

    if (!brand && !model) {
      var brandMap = {};
      vehicles.forEach(function(v) {
        if (v.brand) {
          if (!brandMap[v.brand]) brandMap[v.brand] = 0;
          brandMap[v.brand]++;
        }
      });
      var brands = Object.keys(brandMap).sort().map(function(b) {
        return { name: b, count: brandMap[b] };
      });
      return res.status(200).json({ type: 'brands', data: brands });
    }

    if (brand && !model) {
      var filtered = vehicles.filter(function(v) {
        return v.brand && v.brand.toLowerCase() === brand.toLowerCase();
      });
      var modelMap = {};
      filtered.forEach(function(v) {
        var m = v.master_model || v.model_range;
        if (m) {
          if (!modelMap[m]) modelMap[m] = { years: [] };
          if (v.sold_from_year) modelMap[m].years.push(v.sold_from_year);
        }
      });
      var models = Object.keys(modelMap).sort().map(function(m) {
        var years = modelMap[m].years;
        return {
          name: m,
          year_from: years.length ? Math.min.apply(null, years) : null,
          year_until: years.length ? Math.max.apply(null, years) : null,
          count: years.length
        };
      });
      return res.status(200).json({ type: 'models', brand: brand, data: models });
    }

    if (brand && model) {
      var filtered2 = vehicles.filter(function(v) {
        return v.brand && v.brand.toLowerCase() === brand.toLowerCase() &&
          (v.master_model || v.model_range || '').toLowerCase() === model.toLowerCase();
      });
      var yearMap = {};
      filtered2.forEach(function(v) {
        var y = v.sold_from_year;
        if (!y) return;
        if (!yearMap[y]) yearMap[y] = [];
        yearMap[y].push({
          id: v.id || v.code,
          version: v.version,
          engine: v.engine_displacement_liters,
          transmission: v.transmission,
          fuel: v.fuel_type
        });
      });
      var years = Object.keys(yearMap).map(Number).sort(function(a,b){return b-a;});
      return res.status(200).json({
        type: 'years',
        brand: brand,
        model: model,
        data: years.map(function(y) {
          return { year: y, versions: yearMap[y] };
        })
      });
    }

  } catch (error) {
    console.error('Vehicles error:', error);
    return res.status(500).json({ error: 'Error al consultar vehículos.' });
  }
};
