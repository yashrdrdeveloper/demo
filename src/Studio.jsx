import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, RotateCcw, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { COLORS, DETAILS, FABRICS, LENGTHS, NECKS, SILHOUETTES, SLEEVES, money } from './data';

const AVATAR_URL = 'https://cdn.jsdelivr.net/gh/927tanmay/react-ai-voice-avatar@avatars-v2/assets/avatars/ananya.glb';
const SKIN = '#c99177';

function fabricProps(name) {
  if (name === 'Silk') return { roughness: .2, metalness: .03, sheen: 1, sheenRoughness: .2, clearcoat: .14 };
  if (name === 'Chanderi') return { roughness: .31, metalness: .02, sheen: .8, sheenRoughness: .3, clearcoat: .08 };
  if (name === 'Velvet') return { roughness: .88, metalness: 0, sheen: 1, sheenRoughness: .78, clearcoat: 0 };
  return { roughness: .72, metalness: 0, sheen: .15, sheenRoughness: .7, clearcoat: 0 };
}

function useWeaveTexture(fabric) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#777';
    ctx.fillRect(0, 0, 128, 128);

    const alpha = fabric === 'Velvet' ? .08 : fabric === 'Cotton' ? .24 : .14;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 128; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 14);
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }, [fabric]);
}

