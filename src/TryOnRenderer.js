const textureCache = new Map();

const point = (landmark, width, height) => ({
  x: landmark.x * width,
  y: landmark.y * height,
  visibility: landmark.visibility ?? 1,
});

const safeAverage = (a, b) => (a + b) / 2;

function getTextureEntry(product) {
  if (!product?.textureUrl) return null;
  let entry = textureCache.get(product.textureUrl);
  if (entry) return entry;

  const image = new Image();
  image.crossOrigin = 'anonymous';
  entry = { image, ready: false, failed: false, tile: null, promise: null };
  entry.promise = new Promise((resolve) => {
    image.onload = () => {
      entry.ready = true;
      entry.tile = buildTextureTile(image, product.textureCrop);
      resolve(entry);
    };
    image.onerror = () => {
      entry.failed = true;
      resolve(entry);
    };
  });
  image.src = product.textureUrl;
  textureCache.set(product.textureUrl, entry);
  return entry;
}

function buildTextureTile(image, crop) {
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.max(0, Math.min(image.naturalWidth - 1, image.naturalWidth * c.x));
  const sy = Math.max(0, Math.min(image.naturalHeight - 1, image.naturalHeight * c.y));
  const sw = Math.max(8, Math.min(image.naturalWidth - sx, image.naturalWidth * c.w));
  const sh = Math.max(8, Math.min(image.naturalHeight - sy, image.naturalHeight * c.h));
  const tile = document.createElement('canvas');
  tile.width = 420;
  tile.height = 420;
  const tctx = tile.getContext('2d');
  tctx.drawImage(image, sx, sy, sw, sh, 0, 0, tile.width, tile.height);
  return tile;
}

export function preloadGarmentTexture(product) {
  const entry = getTextureEntry(product);
  return entry?.promise || Promise.resolve(null);
}

function bodyGeometry(landmarks, width, height) {
  const shoulders = [point(landmarks[11], width, height), point(landmarks[12], width, height)].sort((a, b) => a.x - b.x);
  const hips = [point(landmarks[23], width, height), point(landmarks[24], width, height)].sort((a, b) => a.x - b.x);
  const knees = [point(landmarks[25], width, height), point(landmarks[26], width, height)];
  const ankles = [point(landmarks[27], width, height), point(landmarks[28], width, height)];

  const [leftShoulder, rightShoulder] = shoulders;
  const [leftHip, rightHip] = hips;
  const shoulderWidth = Math.max(rightShoulder.x - leftShoulder.x, width * .085);
  const hipWidth = Math.max(rightHip.x - leftHip.x, shoulderWidth * .66);
  const centerX = safeAverage(leftHip.x, rightHip.x);
  const shoulderY = safeAverage(leftShoulder.y, rightShoulder.y);
  const hipY = safeAverage(leftHip.y, rightHip.y);
  const kneeY = safeAverage(knees[0].y, knees[1].y);
  const ankleY = Math.min(safeAverage(ankles[0].y, ankles[1].y), height * .97);
  const torso = Math.max(hipY - shoulderY, shoulderWidth * .9);
  const waistY = hipY - torso * .34;

  return { leftShoulder, rightShoulder, leftHip, rightHip, shoulderWidth, hipWidth, centerX, shoulderY, waistY, hipY, kneeY, ankleY, torso };
}

function clothGradient(ctx, product, x1, y1, x2, y2) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, '#0000001f');
  gradient.addColorStop(.13, product.color);
  gradient.addColorStop(.32, '#ffffff20');
  gradient.addColorStop(.5, product.color);
  gradient.addColorStop(.68, '#00000018');
  gradient.addColorStop(.86, '#ffffff1d');
  gradient.addColorStop(1, product.color);
  return gradient;
}

