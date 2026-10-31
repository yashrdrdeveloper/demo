import { FilesetResolver, ImageSegmenter, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, ImagePlus, LoaderCircle, RefreshCcw, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  analyzePose,
  createSkinMaskCanvas,
  drawSareeTryOn,
  prepareFabricTexture,
  smoothLandmarks,
} from './TryOnRenderer';

const WASM_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  'https://unpkg.com/@mediapipe/tasks-vision@latest/wasm',
];
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const SEGMENT_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

function timeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

function loadImage(src, crossOrigin = false) {
  return timeout(new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not load'));
    image.src = src;
  }), 9000, 'Image loading');
}

async function resolveVision() {
  let lastError;
  for (const source of WASM_SOURCES) {
    try {
      return await timeout(FilesetResolver.forVisionTasks(source), 6500, 'Vision runtime');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Vision runtime unavailable');
}

async function createPoseTracker(vision) {
  const base = {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: .42,
    minPosePresenceConfidence: .42,
    minTrackingConfidence: .42,
    outputSegmentationMasks: false,
  };
  try {
    return await timeout(PoseLandmarker.createFromOptions(vision, base), 8500, 'Body tracker');
  } catch {
    return timeout(PoseLandmarker.createFromOptions(vision, {
      ...base,
      baseOptions: { modelAssetPath: POSE_MODEL },
    }), 7000, 'Body tracker fallback');
  }
}

async function createSkinSegmenter(vision) {
  const base = {
    baseOptions: { modelAssetPath: SEGMENT_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  };
  try {
    return await timeout(ImageSegmenter.createFromOptions(vision, base), 7000, 'Skin segmentation');
  } catch {
    return timeout(ImageSegmenter.createFromOptions(vision, {
      ...base,
      baseOptions: { modelAssetPath: SEGMENT_MODEL },
    }), 6000, 'Skin segmentation fallback');
  }
}

export default function VirtualTryOnStage({ product, size = 'M' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const segmenterRef = useRef(null);
  const visionRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const imageUrlRef = useRef('');
  const sourceImageRef = useRef(null);
  const fabricRef = useRef(null);
  const lastPoseRef = useRef(null);
  const lastSkinMaskRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastPoseAtRef = useRef(0);
  const lastSegmentAtRef = useRef(0);
  const segmentBusyRef = useRef(false);
  const segmentLoadingRef = useRef(false);
  const modeRef = useRef('idle');
  const productRef = useRef(product);
  const sizeRef = useRef(size);
  const mountedRef = useRef(true);

  const [mode, setMode] = useState('idle');
  const [engine, setEngine] = useState('loading');
  const [segmentation, setSegmentation] = useState('idle');
  const [status, setStatus] = useState('Preparing automatic body tracking…');
  const [fitState, setFitState] = useState({ state: 'searching', mode: 'none', quality: 0 });
  const [fabricReady, setFabricReady] = useState(false);

  const setModeSafe = useCallback((next) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const clearFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const render = useCallback((source, landmarks, state, drawSource = false) => {
    if (!source || !landmarks) return;
    drawSareeTryOn({
      canvas: canvasRef.current,
      source,
      landmarks,
      fabric: fabricRef.current,
      product: productRef.current,
      size: sizeRef.current,
      previewMode: state?.mode === 'full' ? 'full' : 'upper',
      skinMask: lastSkinMaskRef.current,
      drawSource,
    });
  }, []);

  const initSegmentation = useCallback(async () => {
    if (segmenterRef.current || segmentLoadingRef.current || !visionRef.current) return;
    segmentLoadingRef.current = true;
    if (mountedRef.current) setSegmentation('loading');
    try {
      segmenterRef.current = await createSkinSegmenter(visionRef.current);
      if (mountedRef.current) setSegmentation('ready');
    } catch (error) {
      console.warn('Skin segmentation unavailable; using pose occlusion fallback.', error);
      if (mountedRef.current) setSegmentation('fallback');
    } finally {
      segmentLoadingRef.current = false;
    }
  }, []);

  const initialize = useCallback(async () => {
    setEngine('loading');
    setStatus('Preparing automatic body tracking…');
    try {
      poseRef.current?.close?.();
      segmenterRef.current?.close?.();
      poseRef.current = null;
      segmenterRef.current = null;
      segmentLoadingRef.current = false;
      setSegmentation('idle');

      const setup = (async () => {
        const vision = await resolveVision();
        visionRef.current = vision;
        const pose = await createPoseTracker(vision);
        return { vision, pose };
      })();
      const { pose } = await timeout(setup, 20000, 'Tracker setup');
      if (!mountedRef.current) {
        pose.close?.();
        return;
      }
      poseRef.current = pose;
      setEngine('ready');
      setStatus('Ready — start the camera or upload a photo');
      window.setTimeout(() => initSegmentation(), 80);
    } catch (error) {
      console.error(error);
      if (mountedRef.current) {
        setEngine('error');
        setStatus('Tracker could not load in time. Check your connection and retry.');
      }
    }
  }, [initSegmentation]);

  useEffect(() => {
    mountedRef.current = true;
    initialize();
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      poseRef.current?.close?.();
      segmenterRef.current?.close?.();
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, [initialize]);

  useEffect(() => {
    productRef.current = product;
    let active = true;
    setFabricReady(false);
    (async () => {
      try {
        const image = await loadImage(product.textureUrl || product.photoUrl, true);
        if (!active) return;
        fabricRef.current = prepareFabricTexture(image, product.textureCrop);
        setFabricReady(true);
        if (lastPoseRef.current) {
          const source = modeRef.current === 'camera' ? videoRef.current : sourceImageRef.current;
          render(source, lastPoseRef.current, fitState, modeRef.current === 'photo');
        }
      } catch (error) {
        console.warn('Fabric texture could not load; renderer will use a fallback tone.', error);
        fabricRef.current = null;
        setFabricReady(false);
      }
    })();
    return () => { active = false; };
  }, [product, render, fitState]);

  useEffect(() => {
    sizeRef.current = size;
    if (lastPoseRef.current) {
      const source = modeRef.current === 'camera' ? videoRef.current : sourceImageRef.current;
      render(source, lastPoseRef.current, fitState, modeRef.current === 'photo');
    }
  }, [size, fitState, render]);

  const updateSegmentation = useCallback((source, now) => {
    const segmenter = segmenterRef.current;
    if (!segmenter || segmentation !== 'ready' || segmentBusyRef.current || now - lastSegmentAtRef.current < 110) return;
    segmentBusyRef.current = true;
    lastSegmentAtRef.current = now;
    try {
      segmenter.segmentForVideo(source, now, (result) => {
        lastSkinMaskRef.current = createSkinMaskCanvas(result.categoryMask);
        segmentBusyRef.current = false;
        if (lastPoseRef.current && modeRef.current === 'camera') {
          render(source, lastPoseRef.current, analyzePose(lastPoseRef.current), false);
        }
      });
    } catch (error) {
      console.warn('Segmentation frame skipped.', error);
      segmentBusyRef.current = false;
    }
  }, [render, segmentation]);

  const cameraLoop = useCallback(() => {
    const video = videoRef.current;
    const pose = poseRef.current;
    if (modeRef.current !== 'camera' || !video || !pose) return;

    const now = performance.now();
    if (video.readyState >= 2 && video.videoWidth && video.currentTime !== lastVideoTimeRef.current && now - lastPoseAtRef.current >= 42) {
      lastVideoTimeRef.current = video.currentTime;
      lastPoseAtRef.current = now;
      try {
        const result = pose.detectForVideo(video, now);
        const detected = result.landmarks?.[0];
        if (detected) {
          const smoothed = smoothLandmarks(lastPoseRef.current, detected);
          lastPoseRef.current = smoothed;
          const nextState = analyzePose(smoothed);
          setFitState(nextState);
          setStatus(nextState.message);
          render(video, smoothed, nextState, false);
          updateSegmentation(video, now);
        } else {
          lastPoseRef.current = null;
          lastSkinMaskRef.current = null;
          setFitState({ state: 'searching', mode: 'none', quality: 0 });
          setStatus('Step into the frame — tracking will lock automatically');
          clearFrame();
        }
      } catch (error) {
        console.warn('Pose frame skipped.', error);
      }
    }
    rafRef.current = requestAnimationFrame(cameraLoop);
  }, [clearFrame, render, updateSegmentation]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    lastVideoTimeRef.current = -1;
    lastPoseRef.current = null;
    lastSkinMaskRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (engine !== 'ready' || !poseRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('This browser does not support camera access. Upload a photo instead.');
      return;
    }
    stopCamera();
    setStatus('Opening camera…');
    setFitState({ state: 'searching', mode: 'none', quality: 0 });
    try {
      await poseRef.current.setOptions({ runningMode: 'VIDEO' });
      if (segmenterRef.current) await segmenterRef.current.setOptions({ runningMode: 'VIDEO' });
      const stream = await timeout(navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      }), 20000, 'Camera permission');
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      setModeSafe('camera');
      await timeout(video.play(), 6000, 'Camera start');
      setStatus('Finding you automatically…');
      lastPoseAtRef.current = 0;
      lastVideoTimeRef.current = -1;
      initSegmentation();
      rafRef.current = requestAnimationFrame(cameraLoop);
    } catch (error) {
      console.error(error);
      setModeSafe('idle');
      setStatus(error?.name === 'NotAllowedError' ? 'Camera permission was blocked. Upload a photo instead.' : 'Camera did not start. Retry or upload a photo.');
    }
  }, [cameraLoop, engine, initSegmentation, setModeSafe, stopCamera]);

  const handlePhoto = useCallback(async (file) => {
    if (!file || engine !== 'ready' || !poseRef.current) return;
    stopCamera();
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;
    setStatus('Analyzing your photo…');
    setModeSafe('photo');
    try {
      const image = await loadImage(url);
      sourceImageRef.current = image;
      await poseRef.current.setOptions({ runningMode: 'IMAGE' });
      const result = poseRef.current.detect(image);
      const detected = result.landmarks?.[0];
      if (!detected) {
        setFitState({ state: 'searching', mode: 'none', quality: 0 });
        setStatus('No person detected. Use a clear front-facing photo.');
        const canvas = canvasRef.current;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return;
      }
      lastPoseRef.current = detected;
      const nextState = analyzePose(detected);
      setFitState(nextState);
      setStatus(nextState.mode === 'full' ? 'Photo fitted automatically' : 'Upper-body saree preview fitted automatically');
      render(image, detected, nextState, true);
    } catch (error) {
      console.error(error);
      setStatus('Could not process that photo. Try another image.');
    }
  }, [engine, render, setModeSafe, stopCamera]);

  const reset = useCallback(() => {
    stopCamera();
    setModeSafe('idle');
    lastPoseRef.current = null;
    lastSkinMaskRef.current = null;
    sourceImageRef.current = null;
    clearFrame();
    setFitState({ state: 'searching', mode: 'none', quality: 0 });
    setStatus(engine === 'ready' ? 'Ready — start the camera or upload a photo' : 'Preparing automatic body tracking…');
  }, [clearFrame, engine, setModeSafe, stopCamera]);

  const ready = engine === 'ready';
  const locked = fitState.state === 'locked';

  return <div className="auto-tryon-stage">
    <div className="auto-tryon-viewport">
      <video ref={videoRef} className={`auto-camera ${mode === 'camera' ? 'visible' : ''}`} playsInline muted/>
      <canvas ref={canvasRef} className={`auto-overlay ${mode === 'camera' ? 'mirrored' : ''}`}/>

      {mode === 'camera' && <div className={`body-guide ${locked ? 'locked' : ''}`} aria-hidden="true">
        <div className="body-guide-frame"><span/><span/><span/><span/></div>
      </div>}

      {mode === 'idle' && <div className="auto-empty">
        <div className="auto-icon"><Sparkles size={32}/></div>
        <span className="eyebrow">AUTOMATIC SAREE TRY-ON</span>
        <h2>No setup.<br/><em>Just step in.</em></h2>
        <p>The camera finds your shoulders, hips and legs automatically. Stand farther back for the full saree, or use a closer selfie for the blouse and pallu preview.</p>
        {engine === 'error' ? <button className="btn dark" onClick={initialize}><RefreshCcw size={16}/> Retry tracker</button> : <div className="auto-start-actions">
          <button className="btn dark" disabled={!ready} onClick={startCamera}>{ready ? <Camera size={16}/> : <LoaderCircle className="spin" size={16}/>} {ready ? 'Start live try-on' : 'Preparing tracker'}</button>
          <label className={`btn outline ${!ready ? 'disabled' : ''}`}><ImagePlus size={16}/> Upload photo<input type="file" accept="image/*" disabled={!ready} onChange={(event) => handlePhoto(event.target.files?.[0])}/></label>
        </div>}
        <div className="privacy"><ShieldCheck size={14}/><span>Body tracking runs on-device in your browser.</span></div>
      </div>}

      {mode !== 'idle' && <>
        <div className={`auto-status ${fitState.state}`}>
          <i className={locked ? 'lock-dot' : ''}/><span><b>{status}</b><small>{locked ? (fitState.mode === 'full' ? 'Full saree · live' : 'Selfie / upper-body preview') : 'The fit re-locks automatically when your body is visible'}</small></span>
        </div>
        <div className="quality-meter"><span style={{ width: `${Math.max(8, Math.round((fitState.quality || 0) * 100))}%` }}/></div>
        <div className="auto-actions">
          {mode === 'camera' && <button onClick={startCamera}><RotateCcw size={15}/> Restart camera</button>}
          <label><ImagePlus size={15}/> Use photo<input type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])}/></label>
          <button onClick={reset}><X size={15}/> Close</button>
        </div>
      </>}
    </div>

    <div className="auto-footnote">
      <b>{fabricReady ? 'Real fabric pixels loaded' : 'Fabric fallback active'}</b>
      <span>{segmentation === 'ready' ? 'Skin/arm occlusion enhanced.' : 'Pose-based arm occlusion active.'} Tracking automatically reacquires after temporary loss.</span>
    </div>
  </div>;
}
