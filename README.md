# Maison Aara — Live Exact-Garment Trial Room

React + Vite prototype for a deterministic online garment fitting room with a **live tracking layer**.

## Core idea

The customer provides only the size they normally buy: **XS / S / M / L / XL**.

There is no chest/waist/hip measurement form in the trial room.

The live mode works like this:

1. choose the product and size
2. open the real customer camera
3. load the exact transparent SKU garment PNG/WebP
4. tap four torso points once: left/right shoulder and left/right hip
5. detect many visual features inside the torso region
6. track that feature cloud frame-to-frame with classic Lucas–Kanade optical flow
7. estimate one stable torso transform
8. continuously move/re-scale/re-warp the complete real garment asset with that transform

This is more stable than tracking every garment anchor independently because one bad point cannot pull a sleeve or hem away from the rest of the garment.

## Included

- Premium boutique storefront
- Exact T-shirt demo using a transparent real garment PNG
- Boutique examples for saree, one-piece, gown and kurti
- Live camera trial room
- Four-point live torso calibration
- Multi-feature OpenCV optical-flow tracking
- Full-body photo fitting fallback
- Exact garment PNG/WebP upload
- Multi-band image mesh warping
- Exact logo / print / embroidery / neckline / sleeve pixels preserved from the garment asset
- XS / S / M / L / XL selector
- Selected size passed directly from product page into the live trial room
- Size changes update the garment layer without re-calibrating
- Responsive fitting-room UI

## Why four calibration points?

The project intentionally avoids a pose/body ML model. The customer marks four stable torso references once. OpenCV then finds many natural visual features around that torso region and tracks them together.

The garment follows the **estimated torso motion**, rather than following four or eight independently drifting points.

## Live tracking behavior

The tracker uses sparse Lucas–Kanade pyramidal optical flow (`calcOpticalFlowPyrLK`). It rejects feature points whose motion disagrees strongly with the majority, estimates translation/scale/rotation from the remaining points, smooths that transform, and periodically re-seeds visual features.

The calibration click mapping also accounts for the camera's `object-fit: contain` letterboxing and mirrored preview so the garment anchors line up with where the customer actually tapped.

If the user turns too far, leaves frame, or too many visual features are lost, the UI pauses tracking and asks for recalibration instead of letting the garment drift across the screen.

## Size behavior

The live body calibration stays fixed to the customer.

Changing size changes the garment width around that same torso calibration:

- XS — narrower visual fit
- S — slightly narrower
- M — baseline
- L — slightly wider
- XL — wider

This is a visual size comparison, not a physical cloth-simulation measurement system.

## Catalog asset requirements

Every production SKU should ideally include:

1. normal ecommerce product photo
2. transparent front-facing PNG/WebP of the exact garment
3. product type (`top` or `full`)
4. available sizes

A T-shirt asset should contain the exact T-shirt shape, sleeves, neck, logo and print. The renderer deforms those pixels rather than drawing a replacement shirt.

For sarees or layered outfits, production should use separate transparent assets/meshes for blouse, main drape, pallu and optional lower layers so those layers can be warped independently.

## Fit accuracy

The live result is a deterministic 2D tracked preview. It is useful for appearance, product comparison and approximate visual size differences, but it is **not physical cloth simulation**. It cannot calculate real fabric tension, stretch, gravity-driven folds or hidden body depth from a normal RGB camera.

For physically accurate fitting without generative AI, the next step is a true 3D apparel pipeline using real garment patterns/meshes and cloth simulation.

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
