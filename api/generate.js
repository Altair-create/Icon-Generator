module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword, style } = req.body;
  if (!keyword || !style) return res.status(400).json({ error: 'Data tidak lengkap' });

  const STYLE_PROMPT = {
    color: 'COLOR STYLE: Bold black outlines stroke="#2d2d2d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" on ALL shapes. Fill with warm multi-shade colors: light #F5C478, mid #D4973A, dark #B8782A. Different shade per face for 3D depth. Max 12 shapes per icon.',
    flat: 'FLAT STYLE: NO strokes on main shapes. Solid flat fills, 3 tones: light #F5C478, mid #D4973A, shadow #B8782A. Darker polygon for shadow face. Max 12 shapes per icon.',
    outline: 'OUTLINE STYLE: ONLY strokes, fill="none" on EVERY shape. stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round". Max 10 paths per icon.',
    ui: 'UI ICON: Minimal functional. Filled #374151 OR stroke="#374151" stroke-width="2.5". Max 6 shapes per icon.'
  };

  const prompt = `You are an SVG icon designer. Generate exactly 9 different SVG icons for the keyword: "${keyword}"

${STYLE_PROMPT[style] || STYLE_PROMPT.flat}

RULES FOR EACH ICON:
- viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
- Centered, coords 10-90 only
- NO text elements, NO external refs
- Each icon must be a DIFFERENT concept related to "${keyword}"
- Clean, recognizable shapes

Return ONLY this exact JSON (no markdown, no explanation):
{"icons":[{"name":"icon name","svg":"<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."},{"name":"...","svg":"..."}]}`;

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
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192
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
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan' });
    
  }
};
