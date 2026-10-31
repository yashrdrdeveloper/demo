export default function GarmentArt({ product, compact = false }) {
  const color = product?.color || '#6E2636';
  const shape = product?.shape || 'anarkali';
  const isLehenga = shape === 'lehenga';
  const isStraight = shape === 'straight';
  const isGown = shape === 'gown';

  const skirtPath = isStraight
    ? 'M118 188 C120 310 112 390 108 500 L292 500 C288 390 280 310 282 188 Z'
    : isLehenga
      ? 'M120 226 C104 298 78 398 44 500 L356 500 C322 398 296 298 280 226 Z'
      : isGown
        ? 'M118 190 C105 300 72 410 38 500 L362 500 C328 410 295 300 282 190 Z'
        : 'M120 188 C111 300 92 408 64 500 L336 500 C308 408 289 300 280 188 Z';

  return <div className={`garment-art ${compact ? 'compact' : ''}`} style={{ '--garment': color }}>
    <svg viewBox="0 0 400 560" role="img" aria-label={`${product?.name || 'Dress'} garment preview`}>
      <defs>
        <linearGradient id={`cloth-${product?.id || 'x'}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".15"/>
          <stop offset=".28" stopColor="#fff" stopOpacity=".12"/>
          <stop offset=".55" stopColor="#000" stopOpacity=".05"/>
          <stop offset=".82" stopColor="#fff" stopOpacity=".1"/>
          <stop offset="1" stopColor="#000" stopOpacity=".16"/>
        </linearGradient>
        <filter id={`shadow-${product?.id || 'x'}`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="13" floodOpacity=".17"/>
        </filter>
      </defs>
      <ellipse cx="200" cy="520" rx="132" ry="17" fill="#50382d" opacity=".12"/>
      <g filter={`url(#shadow-${product?.id || 'x'})`}>
        <path d="M132 82 C151 63 170 56 200 56 C230 56 249 63 268 82 L302 130 L278 151 L263 127 L279 194 L121 194 L137 127 L122 151 L98 130 Z" fill={color}/>
        <path d="M132 82 C154 104 176 111 200 111 C224 111 246 104 268 82 L259 70 C239 83 222 89 200 89 C178 89 161 83 141 70 Z" fill="#f0dfcd" opacity=".86"/>
        <path d={skirtPath} fill={color}/>
        <path d="M132 82 C151 63 170 56 200 56 C230 56 249 63 268 82 L302 130 L278 151 L263 127 L279 194 L121 194 L137 127 L122 151 L98 130 Z" fill={`url(#cloth-${product?.id || 'x'})`}/>
        <path d={skirtPath} fill={`url(#cloth-${product?.id || 'x'})`}/>
        <path d="M123 190 C167 199 233 199 277 190" fill="none" stroke="#d6b578" strokeWidth="4" opacity=".85"/>
        {isLehenga && <><path d="M101 382 C165 399 235 399 299 382" fill="none" stroke="#d6b578" strokeWidth="5" opacity=".75"/><path d="M73 470 C156 488 244 488 327 470" fill="none" stroke="#d6b578" strokeWidth="7" opacity=".8"/></>}
        {!isStraight && !isLehenga && <path d="M72 475 C155 491 245 491 328 475" fill="none" stroke="#d6b578" strokeWidth="5" opacity=".68"/>}
      </g>
    </svg>
    {!compact && <span className="garment-art-note">GARMENT VIEW</span>}
  </div>;
}
