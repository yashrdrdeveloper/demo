# Maison Aara — Automatic Saree Trial Room

React + Vite prototype for an online saree fitting room with **automatic on-device body tracking**.

## Customer experience

The customer does not mark body points and does not enter body measurements.

1. choose a saree
2. choose the blouse size normally purchased: XS / S / M / L / XL
3. start the live camera, or upload a photo
4. the browser automatically detects shoulders, hips, knees and ankles
5. the renderer fits blouse, wrapped saree, pleats and pallu to the detected body
6. if the person moves out of frame, tracking searches and locks again automatically

A MacBook user can stand farther away to show the whole body. A closer phone/selfie view becomes an upper-body blouse + pallu preview instead of failing completely.

## Included

- Saree-only boutique catalog
- Live camera try-on
- Photo upload fallback
- No manual calibration points
- MediaPipe Pose Landmarker running on-device
- GPU setup with CPU fallback
- CDN/WASM fallback and hard loading timeouts
- Camera-start timeout and visible retry state instead of an endless loader
- Automatic tracking recovery after temporary loss
- Framing guidance: center yourself, move closer/back, face the camera
- Full-body mode when legs/ankles are visible
- Upper-body selfie mode when only torso landmarks are available
- Smoothing to reduce landmark jitter
- Saree-specific rendering:
  - blouse
  - lower wrapped drape
  - center pleats
  - shoulder pallu
  - borders
- Real photographic saree pixels used as the fabric texture
- Optional multi-class skin segmentation for better hand/arm occlusion
- Pose-based arm occlusion fallback if segmentation is slow or unavailable
- Blouse size selector XS / S / M / L / XL
- Live switching between sarees while keeping the fitting room open

## Why automatic tracking now?

A consumer fitting room should not ask shoppers to identify technical body landmarks. The current version uses MediaPipe Pose Landmarker to reacquire the body on every frame, so there is no calibration step to lose or repeat.

The fitting room does not use a generative image model. It uses computer vision for body landmarks/segmentation and deterministic canvas rendering for the saree.

## Reliability / anti-stuck behavior

The app deliberately avoids indefinite loading states:

- primary MediaPipe WASM CDN + fallback CDN
- GPU initialization + CPU fallback
- tracker setup has a hard timeout
- image/fabric loading has a hard timeout
- camera permission/start has a hard timeout
- secondary skin segmentation never blocks the main fitting room
- if segmentation fails, pose-based arm occlusion remains active
- if body tracking is lost, the UI returns to searching and automatically re-locks when the person is visible again
- a Retry Tracker button is shown if the engine cannot initialize

## Framing modes

### Full saree
Best for a laptop/MacBook camera when the customer stands far enough back to show shoulders, hips, knees and ankles.

### Selfie / upper-body
If only the torso is visible, the experience continues with blouse and pallu placement rather than showing an error. The UI labels this as an upper-body preview.

## Fit accuracy

This is a live visual try-on, not physical cloth simulation. A normal RGB camera cannot determine true fabric tension, hidden body depth, real folds or tailoring fit with the accuracy of a physical trial room.

For physically accurate non-generative fit, the later production path is 3D body/depth capture + actual garment patterns/meshes + cloth simulation. The React shopping/trial-room UX can remain the same.

## Run

```bash
npm install
npm run dev
```

Camera access works on `localhost`. Production deployments must use HTTPS for browser camera permissions.

## Build

```bash
npm run build
npm run preview
```

## Demo assets

The prototype catalog uses openly licensed saree photographs from Wikimedia Commons as visual/fabric references. Replace these URLs with your boutique's actual product photography and fabric/detail crops for production.
