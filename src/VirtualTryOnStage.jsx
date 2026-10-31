import { Camera, Check, ImagePlus, LoaderCircle, RefreshCcw, Shirt, Upload, Video, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PHOTO_CALIBRATION_STEPS,
  detectVisibleBounds,
  getLiveCalibrationSteps,
  renderGarmentOverlay,
  renderTryOn,
} from './TryOnRenderer';

const OPENCV_URL = 'https://docs.opencv.org/4.x/opencv.js';
let openCvPromise;

function loadImage(src, crossOrigin = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function loadOpenCv() {
  if (window.cv?.Mat) return Promise.resolve(window.cv);
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      try {
        let cv = window.cv;
        if (cv && typeof cv.then === 'function') cv = await cv;
        if (cv?.Mat) return resolve(cv);
        if (cv) {
          cv.onRuntimeInitialized = () => resolve(cv);
          return;
        }
        reject(new Error('OpenCV runtime unavailable'));
      } catch (error) {
        reject(error);
      }
    };

    const existing = document.querySelector('script[data-opencv-js]');
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.dataset.opencvJs = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Could not load OpenCV.js'));
    document.head.appendChild(script);
  });

  return openCvPromise;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function estimateSimilarity(previous, current) {
  if (previous.length < 3 || current.length !== previous.length) return null;
  const prevCenter = previous.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  const nextCenter = current.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  prevCenter.x /= previous.length;
  prevCenter.y /= previous.length;
  nextCenter.x /= current.length;
  nextCenter.y /= current.length;

  let dot = 0;
  let cross = 0;
  let denom = 0;
  previous.forEach((p, index) => {
    const q = current[index];
    const px = p.x - prevCenter.x;
    const py = p.y - prevCenter.y;
    const qx = q.x - nextCenter.x;
    const qy = q.y - nextCenter.y;
    dot += px * qx + py * qy;
    cross += px * qy - py * qx;
    denom += px * px + py * py;
  });
  if (denom < 1) return null;

  let a = dot / denom;
  let b = cross / denom;
  const scale = Math.hypot(a, b);
  const angle = Math.atan2(b, a);

  // Optical flow can occasionally produce a wild transform. Prefer a stable mirror over a jump.
  if (!Number.isFinite(scale) || scale < 0.94 || scale > 1.06 || Math.abs(angle) > 0.14) {
    a = 1;
    b = 0;
  }

  return {
    a,
    b,
    tx: nextCenter.x - a * prevCenter.x + b * prevCenter.y,
    ty: nextCenter.y - b * prevCenter.x - a * prevCenter.y,
  };
}

function transformAnchor(anchor, transform, width, height) {
  const x = anchor.x * width;
  const y = anchor.y * height;
  return {
    x: clamp((transform.a * x - transform.b * y + transform.tx) / width, 0.01, 0.99),
    y: clamp((transform.b * x + transform.a * y + transform.ty) / height, 0.01, 0.99),
  };
}

function torsoRect(anchors, width, height) {
  const keys = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
  if (keys.some((key) => !anchors[key])) return null;
  const xs = keys.map((key) => anchors[key].x * width);
  const ys = keys.map((key) => anchors[key].y * height);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bodyW = Math.max(40, maxX - minX);
  const bodyH = Math.max(60, maxY - minY);
  const x = clamp(Math.floor(minX - bodyW * 0.28), 0, width - 2);
  const y = clamp(Math.floor(minY - bodyH * 0.18), 0, height - 2);
  const right = clamp(Math.ceil(maxX + bodyW * 0.28), x + 2, width);
  const bottom = clamp(Math.ceil(maxY + bodyH * 0.28), y + 2, height);
  return { x, y, width: right - x, height: bottom - y };
}

