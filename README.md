# Maison Aara — Online Magic Mirror Prototype

A React + Vite fashion boutique prototype that brings an in-store virtual fitting mirror to the web.

## What is included

- Premium boutique storefront with real garment photography
- Saree, one-piece dress, gown and kurti product categories
- Virtual Try-On entry point from every product
- Live browser camera support
- Full-body photo upload fallback
- MediaPipe Pose Landmarker body tracking
- Garment placement using the customer's real shoulders, waist, hips, knees and ankles
- Garment-specific renderers instead of one generic dress overlay
  - Saree: blouse + wrapped lower saree + front pleats + shoulder pallu
  - One-piece: continuous fitted bodice and skirt
  - Gown: floor-length flared dress
  - Kurti: straight below-knee silhouette
- Photographic fabric textures clipped into the live garment geometry
- Real-time garment movement as the customer changes pose
- Foreground arm occlusion so the customer's arms stay visually in front of the garment
- Instant product switching while the camera stays open
- Full-body alignment guide
- Responsive desktop and mobile fitting-room layouts
- Cart and size-selection interactions

## Run locally

```bash
npm install
npm run dev
```

Camera access works on `localhost` during development. A deployed version must be served over HTTPS for browser camera permissions.

## Production build

```bash
npm run build
npm run preview
```

## Architecture

The prototype uses `@mediapipe/tasks-vision` Pose Landmarker in the browser. It detects body landmarks from live camera frames or an uploaded photo, then selects a garment-specific renderer for the active product.

The renderer combines tracked garment geometry with photographic textile imagery, so the cloth surface uses real image pixels instead of a flat synthetic fill. There is no generated mannequin/avatar in the try-on flow.

## Production upgrade path

For your real boutique catalog, each SKU should provide:

- front garment photo or transparent PNG/WebP
- close-up fabric/embroidery texture
- garment type (`saree`, `onepiece`, `gown`, `kurti`)
- optional anchor/fit metadata

The current browser renderer is suitable for an interactive prototype. For true photorealistic cloth deformation, folds, self-occlusion and body-shape transfer, connect the same fitting-room UI to a dedicated virtual try-on model/service and use the actual SKU garment image as its clothing input.

## Demo asset attribution

The repository uses external demo references only to demonstrate realistic garment photography and textile rendering. Replace these URLs with your own product assets for production.

- `Silk saree 2.jpg` — Seratobikiba, Wikimedia Commons, CC BY-SA 4.0
- `Indian traditional lady wearing saree.jpg` — Swapppp57, Wikimedia Commons, CC BY-SA 4.0
- `Red-Dress.jpg` — Vanessa Teves, Wikimedia Commons, CC0
- `Gfp-red-fabric-texture.jpg` — Yinan Chen / Good Free Photos, public domain dedication
- `Red dress, Jewels exhibition, Hermitage Amsterdam.jpg` — Wikimedia Commons, CC0/PD artwork photograph metadata on source page
- `Indian woman wearing a kurti.jpg` — NabeelJV, Wikimedia Commons, CC BY-SA 4.0
