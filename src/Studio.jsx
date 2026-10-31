import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, RotateCcw, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { COLORS, DETAILS, FABRICS, LENGTHS, NECKS, SILHOUETTES, SLEEVES, money } from './data';

function NeckCut({ type, skin }) {
  if (type === 'V Neck') return <mesh position={[0,1.03,.49]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.32,.32,.035]}/><meshStandardMaterial color={skin}/></mesh>;
  if (type === 'Square') return <mesh position={[0,1.07,.49]}><boxGeometry args={[.38,.28,.035]}/><meshStandardMaterial color={skin}/></mesh>;
  if (type === 'Boat') return <mesh position={[0,1.18,.49]} scale={[1.8,.55,1]}><sphereGeometry args={[.27,24,16]}/><meshStandardMaterial color={skin}/></mesh>;
  if (type === 'Sweetheart') return <group position={[0,1.07,.49]}><mesh position={[-.12,0,0]}><sphereGeometry args={[.18,20,12]}/><meshStandardMaterial color={skin}/></mesh><mesh position={[.12,0,0]}><sphereGeometry args={[.18,20,12]}/><meshStandardMaterial color={skin}/></mesh></group>;
  return <mesh position={[0,1.14,.49]} scale={[1.2,.65,1]}><sphereGeometry args={[.24,24,16]}/><meshStandardMaterial color={skin}/></mesh>;
}

function Garment({ c }) {
  const fabric = FABRICS.find((f)=>f.name===c.fabric) || FABRICS[0];
  const lengths = { Knee:1.55, Calf:1.9, Ankle:2.25, Floor:2.55 };
  const hems = { 'A-Line':1.22, Straight:.78, Flared:1.5, Fitted:.67 };
  const sleeves = { Sleeveless:0, Cap:.34, Elbow:.62, '3/4':.95, Full:1.22 };
  const skin = '#d7b9a7', h = lengths[c.length], hem = hems[c.silhouette], sl = sleeves[c.sleeves];
  const mat = { color:c.color, roughness:fabric.roughness, metalness:fabric.metalness };
  return <group position={[0,-.22,0]}>
    <mesh position={[0,2.72,0]} castShadow><sphereGeometry args={[.3,40,28]}/><meshStandardMaterial color={skin} roughness={.7}/></mesh>
    <mesh position={[0,2.37,0]}><cylinderGeometry args={[.12,.14,.38,28]}/><meshStandardMaterial color={skin}/></mesh>
    <mesh position={[0,1.52,0]} castShadow><cylinderGeometry args={[.44,.58,1.4,44]}/><meshStandardMaterial {...mat}/></mesh>
    <NeckCut type={c.neck} skin={skin}/>
    <mesh position={[0,.16,0]} castShadow><cylinderGeometry args={[.56,hem,h,56]}/><meshStandardMaterial {...mat}/></mesh>
    <mesh position={[0,-1.08,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[hem*.78,.026,12,56]}/><meshStandardMaterial color={c.detail==='Clean'?c.color:'#c79e54'} metalness={.35} roughness={.35}/></mesh>
    {sl>0&&<><mesh position={[-.63,1.58-sl*.28,0]} rotation={[0,0,-.12]}><cylinderGeometry args={[.22,.17,sl,28]}/><meshStandardMaterial {...mat}/></mesh><mesh position={[.63,1.58-sl*.28,0]} rotation={[0,0,.12]}><cylinderGeometry args={[.22,.17,sl,28]}/><meshStandardMaterial {...mat}/></mesh></>}
    <mesh position={[-.66,.75,0]}><cylinderGeometry args={[.105,.12,1.28,22]}/><meshStandardMaterial color={skin}/></mesh><mesh position={[.66,.75,0]}><cylinderGeometry args={[.105,.12,1.28,22]}/><meshStandardMaterial color={skin}/></mesh>
    {c.detail==='Hand embroidery'&&Array.from({length:9}).map((_,i)=><mesh key={i} position={[-.24+(i%3)*.24,1.45-Math.floor(i/3)*.22,.505]}><sphereGeometry args={[.035,14,8]}/><meshStandardMaterial color="#d1ad61" metalness={.45}/></mesh>)}
  </group>;
}

function Viewer({ c }) {
  return <div className="viewer"><Canvas shadows camera={{position:[0,1.25,6.3],fov:34}}><color attach="background" args={['#eee8df']}/><ambientLight intensity={1.6}/><directionalLight position={[4,6,5]} intensity={2.7} castShadow/><directionalLight position={[-4,3,2]} intensity={1.1}/><Garment c={c}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.05,0]} receiveShadow><circleGeometry args={[2.1,56]}/><meshStandardMaterial color="#ddd4c8"/></mesh><OrbitControls enablePan={false} minDistance={4.4} maxDistance={8} target={[0,.6,0]} minPolarAngle={.8} maxPolarAngle={1.65}/></Canvas><div className="viewer-tip"><RotateCcw size={13}/> Drag to rotate · scroll to zoom</div><span className="live">LIVE 3D PREVIEW</span></div>;
}

