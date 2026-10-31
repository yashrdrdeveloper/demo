# Maison Aara — Online Magic Mirror Prototype

A React + Vite fashion boutique prototype that brings an in-store virtual fitting mirror to the web.

## What is included

- Premium boutique storefront
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

There is no generated mannequin/avatar in the try-on flow.

## Production upgrade path

This repository implements the online retail experience and body-tracking layer. For a production catalog, connect each SKU to prepared transparent garment assets or a dedicated photorealistic virtual-try-on model/service. The existing camera, product switching, pose tracking, size selection and fitting-room UX can stay the same.
