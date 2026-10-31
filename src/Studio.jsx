import { ArrowLeft, Check, Ruler, ShieldCheck, ShoppingBag, Shirt, Video } from 'lucide-react';
import { useMemo, useState } from 'react';

import GarmentArt from './GarmentArt';
import VirtualTryOnStage from './VirtualTryOnStage';
import { PRODUCTS, money } from './data';

function recommendSize(product, measurements) {
  const chart = product.sizeChart;
  if (!chart || !measurements.chest) return null;
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const required = {
    chest: Number(measurements.chest) + 4,
    waist: Number(measurements.waist || 0) + 2,
    hip: Number(measurements.hip || 0) + 2,
  };

  return sizes.find((size) => {
    const row = chart[size];
    if (!row) return false;
    if (row.chest && row.chest < required.chest) return false;
    if (required.waist > 2 && row.waist && row.waist < required.waist) return false;
    if (required.hip > 2 && row.hip && row.hip < required.hip) return false;
    return true;
  }) || 'XL';
}

export default function Studio({ goHome, addToBag, initialProduct }) {
  const [product, setProduct] = useState(initialProduct || PRODUCTS[0]);
  const [size, setSize] = useState('M');
  const [measurements, setMeasurements] = useState({ height: '', chest: '', waist: '', hip: '' });
  const recommended = useMemo(() => recommendSize(product, measurements), [product, measurements]);

  const updateMeasurement = (key, value) => setMeasurements((current) => ({ ...current, [key]: value }));

  return <main className="virtual-room nonai-room">
    <div className="virtual-topbar">
      <button onClick={goHome}><ArrowLeft size={16}/> Boutique</button>
      <div><span>MAISON AARA</span><b>Live Trial Room</b></div>
      <div className="desktop"><ShieldCheck size={14}/> No generative AI · classic CV tracking</div>
    </div>

    <div className="virtual-layout">
      <section className="virtual-camera-panel nonai-panel">
        <VirtualTryOnStage product={product}/>
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

        <div className="measurements-box">
          <div className="measurements-title"><Ruler size={15}/><div><b>Your measurements</b><small>Centimetres · used only for deterministic size/fit estimation</small></div></div>
          <div className="measurement-grid">
            {['height', 'chest', 'waist', 'hip'].map((key) => <label key={key}><span>{key}</span><input type="number" min="0" placeholder="cm" value={measurements[key]} onChange={(event) => updateMeasurement(key, event.target.value)}/></label>)}
          </div>
          {recommended && <div className="fit-result"><Check size={15}/><span><b>Recommended size: {recommended}</b><small>Based on garment measurements plus basic ease allowance.</small></span></div>}
        </div>

        <div className="virtual-size">
          <div><b>Choose size</b><u>Size guide</u></div>
          <div>{['XS', 'S', 'M', 'L', 'XL'].map((item) => <button key={item} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
        </div>

        <button className="btn dark full" onClick={addToBag}>Add {product.type.toLowerCase()} to bag <ShoppingBag size={15}/></button>
        <div className="tryon-benefits">
          <p><Video size={14}/><span><b>Live movement tracking</b><small>Manual body anchors follow frame-to-frame with classic optical flow</small></span></p>
          <p><Shirt size={14}/><span><b>Exact garment pixels</b><small>Logo, print, embroidery and garment edges come from the SKU asset</small></span></p>
          <p><Ruler size={14}/><span><b>Measurement-based fit</b><small>Actual customer measurements drive size recommendation</small></span></p>
          <p><ShieldCheck size={14}/><span><b>No generative AI</b><small>No generated person, generated garment or pose model is used</small></span></p>
        </div>
      </aside>
    </div>
  </main>;
}
