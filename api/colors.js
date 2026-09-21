const COLOR_DEFINITIONS = {
  red: { name: 'Red', hex: '#d81605', criteria: 'Red, crimson, ruby, scarlet, blood red' },
  orange: { name: 'Orange', hex: '#f77501', criteria: 'Orange, tangerine, amber, coral' },
  yellow: { name: 'Yellow', hex: '#faca00', criteria: 'Yellow, gold, lemon, sunshine, blonde' },
  green: { name: 'Green', hex: '#049427', criteria: 'Green, lime, emerald, olive, foliage, grass' },
  blue: { name: 'Blue', hex: '#0075f7', criteria: 'Blue, sky blue, azure, cerulean' },
  purple: { name: 'Purple', hex: '#7b18ae', criteria: 'Purple, violet, plum' },
  pink: { name: 'Pink', hex: '#fd81c8', criteria: 'Pink, hot pink, magenta, bubblegum' },
  brown: { name: 'Brown', hex: '#974f00', criteria: 'Brown, chocolate, wood, earth' },
  grey: { name: 'Grey', hex: '#949494', criteria: 'Grey, silver, charcoal, ash' },
  black: { name: 'Black', hex: '#111111', criteria: 'Black, jet black, pitch, dark' },
  white: { name: 'White', hex: '#f5f5f5', criteria: 'White, snow, ivory, milk' },
  teal: { name: 'Teal', hex: '#03be9b', criteria: 'Teal, cyan, turquoise, aqua' },
  beige: { name: 'Beige', hex: '#e4ddcc', criteria: 'Beige, cream, tan, khaki, sand' },
  lavender: { name: 'Lavender', hex: '#fab1fd', criteria: 'Lavender, lilac, pastel purple' },
  navy: { name: 'Navy', hex: '#004456', criteria: 'Navy, dark blue, deep slate, midnight blue' },
  indigo: { name: 'Indigo', hex: '#293dd3', criteria: 'Indigo, royal blue, deep cobalt, ultramarine' },
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({ colors: COLOR_DEFINITIONS });
};