function RealModel() {
  const { scene } = useGLTF(AVATAR_URL);
  const model = useMemo(() => {
    const copy = cloneSkeleton(scene);
    const clothing = /(shirt|blouse|jacket|pants|trouser|jeans|skirt|dress|shoe|boot|cloth|garment|top)/i;

    copy.traverse((object) => {
      if (!object.isMesh && !object.isSkinnedMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const label = `${object.name} ${materials.map((m) => m?.name || '').join(' ')}`;

      // Rocketbox avatars ship with regular clothes. We hide clothing meshes and
      // keep the real rigged body/head/hair so our atelier garment sits on the model.
      if (clothing.test(label)) {
        object.visible = false;
      }
    });

    return copy;
  }, [scene]);

  return <primitive object={model} scale={2.08} position={[0, -2.02, 0]} />;
}

function DressMaterial({ c, side = THREE.FrontSide }) {
  const weave = useWeaveTexture(c.fabric);
  const props = fabricProps(c.fabric);
  return (
    <meshPhysicalMaterial
      color={c.color}
      side={side}
      bumpMap={weave}
      bumpScale={c.fabric === 'Cotton' ? .02 : .012}
      {...props}
    />
  );
}

function skirtProfile(c) {
  const lengthMap = { Knee: 1.25, Calf: 1.62, Ankle: 1.98, Floor: 2.18 };
  const hemMap = { 'A-Line': .93, Straight: .58, Flared: 1.12, Fitted: .68 };
  const h = lengthMap[c.length];
  const hem = hemMap[c.silhouette];

  return [
    new THREE.Vector2(.43, .34),
    new THREE.Vector2(.46, .15),
    new THREE.Vector2(.52, -.14),
    new THREE.Vector2(c.silhouette === 'Fitted' ? .48 : .61, -.46),
    new THREE.Vector2(c.silhouette === 'Straight' ? .58 : hem * .8, -.82),
    new THREE.Vector2(hem, .34 - h),
  ];
}

function NeckOverlay({ type }) {
  const common = { color: SKIN, roughness: .62 };
  if (type === 'V Neck') {
    return <mesh position={[0, .83, .465]} rotation={[0, 0, Math.PI / 4]} scale={[1, .75, 1]}><boxGeometry args={[.3, .3, .025]} /><meshStandardMaterial {...common} /></mesh>;
  }
  if (type === 'Square') {
    return <mesh position={[0, .86, .465]}><boxGeometry args={[.36, .27, .025]} /><meshStandardMaterial {...common} /></mesh>;
  }
  if (type === 'Boat') {
    return <mesh position={[0, .98, .45]} scale={[1.85, .5, .3]}><sphereGeometry args={[.22, 40, 24]} /><meshStandardMaterial {...common} /></mesh>;
  }
  if (type === 'Sweetheart') {
    return <group position={[0, .83, .463]}><mesh position={[-.1, 0, 0]} scale={[1, .8, .3]}><sphereGeometry args={[.16, 36, 24]} /><meshStandardMaterial {...common} /></mesh><mesh position={[.1, 0, 0]} scale={[1, .8, .3]}><sphereGeometry args={[.16, 36, 24]} /><meshStandardMaterial {...common} /></mesh></group>;
  }
  return <mesh position={[0, .94, .46]} scale={[1.25, .68, .3]}><sphereGeometry args={[.2, 40, 24]} /><meshStandardMaterial {...common} /></mesh>;
}

function Sleeves({ c }) {
  const lengths = { Sleeveless: 0, Cap: .3, Elbow: .66, '3/4': .92, Full: 1.23 };
  const length = lengths[c.sleeves];
  if (!length) return null;

  const y = .55 - length * .23;
  return (
    <>
      <mesh position={[-.58, y, 0]} rotation={[0, 0, -.12]} scale={[1, 1, .72]} castShadow>
        <cylinderGeometry args={[.19, .145, length, 48, 8, false]} />
        <DressMaterial c={c} />
      </mesh>
      <mesh position={[.58, y, 0]} rotation={[0, 0, .12]} scale={[1, 1, .72]} castShadow>
        <cylinderGeometry args={[.19, .145, length, 48, 8, false]} />
        <DressMaterial c={c} />
      </mesh>
    </>
  );
}

function Embellishment({ c }) {
  if (c.detail === 'Clean') return null;
  const gold = '#d0ad66';

  if (c.detail === 'Hand embroidery') {
    return (
      <group position={[0, .3, .47]}>
        {Array.from({ length: 17 }).map((_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          return (
            <mesh key={i} position={[-.22 + col * .11 + (row % 2 ? .045 : 0), .58 - row * .14, .01]}>
              <torusGeometry args={[.025 + (i % 3) * .004, .007, 8, 18]} />
              <meshStandardMaterial color={gold} metalness={.45} roughness={.35} />
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <mesh position={[0, c.length === 'Floor' ? -1.72 : c.length === 'Ankle' ? -1.51 : c.length === 'Calf' ? -1.16 : -.8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[c.silhouette === 'Flared' ? 1.15 : .95, 1, .8]}>
      <torusGeometry args={[.72, c.detail === 'Gold border' ? .034 : .022, 12, 72]} />
      <meshStandardMaterial color={gold} metalness={.42} roughness={.36} />
    </mesh>
  );
}

function AtelierDress({ c }) {
  const profile = useMemo(() => skirtProfile(c), [c.length, c.silhouette]);
  const torsoScale = c.silhouette === 'Fitted' ? .93 : c.silhouette === 'Straight' ? 1 : 1.04;

  return (
    <group position={[0, .03, .02]}>
      <mesh position={[0, .48, 0]} scale={[torsoScale, 1, .68]} castShadow>
        <cylinderGeometry args={[.45, .43, 1.08, 64, 18, false]} />
        <DressMaterial c={c} />
      </mesh>
      <NeckOverlay type={c.neck} />
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 96]} />
        <DressMaterial c={c} side={THREE.DoubleSide} />
      </mesh>
      <Sleeves c={c} />
      <Embellishment c={c} />
    </group>
  );
}

function LoadingModel() {
  return <Html center><div className="real-model-loader"><span />Loading atelier model…</div></Html>;
}

function Viewer({ c }) {
  return (
    <div className="viewer realistic-viewer">
      <Canvas shadows camera={{ position: [0, .25, 5.6], fov: 31 }} dpr={[1, 1.7]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={['#ebe5dc']} />
        <fog attach="fog" args={['#ebe5dc', 7, 12]} />
        <ambientLight intensity={.65} />
        <directionalLight position={[4, 5, 5]} intensity={2.35} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight position={[-3, 2.5, 2]} intensity={1.1} />
        <spotLight position={[0, 4, -2]} intensity={1.15} angle={.8} penumbra={1} />
        <Suspense fallback={<LoadingModel />}>
          <RealModel />
          <AtelierDress c={c} />
          <Environment preset="studio" environmentIntensity={.45} />
        </Suspense>
        <ContactShadows position={[0, -2.03, 0]} opacity={.42} scale={5} blur={2.5} far={3} />
        <OrbitControls enablePan={false} minDistance={3.9} maxDistance={7} target={[0, .2, 0]} minPolarAngle={.78} maxPolarAngle={1.68} />
      </Canvas>
      <div className="viewer-tip"><RotateCcw size={13} /> Drag to rotate · scroll to zoom</div>
      <div className="model-badge"><span /> REAL RIGGED MODEL <small>Rocketbox</small></div>
    </div>
  );
}

function Choices({ items, value, onPick, neck = false }) {
  return <div className={`choices ${neck ? 'neck-choices' : ''}`}>{items.map((item) => { const label = typeof item === 'string' ? item : item.name; return <button className={value === label ? 'selected' : ''} onClick={() => onPick(label)} key={label}>{neck && <i className={`neck-shape n-${label.toLowerCase().replace(' ', '-')}`} />}<span>{label}</span>{value === label && <Check size={12} />}</button>; })}</div>;
}

function Measurements({ open, close, values, setValues }) {
  if (!open) return null;
  const fields = [['Height', 'height', 'cm'], ['Shoulder', 'shoulder', 'in'], ['Bust', 'bust', 'in'], ['Waist', 'waist', 'in'], ['Hip', 'hip', 'in'], ['Sleeve', 'sleeve', 'in'], ['Dress length', 'dressLength', 'in'], ['Armhole', 'armhole', 'in']];
  return <div className="drawer-bg" onMouseDown={close}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">MADE TO MEASURE</span><h2>Your measurements</h2></div><button onClick={close}><X size={19} /></button></div><div className="measure-visual"><div className="person"><i /><b /><em /></div><span className="m shoulder">Shoulder</span><span className="m bust">Bust</span><span className="m waist">Waist</span><span className="m hip">Hip</span><p>Measure over light clothing. Keep the tape comfortably close, never tight.</p></div><div className="measure-fields">{fields.map(([label, key, unit]) => <label key={key}><span>{label}</span><div><input type="number" value={values[key]} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} /><small>{unit}</small></div></label>)}</div><button className="btn dark full" onClick={close}>Save measurements <Check size={15} /></button></aside></div>;
}

export default function Studio({ goHome, addToBag }) {
  const [tab, setTab] = useState('Neckline');
  const [drawer, setDrawer] = useState(false);
  const [saved, setSaved] = useState(false);
  const [c, setC] = useState({ neck: 'Sweetheart', depth: 7.5, sleeves: '3/4', silhouette: 'A-Line', fabric: 'Chanderi', color: '#6E2636', length: 'Ankle', detail: 'Gold border' });
  const [measurements, setMeasurements] = useState({ height: 165, shoulder: 15, bust: 36, waist: 30, hip: 39, sleeve: 18, dressLength: 52, armhole: 16 });
  const tabs = ['Silhouette', 'Neckline', 'Sleeves', 'Fabric', 'Colour', 'Length', 'Details'];
  const set = (key, value) => setC((x) => ({ ...x, [key]: value }));
  const total = useMemo(() => 3990 + (FABRICS.find((f) => f.name === c.fabric)?.price || 0) + (DETAILS.find((d) => d.name === c.detail)?.price || 0) + (c.sleeves === 'Full' ? 350 : c.sleeves === '3/4' ? 250 : 0) + 500, [c]);

  return <main className="studio"><div className="studio-bar"><button onClick={goHome}><ArrowLeft size={16} /> Boutique</button><div><span>DESIGN STUDIO</span><b>Aaira Anarkali</b></div><div><button onClick={() => setSaved(!saved)}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button><button>Share</button></div></div>
    <div className="studio-grid"><aside className="controls"><div className="control-title"><span className="eyebrow">CUSTOMIZE</span><h2>Make it yours.</h2><p>Every choice updates your design instantly on a real human avatar.</p></div><div className="tabs">{tabs.map((t) => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}<ChevronDown size={14} /></button>)}</div><div className="panel">
      {tab === 'Silhouette' && <Choices items={SILHOUETTES} value={c.silhouette} onPick={(v) => set('silhouette', v)} />} {tab === 'Neckline' && <><div className="panel-label"><b>Front neckline</b><span>{c.neck}</span></div><Choices items={NECKS} value={c.neck} onPick={(v) => set('neck', v)} neck /><div className="range"><div className="panel-label"><b>Neck depth</b><span>{c.depth}"</span></div><input type="range" min="4" max="12" step=".5" value={c.depth} onChange={(e) => set('depth', Number(e.target.value))} /><small><span>Modest</span><span>Deep</span></small></div></>}
      {tab === 'Sleeves' && <Choices items={SLEEVES} value={c.sleeves} onPick={(v) => set('sleeves', v)} />} {tab === 'Fabric' && <div className="fabrics">{FABRICS.map((f) => <button className={c.fabric === f.name ? 'selected' : ''} onClick={() => set('fabric', f.name)} key={f.name}><i className={`fabric ${f.name.toLowerCase()}`} /><b>{f.name}</b><small>{f.detail}</small>{f.price > 0 && <em>+{money(f.price)}</em>}</button>)}</div>}
      {tab === 'Colour' && <><div className="panel-label"><b>Designer palette</b><span>{COLORS.find((x) => x.hex === c.color)?.name || 'Custom'}</span></div><div className="color-list">{COLORS.map((x) => <button className={c.color === x.hex ? 'selected' : ''} onClick={() => set('color', x.hex)} key={x.name}><i style={{ background: x.hex }} />{x.name}{c.color === x.hex && <Check size={11} />}</button>)}</div><label className="color-picker">Custom colour<input type="color" value={c.color} onChange={(e) => set('color', e.target.value)} /></label></>}
      {tab === 'Length' && <Choices items={LENGTHS} value={c.length} onPick={(v) => set('length', v)} />} {tab === 'Details' && <Choices items={DETAILS} value={c.detail} onPick={(v) => set('detail', v)} />}</div><button className="measure-btn" onClick={() => setDrawer(true)}><div><Sparkles size={15} /><span><b>Made to measure</b><small>Your custom fit is active</small></span></div><ArrowRight size={15} /></button></aside>
      <section className="viewer-area"><Viewer c={c} /><div className="mobile-tabs">{tabs.slice(0, 5).map((t) => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div></section>
      <aside className="summary"><span className="eyebrow">YOUR DESIGN</span><h2>Aaira Anarkali</h2><p>One-of-one configuration</p><div className="tags"><span>{c.silhouette}</span><span>{c.neck}</span><span>{c.sleeves}</span><span>{c.fabric}</span><span>{c.length}</span></div><div className="breakdown"><p><span>Base garment</span><b>{money(3990)}</b></p><p><span>{c.fabric}</span><b>+{money(FABRICS.find((f) => f.name === c.fabric)?.price || 0)}</b></p>{c.detail !== 'Clean' && <p><span>{c.detail}</span><b>+{money(DETAILS.find((d) => d.name === c.detail)?.price || 0)}</b></p>}<p><span>Custom measurements</span><b>+{money(500)}</b></p></div><div className="total"><span>Estimated total<small>Inclusive of taxes</small></span><b>{money(total)}</b></div><button className="btn dark full" onClick={addToBag}>Add custom design <ShoppingBag size={15} /></button><button className="btn outline full" onClick={() => setSaved(!saved)}><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved to My Atelier' : 'Save to My Atelier'}</button><div className="delivery"><b>◷</b><span><strong>Crafted in 10–14 days</strong><br />Final fit is reviewed before production.</span></div></aside>
    </div><Measurements open={drawer} close={() => setDrawer(false)} values={measurements} setValues={setMeasurements} /></main>;
}

useGLTF.preload(AVATAR_URL);
