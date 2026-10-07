export default async function handler(req, res) {
  // Set CORS headers on Vercel response
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
    const fetchOptions = {
      method: req.method,
      headers: {}
    };

    if (req.headers['content-type']) fetchOptions.headers['content-type'] = req.headers['content-type'];
    if (req.headers['authorization']) fetchOptions.headers['authorization'] = req.headers['authorization'];

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return res.status(response.status).send(data);
  } catch (error) {
    return res.status(500).json({ error: `Proxy Error: ${error.message}` });
  }
}
