const SIZE_SCALE = { XS: .94, S: .97, M: 1, L: 1.04, XL: 1.08 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const visible = (point, threshold = .35) => !!point && (point.visibility ?? 1) >= threshold;

function point(landmarks, index, width, height) {
  const item = landmarks?.[index];
  if (!item) return null;
  return { x: item.x * width, y: item.y * height, z: item.z || 0, visibility: item.visibility ?? 1 };
}

function mix(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function average(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function expandPair(left, right, scale) {
  const center = average(left, right);
  return [
    { x: center.x + (left.x - center.x) * scale, y: left.y },
    { x: center.x + (right.x - center.x) * scale, y: right.y },
  ];
}

function polygon(ctx, points) {
  if (!points?.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((item) => ctx.lineTo(item.x, item.y));
  ctx.closePath();
}

function fillFabric(ctx, pathPoints, pattern, fallback = '#8b2441', alpha = .96) {
  ctx.save();
  polygon(ctx, pathPoints);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern || fallback;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function strokePath(ctx, points, color, width) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((item) => ctx.lineTo(item.x, item.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

export function prepareFabricTexture(image, crop = { x: 0, y: 0, w: 1, h: 1 }) {
  if (!image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const sx = clamp(crop.x || 0, 0, 1) * iw;
  const sy = clamp(crop.y || 0, 0, 1) * ih;
  const sw = clamp(crop.w || 1, .05, 1) * iw;
  const sh = clamp(crop.h || 1, .05, 1) * ih;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function smoothLandmarks(previous, current, alpha = .62) {
  if (!current) return previous || null;
  if (!previous || previous.length !== current.length) return current.map((item) => ({ ...item }));
  return current.map((item, index) => {
    const old = previous[index];
    const confidence = clamp(item.visibility ?? .6, .25, 1);
    const blend = alpha * confidence;
    return {
      ...item,
      x: old.x * (1 - blend) + item.x * blend,
      y: old.y * (1 - blend) + item.y * blend,
      z: old.z * (1 - blend) + item.z * blend,
    };
  });
}

function averageVisibility(landmarks, indexes) {
  const values = indexes.map((index) => landmarks?.[index]?.visibility ?? 0);
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function deepestVisibleLandmark(landmarks) {
  const indexes = [11,12,13,14,15,16,23,24,25,26,27,28,29,30,31,32];
  return indexes.reduce((bottom, index) => {
    const item = landmarks?.[index];
    if (!visible(item, .22)) return bottom;
    return Math.max(bottom, clamp(item.y, 0, 1));
  }, .45);
}

function describeCoverage(bottom, hipY, kneeY, ankleY) {
  if (bottom <= hipY + .04) return 'torso';
  if (bottom < kneeY - .03) return 'hips';
  if (bottom < ankleY - .03) return 'legs';
  return 'full';
}

export function analyzePersonMask(mask, landmarks = null) {
  try {
    const values = mask?.getAsUint8Array?.();
    const width = mask?.width;
    const height = mask?.height;
    if (!values || !width || !height) return null;

    const shoulderLeft = landmarks?.[11];
    const shoulderRight = landmarks?.[12];
    const hipLeft = landmarks?.[23];
    const hipRight = landmarks?.[24];
    const centers = [shoulderLeft, shoulderRight, hipLeft, hipRight].filter(Boolean).map((item) => item.x);
    const centerX = centers.length ? centers.reduce((sum, value) => sum + value, 0) / centers.length : .5;
    const shoulderSpan = shoulderLeft && shoulderRight ? Math.abs(shoulderRight.x - shoulderLeft.x) : .28;
    const halfWindow = clamp(shoulderSpan * 1.15, .16, .36);
    const startX = Math.max(0, Math.floor((centerX - halfWindow) * width));
    const endX = Math.min(width - 1, Math.ceil((centerX + halfWindow) * width));
    const requiredPerRow = Math.max(2, Math.floor((endX - startX) * .045));

    let minY = height;
    let maxY = -1;
    let minX = width;
    let maxX = -1;
    let personPixels = 0;

    for (let y = 0; y < height; y += 1) {
      let rowPixels = 0;
      for (let x = startX; x <= endX; x += 1) {
        const category = values[y * width + x];
        if (category === 0) continue;
        rowPixels += 1;
        personPixels += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      if (rowPixels >= requiredPerRow) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxY < 0 || personPixels < 10) return null;
    return {
      top: clamp(minY / height, 0, 1),
      bottom: clamp((maxY + 1) / height, 0, 1),
      left: clamp(minX / width, 0, 1),
      right: clamp((maxX + 1) / width, 0, 1),
      touchesBottom: maxY >= height - 3,
      source: 'pixels',
    };
  } catch {
    return null;
  }
}

export function analyzePose(landmarks, personRegion = null) {
  if (!landmarks?.length) {
    return { state: 'searching', orientation: 'front', coverage: 'none', visibleBottom: .45, message: 'Step into the frame', quality: 0 };
  }

  const shoulders = [landmarks[11], landmarks[12]];
  const hips = [landmarks[23], landmarks[24]];
  const hasShoulders = shoulders.every((item) => visible(item, .34));
  if (!hasShoulders) {
    return { state: 'searching', orientation: 'front', coverage: 'none', visibleBottom: personRegion?.bottom || .45, message: 'Keep your upper body visible', quality: .24 };
  }

  const usable = landmarks.filter((item, index) => index >= 11 && visible(item, .2));
  const xs = usable.map((item) => item.x);
  const centerX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : .5;
  const shoulderY = (shoulders[0].y + shoulders[1].y) / 2;
  const hipY = hips.every(Boolean) ? (hips[0].y + hips[1].y) / 2 : shoulderY + .28;
  const kneeY = [landmarks[25], landmarks[26]].filter(Boolean).reduce((sum, item) => sum + item.y, 0) / Math.max(1, [landmarks[25], landmarks[26]].filter(Boolean).length) || hipY + .22;
  const ankleY = [landmarks[27], landmarks[28]].filter(Boolean).reduce((sum, item) => sum + item.y, 0) / Math.max(1, [landmarks[27], landmarks[28]].filter(Boolean).length) || kneeY + .22;

  const faceScore = averageVisibility(landmarks, [0,1,2,3,4,5,6,7,8]);
  const shoulderDepth = Math.abs((shoulders[0]?.z || 0) - (shoulders[1]?.z || 0));
  const hipDepth = hips.every(Boolean) ? Math.abs((hips[0]?.z || 0) - (hips[1]?.z || 0)) : 0;
  const turnDepth = Math.max(shoulderDepth, hipDepth);
  let orientation = 'front';
  if (faceScore < .20 && averageVisibility(landmarks, [11,12,23,24]) > .42) orientation = 'back';
  else if (turnDepth > .18 || Math.abs((shoulders[0]?.visibility || 0) - (shoulders[1]?.visibility || 0)) > .36) orientation = 'side';

  const landmarkBottom = deepestVisibleLandmark(landmarks);
  const visibleBottom = clamp(personRegion?.bottom ?? landmarkBottom, shoulderY + .08, 1);
  const visibleTop = clamp(personRegion?.top ?? Math.min(shoulders[0].y, shoulders[1].y) - .16, 0, 1);
  const coverage = describeCoverage(visibleBottom, hipY, kneeY, ankleY);
  const bodyHeight = visibleBottom - visibleTop;

  if (centerX < .20 || centerX > .80) {
    return { state: 'guidance', orientation, coverage, visibleBottom, visibleTop, message: 'Move toward the center', quality: .52 };
  }
  if (bodyHeight < .24) {
    return { state: 'guidance', orientation, coverage, visibleBottom, visibleTop, message: 'Come a little closer', quality: .48 };
  }

  const orientationText = orientation === 'back' ? 'Back view' : orientation === 'side' ? 'Side view' : 'Front view';
  const coverageText = coverage === 'full' ? 'full saree' : coverage === 'legs' ? 'saree through the legs' : coverage === 'hips' ? 'saree through the hips' : 'upper saree';
  const pixelQuality = personRegion?.source === 'pixels' ? .96 : .78;
  return {
    state: 'locked',
    orientation,
    coverage,
    visibleBottom,
    visibleTop,
    message: `${orientationText} · ${coverageText}`,
    quality: pixelQuality,
  };
}

function drawArmSegment(ctx, source, a, b, width) {
  if (!a || !b || !source) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  const half = width / 2;
  const shape = [
    { x: a.x + nx * half, y: a.y + ny * half },
    { x: b.x + nx * half * .78, y: b.y + ny * half * .78 },
    { x: b.x - nx * half * .78, y: b.y - ny * half * .78 },
    { x: a.x - nx * half, y: a.y - ny * half },
  ];
  ctx.save();
  polygon(ctx, shape);
  ctx.clip();
  ctx.drawImage(source, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export function drawPoseOcclusion(ctx, source, landmarks) {
  if (!landmarks || !source) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const shoulderSpan = Math.abs((landmarks[11]?.x || 0) - (landmarks[12]?.x || 0)) * w;
  const armWidth = Math.max(12, shoulderSpan * .18);
  [[11,13,15],[12,14,16]].forEach(([s,e,r]) => {
    const shoulder = point(landmarks, s, w, h);
    const elbow = point(landmarks, e, w, h);
    const wrist = point(landmarks, r, w, h);
    if (visible(landmarks[s], .25) && visible(landmarks[e], .25)) drawArmSegment(ctx, source, shoulder, elbow, armWidth);
    if (visible(landmarks[e], .25) && visible(landmarks[r], .25)) drawArmSegment(ctx, source, elbow, wrist, armWidth * .78);
  });
}

let maskCanvas;
let maskImageData;
let maskedSourceCanvas;

export function createSkinMaskCanvas(mask) {
  try {
    if (!mask) return null;
    const values = mask.getAsUint8Array?.();
    const width = mask.width;
    const height = mask.height;
    if (!values || !width || !height) return null;
    if (!maskCanvas) maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const mctx = maskCanvas.getContext('2d');
    if (!maskImageData || maskImageData.width !== width || maskImageData.height !== height) {
      maskImageData = mctx.createImageData(width, height);
    }
    const data = maskImageData.data;
    for (let i = 0; i < values.length; i += 1) {
      const category = values[i];
      const alpha = category === 2 || category === 3 ? 255 : 0;
      const offset = i * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = alpha;
    }
    mctx.putImageData(maskImageData, 0, 0);
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(maskCanvas, 0, 0);
    return copy;
  } catch {
    return null;
  }
}

function drawSkinOcclusion(ctx, source, skinMask) {
  if (!skinMask || !source) return false;
  if (!maskedSourceCanvas) maskedSourceCanvas = document.createElement('canvas');
  maskedSourceCanvas.width = ctx.canvas.width;
  maskedSourceCanvas.height = ctx.canvas.height;
  const off = maskedSourceCanvas.getContext('2d');
  off.clearRect(0, 0, maskedSourceCanvas.width, maskedSourceCanvas.height);
  off.globalCompositeOperation = 'source-over';
  off.drawImage(source, 0, 0, maskedSourceCanvas.width, maskedSourceCanvas.height);
  off.globalCompositeOperation = 'destination-in';
  off.drawImage(skinMask, 0, 0, maskedSourceCanvas.width, maskedSourceCanvas.height);
  off.globalCompositeOperation = 'source-over';
  ctx.drawImage(maskedSourceCanvas, 0, 0);
  return true;
}

function resolvedHips(landmarks, width, height, shoulderL, shoulderR, visibleBottomY) {
  const hipL = point(landmarks, 23, width, height);
  const hipR = point(landmarks, 24, width, height);
  if (visible(landmarks?.[23], .18) && visible(landmarks?.[24], .18)) return [hipL, hipR];

  const shoulderCenter = average(shoulderL, shoulderR);
  const shoulderSpan = Math.max(20, Math.abs(shoulderR.x - shoulderL.x));
  const estimatedY = Math.min(visibleBottomY - shoulderSpan * .12, shoulderCenter.y + shoulderSpan * 1.55);
  return [
    { x: shoulderCenter.x - shoulderSpan * .37, y: estimatedY },
    { x: shoulderCenter.x + shoulderSpan * .37, y: estimatedY },
  ];
}

function frontPallu(shoulderL, waistR, hipL, shoulderSpan, hipSpan, bottomY) {
  const outer = {
    x: Math.max(0, shoulderL.x - shoulderSpan * .58),
    y: Math.min(bottomY, hipL.y + hipSpan * 1.28),
  };
  return [
    { x: waistR.x + hipSpan * .04, y: waistR.y },
    { x: shoulderL.x + shoulderSpan * .13, y: shoulderL.y - shoulderSpan * .05 },
    { x: shoulderL.x - shoulderSpan * .22, y: shoulderL.y + shoulderSpan * .08 },
    outer,
    { x: hipL.x - hipSpan * .20, y: Math.min(bottomY, hipL.y + hipSpan * .18) },
  ];
}

function backPallu(shoulderR, waistL, hipR, shoulderSpan, hipSpan, bottomY) {
  const outer = {
    x: Math.min(ctxWidthSafe(shoulderR.x + shoulderSpan * .58), shoulderR.x + shoulderSpan * .58),
    y: Math.min(bottomY, hipR.y + hipSpan * 1.18),
  };
  return [
    { x: waistL.x - hipSpan * .04, y: waistL.y },
    { x: shoulderR.x - shoulderSpan * .12, y: shoulderR.y - shoulderSpan * .04 },
    { x: shoulderR.x + shoulderSpan * .24, y: shoulderR.y + shoulderSpan * .08 },
    outer,
    { x: hipR.x + hipSpan * .18, y: Math.min(bottomY, hipR.y + hipSpan * .16) },
  ];
}

function ctxWidthSafe(value) {
  return Math.max(0, value);
}

export function drawSareeTryOn({ canvas, source, landmarks, fabric, product, size = 'M', viewState = null, skinMask = null, drawSource = false }) {
  if (!canvas || !source || !landmarks) return;
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  if (!width || !height) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  if (drawSource) ctx.drawImage(source, 0, 0, width, height);

  const shoulderL0 = point(landmarks, 11, width, height);
  const shoulderR0 = point(landmarks, 12, width, height);
  if (![shoulderL0, shoulderR0].every(Boolean)) return;

  const scale = SIZE_SCALE[size] || 1;
  const [shoulderL, shoulderR] = expandPair(shoulderL0, shoulderR0, scale);
  const shoulderCenter = average(shoulderL, shoulderR);
  const shoulderSpan = Math.max(20, Math.abs(shoulderR.x - shoulderL.x));
  const requestedBottom = clamp(viewState?.visibleBottom ?? deepestVisibleLandmark(landmarks), .18, .995) * height;
  const minimumBottom = shoulderCenter.y + shoulderSpan * .85;
  const bottomY = clamp(requestedBottom, minimumBottom, height * .995);
  const [hipL0, hipR0] = resolvedHips(landmarks, width, height, shoulderL, shoulderR, bottomY);
  const [hipL, hipR] = expandPair(hipL0, hipR0, scale);
  const waistL = mix(shoulderL, hipL, .72);
  const waistR = mix(shoulderR, hipR, .72);
  const hipCenter = average(hipL, hipR);
  const hipSpan = Math.max(20, Math.hypot(hipR.x - hipL.x, hipR.y - hipL.y));
  const orientation = viewState?.orientation || 'front';

  const fabricPattern = fabric ? ctx.createPattern(fabric, 'repeat') : null;
  try { fabricPattern?.setTransform?.(new DOMMatrix().scale(.72)); } catch {}
  const fallback = '#8f2948';
  const accent = product?.accent || '#d9b66f';

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, bottomY + 2);
  ctx.clip();

  const blouseTopL = { x: shoulderL.x - shoulderSpan * .12, y: shoulderL.y + shoulderSpan * .04 };
  const blouseTopR = { x: shoulderR.x + shoulderSpan * .12, y: shoulderR.y + shoulderSpan * .04 };
  const blouseBottomY = Math.min(bottomY, Math.max(waistL.y, waistR.y));
  const blouseWaistL = { x: waistL.x, y: blouseBottomY };
  const blouseWaistR = { x: waistR.x, y: blouseBottomY };
  fillFabric(ctx, [blouseTopL, blouseTopR, blouseWaistR, blouseWaistL], fabricPattern, fallback, orientation === 'back' ? .88 : .92);

  if (bottomY > blouseBottomY + hipSpan * .12) {
    const bottomHalf = Math.max(hipSpan * .70, shoulderSpan * .54);
    const lowerLeft = { x: hipCenter.x - bottomHalf, y: bottomY };
    const lowerRight = { x: hipCenter.x + bottomHalf, y: bottomY };
    const lower = [
      { x: waistL.x - hipSpan * .08, y: blouseBottomY },
      { x: waistR.x + hipSpan * .08, y: blouseBottomY },
      lowerRight,
      lowerLeft,
    ];
    fillFabric(ctx, lower, fabricPattern, fallback, .97);

    const pleatCenter = (waistL.x + waistR.x) / 2;
    const pleatTopY = blouseBottomY;
    const pleatBottomY = Math.max(pleatTopY + 2, bottomY - hipSpan * .08);
    if (orientation !== 'back' && pleatBottomY > pleatTopY + hipSpan * .3) {
      for (let i = -2; i <= 2; i += 1) {
        const topX = pleatCenter + i * hipSpan * .075;
        const bottomX = pleatCenter + i * hipSpan * .105;
        ctx.save();
        ctx.globalAlpha = .14 + (2 - Math.abs(i)) * .025;
        ctx.strokeStyle = i % 2 ? '#fff' : '#241714';
        ctx.lineWidth = Math.max(2, hipSpan * .022);
        ctx.beginPath();
        ctx.moveTo(topX, pleatTopY + hipSpan * .04);
        ctx.lineTo(bottomX, pleatBottomY);
        ctx.stroke();
        ctx.restore();
      }
    }

    strokePath(ctx, [lowerLeft, lowerRight], accent, Math.max(4, hipSpan * .055));
    strokePath(ctx, [waistL, waistR], accent, Math.max(2, hipSpan * .025));
  }

  let pallu;
  if (orientation === 'back') {
    pallu = backPallu(shoulderR, waistL, hipR, shoulderSpan, hipSpan, bottomY);
  } else if (orientation === 'side') {
    const nearShoulder = shoulderL.x < shoulderR.x ? shoulderL : shoulderR;
    const nearHip = hipL.x < hipR.x ? hipL : hipR;
    pallu = [
      { x: nearHip.x, y: Math.min(bottomY, nearHip.y) },
      { x: nearShoulder.x, y: nearShoulder.y - shoulderSpan * .03 },
      { x: nearShoulder.x - shoulderSpan * .18, y: nearShoulder.y + shoulderSpan * .08 },
      { x: nearHip.x - shoulderSpan * .22, y: Math.min(bottomY, nearHip.y + hipSpan * .72) },
    ];
  } else {
    pallu = frontPallu(shoulderL, waistR, hipL, shoulderSpan, hipSpan, bottomY);
  }

  fillFabric(ctx, pallu, fabricPattern, fallback, orientation === 'side' ? .90 : .94);
  strokePath(ctx, pallu.slice(2), accent, Math.max(4, hipSpan * .05));
  ctx.restore();

  if (!drawSkinOcclusion(ctx, source, skinMask)) drawPoseOcclusion(ctx, source, landmarks);
}
