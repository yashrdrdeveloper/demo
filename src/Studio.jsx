import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import GarmentArt from './GarmentArt';
import { PRODUCTS, money } from './data';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

const point = (landmark, width, height) => ({
  x: landmark.x * width,
  y: landmark.y * height,
  visibility: landmark.visibility ?? 1,
});

function buildGarmentPath(ctx, landmarks, width, height, product) {
  const ls = point(landmarks[11], width, height);
  const rs = point(landmarks[12], width, height);
  const lh = point(landmarks[23], width, height);
  const rh = point(landmarks[24], width, height);
  const lk = point(landmarks[25], width, height);
  const rk = point(landmarks[26], width, height);
  const la = point(landmarks[27], width, height);
  const ra = point(landmarks[28], width, height);

  const leftShoulder = ls.x < rs.x ? ls : rs;
  const rightShoulder = ls.x < rs.x ? rs : ls;
  const leftHip = lh.x < rh.x ? lh : rh;
  const rightHip = lh.x < rh.x ? rh : lh;
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const hipWidth = Math.max(Math.abs(rightHip.x - leftHip.x), shoulderWidth * .64);
  const centerX = (leftHip.x + rightHip.x) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const kneeY = (lk.y + rk.y) / 2;
  const ankleY = (la.y + ra.y) / 2;
  const bodyHeight = Math.max(ankleY - shoulderY, height * .48);

  let bottomY = ankleY - bodyHeight * .015;
  let flare = shoulderWidth * 1.22;
  if (product.shape === 'straight') {
    bottomY = Math.min(kneeY + bodyHeight * .24, ankleY);
    flare = hipWidth * .72;
  }
  if (product.shape === 'lehenga') flare = shoulderWidth * 1.6;
  if (product.shape === 'gown') flare = shoulderWidth * 1.52;
  if (product.shape === 'anarkali') flare = shoulderWidth * 1.42;

  const shoulderPad = shoulderWidth * .11;
  const waistY = hipY - (hipY - shoulderY) * .32;
  const waistWidth = shoulderWidth * .42;

  ctx.beginPath();
  ctx.moveTo(leftShoulder.x - shoulderPad, leftShoulder.y + shoulderWidth * .05);
  ctx.quadraticCurveTo(centerX - shoulderWidth * .36, shoulderY - shoulderWidth * .13, centerX, shoulderY - shoulderWidth * .02);
  ctx.quadraticCurveTo(centerX + shoulderWidth * .36, shoulderY - shoulderWidth * .13, rightShoulder.x + shoulderPad, rightShoulder.y + shoulderWidth * .05);
  ctx.lineTo(centerX + waistWidth, waistY);
  ctx.quadraticCurveTo(centerX + hipWidth * .62, hipY, centerX + flare * .5, bottomY);
  ctx.quadraticCurveTo(centerX, bottomY + shoulderWidth * .1, centerX - flare * .5, bottomY);
  ctx.quadraticCurveTo(centerX - hipWidth * .62, hipY, centerX - waistWidth, waistY);
  ctx.closePath();

  return { centerX, shoulderY, shoulderWidth, hipY, waistY, bottomY, flare };
}

function drawSleeves(ctx, landmarks, width, height, color, product) {
  if (product.shape === 'lehenga') return;
  const pairs = [[11, 13, 15], [12, 14, 16]];
  const shoulderWidth = Math.abs(landmarks[11].x - landmarks[12].x) * width;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(shoulderWidth * .24, 18);
  ctx.shadowColor = 'rgba(32,18,14,.22)';
  ctx.shadowBlur = shoulderWidth * .06;
  pairs.forEach(([s, e, w]) => {
    const shoulder = point(landmarks[s], width, height);
    const elbow = point(landmarks[e], width, height);
    const wrist = point(landmarks[w], width, height);
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y + shoulderWidth * .06);
    ctx.lineTo(elbow.x, elbow.y);
    if (product.type !== 'Gown') ctx.lineTo(wrist.x, wrist.y - shoulderWidth * .06);
    ctx.stroke();
  });
  ctx.restore();
}