function Choices({ items, value, onPick, neck=false }) {
  return <div className={`choices ${neck?'neck-choices':''}`}>{items.map((item)=>{const label=typeof item==='string'?item:item.name; return <button className={value===label?'selected':''} onClick={()=>onPick(label)} key={label}>{neck&&<i className={`neck-shape n-${label.toLowerCase().replace(' ','-')}`}/>}<span>{label}</span>{value===label&&<Check size={12}/>}</button>;})}</div>;
}

function Measurements({ open, close, values, setValues }) {
  if(!open) return null;
  const fields=[['Height','height','cm'],['Shoulder','shoulder','in'],['Bust','bust','in'],['Waist','waist','in'],['Hip','hip','in'],['Sleeve','sleeve','in'],['Dress length','dressLength','in'],['Armhole','armhole','in']];
  return <div className="drawer-bg" onMouseDown={close}><aside className="drawer" onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">MADE TO MEASURE</span><h2>Your measurements</h2></div><button onClick={close}><X size={19}/></button></div><div className="measure-visual"><div className="person"><i/><b/><em/></div><span className="m shoulder">Shoulder</span><span className="m bust">Bust</span><span className="m waist">Waist</span><span className="m hip">Hip</span><p>Measure over light clothing. Keep the tape comfortably close, never tight.</p></div><div className="measure-fields">{fields.map(([label,key,unit])=><label key={key}><span>{label}</span><div><input type="number" value={values[key]} onChange={(e)=>setValues((v)=>({...v,[key]:e.target.value}))}/><small>{unit}</small></div></label>)}</div><button className="btn dark full" onClick={close}>Save measurements <Check size={15}/></button></aside></div>;
}

