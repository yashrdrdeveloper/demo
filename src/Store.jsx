import { ArrowLeft, ArrowRight, Heart, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState } from 'react';

import Art from './Art';
import { COLORS, PRODUCTS, money } from './data';

export function Home({ openProduct, openStudio }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Anarkali', 'Kurta Set', 'Gown', 'Lehenga', 'Suit Set'];
  const products = filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.type === filter);

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">BESPOKE · INDIA · 2026</span>
        <h1>Made for you.<br/><em>Designed by you.</em></h1>
        <p>Modern Indian silhouettes, made personal from neckline and fabric to fit and finish.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Explore collection <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={openStudio}><Sparkles size={16}/> Design your own</button>
        </div>
        <div className="metrics"><div><strong>10–14 days</strong><span>Made to order</span></div><div><strong>30+ choices</strong><span>Personal details</span></div><div><strong>Custom fit</strong><span>Saved measurements</span></div></div>
      </div>
      <div className="hero-art"><Art/><div className="floating"><span>ATELIER PICK</span><strong>Wine Chanderi</strong><small>Soft shine · fluid fall</small></div></div>
    </section>
    <div className="marquee"><span>PERSONALISED FIT</span><i/><span>DESIGNER FABRICS</span><i/><span>TAILORED FOR YOU</span><i/><span>CRAFTED IN INDIA</span></div>
    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">THE COLLECTION</span><h2>Begin with a silhouette.</h2></div><p>Wear it as designed, or open the Atelier Studio and reinterpret every detail.</p></div>
      <div className="filters">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}<button className="filter-more"><SlidersHorizontal size={14}/>Filters</button></div>
      <div className="product-grid">{products.map((p) => <article key={p.id} className="product-card">
        <button className="product-art" onClick={() => openProduct(p)}><span className="badge">{p.badge}</span><Art color={p.color} shape={p.shape} compact/><span className="quick">View design <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{p.type}</small><h3>{p.name}</h3><p>From {money(p.price)}</p></div><Heart size={18}/></div>
        <button className="customize" onClick={openStudio}>Customize this design <Sparkles size={14}/></button>
      </article>)}</div>
    </section>
    <section className="atelier"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">MAISON AARA ATELIER</span><h2>Your idea.<br/><em>Our canvas.</em></h2><p>Build a one-of-one outfit. Experiment freely, see your design in 3D and save it for later.</p><button className="btn light" onClick={openStudio}>Enter design studio <ArrowRight size={16}/></button></div></section>
  </main>;
}

export function Product({ product, goBack, openStudio, addToBag }) {
  const [color, setColor] = useState(product.color);
  const [size, setSize] = useState('M');
  return <main className="product-page">
    <button className="back" onClick={goBack}><ArrowLeft size={15}/> Collection</button>
    <div className="product-detail">
      <div className="gallery"><div className="thumbs">{[0,1,2].map((n) => <button className={n===0?'active':''} key={n}><Art color={color} shape={product.shape} compact/></button>)}</div><div className="gallery-main"><Art color={color} shape={product.shape}/></div></div>
      <aside className="product-panel"><span className="eyebrow">{product.type.toUpperCase()} · MADE TO ORDER</span><h1>{product.name}</h1><div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div><div className="price">{money(product.price)}</div><p className="description">An elegant modern silhouette designed to move beautifully. Choose the house edit or personalise every detail in our digital atelier.</p>
        <div className="option"><div className="option-title"><strong>Colour</strong><span>{COLORS.find((c)=>c.hex===color)?.name || 'Custom'}</span></div><div className="swatches">{COLORS.map((c)=><button aria-label={c.name} className={color===c.hex?'selected':''} style={{background:c.hex}} onClick={()=>setColor(c.hex)} key={c.name}/>)}</div></div>
        <div className="option"><div className="option-title"><strong>Size</strong><u>Size guide</u></div><div className="sizes">{['XS','S','M','L','XL','Custom'].map((s)=><button className={size===s?'selected':''} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div></div>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button><button className="btn outline full" onClick={openStudio}><Sparkles size={15}/> Customize this design</button>
        <div className="facts"><p><span>Fabric</span><b>Chanderi silk</b></p><p><span>Delivery</span><b>10–14 working days</b></p><p><span>Fit</span><b>Standard or made to measure</b></p></div>
      </aside>
    </div>
  </main>;
}
