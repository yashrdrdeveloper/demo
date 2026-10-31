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

export function analyzePose(landmarks) {
  if (!landmarks?.length) {
    return { state: 'searching', mode: 'none', message: 'Step into the frame', quality: 0 };
  }

  const shoulders = [landmarks[11], landmarks[12]];
  const hips = [landmarks[23], landmarks[24]];
  const ankles = [landmarks[27], landmarks[28]];
  const knees = [landmarks[25], landmarks[26]];

  if (![...shoulders, ...hips].every((item) => visible(item, .42))) {
    return { state: 'searching', mode: 'none', message: 'Face the camera so shoulders and hips are visible', quality: .25 };
  }

  const usable = landmarks.filter((item, index) => index >= 11 && visible(item, .25));
  const xs = usable.map((item) => item.x);
  const ys = usable.map((item) => item.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bodyHeight = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const fullBody = ankles.every((item) => visible(item, .30)) && knees.every((item) => visible(item, .30));
  const depthTurn = Math.max(Math.abs((shoulders[0].z || 0) - (shoulders[1].z || 0)), Math.abs((hips[0].z || 0) - (hips[1].z || 0)));

  if (centerX < .27 || centerX > .73) {
    return { state: 'guidance', mode: fullBody ? 'full' : 'upper', message: 'Move to the center of the frame', quality: .55 };
  }
  if (bodyHeight < .34) {
    return { state: 'guidance', mode: fullBody ? 'full' : 'upper', message: 'Come a little closer', quality: .55 };
  }
  if (bodyHeight > .92) {
    return { state: 'guidance', mode: fullBody ? 'full' : 'upper', message: 'Move back a little', quality: .55 };
  }
  if (depthTurn > .17) {
    return { state: 'guidance', mode: fullBody ? 'full' : 'upper', message: 'Turn slightly toward the camera', quality: .58 };
  }
  if (!fullBody) {
    return { state: 'locked', mode: 'upper', message: 'Upper-body saree preview locked', quality: .76 };
  }

  return { state: 'locked', mode: 'full', message: 'Full-body saree fit locked', quality: .95 };
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

export function drawSareeTryOn({ canvas, source, landmarks, fabric, product, size = 'M', previewMode = 'full', skinMask = null, drawSource = false }) {
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
  const hipL0 = point(landmarks, 23, width, height);
  const hipR0 = point(landmarks, 24, width, height);
  if (![shoulderL0, shoulderR0, hipL0, hipR0].every(Boolean)) return;

  const scale = SIZE_SCALE[size] || 1;
  const [shoulderL, shoulderR] = expandPair(shoulderL0, shoulderR0, scale);
  const [hipL, hipR] = expandPair(hipL0, hipR0, scale);
  const waistL = mix(shoulderL, hipL, .72);
  const waistR = mix(shoulderR, hipR, .72);
  const shoulderCenter = average(shoulderL, shoulderR);
  const hipCenter = average(hipL, hipR);
  const hipSpan = Math.max(20, Math.hypot(hipR.x - hipL.x, hipR.y - hipL.y));
  const shoulderSpan = Math.max(20, Math.abs(shoulderR.x - shoulderL.x));

  let bottomY;
  if (previewMode === 'full' && visible(landmarks[27], .2) && visible(landmarks[28], .2)) {
    bottomY = Math.min(height * .985, Math.max(landmarks[27].y, landmarks[28].y) * height + hipSpan * .14);
  } else {
    bottomY = Math.min(height * .96, hipCenter.y + Math.max(height * .28, hipSpan * 2.2));
  }

  const fabricPattern = fabric ? ctx.createPattern(fabric, 'repeat') : null;
  try { fabricPattern?.setTransform?.(new DOMMatrix().scale(.72)); } catch {}
  const fallback = '#8f2948';
  const accent = product?.accent || '#d9b66f';

  // Blouse base.
  const blouseTopL = { x: shoulderL.x - shoulderSpan * .12, y: shoulderL.y + shoulderSpan * .04 };
  const blouseTopR = { x: shoulderR.x + shoulderSpan * .12, y: shoulderR.y + shoulderSpan * .04 };
  fillFabric(ctx, [blouseTopL, blouseTopR, waistR, waistL], fabricPattern, fallback, .92);

  // Wrapped lower saree.
  const bottomHalf = Math.max(hipSpan * .70, shoulderSpan * .54);
  const lowerLeft = { x: hipCenter.x - bottomHalf, y: bottomY };
  const lowerRight = { x: hipCenter.x + bottomHalf, y: bottomY };
  const lower = [
    { x: waistL.x - hipSpan * .08, y: waistL.y },
    { x: waistR.x + hipSpan * .08, y: waistR.y },
    lowerRight,
    lowerLeft,
  ];
  fillFabric(ctx, lower, fabricPattern, fallback, .97);

  // Center pleats preserve fabric texture while adding depth cues.
  const pleatCenter = (waistL.x + waistR.x) / 2;
  const pleatTopY = (waistL.y + waistR.y) / 2;
  const pleatBottomY = bottomY - hipSpan * .08;
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

  // Pallu from right waist across the torso to left shoulder, then flowing down the left side.
  const palluOuter = {
    x: Math.max(0, shoulderL.x - shoulderSpan * .58),
    y: previewMode === 'full' ? Math.min(bottomY - hipSpan * .35, hipCenter.y + hipSpan * 1.28) : Math.min(height * .94, hipCenter.y + hipSpan * 1.1),
  };
  const pallu = [
    { x: waistR.x + hipSpan * .04, y: waistR.y },
    { x: shoulderL.x + shoulderSpan * .13, y: shoulderL.y - shoulderSpan * .05 },
    { x: shoulderL.x - shoulderSpan * .22, y: shoulderL.y + shoulderSpan * .08 },
    palluOuter,
    { x: hipL.x - hipSpan * .20, y: hipL.y + hipSpan * .18 },
  ];
  fillFabric(ctx, pallu, fabricPattern, fallback, .94);

  // Realistic borders.
  strokePath(ctx, [lowerLeft, lowerRight], accent, Math.max(4, hipSpan * .055));
  strokePath(ctx, [pallu[2], palluOuter, pallu[4]], accent, Math.max(4, hipSpan * .05));
  strokePath(ctx, [waistL, waistR], accent, Math.max(2, hipSpan * .025));

  // Keep the customer's arms/hands visually in front of the saree.
  if (!drawSkinOcclusion(ctx, source, skinMask)) drawPoseOcclusion(ctx, source, landmarks);
}