function applyPhotographicTexture(ctx, product, geometry) {
  const entry = getTextureEntry(product);
  if (!entry?.ready || !entry.tile) return;
  const pattern = ctx.createPattern(entry.tile, 'repeat');
  if (!pattern) return;

  const scale = Math.max(.28, geometry.shoulderWidth / 300);
  if (pattern.setTransform && typeof DOMMatrix !== 'undefined') {
    pattern.setTransform(new DOMMatrix().scale(scale, scale).translate(-geometry.centerX / scale, -geometry.shoulderY / scale));
  }

  ctx.save();
  ctx.globalAlpha = product.textureOpacity ?? .68;
  ctx.globalCompositeOperation = product.textureBlend || 'multiply';
  ctx.fillStyle = pattern;
  ctx.fill();
  ctx.restore();
}

function fillCloth(ctx, product, geometry, pathFn, shadow = true) {
  ctx.save();
  pathFn();
  if (shadow) {
    ctx.shadowColor = 'rgba(22,13,10,.26)';
    ctx.shadowBlur = Math.max(geometry.shoulderWidth * .07, 7);
    ctx.shadowOffsetY = geometry.shoulderWidth * .035;
  }
  ctx.fillStyle = clothGradient(ctx, product, geometry.centerX - geometry.shoulderWidth, geometry.shoulderY, geometry.centerX + geometry.shoulderWidth, geometry.ankleY);
  ctx.fill();
  applyPhotographicTexture(ctx, product, geometry);
  ctx.restore();
}

