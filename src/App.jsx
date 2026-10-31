import { Check, CircleUserRound, Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

import { Home, Product } from './Store';
import Studio from './Studio';
import { PRODUCTS } from './data';

function Logo({ light = false }) {
  return <button className={`logo ${light ? 'light' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span>MAISON</span><b>AARA</b></button>;
}

function Header({ go, cart }) {
  return <header><Logo/><nav><button onClick={() => go('home')}>New</button><button>Collections</button><button>Occasion</button><button className="accent" onClick={() => go('studio')}>Design your own</button></nav><div className="icons"><button aria-label="Search"><Search size={18}/></button><button aria-label="Favourites"><Heart size={18}/></button><button className="bag" aria-label="Bag"><ShoppingBag size={18}/>{cart > 0 && <i>{cart}</i>}</button><button className="desktop" aria-label="Account"><CircleUserRound size={18}/></button><button className="mobile" aria-label="Menu"><Menu size={19}/></button></div></header>;
}

export default function App() {
  const [page, setPage] = useState('home');
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState(false);
  const go = (next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const add = () => { setCart((value) => value + 1); setToast(true); window.setTimeout(() => setToast(false), 2500); };

  return <div>
    {page !== 'studio' && <Header go={go} cart={cart}/>} 
    {page === 'home' && <Home openProduct={(selected) => { setProduct(selected); go('product'); }} openStudio={() => go('studio')}/>} 
    {page === 'product' && <Product product={product} goBack={() => go('home')} openStudio={() => go('studio')} addToBag={add}/>} 
    {page === 'studio' && <Studio goHome={() => go('home')} addToBag={add}/>} 
    {page !== 'studio' && <footer><Logo light/><div><span>Private atelier</span><span>Crafted in India</span><span>Made to order</span></div><small>Prototype experience · Maison Aara</small></footer>} 
    {toast && <div className="toast"><Check size={16}/><span><b>Added to your bag</b><small>{cart} item{cart !== 1 ? 's' : ''} ready</small></span><button onClick={() => setToast(false)}><X size={15}/></button></div>}
  </div>;
}