function fallbackPoints(anchors, width, height) {
  const shoulderL = anchors.leftShoulder;
  const shoulderR = anchors.rightShoulder;
  const hipL = anchors.leftHip;
  const hipR = anchors.rightHip;
  const points = [shoulderL, shoulderR, hipL, hipR];
  if (shoulderL && shoulderR && hipL && hipR) {
    points.push(
      { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 },
      { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 },
      { x: shoulderL.x * 0.42 + hipL.x * 0.58, y: shoulderL.y * 0.42 + hipL.y * 0.58 },
      { x: shoulderR.x * 0.42 + hipR.x * 0.58, y: shoulderR.y * 0.42 + hipR.y * 0.58 },
    );
  }
  return points.filter(Boolean).flatMap((p) => [p.x * width, p.y * height]);
}

function seedFeatures(cv, gray, anchors, width, height) {
  const rect = torsoRect(anchors, width, height);
  if (!rect || rect.width < 20 || rect.height < 20) {
    return cv.matFromArray(4, 1, cv.CV_32FC2, fallbackPoints(anchors, width, height).slice(0, 8));
  }

  const roi = gray.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
  const corners = new cv.Mat();
  const mask = new cv.Mat();
  let points = [];
  try {
    cv.goodFeaturesToTrack(roi, corners, 90, 0.012, 7, mask, 7, false, 0.04);
    for (let i = 0; i < corners.rows; i += 1) {
      points.push(corners.data32F[i * 2] + rect.x, corners.data32F[i * 2 + 1] + rect.y);
    }
  } catch (error) {
    console.warn('Feature detection fallback:', error);
  } finally {
    roi.delete();
    corners.delete();
    mask.delete();
  }

  if (points.length < 12) points = fallbackPoints(anchors, width, height);
  const count = Math.max(1, Math.floor(points.length / 2));
  return cv.matFromArray(count, 1, cv.CV_32FC2, points);
}

