import { ArrowLeft, ArrowRight, Camera, Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import { PRODUCTS, SIZES, money } from './data';

export function Home({ openProduct, openStudio }) {
  return <main>
    <section className="hero tryon-hero">
      <div className="hero-copy">
        <span className="eyebrow">PIXEL-AWARE LIVE SAREE TRIAL ROOM · 2026</span>
        <h1>Choose a saree.<br/><em>See only what your camera can see.</em></h1>
        <p>No dots and no fixed half/full mode. The fitting room analyzes the visible person pixels continuously: torso, hips, knees or full body. Turn around and the drape changes to a back view.</p>
        <div className="hero-actions">
          <button className="btn dark" onClick={() => document.querySelector('#collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop sarees <ArrowRight size={16}/></button>
          <button className="btn outline" onClick={() => openStudio(PRODUCTS[0], 'M')}><Camera size={16}/> Open live trial room</button>
        </div>
        <div className="metrics"><div><strong>Visible-pixel fit</strong><span>Stops where your body leaves frame</span></div><div><strong>Front · side · back</strong><span>Drape changes with orientation</span></div><div><strong>Auto recovery</strong><span>Re-locks when you return</span></div></div>
      </div>
      <div className="hero-art hero-garment"><GarmentArt product={PRODUCTS[0]}/><div className="floating"><span>LIVE SAREE TRY-ON</span><strong>{PRODUCTS[0].name}</strong><small>Visible body pixels · automatic drape depth</small></div></div>
    </section>

    <div className="marquee"><span>NO CALIBRATION</span><i/><span>VISIBLE BODY PIXELS</span><i/><span>FRONT + BACK DRAPE</span><i/><span>AUTO RE-LOCK</span></div>

    <section className="collection" id="collection">
      <div className="section-head"><div><span className="eyebrow">SAREE COLLECTION</span><h2>Try the drape before you buy.</h2></div><p>Use a close phone view, a MacBook from farther away, or an uploaded photo. The saree renderer follows the amount of your body that is actually visible instead of forcing a preset crop.</p></div>
      <div className="product-grid">{PRODUCTS.map((product) => <article key={product.id} className="product-card">
        <button className="product-art product-garment" onClick={() => openProduct(product)}><span className="badge">{product.badge}</span><GarmentArt product={product}/><span className="quick">View saree <ArrowRight size={14}/></span></button>
        <div className="product-meta"><div><small>{product.fabric} · {product.colorName}</small><h3>{product.name}</h3><p>{money(product.price)}</p></div><Heart size={18}/></div>
        <button className="customize tryon-cta" onClick={() => openStudio(product, 'M')}>Try this saree live <Camera size={14}/></button>
      </article>)}</div>
    </section>

    <section className="atelier fitting-promo"><div className="rings"><i/><i/><i/></div><div><span className="eyebrow">CONTINUOUS LIVE FITTING</span><h2>No mannequin.<br/><em>No fixed body mode.</em></h2><p>If only your torso and hips are in frame, the saree renders only that far. Step back and it extends continuously toward the knees and ankles. Turn around and the pallu switches to a back drape after the orientation is stable.</p><button className="btn light" onClick={() => openStudio(PRODUCTS[0], 'M')}>Start saree try-on <Camera size={16}/></button></div></section>
  </main>;
}

export function Product({ product, goBack, openStudio, addToBag }) {
  const [size, setSize] = useState('M');

  return <main className="product-page">
    <button className="back" onClick={goBack}><ArrowLeft size={15}/> Sarees</button>
    <div className="product-detail">
      <div className="gallery"><div className="thumbs">{[0,1,2].map((item) => <button className={item===0?'active':''} key={item}><GarmentArt product={product} compact/></button>)}</div><div className="gallery-main product-only-gallery"><GarmentArt product={product}/></div></div>
      <aside className="product-panel">
        <span className="eyebrow">SAREE · PIXEL-AWARE LIVE TRY-ON</span>
        <h1>{product.name}</h1>
        <div className="rating">★★★★★ <span>4.9 · 128 reviews</span></div>
        <div className="price">{money(product.price)}</div>
        <p className="description">{product.fabric} in {product.colorName}. The live fitting room follows visible body pixels and body orientation, so the saree stops naturally at the current camera crop and can switch between front, side and back drape.</p>

        <div className="option"><div className="option-title"><strong>Blouse size</strong><span>{size}</span></div><div className="sizes">{SIZES.map((item)=><button className={size===item?'selected':''} onClick={()=>setSize(item)} key={item}>{item}</button>)}</div></div>

        <button className="btn tryon-primary full" onClick={() => openStudio(product, size)}><Camera size={16}/> Try this saree live</button>
        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-inline-note"><Sparkles size={15}/><span><b>Continuous visible-body fitting</b><small>No point calibration and no forced half/full switch. The renderer follows the visible body boundary.</small></span></div>
        <div className="facts"><p><span>Garment</span><b>Saree</b></p><p><span>Fabric</span><b>{product.fabric}</b></p><p><span>Try-on</span><b>Live camera + photo</b></p></div>
      </aside>
    </div>
  </main>;
}
