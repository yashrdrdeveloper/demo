import { Check, ImagePlus, RefreshCcw, Shirt, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CALIBRATION_STEPS, detectVisibleBounds, renderTryOn } from './TryOnRenderer';

function loadImage(src, crossOrigin = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function VirtualTryOnStage({ product }) {
  const canvasRef = useRef(null);
  const personRef = useRef(null);
  const garmentRef = useRef(null);
  const personObjectUrlRef = useRef('');
  const garmentObjectUrlRef = useRef('');

  const [personReady, setPersonReady] = useState(false);
  const [garmentReady, setGarmentReady] = useState(false);
  const [garmentBounds, setGarmentBounds] = useState(null);
  const [anchors, setAnchors] = useState({});
  const [step, setStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [message, setMessage] = useState('Upload a full-body photo to begin.');
  const [customGarment, setCustomGarment] = useState(false);

  const redraw = useCallback(() => {
    renderTryOn({
      canvas: canvasRef.current,
      person: personRef.current,
      garment: garmentRef.current,
      bounds: garmentBounds,
      anchors,
      garmentType: product.garmentType,
      showCalibration: calibrating,
      activeStep: step,
    });
  }, [anchors, calibrating, garmentBounds, product.garmentType, step]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    let active = true;
    if (customGarment) return undefined;

    if (!product.tryOnAsset) {
      garmentRef.current = null;
      setGarmentBounds(null);
      setGarmentReady(false);
      setMessage(personReady ? 'Upload this product as a transparent front PNG/WebP to fit the exact garment.' : 'Upload a full-body photo to begin.');
      redraw();
      return undefined;
    }

    (async () => {
      try {
        const image = await loadImage(product.tryOnAsset, true);
        if (!active) return;
        garmentRef.current = image;
        setGarmentBounds(detectVisibleBounds(image));
        setGarmentReady(true);
        setMessage(personReady ? 'Exact garment loaded. Calibrate your body points.' : 'Exact garment loaded. Upload your full-body photo.');
      } catch (error) {
        console.error(error);
        if (active) setMessage('Could not load the garment asset. Upload a transparent garment image instead.');
      }
    })();

    return () => { active = false; };
  }, [customGarment, personReady, product, redraw]);

  useEffect(() => () => {
    if (personObjectUrlRef.current) URL.revokeObjectURL(personObjectUrlRef.current);
    if (garmentObjectUrlRef.current) URL.revokeObjectURL(garmentObjectUrlRef.current);
  }, []);

  const handlePerson = async (file) => {
    if (!file) return;
    if (personObjectUrlRef.current) URL.revokeObjectURL(personObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    personObjectUrlRef.current = url;
    try {
      const image = await loadImage(url);
      personRef.current = image;
      setPersonReady(true);
      setAnchors({});
      setStep(0);
      setCalibrating(false);
      setMessage(garmentRef.current ? 'Photo ready. Start body calibration.' : 'Photo ready. Upload the exact garment cutout.');
      requestAnimationFrame(redraw);
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
      garmentRef.current = image;
      setGarmentBounds(detectVisibleBounds(image));
      setGarmentReady(true);
      setCustomGarment(true);
      setMessage(personRef.current ? 'Exact garment loaded. Start calibration.' : 'Exact garment loaded. Upload your full-body photo.');
      requestAnimationFrame(redraw);
    } catch (error) {
      console.error(error);
      setMessage('Could not open that garment image. Use a transparent PNG/WebP if possible.');
    }
  };

  const startCalibration = () => {
    if (!personReady || !garmentReady) {
      setMessage('Add both your full-body photo and exact garment asset first.');
      return;
    }
    setAnchors({});
    setStep(0);
    setCalibrating(true);
    setMessage(`Click: ${CALIBRATION_STEPS[0].label}`);
  };

  const handleCanvasClick = (event) => {
    if (!calibrating || !canvasRef.current || !personRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const current = CALIBRATION_STEPS[step];
    const nextAnchors = { ...anchors, [current.key]: { x, y } };
    setAnchors(nextAnchors);

    const nextStep = step + 1;
    if (nextStep >= CALIBRATION_STEPS.length) {
      setStep(nextStep);
      setCalibrating(false);
      setMessage('Fitting complete. The displayed garment uses the exact SKU pixels you supplied.');
    } else {
      setStep(nextStep);
      setMessage(`Click: ${CALIBRATION_STEPS[nextStep].label}`);
    }
  };

  const clear = () => {
    setAnchors({});
    setStep(0);
    setCalibrating(false);
    setMessage(personReady && garmentReady ? 'Ready to calibrate again.' : 'Upload a full-body photo to begin.');
  };

  return <div className="nonai-stage">
    <div className="nonai-canvas-wrap">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className={calibrating ? 'is-calibrating' : ''}/>

      {!personReady && <div className="nonai-empty">
        <div className="nonai-icon"><Shirt size={34}/></div>
        <span className="eyebrow">NON-AI VIRTUAL FITTING</span>
        <h2>Your photo.<br/><em>The exact garment.</em></h2>
        <p>No generated person and no synthetic clothing. Upload a real full-body photo, then fit the actual transparent garment asset from your catalog.</p>
        <label className="btn dark"><ImagePlus size={16}/> Upload your photo<input type="file" accept="image/*" onChange={(event) => handlePerson(event.target.files?.[0])}/></label>
      </div>}

      {personReady && <div className="nonai-toolbar">
        <label><ImagePlus size={15}/> Change photo<input type="file" accept="image/*" onChange={(event) => handlePerson(event.target.files?.[0])}/></label>
        <label><Upload size={15}/> Exact garment PNG<input type="file" accept="image/png,image/webp,image/*" onChange={(event) => handleGarment(event.target.files?.[0])}/></label>
        <button onClick={startCalibration}><RefreshCcw size={15}/> Calibrate fit</button>
        <button onClick={clear}><X size={15}/> Reset</button>
      </div>}

      {personReady && <div className={`nonai-status ${calibrating ? 'active' : ''}`}>
        {calibrating ? <span>{step + 1}/{CALIBRATION_STEPS.length}</span> : <Check size={14}/>}<b>{message}</b>
      </div>}
    </div>

    <div className="nonai-explainer">
      <b>Exact-pixel fitting</b>
      <span>Use a transparent front-facing garment asset. Prints, logos, embroidery, necklines and sleeve shape come from that real asset.</span>
    </div>
  </div>;
}
