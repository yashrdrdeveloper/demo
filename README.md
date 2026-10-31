# Maison Aara — Non-AI Online Trial Room

React + Vite prototype for a deterministic online garment fitting room.

## Core idea

This version intentionally uses **no AI**:

- no generative try-on model
- no pose/body ML model
- no generated avatar
- no synthetic garment rendering

Instead, the customer uploads a real full-body photo and the catalog provides the **exact front-facing transparent garment asset**. The customer calibrates body points once, then the app warps those real garment pixels to shoulders, waist, hips and hem.

## Included

- Premium boutique storefront
- Exact T-shirt demo using a transparent real garment PNG
- Boutique examples for saree, one-piece, gown and kurti
- Customer full-body photo upload
- Exact garment PNG/WebP upload
- Eight-point manual body calibration
  - left/right shoulder
  - left/right waist
  - left/right hip
  - left/right hem
- Multi-band image mesh warping
- Exact logo / print / embroidery pixels preserved from the garment asset
- Customer measurement inputs
- Deterministic size recommendation from garment size-chart measurements
- Responsive fitting-room UI

## Why manual calibration?

Automatically understanding body shape from a normal photo requires computer-vision/ML techniques. Since this project is explicitly non-AI, calibration is manual and deterministic.

## Catalog asset requirements

For the best result, every production SKU should include:

1. normal ecommerce product photo
2. transparent front-facing PNG/WebP of the actual garment
3. product type (`top` or `full`)
4. size-chart garment measurements

A T-shirt asset should contain the exact T-shirt shape, sleeves, neck, logo and print. The renderer deforms those pixels rather than drawing a replacement shirt.

## Fit accuracy

The visual result is a deterministic 2D fit preview. It is useful for appearance and proportion, but it is **not cloth simulation** and cannot predict real fabric tension, folds or stretch from a single photo.

For physically accurate fit without AI, the next step is a true 3D apparel pipeline: calibrated body measurements + a 3D garment pattern/mesh + cloth simulation (for example assets authored in CLO/Marvelous Designer/Blender and rendered with WebGL).

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Demo asset attribution

The included exact T-shirt demo uses `Wikipedia 25 Tshirt white (front).png` from Wikimedia Commons, licensed CC BY-SA 4.0.
