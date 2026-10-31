export default function Art({ color = '#6E2636', shape = 'anarkali', compact = false }) {
  return (
    <div className={`fashion-art ${compact ? 'compact' : ''}`} style={{ '--dress': color }}>
      <div className="glow" />
      <div className="head" />
      <div className="neck" />
      <div className={`bodice ${shape}`} />
      <div className={`skirt ${shape}`} />
      <div className="arm left" /><div className="arm right" />
      <div className="shadow" /><div className="vertical-note">MADE TO MEASURE</div>
    </div>
  );
}
