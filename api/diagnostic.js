import https from 'https';
import zlib from 'zlib';

function specpartsGet(path, token) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'external-api.specparts.ai',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    };
    https.get(options, function(apiRes) {
      var chunks = [];
      apiRes.on('data', function(c) { chunks.push(c); });
      apiRes.on('end', function() {
        var buf = Buffer.concat(chunks);
        var encoding = apiRes.headers['content-encoding'];
        if (encoding === 'gzip') {
          zlib.gunzip(buf, function(err, result) {
            if (err) {
              try { resolve(JSON.parse(buf.toString('utf8'))); }
              catch(e) { reject(new Error('Decompress failed')); }
            } else {
              try { resolve(JSON.parse(result.toString('utf8'))); }
              catch(e) { reject(new Error('JSON parse failed after gunzip')); }
            }
          });
        } else {
          try { resolve(JSON.parse(buf.toString('utf8'))); }
          catch(e) { reject(new Error('JSON parse failed')); }
        }
      });
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var results = { timestamp: new Date().toISOString(), tests: {} };

  try {
    var clientId = process.env.SPECPARTS_CLIENT_ID;
    var clientSecret = process.env.SPECPARTS_CLIENT_SECRET;

    results.tests.credentials = {
      client_id_first_5: clientId ? clientId.substring(0, 5) + '...' : 'MISSING',
      client_id_last_5: clientId ? '...' + clientId.substring(clientId.length - 5) : 'MISSING',
      secret_first_5: clientSecret ? clientSecret.substring(0, 5) + '...' : 'MISSING',
      secret_last_5: clientSecret ? '...' + clientSecret.substring(clientSecret.length - 5) : 'MISSING'
    };

    var tokenResp = await fetch('https://auth.specparts.ai/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
    });

    if (!tokenResp.ok) {
      results.tests.auth = { status: 'FAILED', httpCode: tokenResp.status };
      return res.status(200).json(results);
    }

    var tokenData = await tokenResp.json();
    var token = tokenData.access_token;
    results.tests.auth = { status: 'OK', token_first_10: token.substring(0, 10) + '...' };

    var allProducts = [];
    var page = 1;
    var totalPages = 1;

    while (page <= totalPages) {
      var path = '/part/list?lang=1&limit=100&page=' + page + '&brand[]=GRIFFO&output=v1';
      var data = await specpartsGet(path, token);
      if (data && data.data) {
        allProducts = allProducts.concat(data.data);
        if (data.paging) totalPages = data.paging.pages || 1;
      } else { break; }
      page++;
    }

    var categories = {};
    var products = {};
    var withVehicles = 0;
    var withoutVehicles = 0;
    var withPictures = 0;
    var withLinks = 0;
    var sampleProducts = [];

    allProducts.forEach(function(p) {
      var cat = p.category || 'Sin categoría';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;
      var prod = p.product || 'Sin producto';
      if (!products[prod]) products[prod] = 0;
      products[prod]++;
      if (p.vehicles && p.vehicles.length > 0) { withVehicles++; } else { withoutVehicles++; }
      if (p.pictures && p.pictures.length > 0) withPictures++;
      if (p.links && p.links.length > 0) withLinks++;
      if (sampleProducts.length < 5) {
        sampleProducts.push({
          code: p.code, brand: p.brand, category: p.category, product: p.product,
          description: p.description, vehicles_count: p.vehicles ? p.vehicles.length : 0,
          pictures_count: p.pictures ? p.pictures.length : 0, has_links: p.links && p.links.length > 0
        });
      }
    });

    results.tests.products = {
      status: 'OK', total: allProducts.length, pages_loaded: totalPages,
      with_vehicles: withVehicles, without_vehicles: withoutVehicles,
      with_pictures: withPictures, with_links: withLinks,
      categories: categories, product_types: products, sample_products: sampleProducts
    };

    var searchCode = req.query.code || '';
    if (searchCode) {
      var codeResults = allProducts.filter(function(p) {
        return p.code && p.code.toLowerCase().indexOf(searchCode.toLowerCase()) >= 0;
      });
      results.tests.code_search = {
        searched: searchCode, found: codeResults.length,
        matches: codeResults.map(function(p) {
          return {
            code: p.code, description: p.description, product: p.product, category: p.category,
            vehicles_count: p.vehicles ? p.vehicles.length : 0,
            pictures: p.pictures ? p.pictures.map(function(pic) { return pic.image_url || pic.url; }) : [],
            vehicles_sample: p.vehicles ? p.vehicles.slice(0, 3).map(function(v) {
              return v.brand + ' ' + v.master_model + ' ' + v.model + ' (' + v.sold_from_year + '-' + v.sold_until_year + ')';
            }) : []
          };
        })
      };
    }

    try {
      var plateData = await specpartsGet('/vehicle/identification?plate=AC923HI', token);
      results.tests.plate_search = {
        status: 'OK', plate: 'AC923HI',
        result: plateData ? {
          brand: plateData.brand, model: plateData.master_model || plateData.model,
          version: plateData.version, year: plateData.sold_from_year, id: plateData.id
        } : 'No data'
      };
    } catch(e) {
      results.tests.plate_search = { status: 'ERROR', message: e.message };
    }

  } catch(e) { results.error = e.message; }

  return res.status(200).json(results);
}
