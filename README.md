# Maison Aara — Virtual Boutique Prototype

A React + Vite fashion boutique prototype built around a Lenskart-style virtual try-on experience.

## What is included

- Premium boutique landing page and product collection
- Product detail pages with colour and size selection
- **Virtual Try-On** entry point from every product
- Live browser camera support
- Full-body photo upload fallback
- MediaPipe Pose Landmarker body tracking
- Garment placement using the customer's real shoulders, waist, hips, knees and ankles
- Real-time garment movement as the customer changes pose
- Foreground arm occlusion so the customer's arms remain in front of the garment
- Instant switching between products while the camera stays open
- Responsive desktop and mobile fitting-room layouts
- Cart and size-selection interactions
- Camera frames processed locally in the browser

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

## Virtual try-on approach

The prototype uses `@mediapipe/tasks-vision` Pose Landmarker in the browser. It detects body landmarks from live camera frames or an uploaded photo, then fits the selected garment overlay to those landmarks.

There is **no generated mannequin/avatar** in the try-on flow.

For production-quality photorealistic try-on, replace the current prototype garment overlay with prepared transparent garment assets or a dedicated virtual-try-on model/service while keeping the same camera, product-selection and fitting-room UX.
