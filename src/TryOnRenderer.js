export const CALIBRATION_STEPS = [
  ['leftShoulder', 'Left shoulder edge'],
  ['rightShoulder', 'Right shoulder edge'],
  ['leftWaist', 'Left waist edge'],
  ['rightWaist', 'Right waist edge'],
  ['leftHip', 'Left hip edge'],
  ['rightHip', 'Right hip edge'],
  ['leftHem', 'Left garment hem'],
  ['rightHem', 'Right garment hem'],
].map(([key, label]) => ({ key, label }));

const toPoint = (anchor, width, height) => ({ x: anchor.x * width, y: anchor.y * height });

function affine(source, target) {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = target;
  const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(den) < 0.00001) return null;

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den;
  const e = (
    d0.x * (s1.x * s2.y - s2.x * s1.y) +
    d1.x * (s2.x * s0.y - s0.x * s2.y) +
    d2.x * (s0.x * s1.y - s1.x * s0.y)
  ) / den;

  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den;
  const f = (
    d0.y * (s1.x * s2.y - s2.x * s1.y) +
    d1.y * (s2.x * s0.y - s0.x * s2.y) +
    d2.y * (s0.x * s1.y - s1.x * s0.y)
  ) / den;

  return { a, b, c, d, e, f };
}

function drawTriangle(ctx, image, source, target) {
  const matrix = affine(source, target);
  if (!matrix) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(target[0].x, target[0].y);
  ctx.lineTo(target[1].x, target[1].y);
  ctx.lineTo(target[2].x, target[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function drawBand(ctx, image, sourceRect, targetQuad) {
  const { x0, y0, x1, y1 } = sourceRect;
  const [tl, tr, br, bl] = targetQuad;

  drawTriangle(
    ctx,
    image,
    [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }],
    [tl, tr, br],
  );
  drawTriangle(
    ctx,
    image,
    [{ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }],
    [tl, br, bl],
  );
}

export function detectVisibleBounds(image) {
  try {
    const canvas = document.createElement('canvas');
    const max = 700;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 24) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!found) throw new Error('No visible pixels');
    const inv = 1 / scale;
    return {
      x: minX * inv,
      y: minY * inv,
      width: Math.max(1, (maxX - minX) * inv),
      height: Math.max(1, (maxY - minY) * inv),
    };
  } catch {
    return { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  }
}

export function drawExactGarment(ctx, garment, bounds, anchors, garmentType = 'full') {
  if (!garment || !bounds || !anchors) return;
  const required = ['leftShoulder', 'rightShoulder', 'leftWaist', 'rightWaist', 'leftHip', 'rightHip'];
  if (required.some((key) => !anchors[key])) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const point = (key) => toPoint(anchors[key], w, h);

  const shoulderL = point('leftShoulder');
  const shoulderR = point('rightShoulder');
  const waistL = point('leftWaist');
  const waistR = point('rightWaist');
  const hipL = point('leftHip');
  const hipR = point('rightHip');
  const hemL = anchors.leftHem ? point('leftHem') : hipL;
  const hemR = anchors.rightHem ? point('rightHem') : hipR;

  const x0 = bounds.x;
  const x1 = bounds.x + bounds.width;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;

  if (garmentType === 'top') {
    const yMid = top + bounds.height * 0.52;
    drawBand(ctx, garment, { x0, y0: top, x1, y1: yMid }, [shoulderL, shoulderR, waistR, waistL]);
    drawBand(ctx, garment, { x0, y0: yMid, x1, y1: bottom }, [waistL, waistR, hipR, hipL]);
    return;
  }

  const yWaist = top + bounds.height * 0.40;
  const yHip = top + bounds.height * 0.64;
  drawBand(ctx, garment, { x0, y0: top, x1, y1: yWaist }, [shoulderL, shoulderR, waistR, waistL]);
  drawBand(ctx, garment, { x0, y0: yWaist, x1, y1: yHip }, [waistL, waistR, hipR, hipL]);
  drawBand(ctx, garment, { x0, y0: yHip, x1, y1: bottom }, [hipL, hipR, hemR, hemL]);
}

export function renderTryOn({ canvas, person, garment, bounds, anchors, garmentType, showCalibration = false, activeStep = 0 }) {
  if (!canvas || !person) return;
  const ctx = canvas.getContext('2d');
  const width = person.naturalWidth || person.width;
  const height = person.naturalHeight || person.height;
  if (!width || !height) return;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(person, 0, 0, width, height);

  if (garment && bounds && anchors) {
    drawExactGarment(ctx, garment, bounds, anchors, garmentType);
  }

  if (showCalibration) {
    ctx.save();
    ctx.lineWidth = Math.max(2, width * .002);
    CALIBRATION_STEPS.forEach((step, index) => {
      const anchor = anchors?.[step.key];
      if (!anchor) return;
      const x = anchor.x * width;
      const y = anchor.y * height;
      const size = Math.max(8, width * .009);
      ctx.strokeStyle = index === activeStep ? '#ffcf70' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    });
    ctx.restore();
  }
}
