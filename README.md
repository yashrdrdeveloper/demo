# Maison Aara — Boutique Configurator Prototype

A premium React + Vite boutique prototype for made-to-measure fashion.

## What is included

- Editorial boutique landing page and product collection
- Category filters and premium product cards
- Product-detail experience with colour and size selection
- Interactive React Three Fiber 3D garment preview
- Rotate and zoom controls
- Silhouette, neckline, neck-depth, sleeve, fabric, colour, length, and embellishment customisation
- Fabric-specific 3D material response
- Made-to-measure drawer with measurement inputs
- Live price calculation
- Save-to-atelier and cart interactions
- Responsive desktop and mobile configurator layouts

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## 3D approach

The prototype intentionally generates the garment using procedural Three.js primitives so it works without external GLB files. For a production boutique, the same React configuration state can drive modular CLO3D / Marvelous Designer / Blender assets and PBR fabric textures for photorealistic garments.
