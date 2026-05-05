module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword, style } = req.body;
  if (!keyword || !style) return res.status(400).json({ error: 'Data tidak lengkap' });

  const styleGuide = {
    color: 'Use thick black outlines (stroke="#2d2d2d" stroke-width="3") on ALL shapes. Fill with warm colors using 2-3 shades for depth: light #F5C478, mid #D4973A, dark #B8782A. Add accent colors like blue #7EC8F0 for badges.',
    flat: 'NO outlines. Use solid flat fills only with 2-3 tones: light #F5C478, mid #D4973A, shadow #B8782A. No gradients.',
    outline: 'ONLY black strokes (stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"), fill="none" on ALL shapes. No color fills anywhere.',
    ui: 'Simple minimal shapes. Use filled #374151 OR stroke="#374151" stroke-width="2.5". Maximum 5 shapes per icon.'
  };

  const iconNames = {
    baby: ['Baby Bottle','Baby Crib','Diaper','Baby Bath Tub','Stroller','Baby Clothes','Pacifier','Baby Monitor','Baby Toy'],
    food: ['Burger','Pizza','Coffee Cup','Salad Bowl','Sushi','Cake','Fries','Smoothie','Fruit Bowl'],
    camera: ['DSLR Camera','Camera Lens','Tripod','Flash','Film Roll','Camera Bag','Viewfinder','Memory Card','Photo Frame'],
    music: ['Music Note','Headphones','Microphone','Speaker','Guitar','Piano','Vinyl Record','Equalizer','Music Player'],
    finance: ['Coin Stack','Piggy Bank','Credit Card','Bar Chart','Wallet','Investment','Tax Document','Insurance','Budget'],
    nature: ['Tree','Flower','Mountain','Sun','Rain Cloud','Leaf','River','Bird','Butterfly'],
    technology: ['Laptop','Smartphone','Tablet','Smartwatch','Router','Cloud Storage','CPU','Battery','Keyboard'],
  };

  function getIconNames(kw) {
    const k = kw.toLowerCase();
    for (const key in iconNames) {
      if (k.includes(key)) return iconNames[key];
    }
    const suffixes = ['Main Icon','Type A','Type B','Type C','Variant 1','Variant 2','Style 1','Style 2','Style 3'];
    return suffixes.map((s, i) => i === 0 ? kw : `${kw} ${s}`);
  }

  const names = getIconNames(keyword);

  const prompt = `You are a professional SVG icon designer. Create exactly 9 SVG icons for the keyword: "${keyword}"

STYLE: ${styleGuide[style] || styleGuide.flat}

The 9 icons must represent these specific concepts (one icon per concept):
1. ${names[0]}
2. ${names[1]}
3. ${names[2]}
4. ${names[3]}
5. ${names[4]}
6. ${names[5]}
7. ${names[6]}
8. ${names[7]}
9. ${names[8]}

CRITICAL RULES for each SVG:
- viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
- Draw shapes that ACTUALLY LOOK LIKE the concept (baby bottle = bottle shape, not diamond!)
- Center icon within 15-85 coordinate range
- Use realistic proportions and recognizable silhouettes
- Maximum 15 shapes per icon, minimum 3 shapes
- NO text elements, NO external refs

Return ONLY valid JSON (no markdown):
{"icons":[{"name":"${names[0]}","svg":"<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"},{"name":"${names[1]}","svg":"..."},{"name":"${names[2]}","svg":"..."},{"name":"${names[3]}","svg":"..."},{"name":"${names[4]}","svg":"..."},{"name":"${names[5]}","svg":"..."},{"name":"${names[6]}","svg":"..."},{"name":"${names[7]}","svg":"..."},{"name":"${names[8]}","svg":"..."}]}`;

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
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 5000
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
