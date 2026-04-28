export default function NotFound() {
  return (
    <div style={{ minHeight:'100vh', background:'#FAF9F5', color:'#0B1C37', fontFamily:'var(--font-inter), sans-serif', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, padding:40 }}>
      <h1 style={{ fontSize:48, fontWeight:800, margin:0 }}>404</h1>
      <p style={{ fontSize:16, color:'#475569', margin:0 }}>Page not found.</p>
      <a href="/" style={{ marginTop:8, padding:'10px 24px', background:'#FECC01', color:'#0B1C37', borderRadius:8, textDecoration:'none', fontWeight:600 }}>Back to dashboard</a>
    </div>
  );
}
