import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, ImagePlus, LoaderCircle, RefreshCcw, ScanLine, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { drawTryOn } from './TryOnRenderer';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

async function createLandmarker(vision) {
  const options = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: .55,
    minPosePresenceConfidence: .55,
    minTrackingConfidence: .55,
  };

  try {
    return await PoseLandmarker.createFromOptions(vision, options);
  } catch (gpuError) {
    console.warn('GPU body tracking unavailable; falling back to CPU.', gpuError);
    return PoseLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { modelAssetPath: MODEL_URL },
    });
  }
}

export default function VirtualTryOnStage({ product }) {
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const landmarksRef = useRef(null);
  const productRef = useRef(product);
  const lastVideoTimeRef = useRef(-1);
  const lastDetectRef = useRef(0);
  const modeRef = useRef('idle');
  const statusRef = useRef('Loading body tracking…');

  const [mode, setModeState] = useState('idle');
  const [status, setStatus] = useState('Loading body tracking…');
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState('');
  const [cameraError, setCameraError] = useState('');

  const setMode = useCallback((next) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  const updateStatus = useCallback((next) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatus(next);
  }, []);

  const sizeCanvas = useCallback((width, height) => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }, []);

  const clearOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    productRef.current = product;
    if (landmarksRef.current && canvasRef.current) {
      drawTryOn(canvasRef.current, landmarksRef.current, product);
    }
  }, [product]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const pose = await createLandmarker(vision);
        if (!active) {
          pose.close();
          return;
        }
        poseRef.current = pose;
        setReady(true);
        updateStatus('Ready — stand full body in frame');
      } catch (error) {
        console.error(error);
        updateStatus('Body tracking could not load');
      }
    })();

    return () => {
      active = false;
      stopCamera();
      poseRef.current?.close();
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [photo, stopCamera, updateStatus]);

  const drawVideo = useCallback(() => {
    if (modeRef.current !== 'camera') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseRef.current;
    if (!video || !canvas || !pose) return;

    const now = performance.now();
    if (
      video.readyState >= 2 &&
      video.videoWidth &&
      video.currentTime !== lastVideoTimeRef.current &&
      now - lastDetectRef.current > 38
    ) {
      sizeCanvas(video.videoWidth, video.videoHeight);
      lastVideoTimeRef.current = video.currentTime;
      lastDetectRef.current = now;

      try {
        const result = pose.detectForVideo(video, now);
        const landmarks = result.landmarks?.[0];
        if (landmarks) {
          landmarksRef.current = landmarks;
          drawTryOn(canvas, landmarks, productRef.current);
          const upperVisible = [11, 12, 23, 24].every((index) => (landmarks[index]?.visibility ?? 1) > .5);
          const legsVisible = [25, 26, 27, 28].every((index) => (landmarks[index]?.visibility ?? 1) > .35);
          updateStatus(
            upperVisible && legsVisible
              ? `${productRef.current.type} fitted — move naturally`
              : 'Step back until shoulders, hips and feet are visible',
          );
        } else {
          clearOverlay();
          updateStatus('Stand facing the camera to start fitting');
        }
      } catch (error) {
        console.error(error);
      }
    }

    rafRef.current = requestAnimationFrame(drawVideo);
  }, [clearOverlay, sizeCanvas, updateStatus]);

  const startCamera = useCallback(async () => {
    if (!ready || !poseRef.current) return;
    stopCamera();
    setCameraError('');
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return '';
    });
    updateStatus('Opening camera…');

    try {
      await poseRef.current.setOptions({ runningMode: 'VIDEO' });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      setMode('camera');
      await video.play();
      lastVideoTimeRef.current = -1;
      lastDetectRef.current = 0;
      drawVideo();
    } catch (error) {
      console.error(error);
      setMode('idle');
      setCameraError('Camera access was blocked. Upload a full-body photo instead.');
      updateStatus('Camera unavailable');
    }
  }, [drawVideo, ready, setMode, stopCamera, updateStatus]);

  const usePhoto = useCallback((file) => {
    if (!file || !poseRef.current) return;
    stopCamera();
    clearOverlay();
    const next = URL.createObjectURL(file);
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return next;
    });
    setMode('photo');
    updateStatus(`Fitting ${productRef.current.type.toLowerCase()} to your photo…`);
  }, [clearOverlay, setMode, stopCamera, updateStatus]);

  const detectPhoto = useCallback(async () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const pose = poseRef.current;
    if (!image || !canvas || !pose || !image.naturalWidth) return;

    try {
      await pose.setOptions({ runningMode: 'IMAGE' });
      sizeCanvas(image.naturalWidth, image.naturalHeight);
      const result = pose.detect(image);
      const landmarks = result.landmarks?.[0];
      if (landmarks) {
        landmarksRef.current = landmarks;
        drawTryOn(canvas, landmarks, productRef.current);
        updateStatus(`${productRef.current.type} fitted — switch products below`);
      } else {
        clearOverlay();
        updateStatus('Use a photo showing one full person from shoulders to feet');
      }
    } catch (error) {
      console.error(error);
      updateStatus('Could not process this photo');
    }
  }, [clearOverlay, sizeCanvas, updateStatus]);

  const close = useCallback(() => {
    stopCamera();
    clearOverlay();
    landmarksRef.current = null;
    setMode('idle');
    updateStatus('Ready — stand full body in frame');
  }, [clearOverlay, setMode, stopCamera, updateStatus]);

  return <div className="tryon-stage">
    <div className="tryon-media-wrap">
      <video ref={videoRef} className={`tryon-media mirrored ${mode === 'camera' ? '' : 'media-hidden'}`} playsInline muted/>
      {mode === 'photo' && photo && <img ref={imageRef} className="tryon-media" src={photo} alt="Your virtual try-on" onLoad={detectPhoto}/>} 
      <canvas ref={canvasRef} className={`tryon-overlay ${mode === 'camera' ? 'mirrored' : ''}`}/>

      {mode === 'camera' && <div className="fit-guide" aria-hidden="true"><span/><b>Keep your full body inside the guide</b></div>}

      {mode === 'idle' && <div className="tryon-empty">
        <div className="tryon-orbit"><ScanLine size={34}/></div>
        <span className="eyebrow">ONLINE MAGIC MIRROR</span>
        <h2>Try the real style <em>on you.</em></h2>
        <p>Choose a saree, one-piece, gown or kurti. Your camera tracks your body and fits that garment type directly over you.</p>
        <div className="tryon-start-actions">
          <button className="btn dark" disabled={!ready} onClick={startCamera}>
            {!ready ? <LoaderCircle className="spin" size={16}/> : <Camera size={16}/>} {ready ? 'Start live try-on' : 'Loading try-on'}
          </button>
          <label className={`btn outline ${!ready ? 'disabled' : ''}`}><ImagePlus size={16}/> Upload full-body photo<input type="file" accept="image/*" disabled={!ready} onChange={(event) => usePhoto(event.target.files?.[0])}/></label>
        </div>
        {cameraError && <small className="camera-error">{cameraError}</small>}
        <div className="privacy"><ShieldCheck size={14}/><span>Camera frames stay inside your browser for this prototype.</span></div>
      </div>}

      {mode !== 'idle' && <>
        <div className="tracking-status"><i/><span>{status}</span></div>
        <div className="stage-actions">
          <button onClick={close}><X size={16}/> Close</button>
          {mode === 'photo' && <label><RefreshCcw size={15}/> Change photo<input type="file" accept="image/*" onChange={(event) => usePhoto(event.target.files?.[0])}/></label>}
        </div>
      </>}
    </div>
  </div>;
}
