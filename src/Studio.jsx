import { ArrowLeft, Check, ShieldCheck, ShoppingBag, Shirt, Video } from 'lucide-react';
import { useState } from 'react';

import GarmentArt from './GarmentArt';
import VirtualTryOnStage from './VirtualTryOnStage';
import { PRODUCTS, money } from './data';

export default function Studio({ goHome, addToBag, initialProduct, initialSize = 'M' }) {
  const [product, setProduct] = useState(initialProduct || PRODUCTS[0]);
  const [size, setSize] = useState(initialSize);

  return <main className="virtual-room nonai-room">
    <div className="virtual-topbar">
      <button onClick={goHome}><ArrowLeft size={16}/> Boutique</button>
      <div><span>MAISON AARA</span><b>Live Trial Room</b></div>
      <div className="desktop"><ShieldCheck size={14}/> Exact garment · live classic-CV tracking</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel nonai-panel">
        <VirtualTryOnStage product={product} size={size}/>
        <div className="tryon-filmstrip">
          <div className="filmstrip-head"><div><span className="eyebrow">TRY ANOTHER PRODUCT</span><b>Exact SKU assets</b></div><small>{PRODUCTS.length} examples</small></div>
          <div className="filmstrip-items">{PRODUCTS.map((item) => <button key={item.id} className={item.id === product.id ? 'active' : ''} onClick={() => setProduct(item)}>
            <GarmentArt product={item} compact/>
            <span>{item.type}</span>
          </button>)}</div>
        </div>
      </section>

      <aside className="virtual-product-panel">
        <span className="eyebrow">NOW FITTING</span>
        <div className="virtual-product-thumb"><GarmentArt product={product}/></div>
        <div className="virtual-product-title"><div><small>{product.type} · {product.fabric}</small><h1>{product.name}</h1></div><b>{money(product.price)}</b></div>
        <p className="virtual-copy">{product.fitNote}</p>

        <div className="virtual-size size-only-box">
          <div><b>Your size</b><span>Choose the size you normally buy</span></div>
          <div>{['XS', 'S', 'M', 'L', 'XL'].map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
          <p className="size-fit-note"><Check size={14}/><span>The garment layer updates immediately for <b>{size}</b>. No body measurements are requested.</span></p>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add size {size} to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Video size={14}/><span><b>Stable live movement</b><small>Many torso features are tracked together so the garment moves as one layer</small></span></p>
          <p><Shirt size={14}/><span><b>Exact garment pixels</b><small>Logo, print, embroidery, neckline and sleeves come from the SKU asset</small></span></p>
          <p><ShieldCheck size={14}/><span><b>No generative AI</b><small>No generated person or generated garment is used</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