function revealArms(ctx, landmarks, width, height) {
  const shoulderWidth = Math.abs(landmarks[11].x - landmarks[12].x) * width;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(shoulderWidth * .15, 14);
  [[11, 13, 15], [12, 14, 16]].forEach(([s, e, w]) => {
    const a = point(landmarks[s], width, height);
    const b = point(landmarks[e], width, height);
    const c = point(landmarks[w], width, height);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  });
  ctx.restore();
}

function renderTryOn(canvas, landmarks, product) {
  if (!canvas || !landmarks?.length) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const important = [11, 12, 23, 24];
  if (important.some((index) => (landmarks[index]?.visibility ?? 1) < .35)) return;

  const color = product.color;
  const geometry = buildGarmentPath(ctx, landmarks, width, height, product);
  const gradient = ctx.createLinearGradient(
    geometry.centerX - geometry.flare * .5,
    geometry.shoulderY,
    geometry.centerX + geometry.flare * .5,
    geometry.bottomY,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(.18, '#ffffff22');
  gradient.addColorStop(.38, color);
  gradient.addColorStop(.64, '#00000018');
  gradient.addColorStop(.82, '#ffffff1f');
  gradient.addColorStop(1, color);

  ctx.save();
  ctx.shadowColor = 'rgba(30,18,14,.28)';
  ctx.shadowBlur = Math.max(geometry.shoulderWidth * .08, 8);
  ctx.shadowOffsetY = geometry.shoulderWidth * .035;
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  drawSleeves(ctx, landmarks, width, height, color, product);

  // Neck opening: reveal the customer's real skin under the garment.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(
    geometry.centerX,
    geometry.shoulderY + geometry.shoulderWidth * .025,
    geometry.shoulderWidth * .18,
    geometry.shoulderWidth * .15,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // Fine fabric folds make the overlay read like cloth rather than a flat sticker.
  ctx.save();
  ctx.globalAlpha = .18;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.3, geometry.shoulderWidth * .006);
  for (let i = -3; i <= 3; i += 1) {
    const topX = geometry.centerX + i * geometry.shoulderWidth * .075;
    const endX = geometry.centerX + i * geometry.flare * .105;
    ctx.beginPath();
    ctx.moveTo(topX, geometry.waistY);
    ctx.quadraticCurveTo(
      geometry.centerX + i * geometry.flare * .06,
      (geometry.waistY + geometry.bottomY) / 2,
      endX,
      geometry.bottomY - geometry.shoulderWidth * .08,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Decorative hem/border varies by product.
  ctx.save();
  ctx.strokeStyle = '#d6b477';
  ctx.globalAlpha = .82;
  ctx.lineWidth = Math.max(3, geometry.shoulderWidth * .018);
  ctx.beginPath();
  ctx.moveTo(geometry.centerX - geometry.flare * .43, geometry.bottomY - geometry.shoulderWidth * .08);
  ctx.quadraticCurveTo(
    geometry.centerX,
    geometry.bottomY + geometry.shoulderWidth * .02,
    geometry.centerX + geometry.flare * .43,
    geometry.bottomY - geometry.shoulderWidth * .08,
  );
  ctx.stroke();
  ctx.restore();

  // Arms stay in front of the virtual garment, which makes the effect far more natural.
  revealArms(ctx, landmarks, width, height);
}

function TryOnStage({ product, onReady }) {
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const landmarksRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const modeRef = useRef('idle');

  const [mode, setModeState] = useState('idle');
  const [status, setStatus] = useState('Loading body tracking…');
  const [modelReady, setModelReady] = useState(false);
  const [photo, setPhoto] = useState('');
  const [cameraError, setCameraError] = useState('');

  const setMode = (value) => {
    modeRef.current = value;
    setModeState(value);
  };

  const sizeCanvas = useCallback((width, height) => {
    if (!canvasRef.current || !width || !height) return;
    if (canvasRef.current.width !== width) canvasRef.current.width = width;
    if (canvasRef.current.height !== height) canvasRef.current.height = height;
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: .55,
          minPosePresenceConfidence: .55,
          minTrackingConfidence: .55,
        });
        if (!alive) {
          landmarker.close();
          return;
        }
        poseRef.current = landmarker;
        setModelReady(true);
        setStatus('Ready for virtual try-on');
        onReady?.();
      } catch (error) {
        console.error(error);
        setStatus('Body tracking could not load');
      }
    })();

    return () => {
      alive = false;
      stopCamera();
      poseRef.current?.close();
    };
  }, [onReady, stopCamera]);

  const drawVideo = useCallback(() => {
    if (modeRef.current !== 'camera') return;
    const video = videoRef.current;
    const pose = poseRef.current;
    const canvas = canvasRef.current;
    if (!video || !pose || !canvas) return;

    if (video.readyState >= 2 && video.videoWidth && video.currentTime !== lastTimeRef.current) {
      sizeCanvas(video.videoWidth, video.videoHeight);
      lastTimeRef.current = video.currentTime;
      try {
        const result = pose.detectForVideo(video, performance.now());
        if (result.landmarks?.[0]) {
          landmarksRef.current = result.landmarks[0];
          renderTryOn(canvas, result.landmarks[0], product);
          const allVisible = [11, 12, 23, 24, 25, 26].every((i) => (result.landmarks[0][i]?.visibility ?? 1) > .45);
          setStatus(allVisible ? 'Perfect — move naturally' : 'Step back so we can see more of your outfit');
        } else {
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          setStatus('Stand in frame to start trying on');
        }
      } catch (error) {
        console.error(error);
      }
    }
    rafRef.current = requestAnimationFrame(drawVideo);
  }, [product, sizeCanvas]);

  const startCamera = useCallback(async () => {
    if (!modelReady || !poseRef.current) return;
    stopCamera();
    setCameraError('');
    setPhoto('');
    setStatus('Opening camera…');
    try {
      await poseRef.current.setOptions({ runningMode: 'VIDEO' });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setMode('camera');
      lastTimeRef.current = -1;
      drawVideo();
    } catch (error) {
      console.error(error);
      setMode('idle');
      setCameraError('Camera access was blocked. You can still upload a full-body photo.');
      setStatus('Camera unavailable');
    }
  }, [drawVideo, modelReady, stopCamera]);

  const usePhoto = useCallback(async (file) => {
    if (!file || !poseRef.current) return;
    stopCamera();
    const url = URL.createObjectURL(file);
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    setMode('photo');
    setStatus('Fitting the dress to your photo…');
  }, [stopCamera]);

  const detectPhoto = useCallback(async () => {
    const image = imageRef.current;
    const pose = poseRef.current;
    const canvas = canvasRef.current;
    if (!image || !pose || !canvas || !image.naturalWidth) return;
    try {
      await pose.setOptions({ runningMode: 'IMAGE' });
      sizeCanvas(image.naturalWidth, image.naturalHeight);
      const result = pose.detect(image);
      if (result.landmarks?.[0]) {
        landmarksRef.current = result.landmarks[0];
        renderTryOn(canvas, result.landmarks[0], product);
        setStatus('Try-on ready — switch dresses below');
      } else {
        setStatus('We could not find a full person in this photo');
      }
    } catch (error) {
      console.error(error);
      setStatus('Could not process this photo');
    }
  }, [product, sizeCanvas]);

  useEffect(() => {
    if (landmarksRef.current && canvasRef.current) {
      renderTryOn(canvasRef.current, landmarksRef.current, product);
    }
  }, [product]);

  return <div className="tryon-stage">
    <div className="tryon-media-wrap">
      {mode === 'camera' && <video ref={videoRef} className="tryon-media mirrored" playsInline muted/>}
      {mode === 'photo' && photo && <img ref={imageRef} className="tryon-media" src={photo} alt="Your uploaded try-on" onLoad={detectPhoto}/>} 
      <canvas ref={canvasRef} className={`tryon-overlay ${mode === 'camera' ? 'mirrored' : ''}`}/>

      {mode === 'idle' && <div className="tryon-empty">
        <div className="tryon-orbit"><ScanLine size={34}/></div>
        <span className="eyebrow">VIRTUAL FITTING ROOM</span>
        <h2>See it on <em>you.</em></h2>
        <p>No avatar. No mannequin. Use your live camera or a full-body photo and try the collection on your own body.</p>
        <div className="tryon-start-actions">
          <button className="btn dark" disabled={!modelReady} onClick={startCamera}>
            {!modelReady ? <LoaderCircle className="spin" size={16}/> : <Camera size={16}/>} {modelReady ? 'Start camera' : 'Loading try-on'}
          </button>
          <label className={`btn outline ${!modelReady ? 'disabled' : ''}`}><ImagePlus size={16}/> Upload photo<input type="file" accept="image/*" disabled={!modelReady} onChange={(e) => usePhoto(e.target.files?.[0])}/></label>
        </div>
        {cameraError && <small className="camera-error">{cameraError}</small>}
        <div className="privacy"><ShieldCheck size={14}/><span>Your camera stays in your browser. Frames are not uploaded.</span></div>
      </div>}

      {mode !== 'idle' && <>
        <div className="tracking-status"><i/><span>{status}</span></div>
        <div className="stage-actions">
          <button onClick={() => { stopCamera(); setMode('idle'); landmarksRef.current = null; canvasRef.current?.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }}><X size={16}/> Close</button>
          {mode === 'photo' && <label><RefreshCcw size={15}/> Change photo<input type="file" accept="image/*" onChange={(e) => usePhoto(e.target.files?.[0])}/></label>}
        </div>
      </>}
    </div>
  </div>;
}

