function ClothDefs({ id, color, accent }) {
  return <defs>
    <linearGradient id={`cloth-${id}`} x1="0" x2="1">
      <stop offset="0" stopColor="#000" stopOpacity=".18"/>
      <stop offset=".22" stopColor="#fff" stopOpacity=".13"/>
      <stop offset=".5" stopColor={color}/>
      <stop offset=".76" stopColor="#fff" stopOpacity=".1"/>
      <stop offset="1" stopColor="#000" stopOpacity=".2"/>
    </linearGradient>
    <linearGradient id={`accent-${id}`} x1="0" x2="1">
      <stop offset="0" stopColor={accent} stopOpacity=".82"/>
      <stop offset="1" stopColor="#fff0"/>
    </linearGradient>
    <filter id={`shadow-${id}`} x="-40%" y="-30%" width="180%" height="180%">
      <feDropShadow dx="0" dy="18" stdDeviation="13" floodOpacity=".2"/>
    </filter>
  </defs>;
}

function Saree({ id, color, accent }) {
  return <g filter={`url(#shadow-${id})`}>
    <path d="M126 88 C146 66 171 58 200 58 C229 58 254 66 274 88 L292 130 L267 144 L251 111 L248 191 L149 191 L146 111 L130 144 L105 130 Z" fill={color}/>
    <path d="M145 78 C167 98 180 103 200 103 C220 103 233 98 255 78 L247 68 C230 80 216 85 200 85 C184 85 170 80 153 68 Z" fill="#f2dcc8" opacity=".92"/>
    <path d="M151 186 C132 264 121 343 108 502 L292 502 C279 343 268 264 249 186 Z" fill={color}/>
    <path d="M151 186 C132 264 121 343 108 502 L292 502 C279 343 268 264 249 186 Z" fill={`url(#cloth-${id})`}/>
    <path d="M154 192 C148 273 149 379 158 501 M174 192 C170 281 172 392 177 501 M196 192 C194 283 196 397 199 501 M220 192 C224 283 222 397 220 501 M242 192 C251 277 250 385 243 501" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="3"/>
    <path d="M258 91 C237 129 219 164 206 205 C195 241 208 277 239 301 C270 325 303 346 329 390 L361 356 C323 311 298 281 283 243 C271 211 272 158 292 116 Z" fill={color}/>
    <path d="M258 91 C237 129 219 164 206 205 C195 241 208 277 239 301 C270 325 303 346 329 390 L361 356 C323 311 298 281 283 243 C271 211 272 158 292 116 Z" fill={`url(#cloth-${id})`}/>
    <path d="M104 472 C157 485 243 485 296 472" fill="none" stroke={accent} strokeWidth="8" opacity=".9"/>
    <path d="M322 350 L352 365" stroke={accent} strokeWidth="8" opacity=".9"/>
    <path d="M149 188 C174 196 225 196 251 188" fill="none" stroke={accent} strokeWidth="4" opacity=".82"/>
  </g>;
}

function OnePiece({ id, color, accent }) {
  return <g filter={`url(#shadow-${id})`}>
    <path d="M132 82 C151 64 174 57 200 57 C226 57 249 64 268 82 L297 129 L274 149 L256 121 L266 202 L134 202 L144 121 L126 149 L103 129 Z" fill={color}/>
    <path d="M132 82 C151 64 174 57 200 57 C226 57 249 64 268 82 L297 129 L274 149 L256 121 L266 202 L134 202 L144 121 L126 149 L103 129 Z" fill={`url(#cloth-${id})`}/>
    <path d="M136 198 C128 278 105 384 70 498 L330 498 C295 384 272 278 264 198 Z" fill={color}/>
    <path d="M136 198 C128 278 105 384 70 498 L330 498 C295 384 272 278 264 198 Z" fill={`url(#cloth-${id})`}/>
    <path d="M142 81 C164 103 181 110 200 110 C219 110 236 103 258 81 L248 70 C231 83 216 89 200 89 C184 89 169 83 152 70 Z" fill="#efdcc9" opacity=".9"/>
    <path d="M136 203 C170 214 230 214 264 203" fill="none" stroke={accent} strokeWidth="4" opacity=".76"/>
    <path d="M86 463 C149 480 251 480 314 463" fill="none" stroke={accent} strokeWidth="5" opacity=".58"/>
  </g>;
}

function Gown({ id, color, accent }) {
  return <g filter={`url(#shadow-${id})`}>
    <path d="M133 82 C153 64 176 57 200 57 C224 57 247 64 267 82 L293 128 L271 148 L255 119 L264 194 L136 194 L145 119 L129 148 L107 128 Z" fill={color}/>
    <path d="M133 82 C153 64 176 57 200 57 C224 57 247 64 267 82 L293 128 L271 148 L255 119 L264 194 L136 194 L145 119 L129 148 L107 128 Z" fill={`url(#cloth-${id})`}/>
    <path d="M136 190 C122 280 83 405 31 510 L369 510 C317 405 278 280 264 190 Z" fill={color}/>
    <path d="M136 190 C122 280 83 405 31 510 L369 510 C317 405 278 280 264 190 Z" fill={`url(#cloth-${id})`}/>
    <path d="M52 476 C139 497 261 497 348 476" fill="none" stroke={accent} strokeWidth="6" opacity=".7"/>
  </g>;
}

function Kurti({ id, color, accent }) {
  return <g filter={`url(#shadow-${id})`}>
    <path d="M126 84 C146 65 171 58 200 58 C229 58 254 65 274 84 L303 132 L278 152 L260 120 L274 372 L126 372 L140 120 L122 152 L97 132 Z" fill={color}/>
    <path d="M126 84 C146 65 171 58 200 58 C229 58 254 65 274 84 L303 132 L278 152 L260 120 L274 372 L126 372 L140 120 L122 152 L97 132 Z" fill={`url(#cloth-${id})`}/>
    <path d="M143 80 C164 101 181 108 200 108 C219 108 236 101 257 80 L248 70 C231 83 216 88 200 88 C184 88 169 83 152 70 Z" fill="#efddca" opacity=".9"/>
    <path d="M133 337 C166 348 234 348 267 337" fill="none" stroke={accent} strokeWidth="5" opacity=".72"/>
  </g>;
}

export default function GarmentArt({ product, compact = false }) {
  const item = product || {};
  const id = item.id || 'x';
  const color = item.color || '#7C2F3E';
  const accent = item.accent || '#D6B477';
  const type = item.garmentType || 'onepiece';

  return <div className={`garment-art garment-${type} ${compact ? 'compact' : ''}`} style={{ '--garment': color }}>
    <svg viewBox="0 0 400 560" role="img" aria-label={`${item.name || 'Garment'} preview`}>
      <ClothDefs id={id} color={color} accent={accent}/>
      <ellipse cx="200" cy="522" rx="132" ry="17" fill="#50382d" opacity=".12"/>
      {type === 'saree' && <Saree id={id} color={color} accent={accent}/>} 
      {type === 'onepiece' && <OnePiece id={id} color={color} accent={accent}/>} 
      {type === 'gown' && <Gown id={id} color={color} accent={accent}/>} 
      {type === 'kurti' && <Kurti id={id} color={color} accent={accent}/>} 
    </svg>
    {!compact && <span className="garment-art-note">{(item.type || 'GARMENT').toUpperCase()}</span>}
  </div>;
}
