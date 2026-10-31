import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, ImagePlus, LoaderCircle, RefreshCcw, ScanLine, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

const p = (landmark, width, height) => ({
  x: landmark.x * width,
  y: landmark.y * height,
  visibility: landmark.visibility ?? 1,
});

function geometryFor(landmarks, width, height, product) {
  const shoulders = [p(landmarks[11], width, height), p(landmarks[12], width, height)].sort((a, b) => a.x - b.x);
  const hips = [p(landmarks[23], width, height), p(landmarks[24], width, height)].sort((a, b) => a.x - b.x);
  const knees = [p(landmarks[25], width, height), p(landmarks[26], width, height)];
  const ankles = [p(landmarks[27], width, height), p(landmarks[28], width, height)];

  const [leftShoulder, rightShoulder] = shoulders;
  const [leftHip, rightHip] = hips;
  const shoulderWidth = Math.max(rightShoulder.x - leftShoulder.x, width * .08);
  const hipWidth = Math.max(rightHip.x - leftHip.x, shoulderWidth * .66);
  const centerX = (leftHip.x + rightHip.x) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const kneeY = (knees[0].y + knees[1].y) / 2;
  const ankleY = (ankles[0].y + ankles[1].y) / 2;
  const trackedHeight = Math.max(ankleY - shoulderY, height * .46);
  const waistY = hipY - (hipY - shoulderY) * .34;

  let bottomY = Math.min(ankleY, height * .96);
  let flare = shoulderWidth * 1.35;
  if (product.shape === 'straight') {
    bottomY = Math.min(kneeY + trackedHeight * .22, ankleY);
    flare = hipWidth * .78;
  }
  if (product.shape === 'gown') flare = shoulderWidth * 1.55;
  if (product.shape === 'lehenga') flare = shoulderWidth * 1.65;
  if (product.shape === 'anarkali') flare = shoulderWidth * 1.46;

  return {
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    shoulderWidth,
    hipWidth,
    centerX,
    shoulderY,
    hipY,
    waistY,
    bottomY,
    flare,
  };
}

function traceDress(ctx, g) {
  const shoulderPad = g.shoulderWidth * .1;
  const waistWidth = g.shoulderWidth * .43;

  ctx.beginPath();
  ctx.moveTo(g.leftShoulder.x - shoulderPad, g.leftShoulder.y + g.shoulderWidth * .055);
  ctx.quadraticCurveTo(g.centerX - g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .12, g.centerX, g.shoulderY - g.shoulderWidth * .015);
  ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .12, g.rightShoulder.x + shoulderPad, g.rightShoulder.y + g.shoulderWidth * .055);
  ctx.lineTo(g.centerX + waistWidth, g.waistY);
  ctx.quadraticCurveTo(g.centerX + g.hipWidth * .63, g.hipY, g.centerX + g.flare * .5, g.bottomY);
  ctx.quadraticCurveTo(g.centerX, g.bottomY + g.shoulderWidth * .095, g.centerX - g.flare * .5, g.bottomY);
  ctx.quadraticCurveTo(g.centerX - g.hipWidth * .63, g.hipY, g.centerX - waistWidth, g.waistY);
  ctx.closePath();
}

function drawSleeves(ctx, landmarks, width, height, product, shoulderWidth) {
  if (product.shape === 'lehenga') return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(shoulderWidth * .23, 16);
  ctx.strokeStyle = product.color;
  ctx.shadowColor = 'rgba(20,12,10,.24)';
  ctx.shadowBlur = shoulderWidth * .06;

  [[11, 13, 15], [12, 14, 16]].forEach(([s, e, w]) => {
    const shoulder = p(landmarks[s], width, height);
    const elbow = p(landmarks[e], width, height);
    const wrist = p(landmarks[w], width, height);
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y + shoulderWidth * .05);
    ctx.lineTo(elbow.x, elbow.y);
    if (product.type !== 'Gown') ctx.lineTo(wrist.x, wrist.y - shoulderWidth * .04);
    ctx.stroke();
  });
  ctx.restore();
}

