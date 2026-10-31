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
      <div><span>MAISON AARA</span><b>Online Magic Mirror</b></div>
      <div className="desktop"><ShieldCheck size={14}/> Browser-based live fitting</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel">
        <VirtualTryOnStage product={product}/>
        <div className="tryon-filmstrip">
          <div className="filmstrip-head"><div><span className="eyebrow">CHANGE OUTFIT LIVE</span><b>Keep the mirror open</b></div><small>{PRODUCTS.length} try-on pieces</small></div>
          <div className="filmstrip-items">{PRODUCTS.map((item) => <button key={item.id} className={item.id === product.id ? 'active' : ''} onClick={() => setProduct(item)}>
            <GarmentArt product={item} compact/>
            <span>{item.type}</span>
          </button>)}</div>
        </div>
      </section>

      <aside className="virtual-product-panel">
        <span className="eyebrow">NOW TRYING ON</span>
        <div className="virtual-product-thumb"><GarmentArt product={product}/></div>
        <div className="virtual-product-title"><div><small>{product.type} · {product.fabric}</small><h1>{product.name}</h1></div><b>{money(product.price)}</b></div>
        <p className="virtual-copy">{product.garmentType === 'saree' ? 'The saree renderer fits a blouse, wrapped lower drape, center pleats and a pallu across the shoulder.' : product.garmentType === 'onepiece' ? 'The one-piece renderer follows the shoulders, waist and hips as one continuous dress.' : `This ${product.type.toLowerCase()} uses its own garment geometry instead of a generic dress overlay.`}</p>

        <div className="virtual-size">
          <div><b>Choose size</b><u>Size guide</u></div>
          <div>{['XS', 'S', 'M', 'L', 'XL'].map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add {product.type.toLowerCase()} to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Check size={14}/><span><b>Real customer camera</b><small>No mannequin or generated avatar</small></span></p>
          <p><Sparkles size={14}/><span><b>Garment-specific fitting</b><small>Saree, one-piece, gown and kurti render differently</small></span></p>
          <p><ShieldCheck size={14}/><span><b>Online retail flow</b><small>Try multiple products without leaving the fitting room</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