function mediaPointFromClick(event, canvas, video, mode) {
  const rect = canvas.getBoundingClientRect();
  if (mode !== 'live' || !video?.videoWidth || !video?.videoHeight) {
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  const scale = Math.min(rect.width / video.videoWidth, rect.height / video.videoHeight);
  const displayWidth = video.videoWidth * scale;
  const displayHeight = video.videoHeight * scale;
  const offsetX = (rect.width - displayWidth) / 2;
  const offsetY = (rect.height - displayHeight) / 2;
  const visualX = clamp((event.clientX - rect.left - offsetX) / displayWidth, 0, 1);
  const visualY = clamp((event.clientY - rect.top - offsetY) / displayHeight, 0, 1);

  // The mirror is visually flipped with CSS; OpenCV receives the original camera frame.
  return { x: 1 - visualX, y: visualY };
}

export default function VirtualTryOnStage({ product, size = 'M' }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const personRef = useRef(null);
  const garmentRef = useRef(null);
  const personObjectUrlRef = useRef('');
  const garmentObjectUrlRef = useRef('');
  const streamRef = useRef(null);
  const trackerRef = useRef(null);
  const anchorsRef = useRef({});
  const modeRef = useRef('idle');
  const garmentBoundsRef = useRef(null);
  const garmentTypeRef = useRef(product.garmentType);
  const sizeRef = useRef(size);

  const [mode, setMode] = useState('idle');
  const [personReady, setPersonReady] = useState(false);
  const [garmentReady, setGarmentReady] = useState(false);
  const [anchors, setAnchors] = useState({});
  const [step, setStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [message, setMessage] = useState('Choose live mirror or upload a photo.');
  const [customGarment, setCustomGarment] = useState(false);

  const liveSteps = getLiveCalibrationSteps(product.garmentType);
  const photoSteps = PHOTO_CALIBRATION_STEPS;
  const activeSteps = mode === 'live' ? liveSteps : photoSteps;

  const setModeSafe = useCallback((next) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const cleanupTracker = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    if (tracker.raf) cancelAnimationFrame(tracker.raf);
    tracker.prevGray?.delete?.();
    tracker.prevPts?.delete?.();
    tracker.cap?.delete?.();
    trackerRef.current = null;
    setTracking(false);
  }, []);

  const stopCamera = useCallback(() => {
    cleanupTracker();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [cleanupTracker]);

  const renderCurrentOverlay = useCallback((nextAnchors = anchorsRef.current, showCalibration = calibrating, activeStep = step) => {
    const video = videoRef.current;
    if (modeRef.current !== 'live' || !video?.videoWidth) return;
    renderGarmentOverlay({
      canvas: canvasRef.current,
      garment: garmentRef.current,
      bounds: garmentBoundsRef.current,
      anchors: nextAnchors,
      garmentType: garmentTypeRef.current,
      size: sizeRef.current,
      width: video.videoWidth,
      height: video.videoHeight,
      showCalibration,
      activeStep,
      calibrationSteps: getLiveCalibrationSteps(garmentTypeRef.current),
    });
  }, [calibrating, step]);

  const redrawPhoto = useCallback(() => {
    if (modeRef.current !== 'photo') return;
    renderTryOn({
      canvas: canvasRef.current,
      person: personRef.current,
      garment: garmentRef.current,
      bounds: garmentBoundsRef.current,
      anchors: anchorsRef.current,
      garmentType: garmentTypeRef.current,
      size: sizeRef.current,
      showCalibration: calibrating,
      activeStep: step,
    });
  }, [calibrating, step]);

  const redraw = useCallback(() => {
    if (modeRef.current === 'live') renderCurrentOverlay();
    if (modeRef.current === 'photo') redrawPhoto();
  }, [redrawPhoto, renderCurrentOverlay]);

  useEffect(() => {
    anchorsRef.current = anchors;
    redraw();
  }, [anchors, redraw]);

  useEffect(() => {
    sizeRef.current = size;
    redraw();
  }, [size, redraw]);

  useEffect(() => {
    garmentTypeRef.current = product.garmentType;
    redraw();
  }, [product.garmentType, redraw]);

  useEffect(() => {
    let active = true;
    if (customGarment) return undefined;

    if (!product.tryOnAsset) {
      garmentRef.current = null;
      garmentBoundsRef.current = null;
      setGarmentReady(false);
      setMessage('Upload the exact transparent front garment PNG/WebP for this product.');
      redraw();
      return undefined;
    }

    (async () => {
      try {
        const image = await loadImage(product.tryOnAsset, true);
        if (!active) return;
        const bounds = detectVisibleBounds(image);
        garmentRef.current = image;
        garmentBoundsRef.current = bounds;
        setGarmentReady(true);
        setMessage(modeRef.current === 'live' ? 'Garment ready. Calibrate the torso once.' : 'Exact garment ready. Choose live mirror or photo fitting.');
        redraw();
      } catch (error) {
        console.error(error);
        if (active) setMessage('Could not load the garment asset. Upload a transparent garment image instead.');
      }
    })();

    return () => { active = false; };
  }, [customGarment, product, redraw]);

  useEffect(() => () => {
    stopCamera();
    if (personObjectUrlRef.current) URL.revokeObjectURL(personObjectUrlRef.current);
    if (garmentObjectUrlRef.current) URL.revokeObjectURL(garmentObjectUrlRef.current);
  }, [stopCamera]);

  const trackFrame = useCallback(() => {
    const tracker = trackerRef.current;
    const video = videoRef.current;
    if (!tracker || modeRef.current !== 'live' || !video?.videoWidth) return;

    const { cv, cap } = tracker;
    const frame = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
    const gray = new cv.Mat();
    const nextPts = new cv.Mat();
    const status = new cv.Mat();
    const err = new cv.Mat();

    try {
      cap.read(frame);
      cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
      const winSize = new cv.Size(29, 29);
      const criteria = new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 24, 0.02);
      cv.calcOpticalFlowPyrLK(tracker.prevGray, gray, tracker.prevPts, nextPts, status, err, winSize, 3, criteria);

      const previousPoints = [];
      const currentPoints = [];
      const dx = [];
      const dy = [];
      for (let i = 0; i < tracker.prevPts.rows; i += 1) {
        if (status.data[i] !== 1) continue;
        const px = tracker.prevPts.data32F[i * 2];
        const py = tracker.prevPts.data32F[i * 2 + 1];
        const nx = nextPts.data32F[i * 2];
        const ny = nextPts.data32F[i * 2 + 1];
        if (![px, py, nx, ny].every(Number.isFinite)) continue;
        previousPoints.push({ x: px, y: py });
        currentPoints.push({ x: nx, y: ny });
        dx.push(nx - px);
        dy.push(ny - py);
      }

      if (previousPoints.length < 6) throw new Error('Too few tracked visual features');

      const medianDx = median(dx);
      const medianDy = median(dy);
      const maxDeviation = Math.max(14, Math.min(video.videoWidth, video.videoHeight) * 0.035);
      const filteredPrev = [];
      const filteredNext = [];
      currentPoints.forEach((point, index) => {
        const flowX = point.x - previousPoints[index].x;
        const flowY = point.y - previousPoints[index].y;
        if (Math.hypot(flowX - medianDx, flowY - medianDy) <= maxDeviation) {
          filteredPrev.push(previousPoints[index]);
          filteredNext.push(point);
        }
      });

      const transform = estimateSimilarity(filteredPrev, filteredNext);
      if (!transform || filteredPrev.length < 5) throw new Error('Unstable torso transform');

      const previousAnchors = anchorsRef.current;
      const nextAnchors = {};
      Object.entries(previousAnchors).forEach(([key, anchor]) => {
        const transformed = transformAnchor(anchor, transform, video.videoWidth, video.videoHeight);
        nextAnchors[key] = {
          x: anchor.x * 0.38 + transformed.x * 0.62,
          y: anchor.y * 0.38 + transformed.y * 0.62,
        };
      });

      anchorsRef.current = nextAnchors;
      renderCurrentOverlay(nextAnchors, false, 0);
      tracker.frameCount += 1;

      tracker.prevGray.delete();
      tracker.prevPts.delete();
      tracker.prevGray = gray.clone();

      if (tracker.frameCount % 18 === 0 || filteredNext.length < 16) {
        tracker.prevPts = seedFeatures(cv, gray, nextAnchors, video.videoWidth, video.videoHeight);
      } else {
        const packed = filteredNext.flatMap((point) => [point.x, point.y]);
        tracker.prevPts = cv.matFromArray(filteredNext.length, 1, cv.CV_32FC2, packed);
      }
    } catch (error) {
      console.error(error);
      cleanupTracker();
      setMessage('Tracking paused. Face the camera and tap Recalibrate.');
      setCalibrating(false);
      renderCurrentOverlay(anchorsRef.current, false, 0);
    } finally {
      frame.delete();
      gray.delete();
      nextPts.delete();
      status.delete();
      err.delete();
    }

    if (trackerRef.current) trackerRef.current.raf = requestAnimationFrame(trackFrame);
  }, [cleanupTracker, renderCurrentOverlay]);

  const startTracking = useCallback(async (nextAnchors) => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    cleanupTracker();
    setTrackerLoading(true);
    setMessage('Locking the garment to your torso…');

    try {
      const cv = await loadOpenCv();
      if (modeRef.current !== 'live') return;
      const cap = new cv.VideoCapture(video);
      const frame = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
      const gray = new cv.Mat();
      cap.read(frame);
      cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
      const pts = seedFeatures(cv, gray, nextAnchors, video.videoWidth, video.videoHeight);
      if (pts.rows < 4) throw new Error('Not enough torso texture to track');

      trackerRef.current = {
        cv,
        cap,
        prevGray: gray.clone(),
        prevPts: pts.clone(),
        frameCount: 0,
        raf: null,
      };

      frame.delete();
      gray.delete();
      pts.delete();
      setTracking(true);
      setMessage('Live fit locked — move naturally.');
      trackerRef.current.raf = requestAnimationFrame(trackFrame);
    } catch (error) {
      console.error(error);
      setMessage('Live tracker could not lock. Use good lighting and recalibrate your torso.');
    } finally {
      setTrackerLoading(false);
    }
  }, [cleanupTracker, trackFrame]);

  const startLive = useCallback(async () => {
    if (!garmentReady) {
      setMessage('Load the exact garment asset first.');
      return;
    }

    stopCamera();
    setMessage('Opening camera…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      setModeSafe('live');
      await video.play();
      anchorsRef.current = {};
      setAnchors({});
      setStep(0);
      setCalibrating(true);
      const steps = getLiveCalibrationSteps(garmentTypeRef.current);
      setMessage(`Tap ${steps[0].label.toLowerCase()} on the mirror`);
      requestAnimationFrame(() => renderCurrentOverlay({}, true, 0));
    } catch (error) {
      console.error(error);
      setMessage('Camera access was blocked. Use photo fitting instead.');
    }
  }, [garmentReady, renderCurrentOverlay, setModeSafe, stopCamera]);

  const handlePerson = async (file) => {
    if (!file) return;
    stopCamera();
    if (personObjectUrlRef.current) URL.revokeObjectURL(personObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    personObjectUrlRef.current = url;
    try {
      const image = await loadImage(url);
      personRef.current = image;
      setModeSafe('photo');
      setPersonReady(true);
      anchorsRef.current = {};
      setAnchors({});
      setStep(0);
      setCalibrating(false);
      setMessage(garmentRef.current ? 'Photo ready. Start body calibration.' : 'Photo ready. Upload the exact garment cutout.');
      requestAnimationFrame(redrawPhoto);
    } catch (error) {
      console.error(error);
      setMessage('Could not open that photo.');
    }
  };

  const handleGarment = async (file) => {
    if (!file) return;
    if (garmentObjectUrlRef.current) URL.revokeObjectURL(garmentObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    garmentObjectUrlRef.current = url;
    try {
      const image = await loadImage(url);
      const bounds = detectVisibleBounds(image);
      garmentRef.current = image;
      garmentBoundsRef.current = bounds;
      setGarmentReady(true);
      setCustomGarment(true);
      cleanupTracker();
      setMessage(modeRef.current === 'live' ? 'Garment loaded. Tap Recalibrate to lock it to your torso.' : 'Exact garment loaded. Choose live mirror or upload your photo.');
      redraw();
    } catch (error) {
      console.error(error);
      setMessage('Could not open that garment image. Use a transparent PNG/WebP if possible.');
    }
  };

  const startCalibration = () => {
    if (!garmentReady || (modeRef.current === 'photo' && !personReady) || modeRef.current === 'idle') {
      setMessage('Start the live mirror or add a photo first.');
      return;
    }
    cleanupTracker();
    anchorsRef.current = {};
    setAnchors({});
    setStep(0);
    setCalibrating(true);
    const steps = modeRef.current === 'live' ? getLiveCalibrationSteps(garmentTypeRef.current) : PHOTO_CALIBRATION_STEPS;
    setMessage(`Tap ${steps[0].label.toLowerCase()}`);
    if (modeRef.current === 'live') renderCurrentOverlay({}, true, 0);
  };

  const handleCanvasClick = (event) => {
    if (!calibrating || !canvasRef.current) return;
    const steps = modeRef.current === 'live' ? getLiveCalibrationSteps(garmentTypeRef.current) : PHOTO_CALIBRATION_STEPS;
    const point = mediaPointFromClick(event, canvasRef.current, videoRef.current, modeRef.current);
    const current = steps[step];
    if (!current) return;

    const nextAnchors = { ...anchorsRef.current, [current.key]: point };
    anchorsRef.current = nextAnchors;
    setAnchors(nextAnchors);

    const nextStep = step + 1;
    if (nextStep >= steps.length) {
      setStep(nextStep);
      setCalibrating(false);
      if (modeRef.current === 'live') {
        renderCurrentOverlay(nextAnchors, false, 0);
        startTracking(nextAnchors);
      } else {
        setMessage('Photo fitting complete. Change size to compare the exact garment fit.');
      }
    } else {
      setStep(nextStep);
      setMessage(`Tap ${steps[nextStep].label.toLowerCase()}`);
      if (modeRef.current === 'live') renderCurrentOverlay(nextAnchors, true, nextStep);
    }
  };

  const reset = () => {
    cleanupTracker();
    anchorsRef.current = {};
    setAnchors({});
    setStep(0);
    setCalibrating(false);
    setMessage(modeRef.current === 'live' ? 'Tap Recalibrate to lock the garment again.' : 'Ready to calibrate again.');
    redraw();
  };

  const closeLive = () => {
    stopCamera();
    setModeSafe('idle');
    anchorsRef.current = {};
    setAnchors({});
    setCalibrating(false);
    setMessage('Choose live mirror or upload a photo.');
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  return <div className="nonai-stage">
    <div className="nonai-canvas-wrap">
      <video ref={videoRef} className={`nonai-live-video ${mode === 'live' ? 'visible' : ''}`} playsInline muted/>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`${calibrating ? 'is-calibrating' : ''} ${mode === 'live' ? 'live-overlay' : ''}`}
      />

      {mode === 'idle' && <div className="nonai-empty">
        <div className="nonai-icon"><Shirt size={34}/></div>
        <span className="eyebrow">LIVE VIRTUAL TRIAL ROOM</span>
        <h2>Your body.<br/><em>The exact garment.</em></h2>
        <p>Choose your size, open the camera and tap four torso points once. The app tracks many visual features around your torso so the complete garment moves as one stable layer.</p>
        <div className="nonai-start-actions">
          <button className="btn dark" disabled={!garmentReady} onClick={startLive}><Camera size={16}/> Start live mirror</button>
          <label className="btn outline"><ImagePlus size={16}/> Fit on photo<input type="file" accept="image/*" onChange={(event) => handlePerson(event.target.files?.[0])}/></label>
        </div>
        <label className="nonai-garment-upload"><Upload size={14}/> Use another exact garment PNG/WebP<input type="file" accept="image/png,image/webp,image/*" onChange={(event) => handleGarment(event.target.files?.[0])}/></label>
      </div>}

      {mode !== 'idle' && <div className="nonai-toolbar">
        {mode === 'photo' && <label><ImagePlus size={15}/> Change photo<input type="file" accept="image/*" onChange={(event) => handlePerson(event.target.files?.[0])}/></label>}
        <label><Upload size={15}/> Exact garment PNG<input type="file" accept="image/png,image/webp,image/*" onChange={(event) => handleGarment(event.target.files?.[0])}/></label>
        <button onClick={startCalibration}><RefreshCcw size={15}/> Recalibrate</button>
        <button onClick={reset}><X size={15}/> Reset fit</button>
        {mode === 'live' && <button onClick={closeLive}><Video size={15}/> Close live</button>}
      </div>}

      {mode !== 'idle' && <div className={`nonai-status ${calibrating ? 'active' : ''}`}>
        {trackerLoading ? <LoaderCircle className="spin" size={14}/> : calibrating ? <span>{step + 1}/{activeSteps.length}</span> : tracking ? <span className="tracking-dot"/> : <Check size={14}/>}<b>{message}</b>
      </div>}
    </div>

    <div className="nonai-explainer">
      <b>{mode === 'live' ? 'Stable live layer' : 'Exact-pixel fitting'}</b>
      <span>{mode === 'live' ? 'The whole garment follows a torso transform estimated from many optical-flow features, reducing point drift.' : 'Prints, logos, embroidery, neckline and sleeve shape come from the real transparent SKU asset.'}</span>
    </div>
  </div>;
}
