import { ArrowLeft, ArrowRight, Camera, Heart, ImagePlus, Ruler, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import GarmentArt from './GarmentArt';
import { COLORS, PRODUCTS, money } from './data';

export function Home({ openProduct, openStudio }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'T-Shirt', 'Saree', 'One-Piece', 'Gown', 'Kurti'];
  const products = useMemo(() => filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.type === filter), [filter]);

  return <main>
    <section className="hero tryon-hero">
      <div className="hero-copy">
        <span className="eyebrow">NON-GENERATIVE LIVE TRIAL ROOM · 2026</span>
        <h1>Move naturally.<br/><em>Keep the exact garment on you.</em></h1>
        <p>Start the camera, calibrate eight body points once and the actual transparent product asset follows your movement frame-by-frame with classic optical flow.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop the collection <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0])}><Camera size={16}/> Open live trial room</button>
        </div>
        <div className="metrics"><div><strong>Live tracking</strong><span>Moves with calibrated body points</span></div><div><strong>Exact SKU pixels</strong><span>Prints and logos stay unchanged</span></div><div><strong>No generative AI</strong><span>Classic computer vision only</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>LIVE T-SHIRT DEMO</span><strong>{PRODUCTS[0].name}</strong><small>Exact transparent asset · optical-flow tracking</small></div></div>
    </section>

    <div className="marquee"><span>LIVE OPTICAL FLOW</span><i/><span>EXACT GARMENT ASSET</span><i/><span>REAL MEASUREMENTS</span><i/><span>NO GENERATIVE AI</span></div>

    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">TRY-ON COLLECTION</span><h2>Choose the actual product.</h2></div><p>Each production SKU should include a clean front-facing transparent PNG/WebP. That exact image is what the live fitting layer deforms and tracks.</p></div>
      <div className="filters">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}<button className="filter-more"><SlidersHorizontal size={14}/>Filters</button></div>
      <div className="product-grid">{products.map((p) => <article key={p.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(p)}><span className="badge">{p.badge}</span><GarmentArt product={p}/><span className="quick">View details <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{p.type} · {p.fabric}</small><h3>{p.name}</h3><p>From {money(p.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(p)}>Try this product live <Camera size={14}/></button>
      </article>)}</div>
    </section>

    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">DETERMINISTIC LIVE FITTING</span><h2>No mannequin.<br/><em>Your real camera.</em></h2><p>Calibrate once, then move. The app tracks those points using classic computer vision and keeps the exact product asset fitted to them. Photo fitting remains available as a fallback.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0])}>Start live trial room <Camera size={16}/></button></div></section>
  </main>;
}

export function Product({ product, goBack, openStudio, addToBag }) {
  const [color, setColor] = useState(product.color);
  const [size, setSize] = useState('M');
  const displayed = { ...product, color };

  return <main className="product-page">
    <button className="back" onClick={goBack}><ArrowLeft size={15}/> Collection</button>
    <div className="product-detail">
      <div className="gallery"><div className="thumbs">{[0,1,2].map((n) => <button className={n===0?'active':''} key={n}><GarmentArt product={displayed} compact/></button>)}</div><div className="gallery-main product-only-gallery"><GarmentArt product={displayed}/></div></div>
      <aside className="product-panel">
        <span className="eyebrow">{product.type.toUpperCase()} · LIVE EXACT-ASSET TRY-ON</span>
        <h1>{product.name}</h1>
        <div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div>
        <div className="price">{money(product.price)}</div>
        <p className="description">{product.fitNote}. The trial room uses the actual transparent garment asset and tracks your calibrated body points live.</p>

        <div className="option"><div className="option-title"><strong>Colour</strong><span>{COLORS.find((c)=>c.hex===color)?.name || 'Custom'}</span></div><div className="swatches">{COLORS.map((c)=><button aria-label={c.name} className={color===c.hex?'selected':''} style={{background:c.hex}} onClick={()=>setColor(c.hex)} key={c.name}/>)}</div></div>
        <div className="option"><div className="option-title"><strong>Size</strong><u>Size guide</u></div><div className="sizes">{['XS','S','M','L','XL'].map((s)=><button className={size===s?'selected':''} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div></div>

        <button className="btn tryon-primary full" onClick={() => openStudio(displayed)}><Camera size={16}/> Try this product live</button>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Classic CV live tracking</b><small>Manual calibration + optical flow + exact garment pixels. No generated clothing.</small></span></div>
        <div className="facts"><p><span>Garment</span><b>{product.type}</b></p><p><span>Fabric</span><b>{product.fabric}</b></p><p><span>Live fit</span><b>{product.tryOnAsset ? 'Exact demo asset included' : 'Upload catalog cutout'}</b></p></div>
      </aside>
    </div>
  </main>;
}