function revealRealArms(ctx, landmarks, width, height, shoulderWidth) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(shoulderWidth * .15, 12);
  ctx.strokeStyle = '#000';
  [[11, 13, 15], [12, 14, 16]].forEach(([s, e, w]) => {
    const shoulder = p(landmarks[s], width, height);
    const elbow = p(landmarks[e], width, height);
    const wrist = p(landmarks[w], width, height);
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(wrist.x, wrist.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawTryOn(canvas, landmarks, product) {
  if (!canvas || !landmarks?.length) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  if ([11, 12, 23, 24].some((index) => (landmarks[index]?.visibility ?? 1) < .35)) return;

  const g = geometryFor(landmarks, width, height, product);
  traceDress(ctx, g);

  const cloth = ctx.createLinearGradient(g.centerX - g.flare * .5, g.shoulderY, g.centerX + g.flare * .5, g.bottomY);
  cloth.addColorStop(0, product.color);
  cloth.addColorStop(.18, '#ffffff24');
  cloth.addColorStop(.38, product.color);
  cloth.addColorStop(.61, '#0000001c');
  cloth.addColorStop(.82, '#ffffff1f');
  cloth.addColorStop(1, product.color);

  ctx.save();
  ctx.shadowColor = 'rgba(24,14,11,.28)';
  ctx.shadowBlur = Math.max(g.shoulderWidth * .08, 7);
  ctx.shadowOffsetY = g.shoulderWidth * .04;
  ctx.fillStyle = cloth;
  ctx.fill();
  ctx.restore();

  drawSleeves(ctx, landmarks, width, height, product, g.shoulderWidth);

  // Real skin remains visible at the neckline.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(g.centerX, g.shoulderY + g.shoulderWidth * .02, g.shoulderWidth * .18, g.shoulderWidth * .145, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cloth highlights and folds follow the tracked body geometry.
  ctx.save();
  ctx.globalAlpha = .16;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.2, g.shoulderWidth * .006);
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(g.centerX + i * g.shoulderWidth * .075, g.waistY);
    ctx.quadraticCurveTo(
      g.centerX + i * g.flare * .055,
      (g.waistY + g.bottomY) / 2,
      g.centerX + i * g.flare * .105,
      g.bottomY - g.shoulderWidth * .08,
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#d6b477';
  ctx.globalAlpha = .8;
  ctx.lineWidth = Math.max(3, g.shoulderWidth * .018);
  ctx.beginPath();
  ctx.moveTo(g.centerX - g.flare * .42, g.bottomY - g.shoulderWidth * .08);
  ctx.quadraticCurveTo(g.centerX, g.bottomY + g.shoulderWidth * .018, g.centerX + g.flare * .42, g.bottomY - g.shoulderWidth * .08);
  ctx.stroke();
  ctx.restore();

  // The customer's actual arms appear above the garment instead of being painted over.
  revealRealArms(ctx, landmarks, width, height, g.shoulderWidth);
}

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
    if (landmarksRef.current && canvasRef.current) drawTryOn(canvasRef.current, landmarksRef.current, product);
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
        updateStatus('Ready for virtual try-on');
      } catch (error) {
        console.error(error);
        updateStatus('Body tracking could not load');
      }
    })();

    return () => {
      active = false;
      stopCamera();
      poseRef.current?.close();
    };
  }, [stopCamera, updateStatus]);

  const drawVideo = useCallback(() => {
    if (modeRef.current !== 'camera') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseRef.current;
    if (!video || !canvas || !pose) return;

    const now = performance.now();
    if (video.readyState >= 2 && video.videoWidth && video.currentTime !== lastVideoTimeRef.current && now - lastDetectRef.current > 38) {
      sizeCanvas(video.videoWidth, video.videoHeight);
      lastVideoTimeRef.current = video.currentTime;
      lastDetectRef.current = now;
      try {
        const result = pose.detectForVideo(video, now);
        const landmarks = result.landmarks?.[0];
        if (landmarks) {
          landmarksRef.current = landmarks;
          drawTryOn(canvas, landmarks, productRef.current);
          const visible = [11, 12, 23, 24, 25, 26].every((index) => (landmarks[index]?.visibility ?? 1) > .45);
          updateStatus(visible ? 'Perfect — move naturally' : 'Step back so more of your outfit is visible');
        } else {
          clearOverlay();
          updateStatus('Stand in frame to start trying on');
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
    if (photo) URL.revokeObjectURL(photo);
    setPhoto('');
    updateStatus('Opening camera…');

    try {
      await poseRef.current.setOptions({ runningMode: 'VIDEO' });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
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
      setCameraError('Camera access was blocked. You can still upload a full-body photo.');
      updateStatus('Camera unavailable');
    }
  }, [drawVideo, photo, ready, setMode, stopCamera, updateStatus]);

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
    updateStatus('Fitting the dress to your photo…');
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
        updateStatus('Try-on ready — switch outfits below');
      } else {
        clearOverlay();
        updateStatus('We could not find a full person in this photo');
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
    updateStatus('Ready for virtual try-on');
  }, [clearOverlay, setMode, stopCamera, updateStatus]);

  return <div className="tryon-stage">
    <div className="tryon-media-wrap">
      <video ref={videoRef} className={`tryon-media mirrored ${mode === 'camera' ? '' : 'media-hidden'}`} playsInline muted/>
      {mode === 'photo' && photo && <img ref={imageRef} className="tryon-media" src={photo} alt="Your virtual try-on" onLoad={detectPhoto}/>} 
      <canvas ref={canvasRef} className={`tryon-overlay ${mode === 'camera' ? 'mirrored' : ''}`}/>

      {mode === 'idle' && <div className="tryon-empty">
        <div className="tryon-orbit"><ScanLine size={34}/></div>
        <span className="eyebrow">VIRTUAL FITTING ROOM</span>
        <h2>See it on <em>you.</em></h2>
        <p>No generated model. Open your camera or use a full-body photo and the garment is fitted to your own pose.</p>
        <div className="tryon-start-actions">
          <button className="btn dark" disabled={!ready} onClick={startCamera}>
            {!ready ? <LoaderCircle className="spin" size={16}/> : <Camera size={16}/>} {ready ? 'Start camera' : 'Loading try-on'}
          </button>
          <label className={`btn outline ${!ready ? 'disabled' : ''}`}><ImagePlus size={16}/> Upload photo<input type="file" accept="image/*" disabled={!ready} onChange={(event) => usePhoto(event.target.files?.[0])}/></label>
        </div>
        {cameraError && <small className="camera-error">{cameraError}</small>}
        <div className="privacy"><ShieldCheck size={14}/><span>Camera frames stay in your browser and are not uploaded.</span></div>
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
