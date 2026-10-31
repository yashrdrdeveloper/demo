export const COLORS = [
  ['Ivory', '#E9E0D0'], ['Rose', '#B86D74'], ['Wine', '#6E2636'], ['Sage', '#76836A'],
  ['Midnight', '#1E2732'], ['Maroon', '#812E39'], ['Champagne', '#C9AA82'],
].map(([name, hex]) => ({ name, hex }));

export const FABRICS = [
  { name: 'Chanderi', detail: 'Light · luminous', price: 900, roughness: .32, metalness: .08 },
  { name: 'Silk', detail: 'Fluid · lustrous', price: 1300, roughness: .22, metalness: .12 },
  { name: 'Cotton', detail: 'Soft · breathable', price: 0, roughness: .78, metalness: 0 },
  { name: 'Velvet', detail: 'Plush · occasion', price: 1800, roughness: .9, metalness: 0 },
];

export const PRODUCTS = [
  { id: 1, name: 'Aaira Anarkali', type: 'Anarkali', price: 4990, color: '#7C2F3E', badge: 'Bestseller', shape: 'anarkali' },
  { id: 2, name: 'Noor Silk Kurta', type: 'Kurta Set', price: 3890, color: '#D5C3A5', badge: 'New', shape: 'straight' },
  { id: 3, name: 'Meher Evening Gown', type: 'Gown', price: 7490, color: '#34453B', badge: 'Atelier', shape: 'gown' },
  { id: 4, name: 'Ziya Festive Lehenga', type: 'Lehenga', price: 8990, color: '#AB7865', badge: 'Limited', shape: 'lehenga' },
  { id: 5, name: 'Ira Chanderi Suit', type: 'Suit Set', price: 5590, color: '#B8A981', badge: 'Made to measure', shape: 'straight' },
  { id: 6, name: 'Saira Draped Dress', type: 'Dress', price: 6290, color: '#3F4358', badge: 'Studio edit', shape: 'gown' },
];

export const NECKS = ['Round', 'V Neck', 'Square', 'Sweetheart', 'Boat'];
export const SLEEVES = ['Sleeveless', 'Cap', 'Elbow', '3/4', 'Full'];
export const SILHOUETTES = ['A-Line', 'Straight', 'Flared', 'Fitted'];
export const LENGTHS = ['Knee', 'Calf', 'Ankle', 'Floor'];
export const DETAILS = [
  { name: 'Clean', price: 0 }, { name: 'Gold border', price: 550 },
  { name: 'Thread work', price: 900 }, { name: 'Hand embroidery', price: 1500 },
];

export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);
