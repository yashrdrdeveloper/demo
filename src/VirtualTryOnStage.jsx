import { Camera, Check, ImagePlus, LoaderCircle, RefreshCcw, Shirt, Upload, Video, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CALIBRATION_STEPS,
  detectVisibleBounds,
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
        if (cv?.Mat) {
          resolve(cv);
          return;
        }
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

function anchorsToPointArray(anchors, width, height) {
  const values = [];
  CALIBRATION_STEPS.forEach(({ key }) => {
    const anchor = anchors[key];
    values.push(anchor.x * width, anchor.y * height);
  });
  return values;
}

export default function VirtualTryOnStage({ product }) {
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

  const [mode, setMode] = useState('idle');
  const [personReady, setPersonReady] = useState(false);
  const [garmentReady, setGarmentReady] = useState(false);
  const [garmentBounds, setGarmentBounds] = useState(null);
  const [anchors, setAnchors] = useState({});
  const [step, setStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [message, setMessage] = useState('Choose live mirror or upload a photo.');
  const [customGarment, setCustomGarment] = useState(false);

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
      width: video.videoWidth,
      height: video.videoHeight,
      showCalibration,
      activeStep,
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
    garmentTypeRef.current = product.garmentType;
    redraw();
  }, [product.garmentType, redraw]);

  useEffect(() => {
    let active = true;
    if (customGarment) return undefined;

    if (!product.tryOnAsset) {
      garmentRef.current = null;
      garmentBoundsRef.current = null;
      setGarmentBounds(null);
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
        setGarmentBounds(bounds);
        setGarmentReady(true);
        setMessage(modeRef.current === 'live' ? 'Garment ready. Calibrate once on the live mirror.' : 'Exact garment ready. Choose live mirror or photo fitting.');
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
      const winSize = new cv.Size(31, 31);
      const criteria = new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 24, 0.02);
      cv.calcOpticalFlowPyrLK(tracker.prevGray, gray, tracker.prevPts, nextPts, status, err, winSize, 3, criteria);

      const previous = anchorsRef.current;
      const nextAnchors = {};
      let valid = 0;

      CALIBRATION_STEPS.forEach(({ key }, index) => {
        const ok = status.data[index] === 1;
        const px = nextPts.data32F[index * 2];
        const py = nextPts.data32F[index * 2 + 1];
        if (ok && Number.isFinite(px) && Number.isFinite(py) && px >= 0 && py >= 0 && px <= video.videoWidth && py <= video.videoHeight) {
          const prior = previous[key];
          const measured = { x: px / video.videoWidth, y: py / video.videoHeight };
          nextAnchors[key] = prior
            ? { x: prior.x * 0.28 + measured.x * 0.72, y: prior.y * 0.28 + measured.y * 0.72 }
            : measured;
          valid += 1;
        } else if (previous[key]) {
          nextAnchors[key] = previous[key];
        }
      });

      if (valid < CALIBRATION_STEPS.length - 1) {
        cleanupTracker();
        setMessage('Tracking lost. Stand still and calibrate the body points again.');
        setCalibrating(false);
        renderCurrentOverlay(nextAnchors, false, 0);
        return;
      }

      anchorsRef.current = nextAnchors;
      renderCurrentOverlay(nextAnchors, false, 0);

      tracker.prevGray.delete();
      tracker.prevPts.delete();
      tracker.prevGray = gray.clone();
      tracker.prevPts = nextPts.clone();
    } catch (error) {
      console.error(error);
      cleanupTracker();
      setMessage('Live tracker stopped. Recalibrate to continue.');
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
    setMessage('Starting classic optical-flow tracking…');

    try {
      const cv = await loadOpenCv();
      if (modeRef.current !== 'live') return;
      const cap = new cv.VideoCapture(video);
      const frame = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
      const gray = new cv.Mat();
      cap.read(frame);
      cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
      const points = anchorsToPointArray(nextAnchors, video.videoWidth, video.videoHeight);
      const pts = cv.matFromArray(CALIBRATION_STEPS.length, 1, cv.CV_32FC2, points);

      trackerRef.current = {
        cv,
        cap,
        prevGray: gray.clone(),
        prevPts: pts.clone(),
        raf: null,
      };

      frame.delete();
      gray.delete();
      pts.delete();
      setTracking(true);
      setMessage('Live tracking active — move naturally.');
      trackerRef.current.raf = requestAnimationFrame(trackFrame);
    } catch (error) {
      console.error(error);
      setMessage('OpenCV tracker could not start. You can still use photo fitting.');
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
      setMessage(`Click once on the live mirror: ${CALIBRATION_STEPS[0].label}`);
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
      setGarmentBounds(bounds);
      setGarmentReady(true);
      setCustomGarment(true);
      setMessage(modeRef.current === 'live' ? 'Garment loaded. Recalibrate the live mirror.' : 'Exact garment loaded. Choose live mirror or upload your photo.');
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
    setMessage(`Click: ${CALIBRATION_STEPS[0].label}`);
    if (modeRef.current === 'live') renderCurrentOverlay({}, true, 0);
  };

  const handleCanvasClick = (event) => {
    if (!calibrating || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const visualX = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const x = modeRef.current === 'live' ? 1 - visualX : visualX;
    const current = CALIBRATION_STEPS[step];
    const nextAnchors = { ...anchorsRef.current, [current.key]: { x, y } };
    anchorsRef.current = nextAnchors;
    setAnchors(nextAnchors);

    const nextStep = step + 1;
    if (nextStep >= CALIBRATION_STEPS.length) {
      setStep(nextStep);
      setCalibrating(false);
      if (modeRef.current === 'live') {
        renderCurrentOverlay(nextAnchors, false, 0);
        startTracking(nextAnchors);
      } else {
        setMessage('Photo fitting complete. The exact SKU pixels are warped to your calibration.');
      }
    } else {
      setStep(nextStep);
      setMessage(`Click: ${CALIBRATION_STEPS[nextStep].label}`);
      if (modeRef.current === 'live') renderCurrentOverlay(nextAnchors, true, nextStep);
    }
  };

  const reset = () => {
    cleanupTracker();
    anchorsRef.current = {};
    setAnchors({});
    setStep(0);
    setCalibrating(false);
    setMessage(modeRef.current === 'live' ? 'Ready to calibrate the live mirror again.' : 'Ready to calibrate again.');
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
        <span className="eyebrow">NON-AI LIVE FITTING</span>
        <h2>Your body.<br/><em>The exact garment.</em></h2>
        <p>Use the live camera and calibrate eight points once. Classic optical flow then follows those points frame-by-frame and continuously warps the exact garment asset as you move.</p>
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
        {trackerLoading ? <LoaderCircle className="spin" size={14}/> : calibrating ? <span>{step + 1}/{CALIBRATION_STEPS.length}</span> : tracking ? <span className="tracking-dot"/> : <Check size={14}/>}<b>{message}</b>
      </div>}
    </div>

    <div className="nonai-explainer">
      <b>{mode === 'live' ? 'Classic CV tracking' : 'Exact-pixel fitting'}</b>
      <span>{mode === 'live' ? 'Manual anchors are tracked frame-to-frame with optical flow. No generative model and no pose model.' : 'Prints, logos, embroidery, neckline and sleeve shape come from the real transparent SKU asset.'}</span>
    </div>
  </div>;
}
