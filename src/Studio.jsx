import { ArrowLeft, Check, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import VirtualTryOnStage from './VirtualTryOnStage';
import { PRODUCTS, money } from './data';

export default function Studio({ goHome, addToBag, initialProduct }) {
  const [product, setProduct] = useState(initialProduct || PRODUCTS[0]);
  const [size, setSize] = useState('M');

  return <main className="virtual-room">
    <div className="virtual-topbar">
      <button onClick={goHome}><ArrowLeft size={16}/> Boutique</button>
      <div><span>MAISON AARA</span><b>Virtual Try-On</b></div>
      <div className="desktop"><ShieldCheck size={14}/> Private on-device fitting</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel">
        <VirtualTryOnStage product={product}/>
        <div className="tryon-filmstrip">
          <div className="filmstrip-head"><div><span className="eyebrow">TRY ANOTHER LOOK</span><b>Switch instantly</b></div><small>{PRODUCTS.length} pieces</small></div>
          <div className="filmstrip-items">{PRODUCTS.map((item) => <button key={item.id} className={item.id === product.id ? 'active' : ''} onClick={() => setProduct(item)}>
            <GarmentArt product={item} compact/>
            <span>{item.name}</span>
          </button>)}</div>
        </div>
      </section>

      <aside className="virtual-product-panel">
        <span className="eyebrow">NOW TRYING ON</span>
        <div className="virtual-product-thumb"><GarmentArt product={product}/></div>
        <div className="virtual-product-title"><div><small>{product.type}</small><h1>{product.name}</h1></div><b>{money(product.price)}</b></div>
        <p className="virtual-copy">The garment follows your real shoulders, waist, hips and body position as you move. Stand far enough back to keep your upper body and hips visible.</p>

        <div className="virtual-size">
          <div><b>Choose size</b><u>Size guide</u></div>
          <div>{['XS', 'S', 'M', 'L', 'XL'].map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Check size={14}/><span><b>Live body tracking</b><small>Moves with your pose in real time</small></span></p>
          <p><Sparkles size={14}/><span><b>Instant style switching</b><small>Compare outfits without leaving the camera</small></span></p>
          <p><ShieldCheck size={14}/><span><b>Private by design</b><small>Camera frames stay on your device</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
