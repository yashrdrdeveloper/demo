import { ArrowLeft, ArrowRight, Camera, Heart, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import { COLORS, PRODUCTS, money } from './data';

export function Home({ openProduct, openStudio }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Anarkali', 'Kurta Set', 'Gown', 'Lehenga', 'Suit Set'];
  const products = filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.type === filter);

  return <main>
    <section className="hero tryon-hero">
      <div className="hero-copy">
        <span className="eyebrow">VIRTUAL BOUTIQUE · INDIA · 2026</span>
        <h1>See the dress.<br/><em>See it on you.</em></h1>
        <p>Browse the collection, open your camera and try each look on your own body before choosing a size.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Explore collection <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0])}><Camera size={16}/> Open virtual try-on</button>
        </div>
        <div className="metrics"><div><strong>Live camera</strong><span>See yourself wearing it</span></div><div><strong>Instant switch</strong><span>Compare every look</span></div><div><strong>Private</strong><span>Processed on your device</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>TRY IT LIVE</span><strong>{PRODUCTS[0].name}</strong><small>Camera-based virtual fitting</small></div></div>
    </section>
    <div className="marquee"><span>LIVE VIRTUAL TRY-ON</span><i/><span>YOUR CAMERA</span><i/><span>YOUR BODY</span><i/><span>INSTANT STYLE SWITCHING</span></div>
    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">THE COLLECTION</span><h2>Pick a look. Try it on.</h2></div><p>Tap “Try on” on any piece to open the fitting room with that exact look selected.</p></div>
      <div className="filters">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}<button className="filter-more"><SlidersHorizontal size={14}/>Filters</button></div>
      <div className="product-grid">{products.map((p) => <article key={p.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(p)}><span className="badge">{p.badge}</span><GarmentArt product={p}/><span className="quick">View details <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{p.type}</small><h3>{p.name}</h3><p>From {money(p.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(p)}>Try on virtually <Camera size={14}/></button>
      </article>)}</div>
    </section>
    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">VIRTUAL FITTING ROOM</span><h2>No mannequin.<br/><em>Just you.</em></h2><p>Use your live camera or upload a full-body photo. The selected garment tracks your shoulders, waist and body position while you move.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0])}>Try the collection <Camera size={16}/></button></div></section>
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
      <aside className="product-panel"><span className="eyebrow">{product.type.toUpperCase()} · MADE TO ORDER</span><h1>{product.name}</h1><div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div><div className="price">{money(product.price)}</div><p className="description">An elegant modern silhouette designed to move beautifully. See how it looks on your own body before you add it to your bag.</p>
        <div className="option"><div className="option-title"><strong>Colour</strong><span>{COLORS.find((c)=>c.hex===color)?.name || 'Custom'}</span></div><div className="swatches">{COLORS.map((c)=><button aria-label={c.name} className={color===c.hex?'selected':''} style={{background:c.hex}} onClick={()=>setColor(c.hex)} key={c.name}/>)}</div></div>
        <div className="option"><div className="option-title"><strong>Size</strong><u>Size guide</u></div><div className="sizes">{['XS','S','M','L','XL'].map((s)=><button className={size===s?'selected':''} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div></div>
        <button className="btn tryon-primary full" onClick={openStudio}><Camera size={16}/> Try on with camera</button><button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Virtual try-on</b><small>Uses body tracking in your browser. No avatar is generated.</small></span></div>
        <div className="facts"><p><span>Fabric</span><b>Chanderi silk</b></p><p><span>Delivery</span><b>10–14 working days</b></p><p><span>Fit</span><b>Standard sizing</b></p></div>
      </aside>
    </div>
  </main>;
}
