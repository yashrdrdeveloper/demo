# Maison Aara — Non-Generative Live Trial Room

React + Vite prototype for a deterministic online garment fitting room with a **live tracking layer**.

## Core idea

This version uses no generative try-on model and no body/pose ML model.

The live mode works like this:

1. open the real customer camera
2. load the exact transparent SKU garment PNG/WebP
3. manually calibrate eight body/garment anchor points once
4. track those exact points frame-to-frame with classic Lucas–Kanade optical flow in OpenCV.js
5. continuously re-warp the real garment pixels to the moving anchors

The app does **not** invent a T-shirt, neckline, print, embroidery or silhouette. Those pixels come from the actual garment asset.

## Included

- Premium boutique storefront
- Exact T-shirt demo using a transparent real garment PNG
- Boutique examples for saree, one-piece, gown and kurti
- **Live camera trial room**
- **Classic OpenCV optical-flow tracking**
- Full-body photo fitting fallback
- Exact garment PNG/WebP upload
- Eight-point manual calibration
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

The project intentionally avoids a pose/body ML model. Therefore the customer marks the body fitting anchors once. After that, OpenCV tracks those marked image points using classic computer-vision optical flow.

This is different from generative AI: frames are not sent to an image-generation model and no synthetic person or synthetic garment is created.

## Live tracking behavior

The tracker uses sparse Lucas–Kanade pyramidal optical flow (`calcOpticalFlowPyrLK`) to follow the calibrated image points between consecutive camera frames. The current garment mesh is redrawn from the new anchor positions on every frame.

If the user turns too far, leaves frame, or the tracked visual features are lost, the UI asks them to recalibrate.

## Catalog asset requirements

For the best result, every production SKU should include:

1. normal ecommerce product photo
2. transparent front-facing PNG/WebP of the actual garment
3. product type (`top` or `full`)
4. size-chart garment measurements

A T-shirt asset should contain the exact T-shirt shape, sleeves, neck, logo and print. The renderer deforms those pixels rather than drawing a replacement shirt.

For sarees or layered outfits, production should use separate transparent assets/meshes for blouse, main drape, pallu and optional lower layers so each layer can be calibrated and warped independently.

## Fit accuracy

The live result is a deterministic 2D tracked preview. It is useful for visual appearance, proportion and comparing products, but it is **not physical cloth simulation**. It cannot calculate true fabric tension, stretch, gravity-driven folds or hidden body depth from a normal camera.

For physically accurate fitting without generative AI, the next step is a 3D apparel pipeline: customer measurements/depth capture + a real garment pattern/mesh + cloth simulation authored in CLO/Marvelous Designer/Blender and rendered in WebGL.

## Run

```bash
npm install
npm run dev
```

Camera access works on `localhost`. A deployed site must use HTTPS for browser camera permissions.

## Build

```bash
npm run build
npm run preview
```

## External runtime

Live tracking dynamically loads OpenCV.js from the official OpenCV documentation host. No API key is required.

## Demo asset attribution

The included exact T-shirt demo uses `Wikipedia 25 Tshirt white (front).png` from Wikimedia Commons, licensed CC BY-SA 4.0.
