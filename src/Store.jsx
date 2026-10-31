import { ArrowLeft, ArrowRight, Camera, Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import { PRODUCTS, SIZES, money } from './data';

export function Home({ openProduct, openStudio }) {
  return <main>
    <section className="hero tryon-hero">
      <div className="hero-copy">
        <span className="eyebrow">AUTOMATIC ONLINE SAREE TRIAL ROOM · 2026</span>
        <h1>Choose a saree.<br/><em>Step into the camera.</em></h1>
        <p>No calibration points and no mannequin. The fitting room automatically finds one person, locks to the body and renders the saree drape as the customer moves.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop sarees <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0], 'M')}><Camera size={16}/> Open live trial room</button>
        </div>
        <div className="metrics"><div><strong>Automatic tracking</strong><span>No body-point clicking</span></div><div><strong>Selfie or full body</strong><span>Upper pallu or full saree</span></div><div><strong>Auto recovery</strong><span>Re-locks when you return</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>LIVE SAREE TRY-ON</span><strong>{PRODUCTS[0].name}</strong><small>Automatic shoulders · hips · legs</small></div></div>
    </section>

    <div className="marquee"><span>NO CALIBRATION</span><i/><span>LIVE BODY TRACKING</span><i/><span>REAL SAREE FABRIC</span><i/><span>AUTO RE-LOCK</span></div>

    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">SAREE COLLECTION</span><h2>Try the drape before you buy.</h2></div><p>Stand farther from a MacBook for a full-body saree preview, or use a closer phone/selfie view for blouse and pallu placement.</p></div>
      <div className="product-grid">{PRODUCTS.map((product) => <article key={product.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(product)}><span className="badge">{product.badge}</span><GarmentArt product={product}/><span className="quick">View saree <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{product.fabric} · {product.colorName}</small><h3>{product.name}</h3><p>{money(product.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(product, 'M')}>Try this saree live <Camera size={14}/></button>
      </article>)}</div>
    </section>

    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">AUTOMATIC FITTING ROOM</span><h2>No dots. No setup.<br/><em>Just stand naturally.</em></h2><p>The app guides distance and framing, automatically reacquires the body after temporary tracking loss, and keeps camera/model loading from hanging indefinitely.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0], 'M')}>Start saree try-on <Camera size={16}/></button></div></section>
  </main>;
}

export function Product({ product, goBack, openStudio, addToBag }) {
  const [size, setSize] = useState('M');

  return <main className="product-page">
    <button className="back" onClick={goBack}><ArrowLeft size={15}/> Sarees</button>
    <div className="product-detail">
      <div className="gallery"><div className="thumbs">{[0,1,2].map((item) => <button className={item===0?'active':''} key={item}><GarmentArt product={product} compact/></button>)}</div><div className="gallery-main product-only-gallery"><GarmentArt product={product}/></div></div>
      <aside className="product-panel">
        <span className="eyebrow">SAREE · AUTOMATIC LIVE TRY-ON</span>
        <h1>{product.name}</h1>
        <div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div>
        <div className="price">{money(product.price)}</div>
        <p className="description">{product.fabric} in {product.colorName}. The live fitting room automatically finds the customer and renders blouse, wrapped drape, pleats and pallu without asking them to mark body points.</p>

        <div className="option"><div className="option-title"><strong>Blouse size</strong><span>{size}</span></div><div className="sizes">{SIZES.map((item)=><button className={size===item?'selected':''} onClick={()=>setSize(item)} key={item}>{item}</button>)}</div></div>

        <button className="btn tryon-primary full" onClick={() => openStudio(product, size)}><Camera size={16}/> Try this saree live</button>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Automatic body lock</b><small>Full-body when you stand back; upper-body pallu preview when you are closer.</small></span></div>
        <div className="facts"><p><span>Garment</span><b>Saree</b></p><p><span>Fabric</span><b>{product.fabric}</b></p><p><span>Try-on</span><b>Live camera + photo</b></p></div>
      </aside>
    </div>
  </main>;
}