function eraseNeck(ctx, g, scaleX = .18, scaleY = .14) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(g.centerX, g.shoulderY + g.shoulderWidth * .015, g.shoulderWidth * scaleX, g.shoulderWidth * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function revealRealArms(ctx, landmarks, width, height, g) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(g.shoulderWidth * .15, 13);
  ctx.strokeStyle = '#000';
  [[11, 13, 15], [12, 14, 16]].forEach(([s, e, w]) => {
    const shoulder = point(landmarks[s], width, height);
    const elbow = point(landmarks[e], width, height);
    const wrist = point(landmarks[w], width, height);
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(wrist.x, wrist.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawSleeves(ctx, landmarks, width, height, g, product, length = 'elbow') {
  const factor = length === 'wrist' ? 1 : length === 'short' ? .42 : .68;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(g.shoulderWidth * .22, 16);
  const texture = getTextureEntry(product);
  ctx.strokeStyle = texture?.ready && texture.tile ? (ctx.createPattern(texture.tile, 'repeat') || product.color) : product.color;
  ctx.shadowColor = 'rgba(20,12,10,.2)';
  ctx.shadowBlur = g.shoulderWidth * .045;

  [[11, 13, 15], [12, 14, 16]].forEach(([s, e, w]) => {
    const shoulder = point(landmarks[s], width, height);
    const elbow = point(landmarks[e], width, height);
    const wrist = point(landmarks[w], width, height);
    const target = length === 'wrist' ? wrist : { x: shoulder.x + (elbow.x - shoulder.x) * factor, y: shoulder.y + (elbow.y - shoulder.y) * factor };
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y + g.shoulderWidth * .04);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawFabricFolds(ctx, g, startY, bottomY, spread, count = 7) {
  ctx.save();
  ctx.globalAlpha = .2;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.2, g.shoulderWidth * .006);
  const half = Math.floor(count / 2);
  for (let i = -half; i <= half; i += 1) {
    const ratio = half ? i / half : 0;
    ctx.beginPath();
    ctx.moveTo(g.centerX + ratio * g.shoulderWidth * .22, startY);
    ctx.quadraticCurveTo(g.centerX + ratio * spread * .24, (startY + bottomY) / 2, g.centerX + ratio * spread * .46, bottomY - g.shoulderWidth * .06);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBorder(ctx, product, g, y, width, lineWidth = .02) {
  ctx.save();
  ctx.strokeStyle = product.accent || '#d6b477';
  ctx.globalAlpha = .9;
  ctx.lineWidth = Math.max(3, g.shoulderWidth * lineWidth);
  ctx.beginPath();
  ctx.moveTo(g.centerX - width / 2, y);
  ctx.quadraticCurveTo(g.centerX, y + g.shoulderWidth * .05, g.centerX + width / 2, y);
  ctx.stroke();
  ctx.restore();
}

function drawOnePiece(ctx, landmarks, width, height, g, product, isGown = false) {
  const shoulderPad = g.shoulderWidth * .1;
  const waistWidth = g.shoulderWidth * .42;
  const bottomY = isGown ? g.ankleY : Math.min(g.ankleY, g.kneeY + (g.ankleY - g.kneeY) * .48);
  const flare = isGown ? g.shoulderWidth * 1.62 : g.shoulderWidth * 1.12;

  fillCloth(ctx, product, g, () => {
    ctx.beginPath();
    ctx.moveTo(g.leftShoulder.x - shoulderPad, g.leftShoulder.y + g.shoulderWidth * .05);
    ctx.quadraticCurveTo(g.centerX - g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .1, g.centerX, g.shoulderY);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .1, g.rightShoulder.x + shoulderPad, g.rightShoulder.y + g.shoulderWidth * .05);
    ctx.lineTo(g.centerX + waistWidth, g.waistY);
    ctx.quadraticCurveTo(g.centerX + g.hipWidth * .62, g.hipY, g.centerX + flare * .5, bottomY);
    ctx.quadraticCurveTo(g.centerX, bottomY + g.shoulderWidth * .07, g.centerX - flare * .5, bottomY);
    ctx.quadraticCurveTo(g.centerX - g.hipWidth * .62, g.hipY, g.centerX - waistWidth, g.waistY);
    ctx.closePath();
  });

  drawSleeves(ctx, landmarks, width, height, g, product, isGown ? 'elbow' : 'short');
  eraseNeck(ctx, g, .18, .14);
  drawFabricFolds(ctx, g, g.waistY, bottomY, flare, isGown ? 9 : 7);
  drawBorder(ctx, product, g, bottomY - g.shoulderWidth * .07, flare * .84, isGown ? .022 : .015);
}

function drawKurti(ctx, landmarks, width, height, g, product) {
  const shoulderPad = g.shoulderWidth * .09;
  const hemY = Math.min(g.ankleY, g.kneeY + (g.ankleY - g.kneeY) * .22);
  const hemWidth = Math.max(g.hipWidth * 1.12, g.shoulderWidth * .76);

  fillCloth(ctx, product, g, () => {
    ctx.beginPath();
    ctx.moveTo(g.leftShoulder.x - shoulderPad, g.leftShoulder.y + g.shoulderWidth * .05);
    ctx.quadraticCurveTo(g.centerX - g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .1, g.centerX, g.shoulderY);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .34, g.shoulderY - g.shoulderWidth * .1, g.rightShoulder.x + shoulderPad, g.rightShoulder.y + g.shoulderWidth * .05);
    ctx.lineTo(g.centerX + g.shoulderWidth * .43, g.waistY);
    ctx.lineTo(g.centerX + hemWidth * .5, hemY);
    ctx.lineTo(g.centerX - hemWidth * .5, hemY);
    ctx.lineTo(g.centerX - g.shoulderWidth * .43, g.waistY);
    ctx.closePath();
  });

  drawSleeves(ctx, landmarks, width, height, g, product, 'elbow');
  eraseNeck(ctx, g, .16, .14);
  drawBorder(ctx, product, g, hemY - g.shoulderWidth * .05, hemWidth * .86, .018);
}

function drawSaree(ctx, landmarks, width, height, g, product) {
  const blouseBottom = g.waistY + g.torso * .08;
  const skirtTop = g.waistY + g.torso * .02;
  const wrapWidth = Math.max(g.hipWidth * 1.05, g.shoulderWidth * .82);
  const bottomWidth = g.shoulderWidth * 1.08;

  fillCloth(ctx, product, g, () => {
    ctx.beginPath();
    ctx.moveTo(g.leftShoulder.x - g.shoulderWidth * .08, g.leftShoulder.y + g.shoulderWidth * .04);
    ctx.quadraticCurveTo(g.centerX - g.shoulderWidth * .32, g.shoulderY - g.shoulderWidth * .08, g.centerX, g.shoulderY);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .32, g.shoulderY - g.shoulderWidth * .08, g.rightShoulder.x + g.shoulderWidth * .08, g.rightShoulder.y + g.shoulderWidth * .04);
    ctx.lineTo(g.centerX + g.shoulderWidth * .39, blouseBottom);
    ctx.lineTo(g.centerX - g.shoulderWidth * .39, blouseBottom);
    ctx.closePath();
  }, false);
  drawSleeves(ctx, landmarks, width, height, g, product, 'short');
  eraseNeck(ctx, g, .18, .135);

  fillCloth(ctx, product, g, () => {
    ctx.beginPath();
    ctx.moveTo(g.centerX - wrapWidth * .5, skirtTop);
    ctx.quadraticCurveTo(g.centerX - g.hipWidth * .62, g.hipY, g.centerX - bottomWidth * .5, g.ankleY);
    ctx.quadraticCurveTo(g.centerX, g.ankleY + g.shoulderWidth * .04, g.centerX + bottomWidth * .5, g.ankleY);
    ctx.quadraticCurveTo(g.centerX + g.hipWidth * .62, g.hipY, g.centerX + wrapWidth * .5, skirtTop);
    ctx.closePath();
  });

  ctx.save();
  ctx.globalAlpha = .22;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.4, g.shoulderWidth * .007);
  [-.14, -.07, 0, .07, .14].forEach((ratio) => {
    ctx.beginPath();
    ctx.moveTo(g.centerX + ratio * g.shoulderWidth, skirtTop + g.shoulderWidth * .03);
    ctx.quadraticCurveTo(g.centerX + ratio * g.shoulderWidth * .7, (skirtTop + g.ankleY) / 2, g.centerX + ratio * g.shoulderWidth * 1.3, g.ankleY - g.shoulderWidth * .08);
    ctx.stroke();
  });
  ctx.restore();

  const palluShoulder = g.rightShoulder;
  const oppositeWaistX = g.centerX - g.shoulderWidth * .42;
  const freeEdgeX = g.centerX + g.shoulderWidth * .86;
  const freeEdgeY = Math.min(g.ankleY, g.hipY + (g.ankleY - g.hipY) * .58);
  fillCloth(ctx, product, g, () => {
    ctx.beginPath();
    ctx.moveTo(palluShoulder.x - g.shoulderWidth * .04, palluShoulder.y - g.shoulderWidth * .02);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .12, g.waistY, oppositeWaistX, g.hipY + g.shoulderWidth * .02);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .2, freeEdgeY - g.shoulderWidth * .2, freeEdgeX, freeEdgeY);
    ctx.lineTo(freeEdgeX + g.shoulderWidth * .22, freeEdgeY - g.shoulderWidth * .18);
    ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .46, g.hipY, palluShoulder.x + g.shoulderWidth * .18, palluShoulder.y + g.shoulderWidth * .04);
    ctx.closePath();
  }, false);

  drawBorder(ctx, product, g, g.ankleY - g.shoulderWidth * .07, bottomWidth * .88, .026);
  ctx.save();
  ctx.strokeStyle = product.accent || '#d6b477';
  ctx.globalAlpha = .9;
  ctx.lineWidth = Math.max(3, g.shoulderWidth * .025);
  ctx.beginPath();
  ctx.moveTo(palluShoulder.x + g.shoulderWidth * .12, palluShoulder.y + g.shoulderWidth * .02);
  ctx.quadraticCurveTo(g.centerX + g.shoulderWidth * .38, g.hipY, freeEdgeX + g.shoulderWidth * .17, freeEdgeY - g.shoulderWidth * .12);
  ctx.stroke();
  ctx.restore();
}

export function drawTryOn(canvas, landmarks, product) {
  if (!canvas || !landmarks?.length || !product) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if ([11, 12, 23, 24].some((index) => (landmarks[index]?.visibility ?? 1) < .35)) return;

  getTextureEntry(product);
  const g = bodyGeometry(landmarks, width, height);
  const type = product.garmentType || 'onepiece';
  if (type === 'saree') drawSaree(ctx, landmarks, width, height, g, product);
  else if (type === 'gown') drawOnePiece(ctx, landmarks, width, height, g, product, true);
  else if (type === 'kurti') drawKurti(ctx, landmarks, width, height, g, product);
  else drawOnePiece(ctx, landmarks, width, height, g, product, false);

  revealRealArms(ctx, landmarks, width, height, g);
}
