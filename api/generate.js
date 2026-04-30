module.exports = async function handler(req, res) {
  // Izinkan akses dari browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { iconName, keyword, style } = req.body;

  if (!iconName || !keyword || !style) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const STYLE_PROMPT = {
    color: `COLOR STYLE (like Flaticon color pack):
- Bold black outlines on ALL shapes: stroke="#2d2d2d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
- Fill: warm multi-shade colors. Light face #F5C478, mid face #D4973A, dark/shadow #B8782A
- 3D depth: lighter fill on front, darker on top/side
- Accent badge (if any): fill="#7EC8F0" circle, white stroke checkmark inside
- Max 12 simple shapes`,

    flat: `FLAT STYLE (like Flaticon flat pack):
- NO outlines (no stroke on main shapes)
- Solid flat fills only, 3 tones: light #F5C478, mid #D4973A, shadow #B8782A
- Darker polygon for shadow/side to show depth
- Accent badge (if any): soft blue #7EC8F0, no outline
- Max 12 shapes, clean and smooth`,

    outline: `OUTLINE STYLE (like Flaticon line icons):
- ONLY strokes, fill="none" on EVERY single shape
- stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
- Fine details: stroke-width="2"
- Accent badge (if any): stroke-only circle + stroke checkmark, fill="none"
- Max 10 clean paths`,

    ui: `UI ICON (like Heroicons / Tabler Icons):
- Minimal, functional, clean
- Filled silhouette in #374151 OR stroke-only stroke="#374151" stroke-width="2.5" stroke-linecap="round"
- Max 6 shapes, simple geometry only`
  };

  const prompt =
    `Create a single professional SVG icon.\n` +
    `Subject: "${iconName}" (context: ${keyword})\n\n` +
    (STYLE_PROMPT[style] || STYLE_PROMPT.flat) + '\n\n' +
    `STRICT LAYOUT RULES:\n` +
    `- viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"\n` +
    `- Icon centered, use coords 10-90 only (10px margin all sides)\n` +
    `- NO text elements, NO external references, NO image tags\n` +
    `- All coordinates must stay within 0-100\n` +
    `- Icon must clearly look like "${iconName}"\n\n` +
    `Return ONLY the raw SVG. Start with <svg and end with </svg>. No explanation, no markdown.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key belum dikonfigurasi di server' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Rate limit, coba lagi sebentar' });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(500).json({ error: err.error?.message || `HTTP ${response.status}` });
    }

    const data = await response.json();
    const raw  = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    const start = raw.indexOf('<svg');
    const end   = raw.lastIndexOf('</svg>') + 6;

    if (start === -1) {
      return res.status(500).json({ error: 'SVG tidak ditemukan dalam response' });
    }

    const svg = raw.slice(start, end);
    return res.status(200).json({ svg });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan' });
  }
}
