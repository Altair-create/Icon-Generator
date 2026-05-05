module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword, style } = req.body;
  if (!keyword || !style) return res.status(400).json({ error: 'Data tidak lengkap' });

  const styleGuide = {
    color: 'stroke="#2d2d2d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" on ALL shapes. Fill: light #F5C478 for front face, mid #D4973A for top, dark #B8782A for shadow/side.',
    flat: 'NO strokes. Solid flat fills: light #F5C478, mid #D4973A, shadow #B8782A. No gradients, no outlines.',
    outline: 'fill="none" on ALL shapes. stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" only.',
    ui: 'fill="#374151" solid silhouette OR stroke="#374151" stroke-width="2.5". Max 5 shapes.'
  };

  const iconDescriptions = {
    baby: [
      { name: 'Baby Bottle', shape: 'A feeding bottle: wide cylindrical bottom (rect rx), narrowing neck in middle, small round nipple on top. Add 2-3 horizontal measurement lines on the body.' },
      { name: 'Baby Crib', shape: 'A baby crib seen from front: rectangular frame, 4-5 vertical bars/slats inside, two rounded legs at bottom corners, a horizontal rail across top.' },
      { name: 'Diaper', shape: 'An open diaper flat view: wide rectangular shape with rounded corners, narrower in middle (hourglass), two sticky tabs on top sides.' },
      { name: 'Baby Bath Tub', shape: 'A baby bath tub: wide oval/ellipse shape, flat bottom with 2 small legs, curved rim at top, water line inside.' },
      { name: 'Baby Stroller', shape: 'A baby stroller side view: round seat/basket on top, handle bar extending up-right, two large circles as wheels at bottom, frame connecting them.' },
      { name: 'Baby Onesie', shape: 'A baby onesie/bodysuit: wide body rectangle, two short sleeve bumps on sides at top, small snap buttons at bottom crotch area, round neckline opening.' },
      { name: 'Pacifier', shape: 'A pacifier: small oval shield/guard in center, round nipple bulb on left side sticking out, small ring handle on right side.' },
      { name: 'Baby Monitor', shape: 'A baby monitor: small rectangular screen body, round camera lens on front, short antenna on top, small stand/base at bottom.' },
      { name: 'Baby Rattle', shape: 'A baby rattle: round ball/circle on top, thin straight handle going down, small dots inside the ball to show rattling beads.' },
    ],
    food: [
      { name: 'Burger', shape: 'A burger side view: top bun (half circle), lettuce layer (wavy line), patty (thick rectangle), bottom bun (half circle). Stack them vertically.' },
      { name: 'Pizza Slice', shape: 'A pizza slice: triangle shape, curved crust at wide end, 3 small circles as toppings, diagonal lines for texture.' },
      { name: 'Coffee Cup', shape: 'A coffee cup: trapezoid/rectangular cup body, small handle loop on right side, steam wavy lines rising from top, saucer ellipse at bottom.' },
      { name: 'Salad Bowl', shape: 'A salad bowl: wide bowl shape (ellipse top, curved sides), leaf shapes inside, fork on right side.' },
      { name: 'Sushi Roll', shape: 'Two sushi pieces side by side: rectangular rice blocks, dark nori strip around middle, round topping on top of each.' },
      { name: 'Birthday Cake', shape: 'A cake: round/rectangular cake body, one candle on top with flame, horizontal frosting lines on sides.' },
      { name: 'French Fries', shape: 'French fries: rectangular box/container at bottom with brand lines, 5-6 rectangular sticks extending upward from the box.' },
      { name: 'Smoothie Cup', shape: 'A smoothie cup: wide at top narrowing at bottom (trapezoid inverted), straw sticking out at angle, wavy liquid line inside.' },
      { name: 'Fruit Bowl', shape: 'A fruit bowl: wide curved bowl shape, apple circle + banana curve + grape circles visible inside/above the bowl.' },
    ],
    camera: [
      { name: 'DSLR Camera', shape: 'A DSLR camera body: rectangular main body, raised pentaprism hump on top center, large circle lens on front center, shutter button on top right, viewfinder bump on top.' },
      { name: 'Camera Lens', shape: 'A camera lens front view: large outer circle, inner circle, smallest circle in center (glass), zoom ring lines around the barrel.' },
      { name: 'Tripod', shape: 'A camera tripod: small platform on top, three legs spreading downward from center point, cross brace connecting legs in middle.' },
      { name: 'Camera Flash', shape: 'A camera flash unit: rectangular box body, wider reflector dish on front face, mounting foot at bottom.' },
      { name: 'Film Roll', shape: 'A 35mm film roll: cylinder shape, two spool knobs on top, sprocket holes along the sides, film strip hanging out.' },
      { name: 'Camera Bag', shape: 'A camera bag: rectangular bag body with rounded bottom corners, top handle, front pocket with zipper line, shoulder strap.' },
      { name: 'Viewfinder', shape: 'A camera viewfinder: rectangle with rounded corners, crosshair lines (horizontal + vertical) inside, focus corner brackets in 4 corners.' },
      { name: 'Memory Card', shape: 'An SD memory card: rectangle with one notched corner at top-left, gold contact strips at bottom, label area in middle.' },
      { name: 'Photo Frame', shape: 'A photo frame: outer rectangle, inner rectangle (the photo area), mountain + sun landscape simple scene inside.' },
    ],
  };

  function getIcons(kw) {
    const k = kw.toLowerCase();
    for (const key in iconDescriptions) {
      if (k.includes(key)) return iconDescriptions[key];
    }
    // Generic fallback
    const generic = ['Main','Secondary','Alt A','Alt B','Variant 1','Variant 2','Type A','Type B','Type C'];
    return generic.map((s, i) => ({
      name: i === 0 ? kw : `${kw} ${s}`,
      shape: `An icon representing "${kw}" concept ${i + 1}: use clear recognizable geometric shapes to represent this concept.`
    }));
  }

  const icons = getIcons(keyword);

  // Generate one icon at a time to ensure quality
  const generateOne = async (icon) => {
    const prompt = `You are a professional SVG icon designer. Draw ONE icon.

Icon name: "${icon.name}"
What to draw: ${icon.shape}
Style: ${styleGuide[style] || styleGuide.outline}

RULES:
- viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
- Center the drawing: use coordinates between 15 and 85
- Draw the EXACT shape described above, not something abstract
- Use rect, circle, ellipse, path, line, polyline elements
- NO text, NO image, NO external refs

Return ONLY the raw SVG element, starting with <svg and ending with </svg>. Nothing else.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err.error && err.error.message) || 'API error');
    }

    const data = await response.json();
    const raw = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
    const start = raw.indexOf('<svg');
    const end = raw.lastIndexOf('</svg>') + 6;
    if (start === -1) throw new Error('SVG not found');
    return raw.slice(start, end);
  };

  try {
    const results = [];
    for (let i = 0; i < icons.length; i++) {
      try {
        const svg = await generateOne(icons[i]);
        results.push({ name: icons[i].name, svg });
        // Small delay between requests
        if (i < icons.length - 1) await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        results.push({ name: icons[i].name, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="25" width="50" height="50" fill="none" stroke="#ccc" stroke-width="2"/><line x1="25" y1="25" x2="75" y2="75" stroke="#ccc" stroke-width="2"/><line x1="75" y1="25" x2="25" y2="75" stroke="#ccc" stroke-width="2"/></svg>' });
      }
    }

    return res.status(200).json({ icons: results });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan' });
  }
};
