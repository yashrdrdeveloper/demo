import { ArrowLeft, Check, ShieldCheck, ShoppingBag, Sparkles, Video } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import VirtualTryOnStage from './VirtualTryOnStage';
import { PRODUCTS, SIZES, money } from './data';

export default function Studio({ goHome, addToBag, initialProduct, initialSize = 'M' }) {
  const [product, setProduct] = useState(initialProduct || PRODUCTS[0]);
  const [size, setSize] = useState(initialSize);

  return <main className="virtual-room saree-room">
    <div className="virtual-topbar">
      <button onClick={goHome}><ArrowLeft size={16}/> Boutique</button>
      <div><span>MAISON AARA</span><b>Automatic Saree Trial Room</b></div>
      <div className="desktop"><ShieldCheck size={14}/> On-device body tracking</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel auto-panel">
        <VirtualTryOnStage product={product} size={size}/>
        <div className="tryon-filmstrip">
          <div className="filmstrip-head"><div><span className="eyebrow">SWITCH SAREE LIVE</span><b>Keep the camera open</b></div><small>{PRODUCTS.length} sarees</small></div>
          <div className="filmstrip-items">{PRODUCTS.map((item) => <button key={item.id} className={item.id === product.id ? 'active' : ''} onClick={() => setProduct(item)}>
            <GarmentArt product={item} compact/>
            <span>{item.colorName}</span>
          </button>)}</div>
        </div>
      </section>

      <aside className="virtual-product-panel">
        <span className="eyebrow">NOW TRYING</span>
        <div className="virtual-product-thumb"><GarmentArt product={product}/></div>
        <div className="virtual-product-title"><div><small>{product.fabric} · {product.colorName}</small><h1>{product.name}</h1></div><b>{money(product.price)}</b></div>
        <p className="virtual-copy">The renderer follows your body automatically and constructs the saree as blouse, wrapped lower drape, front pleats and shoulder pallu.</p>

        <div className="virtual-size size-only-box">
          <div><b>Blouse size</b><span>Choose the size you normally buy</span></div>
          <div>{SIZES.map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
          <p className="size-fit-note"><Check size={14}/><span>The blouse layer updates for <b>{size}</b>; the saree drape remains free-size.</span></p>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add saree to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Video size={14}/><span><b>No manual points</b><small>Shoulders, hips, knees and ankles are detected automatically</small></span></p>
          <p><Sparkles size={14}/><span><b>Selfie + full-body modes</b><small>Close framing shows blouse/pallu; standing back unlocks the full saree</small></span></p>
          <p><ShieldCheck size={14}/><span><b>Automatic recovery</b><small>If tracking drops, it searches and locks again without calibration</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
