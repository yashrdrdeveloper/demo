import { ArrowLeft, ArrowRight, Heart, ImagePlus, Ruler, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
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
        <span className="eyebrow">NON-AI ONLINE TRIAL ROOM · 2026</span>
        <h1>Use your photo.<br/><em>Fit the exact garment.</em></h1>
        <p>Upload a full-body photo, calibrate your body points once and place the real transparent garment asset from the catalog onto your own body.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop the collection <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0])}><ImagePlus size={16}/> Open trial room</button>
        </div>
        <div className="metrics"><div><strong>Exact SKU pixels</strong><span>Prints and logos stay unchanged</span></div><div><strong>No AI</strong><span>No generated person or garment</span></div><div><strong>Real measurements</strong><span>Size estimate from your numbers</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>EXACT GARMENT DEMO</span><strong>{PRODUCTS[0].name}</strong><small>Transparent SKU asset · manual calibration</small></div></div>
    </section>

    <div className="marquee"><span>EXACT GARMENT ASSET</span><i/><span>YOUR PHOTO</span><i/><span>MANUAL BODY CALIBRATION</span><i/><span>NO AI</span></div>

    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">TRY-ON COLLECTION</span><h2>Choose the actual product.</h2></div><p>For production, each SKU should include a clean front-facing transparent PNG/WebP used by the fitting engine.</p></div>
      <div className="filters">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}<button className="filter-more"><SlidersHorizontal size={14}/>Filters</button></div>
      <div className="product-grid">{products.map((p) => <article key={p.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(p)}><span className="badge">{p.badge}</span><GarmentArt product={p}/><span className="quick">View details <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{p.type} · {p.fabric}</small><h3>{p.name}</h3><p>From {money(p.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(p)}>Fit this exact product <ImagePlus size={14}/></button>
      </article>)}</div>
    </section>

    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">DETERMINISTIC FITTING ROOM</span><h2>No mannequin.<br/><em>No generated image.</em></h2><p>Use your real photo, real measurements and the exact garment cutout. The app warps those garment pixels to your calibrated shoulders, waist, hips and hem.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0])}>Open trial room <Ruler size={16}/></button></div></section>
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
        <span className="eyebrow">{product.type.toUpperCase()} · EXACT-ASSET TRY-ON</span>
        <h1>{product.name}</h1>
        <div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div>
        <div className="price">{money(product.price)}</div>
        <p className="description">{product.fitNote}. The trial room does not redraw this product; it uses the actual transparent garment asset you provide.</p>

        <div className="option"><div className="option-title"><strong>Colour</strong><span>{COLORS.find((c)=>c.hex===color)?.name || 'Custom'}</span></div><div className="swatches">{COLORS.map((c)=><button aria-label={c.name} className={color===c.hex?'selected':''} style={{background:c.hex}} onClick={()=>setColor(c.hex)} key={c.name}/>)}</div></div>
        <div className="option"><div className="option-title"><strong>Size</strong><u>Size guide</u></div><div className="sizes">{['XS','S','M','L','XL'].map((s)=><button className={size===s?'selected':''} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div></div>

        <button className="btn tryon-primary full" onClick={() => openStudio(displayed)}><ImagePlus size={16}/> Fit this product on my photo</button>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Non-AI trial room</b><small>Manual body calibration + exact garment image + real measurements.</small></span></div>
        <div className="facts"><p><span>Garment</span><b>{product.type}</b></p><p><span>Fabric</span><b>{product.fabric}</b></p><p><span>Fit setup</span><b>{product.tryOnAsset ? 'Exact demo asset included' : 'Upload catalog cutout'}</b></p></div>
      </aside>
    </div>
  </main>;
}
