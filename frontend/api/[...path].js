export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  const targetUrl = `https://plagiarisme-platform-production.up.railway.app/api/${targetPath}`;

  try {
    const headers = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];

    let body = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const textData = await response.text();

    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(textData || '{}');
  } catch (error) {
    return res.status(500).json({ error: `Proxy Error: ${error.message}` });
  }
}
