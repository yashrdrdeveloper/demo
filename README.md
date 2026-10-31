# Maison Aara — Pixel-Aware Live Saree Trial Room

React + Vite prototype for an online saree fitting room with **automatic on-device body tracking and visible-person pixel analysis**.

## Customer experience

The customer does not mark body points and does not enter body measurements.

1. choose a saree
2. choose the blouse size normally purchased: XS / S / M / L / XL
3. start the live camera, or upload a photo
4. the browser automatically detects the person and body landmarks
5. segmentation analyzes the actual visible person area in the frame
6. the saree renderer stops at the visible body boundary instead of forcing a fixed upper/full mode
7. front, side and back orientation are detected and stabilized over several frames
8. if the customer leaves frame, tracking searches and automatically locks again when they return

Examples:

- shoulders + torso visible → blouse and upper drape only
- hips visible → saree continues only through the visible hip area
- knees visible → saree extends through the visible legs
- ankles/full body visible → full saree drape
- customer turns around → back-drape treatment
- side turn → narrower side-drape treatment

The transition is continuous. It is not a binary "half body" versus "full body" switch.

## Included

- Saree-only boutique catalog
- Live camera try-on
- Photo upload fallback
- No manual calibration points
- MediaPipe Pose Landmarker running on-device
- Person-pixel segmentation used to estimate the real visible body boundary
- Torso-aware mask sampling so an outstretched hand does not incorrectly extend the saree length
- Automatic front / side / back view handling
- Orientation hysteresis to prevent front/back flicker
- Coverage hysteresis to prevent torso/hips/legs/full labels from chattering
- Smooth visible-bottom interpolation so the saree edge does not jump between frames
- GPU setup with CPU fallback
- CDN/WASM fallback and hard loading timeouts
- Camera-start timeout and visible retry state instead of an endless loader
- Automatic tracking recovery after temporary loss
- Saree-specific rendering:
  - blouse
  - wrapped lower drape
  - center pleats for front/side views
  - front pallu
  - back pallu
  - borders
- Real photographic saree pixels used as the fabric texture
- Optional multi-class skin segmentation for better hand/arm occlusion
- Pose-based arm occlusion fallback if segmentation is slow or unavailable
- Blouse size selector XS / S / M / L / XL
- Live switching between sarees while keeping the fitting room open

## Reliability / anti-stuck behavior

The app deliberately avoids indefinite loading states:

- primary MediaPipe WASM CDN + fallback CDN
- GPU initialization + CPU fallback
- tracker setup has a hard timeout
- image/fabric loading has a hard timeout
- camera permission/start has a hard timeout
- secondary segmentation is throttled so it does not run on every video frame
- segmentation never blocks the main body-tracking fallback path
- if segmentation fails, landmark visibility and pose-based arm occlusion remain active
- if body tracking is lost, the UI returns to searching and automatically re-locks when the person is visible again
- a Retry Tracker button is shown if the engine cannot initialize

## How visible-body fitting works

The pose tracker supplies the main body anchors used for saree placement.

The segmentation mask supplies the visible-person pixels. The renderer samples the mask around the torso center and derives the lowest reliably visible body row. That value controls the saree's vertical render boundary.

This avoids assuming that every camera frame is either "upper body" or "full body". The saree instead follows the current crop continuously.

## Front / side / back handling

Orientation is estimated from shoulder ordering, torso depth and face visibility. The result is stabilized over several consecutive frames before the renderer changes drape direction.

- front → normal chest-crossing pallu and pleats
- side → narrower side drape
- back → back pallu treatment and no front pleat emphasis

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
