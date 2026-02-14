const https = require('https');
const zlib = require('zlib');

function specpartsGet(path, token) {
  return new Promise(function(resolve, reject) {
    https.get({
      hostname: 'external-api.specparts.ai',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    }, function(apiRes) {
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
              catch(e) { reject(new Error('JSON parse failed')); }
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

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var plate = req.query.plate || '';
  if (!plate) return res.status(400).json({ error: 'Falta patente' });

  try {
    var tokenResp = await fetch('https://auth.specparts.ai/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SPECPARTS_CLIENT_ID,
        client_secret: process.env.SPECPARTS_CLIENT_SECRET
      })
    });
    if (!tokenResp.ok) return res.status(401).json({ error: 'Auth failed' });

    var tokenData = await tokenResp.json();
    var data = await specpartsGet('/vehicle/identification?plate=' + encodeURIComponent(plate), tokenData.access_token);
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
