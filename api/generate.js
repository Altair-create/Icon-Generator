module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword, style } = req.body;
  if (!keyword || !style) return res.status(400).json({ error: 'Data tidak lengkap' });

  const styles = {
    color: 'colorful with black outlines stroke="#2d2d2d" stroke-width="3", warm fills #F5C478/#D4973A/#B8782A',
    flat: 'flat no outlines, solid fills #F5C478/#D4973A/#B8782A',
    outline: 'outline only, fill="none", stroke="#1a1a1a" stroke-width="3"',
    ui: 'minimal UI, filled #374151, simple shapes'
  };

  const prompt = `Create 9 SVG icons for "${keyword}". Style: ${styles[style]||styles.flat}. Each icon: viewBox="0 0 100 100", centered, no text. Different concepts. Return JSON only: {"icons":[{"name":"name","svg":"<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."}]}`;

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key belum dikonfigurasi' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 5000,
      })
    });

    if (response.status === 429) return res.status(429).json({ error: 'Rate limit, coba lagi sebentar' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(500).json({ error: (err.error && err.error.message) || ('HTTP ' + response.status) });
    }

    const data = await response.json();
    const raw = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();

    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}') + 1;
    if (jsonStart === -1) return res.status(500).json({ error: 'Response tidak valid' });

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd));
    return res.status(200).json({ icons: parsed.icons });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan', stack: e.stack, type: e.constructor.name });
  }
};
