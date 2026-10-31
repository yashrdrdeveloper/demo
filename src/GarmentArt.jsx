export default function GarmentArt({ product, compact = false }) {
  const item = product || {};
  const type = item.garmentType || 'onepiece';

  if (item.photoUrl) {
    return <div className={`garment-art real-garment-photo garment-${type} ${compact ? 'compact' : ''}`}>
      <img
        src={item.photoUrl}
        alt={`${item.name || 'Garment'} reference`}
        style={{ objectPosition: item.photoFocus || 'center' }}
        crossOrigin="anonymous"
      />
      <div className="real-garment-vignette"/>
      {!compact && <><span className="garment-art-note">REAL GARMENT REFERENCE</span><small className="garment-source">{item.sourceLabel}</small></>}
    </div>;
  }

  return <div className={`garment-art garment-${type} ${compact ? 'compact' : ''}`} style={{ background: item.color || '#7C2F3E' }}>
    <strong>{item.name || 'Garment'}</strong>
  </div>;
}