export default function Studio({ goHome, addToBag, initialProduct }) {
  const [product, setProduct] = useState(initialProduct || PRODUCTS[0]);
  const [size, setSize] = useState('M');

  return <main className="virtual-room">
    <div className="virtual-topbar">
      <button onClick={goHome}><ArrowLeft size={16}/> Boutique</button>
      <div><span>MAISON AARA</span><b>Virtual Try-On</b></div>
      <div className="desktop"><ShieldCheck size={14}/> Private on-device fitting</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel">
        <TryOnStage product={product}/>
        <div className="tryon-filmstrip">
          <div className="filmstrip-head"><div><span className="eyebrow">TRY ANOTHER LOOK</span><b>Switch instantly</b></div><small>{PRODUCTS.length} pieces</small></div>
          <div className="filmstrip-items">{PRODUCTS.map((item) => <button key={item.id} className={item.id === product.id ? 'active' : ''} onClick={() => setProduct(item)}>
            <GarmentArt product={item} compact/>
            <span>{item.name}</span>
          </button>)}</div>
        </div>
      </section>

      <aside className="virtual-product-panel">
        <span className="eyebrow">NOW TRYING ON</span>
        <div className="virtual-product-thumb"><GarmentArt product={product}/></div>
        <div className="virtual-product-title"><div><small>{product.type}</small><h1>{product.name}</h1></div><b>{money(product.price)}</b></div>
        <p className="virtual-copy">The garment follows your shoulders, waist and body position as you move. Stand far enough back to keep your upper body and hips visible.</p>

        <div className="virtual-size">
          <div><b>Choose size</b><u>Size guide</u></div>
          <div>{['XS', 'S', 'M', 'L', 'XL'].map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Check size={14}/><span><b>Live body tracking</b><small>Moves with your pose in real time</small></span></p>
          <p><Sparkles size={14}/><span><b>Instant style switching</b><small>Compare the collection without leaving camera</small></span></p>
          <p><ShieldCheck size={14}/><span><b>Private by design</b><small>Camera frames stay on your device</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