export default function Studio({ goHome, addToBag }) {
  const [tab,setTab]=useState('Neckline');
  const [drawer,setDrawer]=useState(false);
  const [saved,setSaved]=useState(false);
  const [c,setC]=useState({ neck:'Sweetheart', depth:7.5, sleeves:'3/4', silhouette:'A-Line', fabric:'Chanderi', color:'#6E2636', length:'Ankle', detail:'Gold border' });
  const [measurements,setMeasurements]=useState({height:165,shoulder:15,bust:36,waist:30,hip:39,sleeve:18,dressLength:52,armhole:16});
  const tabs=['Silhouette','Neckline','Sleeves','Fabric','Colour','Length','Details'];
  const set=(key,value)=>setC((x)=>({...x,[key]:value}));
  const total=useMemo(()=>3990+(FABRICS.find((f)=>f.name===c.fabric)?.price||0)+(DETAILS.find((d)=>d.name===c.detail)?.price||0)+(c.sleeves==='Full'?350:c.sleeves==='3/4'?250:0)+500,[c]);

  return <main className="studio"><div className="studio-bar"><button onClick={goHome}><ArrowLeft size={16}/> Boutique</button><div><span>DESIGN STUDIO</span><b>Aaira Anarkali</b></div><div><button onClick={()=>setSaved(!saved)}><Heart size={16} fill={saved?'currentColor':'none'}/> {saved?'Saved':'Save'}</button><button>Share</button></div></div>
    <div className="studio-grid"><aside className="controls"><div className="control-title"><span className="eyebrow">CUSTOMIZE</span><h2>Make it yours.</h2><p>Every choice updates your design instantly.</p></div><div className="tabs">{tabs.map((t)=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}<ChevronDown size={14}/></button>)}</div><div className="panel">
      {tab==='Silhouette'&&<Choices items={SILHOUETTES} value={c.silhouette} onPick={(v)=>set('silhouette',v)}/>} {tab==='Neckline'&&<><div className="panel-label"><b>Front neckline</b><span>{c.neck}</span></div><Choices items={NECKS} value={c.neck} onPick={(v)=>set('neck',v)} neck/><div className="range"><div className="panel-label"><b>Neck depth</b><span>{c.depth}"</span></div><input type="range" min="4" max="12" step=".5" value={c.depth} onChange={(e)=>set('depth',Number(e.target.value))}/><small><span>Modest</span><span>Deep</span></small></div></>}
      {tab==='Sleeves'&&<Choices items={SLEEVES} value={c.sleeves} onPick={(v)=>set('sleeves',v)}/>} {tab==='Fabric'&&<div className="fabrics">{FABRICS.map((f)=><button className={c.fabric===f.name?'selected':''} onClick={()=>set('fabric',f.name)} key={f.name}><i className={`fabric ${f.name.toLowerCase()}`}/><b>{f.name}</b><small>{f.detail}</small>{f.price>0&&<em>+{money(f.price)}</em>}</button>)}</div>}
      {tab==='Colour'&&<><div className="panel-label"><b>Designer palette</b><span>{COLORS.find((x)=>x.hex===c.color)?.name||'Custom'}</span></div><div className="color-list">{COLORS.map((x)=><button className={c.color===x.hex?'selected':''} onClick={()=>set('color',x.hex)} key={x.name}><i style={{background:x.hex}}/>{x.name}{c.color===x.hex&&<Check size={11}/>}</button>)}</div><label className="color-picker">Custom colour<input type="color" value={c.color} onChange={(e)=>set('color',e.target.value)}/></label></>}
      {tab==='Length'&&<Choices items={LENGTHS} value={c.length} onPick={(v)=>set('length',v)}/>} {tab==='Details'&&<Choices items={DETAILS} value={c.detail} onPick={(v)=>set('detail',v)}/>}</div><button className="measure-btn" onClick={()=>setDrawer(true)}><div><Sparkles size={15}/><span><b>Made to measure</b><small>Your custom fit is active</small></span></div><ArrowRight size={15}/></button></aside>
      <section className="viewer-area"><Viewer c={c}/><div className="mobile-tabs">{tabs.slice(0,5).map((t)=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div></section>
      <aside className="summary"><span className="eyebrow">YOUR DESIGN</span><h2>Aaira Anarkali</h2><p>One-of-one configuration</p><div className="tags"><span>{c.silhouette}</span><span>{c.neck}</span><span>{c.sleeves}</span><span>{c.fabric}</span><span>{c.length}</span></div><div className="breakdown"><p><span>Base garment</span><b>{money(3990)}</b></p><p><span>{c.fabric}</span><b>+{money(FABRICS.find((f)=>f.name===c.fabric)?.price||0)}</b></p>{c.detail!=='Clean'&&<p><span>{c.detail}</span><b>+{money(DETAILS.find((d)=>d.name===c.detail)?.price||0)}</b></p>}<p><span>Custom measurements</span><b>+{money(500)}</b></p></div><div className="total"><span>Estimated total<small>Inclusive of taxes</small></span><b>{money(total)}</b></div><button className="btn dark full" onClick={addToBag}>Add custom design <ShoppingBag size={15}/></button><button className="btn outline full" onClick={()=>setSaved(!saved)}><Heart size={15} fill={saved?'currentColor':'none'}/>{saved?'Saved to My Atelier':'Save to My Atelier'}</button><div className="delivery"><b>◷</b><span><strong>Crafted in 10–14 days</strong><br/>Final fit is reviewed before production.</span></div></aside>
    </div><Measurements open={drawer} close={()=>setDrawer(false)} values={measurements} setValues={setMeasurements}/></main>;
}
