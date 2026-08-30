export default function OceanBackground() {
  return (
    <div 
      className="ocean-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.3)), url('/bg-ocean.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
