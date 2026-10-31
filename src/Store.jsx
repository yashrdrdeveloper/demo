import { ArrowLeft, ArrowRight, Camera, Heart, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import GarmentArt from './GarmentArt';
import { COLORS, PRODUCTS, money } from './data';

export function Home({ openProduct, openStudio }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Saree', 'One-Piece', 'Gown', 'Kurti'];
  const products = useMemo(() => filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.type === filter), [filter]);

  return <main>
    <section className="hero tryon-hero">
      <div className="hero-copy">
        <span className="eyebrow">ONLINE MAGIC MIRROR · INDIA · 2026</span>
        <h1>Pick the outfit.<br/><em>Try it on yourself.</em></h1>
        <p>Bring the in-store virtual mirror online. Choose a saree, one-piece, gown or kurti and see the garment type fitted to your own live camera.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop the collection <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0])}><Camera size={16}/> Open virtual mirror</button>
        </div>
        <div className="metrics"><div><strong>Live camera</strong><span>Your body, not an avatar</span></div><div><strong>Real categories</strong><span>Saree · dress · gown</span></div><div><strong>Instant switch</strong><span>Compare without changing</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>LIVE SAREE TRY-ON</span><strong>{PRODUCTS[0].name}</strong><small>Blouse · pleats · pallu tracking</small></div></div>
    </section>

    <div className="marquee"><span>ONLINE VIRTUAL MIRROR</span><i/><span>SAREE TRY-ON</span><i/><span>ONE-PIECE TRY-ON</span><i/><span>YOUR CAMERA</span></div>

    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">TRY-ON COLLECTION</span><h2>Choose what you want to wear.</h2></div><p>Every garment category has its own fitting geometry. A saree drapes differently from a one-piece or gown.</p></div>
      <div className="filters">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}<button className="filter-more"><SlidersHorizontal size={14}/>Filters</button></div>
      <div className="product-grid">{products.map((p) => <article key={p.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(p)}><span className="badge">{p.badge}</span><GarmentArt product={p}/><span className="quick">View details <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{p.type} · {p.fabric}</small><h3>{p.name}</h3><p>From {money(p.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(p)}>Try this {p.type.toLowerCase()} on <Camera size={14}/></button>
      </article>)}</div>
    </section>

    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">ONLINE FITTING ROOM</span><h2>What stores do with a mirror.<br/><em>Do it online.</em></h2><p>Open the camera, stand full-body in frame and switch between sarees and dresses while the fitting room stays open.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0])}>Start virtual try-on <Camera size={16}/></button></div></section>
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
        <span className="eyebrow">{product.type.toUpperCase()} · VIRTUAL TRY-ON READY</span>
        <h1>{product.name}</h1>
        <div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div>
        <div className="price">{money(product.price)}</div>
        <p className="description">{product.fitNote}. Open the online fitting room to see this garment category aligned to your own body instead of a mannequin.</p>

        <div className="option"><div className="option-title"><strong>Colour</strong><span>{COLORS.find((c)=>c.hex===color)?.name || 'Custom'}</span></div><div className="swatches">{COLORS.map((c)=><button aria-label={c.name} className={color===c.hex?'selected':''} style={{background:c.hex}} onClick={()=>setColor(c.hex)} key={c.name}/>)}</div></div>
        <div className="option"><div className="option-title"><strong>Size</strong><u>Size guide</u></div><div className="sizes">{['XS','S','M','L','XL'].map((s)=><button className={size===s?'selected':''} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div></div>

        <button className="btn tryon-primary full" onClick={() => openStudio(displayed)}><Camera size={16}/> Try this {product.type.toLowerCase()} on me</button>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Online magic mirror</b><small>Live body tracking, garment-specific drape and instant style switching.</small></span></div>
        <div className="facts"><p><span>Garment</span><b>{product.type}</b></p><p><span>Fabric</span><b>{product.fabric}</b></p><p><span>Virtual fit</span><b>{product.fitNote}</b></p></div>
      </aside>
    </div>
  </main>;
}
