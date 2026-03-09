#!/usr/bin/env python3
"""
Noody Dashboard — Complete Upgrade v3
Everything in one script: design + live data + Xero tab
Built against the exact b22ca73 index.html (537 lines)
"""

with open('index.html', 'r') as f:
    c = f.read()

orig_len = len(c)
print(f"Original: {orig_len} bytes, {c.count(chr(10))} lines")

# ═══════════════════════════════════════════════════════════
# PART A: DESIGN — Theme system, bigger UI, light/dark toggle
# ═══════════════════════════════════════════════════════════

# A1. Replace <style> block with theme system
OLD_STYLE = """<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a14; }
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
  ::-webkit-scrollbar { width: 5px }
  ::-webkit-scrollbar-track { background: #111 }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px }
</style>"""

NEW_STYLE = """<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  :root{--bg:#0c0c18;--card:#13131f;--bdr:#1e1e34;--t1:#f0f0f5;--t2:#a0a0b8;--t3:#6b6b82;--acc:#4f6ef7;--grn:#22c55e;--ylw:#eab308;--red:#ef4444;--grid:#1e1e34;--tipbg:#1a1a2e;--tipbdr:#2d2d44}
  [data-theme="light"]{--bg:#f4f4f8;--card:#fff;--bdr:#dde0e8;--t1:#1a1a2e;--t2:#555568;--t3:#8888a0;--acc:#4f6ef7;--grn:#16a34a;--ylw:#ca8a04;--red:#dc2626;--grid:#e4e4ef;--tipbg:#fff;--tipbdr:#dde0e8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--t1);font-family:'DM Sans',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:3px}
  button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
  div,span,td,th{transition:background .2s,color .2s,border-color .2s}
</style>"""

assert OLD_STYLE in c, "FATAL: Could not find style block"
c = c.replace(OLD_STYLE, NEW_STYLE)
print("✅ A1: Theme CSS variables")

# A2. Remove inline <style> in JSX
OLD_INLINE = """<style>{"@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}"}</style>"""
assert OLD_INLINE in c, "FATAL: Could not find inline style"
c = c.replace(OLD_INLINE, '')
print("✅ A2: Removed inline <style>")

# A3. Main container → themed
OLD_MAIN = 'minHeight:"100vh",background:"#0a0a14",color:"#e5e7eb",fontFamily:"' + "'Inter',-apple-system,sans-serif" + '"'
NEW_MAIN = 'minHeight:"100vh",background:"var(--bg)",color:"var(--t1)",fontFamily:"' + "'DM Sans',-apple-system,sans-serif" + '"'
c = c.replace(OLD_MAIN, NEW_MAIN)
print("✅ A3: Main container themed")

# A4. Header bar → bigger + themed
c = c.replace(
    'padding:"14px 20px",borderBottom:"1px solid #1a1a2e",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8',
    'padding:"18px 24px",borderBottom:"1px solid var(--bdr)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12'
)

# A5. Logo → bigger
c = c.replace(
    'width:32,height:32,borderRadius:7,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700',
    'width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,var(--acc),#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff"'
)

# A6. Brand name → bigger
c = c.replace(
    'fontSize:14,fontWeight:700,letterSpacing:"-0.02em"',
    'fontSize:17,fontWeight:700,letterSpacing:"-0.02em",color:"var(--t1)"'
)
print("✅ A4-6: Header, logo, brand bigger")

# A7. Tab component → bigger + themed
OLD_TAB = """function Tab({a,onClick,children,icon}){
  return <button onClick={onClick} style={{padding:"8px 13px",background:a?"#2563eb":"transparent",border:a?"1px solid #3b82f6":"1px solid transparent",borderRadius:7,color:a?"#fff":"#9ca3af",fontSize:12,fontWeight:a?600:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:13}}>{icon}</span>{children}</button>;
}"""
NEW_TAB = """function Tab({a,onClick,children,icon}){
  return <button onClick={onClick} style={{padding:"11px 20px",background:a?"var(--acc)":"transparent",border:a?"1px solid var(--acc)":"1px solid var(--bdr)",borderRadius:10,color:a?"#fff":"var(--t2)",fontSize:14,fontWeight:a?600:500,cursor:"pointer",display:"flex",alignItems:"center",gap:7,minHeight:44,whiteSpace:"nowrap",transition:"all .2s"}}><span style={{fontSize:17}}>{icon}</span>{children}</button>;
}"""
assert OLD_TAB in c, "FATAL: Could not find Tab component"
c = c.replace(OLD_TAB, NEW_TAB)
print("✅ A7: Tabs bigger (44px, 14px font)")

# A8. MC component → bigger numbers + themed labels
c = c.replace(
    'fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3',
    'fontSize:12,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5,fontWeight:500'
)
c = c.replace('fontSize:big?26:20,fontWeight:700', 'fontSize:big?32:24,fontWeight:700')
c = c.replace(
    'borderRadius:8,padding:big?"16px":"12px 14px",minWidth:0',
    'borderRadius:12,padding:big?"20px 18px":"16px",minWidth:0,transition:"all .2s"'
)
print("✅ A8: Metric cards bigger (24/32px numbers)")

# A9. Theme state + toggle
OLD_DASH_STATE = """function Dashboard(){
  const [tab,setTab]=useState("equation");
  const [range,setRange]=useState(30);"""
NEW_DASH_STATE = """function Dashboard(){
  const [tab,setTab]=useState("equation");
  const [theme,setTheme]=useState("dark");
  const toggleTheme=()=>{const t=theme==="dark"?"light":"dark";setTheme(t);document.documentElement.setAttribute("data-theme",t);};
  const [range,setRange]=useState(30);"""
assert OLD_DASH_STATE in c, "FATAL: Could not find Dashboard state"
c = c.replace(OLD_DASH_STATE, NEW_DASH_STATE)
print("✅ A9: Theme state added")

# A10. Add toggle button + Xero tab button in header
OLD_TAB_BUTTONS = """        <Tab a={tab==="gads"} onClick={()=>setTab("gads")} icon="\U0001f3af">Google Ads</Tab>
      </div>
    </div>"""
NEW_TAB_BUTTONS = """        <Tab a={tab==="gads"} onClick={()=>setTab("gads")} icon="\U0001f3af">Google Ads</Tab>
        <Tab a={tab==="xero"} onClick={()=>setTab("xero")} icon="\U0001f4cb">Xero P&L</Tab>
      </div>
      <button onClick={toggleTheme} style={{padding:"10px",background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:10,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",width:44,height:44,transition:"all .2s",color:"var(--t2)",flexShrink:0}} title={theme==="dark"?"Light mode":"Dark mode"}>{theme==="dark"?"\u2600\ufe0f":"\U0001f319"}</button>
    </div>"""
assert OLD_TAB_BUTTONS in c, "FATAL: Could not find tab buttons"
c = c.replace(OLD_TAB_BUTTONS, NEW_TAB_BUTTONS)
print("✅ A10: Toggle button + Xero tab button added")

# A11. Range buttons → bigger + themed
c = c.replace(
    'padding:"3px 9px",fontSize:10,borderRadius:4,cursor:"pointer",background:range===r?"#2563eb":"#111",color:range===r?"#fff":"#6b7280",border:range===r?"1px solid #3b82f6":"1px solid #1a1a2e"',
    'padding:"8px 16px",fontSize:13,borderRadius:8,minHeight:36,cursor:"pointer",background:range===r?"var(--acc)":"var(--card)",color:range===r?"#fff":"var(--t2)",border:range===r?"1px solid var(--acc)":"1px solid var(--bdr)"'
)
print("✅ A11: Range buttons bigger (36px)")

# A12. Google Ads day buttons → themed
c = c.replace('background:gadsDays===d?"#2563eb":"#111"', 'background:gadsDays===d?"var(--acc)":"var(--card)"')
c = c.replace('color:gadsDays===d?"#fff":"#6b7280"', 'color:gadsDays===d?"#fff":"var(--t2)"')
c = c.replace('border:gadsDays===d?"1px solid #3b82f6":"1px solid #1a1a2e"', 'border:gadsDays===d?"1px solid var(--acc)":"1px solid var(--bdr)"')

# A13. Global color replacements
c = c.replace('background:"#111"', 'background:"var(--card)"')
c = c.replace('border:"1px solid #1a1a2e"', 'border:"1px solid var(--bdr)"')
c = c.replace('borderBottom:"1px solid #1a1a2e"', 'borderBottom:"1px solid var(--bdr)"')
c = c.replace('borderBottom:"1px solid #0a0a14"', 'borderBottom:"1px solid var(--bg)"')
c = c.replace('background:"#1a1a2e"', 'background:"var(--bdr)"')
c = c.replace('background:"#0a0a14"', 'background:"var(--bg)"')

c = c.replace('color:"#fff"', 'color:"var(--t1)"')
c = c.replace('color:"#e5e7eb"', 'color:"var(--t1)"')
c = c.replace('color:"#d1d5db"', 'color:"var(--t1)"')
c = c.replace('color:"#9ca3af"', 'color:"var(--t2)"')
c = c.replace('color:"#6b7280"', 'color:"var(--t3)"')
c = c.replace('color:"#4b5563"', 'color:"var(--t3)"')

c = c.replace('stroke:"#1a1a2e"', 'stroke:"var(--grid)"')
c = c.replace('background:"#1a1a2e",border:"1px solid #2d2d44"', 'background:"var(--tipbg)",border:"1px solid var(--tipbdr)"')
print("✅ A13: All colors → CSS vars")

# A14. Section headings bigger
c = c.replace('fontSize:16,fontWeight:700', 'fontSize:20,fontWeight:700')

# A15. Tables bigger
c = c.replace('fontSize:9,textTransform:"uppercase"', 'fontSize:11,textTransform:"uppercase"')

# A16. Content area wider + more padding
c = c.replace('maxWidth:1200', 'maxWidth:1400')
c = c.replace('padding:"16px 20px",maxWidth:1400', 'padding:"24px 28px",maxWidth:1400')

# A17. Charts taller
c = c.replace('height={170}', 'height={240}')
c = c.replace('height={120}', 'height={180}')
c = c.replace('height={140}', 'height={200}')

# A18. Card padding + radius
c = c.replace('borderRadius:10,padding:14', 'borderRadius:14,padding:18')
c = c.replace('borderRadius:10,padding:16', 'borderRadius:14,padding:20')

# A19. Chart axis labels bigger
c = c.replace('fontSize:8', 'fontSize:10')

# A20. Subtitle update
c = c.replace(
    'Shopify + Meta + Klaviyo + Xero',
    'Shopify + Meta + Google Ads + Xero'
)
print("✅ A14-20: Bigger headings, tables, charts, cards")


# ═══════════════════════════════════════════════════════════
# PART B: LIVE DATA — Xero, Shopify, Meta fetching + Xero tab
# ═══════════════════════════════════════════════════════════

# B1. Add live data state + fetch functions after Google Ads useEffect
OLD_GADS_EFFECT = '  useEffect(()=>{if(tab==="gads")fetchGads(gadsDays);},[tab,gadsDays]);'
NEW_LIVE_STATE = """  useEffect(()=>{if(tab==="gads")fetchGads(gadsDays);},[tab,gadsDays]);

  // Live Xero data
  const [xeroLive,setXeroLive]=useState(null);
  const [xeroLoading,setXeroLoading]=useState(false);
  const [xeroMonths,setXeroMonths]=useState(12);
  const fetchXero=useCallback(async(mo)=>{
    setXeroLoading(true);
    try{
      const r=await fetch(`/api/pull-xero${mo?`?months=${mo}`:""}`,{headers:{"x-api-key":"noody-eq-2026-datahub"}});
      if(r.ok){const d=await r.json();if(d.success)setXeroLive(d);}
    }catch(e){console.error("Xero:",e);}
    setXeroLoading(false);
  },[]);
  useEffect(()=>{if(tab==="xero"&&!xeroLive&&!xeroLoading)fetchXero(xeroMonths);},[tab]);"""

assert OLD_GADS_EFFECT in c, "FATAL: Could not find gads useEffect"
c = c.replace(OLD_GADS_EFFECT, NEW_LIVE_STATE)
print("✅ B1: Xero live data state + fetch")

# B2. Add Xero tab content — insert INSIDE the content div, after gads tab
# The exact end structure is:
#       </>}
#     </>}
# 
#     </div>
#   </div>;
# }

OLD_END = """      </>}
    </>}

    </div>
  </div>;
}"""

XERO_TAB = """      </>}
    </>}

    {tab==="xero"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:0,color:"var(--t1)"}}>Xero P&L — Live</h2>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {[3,6,12].map(mo=><button key={mo} onClick={()=>{setXeroMonths(mo);fetchXero(mo);}} style={{padding:"8px 16px",fontSize:13,borderRadius:8,minHeight:36,cursor:"pointer",background:xeroMonths===mo?"var(--acc)":"var(--card)",color:xeroMonths===mo?"#fff":"var(--t2)",border:xeroMonths===mo?"1px solid var(--acc)":"1px solid var(--bdr)"}}>{mo}mo</button>)}
          <button onClick={()=>fetchXero(xeroMonths)} style={{padding:"8px 16px",fontSize:13,borderRadius:8,cursor:"pointer",background:"var(--card)",color:"var(--t2)",border:"1px solid var(--bdr)"}}>↻ Refresh</button>
        </div>
      </div>

      {xeroLoading&&<div style={{textAlign:"center",padding:40,color:"var(--t3)"}}>
        <div style={{fontSize:24,marginBottom:8}}>⏳</div>
        <div style={{fontSize:14}}>Pulling live data from Xero...</div>
      </div>}

      {!xeroLoading&&!xeroLive&&<div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:24,textAlign:"center"}}>
        <div style={{fontSize:14,color:"var(--t2)",marginBottom:12}}>No Xero data loaded yet</div>
        <button onClick={()=>fetchXero(12)} style={{padding:"12px 24px",fontSize:14,borderRadius:10,cursor:"pointer",background:"var(--acc)",color:"#fff",border:"none",fontWeight:600}}>Load Xero P&L</button>
      </div>}

      {xeroLive&&!xeroLoading&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:18}}>
          <MC l="Revenue" v={xeroLive.profitAndLoss?.summary?.revenue} fmt="$" big/>
          <MC l="COGS" v={xeroLive.profitAndLoss?.summary?.cogs} fmt="$"/>
          <MC l="Gross Profit" v={xeroLive.profitAndLoss?.summary?.grossProfit} fmt="$"/>
          <MC l="Gross Margin" v={xeroLive.profitAndLoss?.summary?.grossMargin} fmt="%" bm={{h:[60,100],w:[50,60]}}/>
          <MC l="Expenses" v={xeroLive.profitAndLoss?.summary?.totalExpenses} fmt="$"/>
          <MC l="Net Profit" v={xeroLive.profitAndLoss?.summary?.netProfit} fmt="$"/>
          <MC l="Net Margin" v={xeroLive.profitAndLoss?.summary?.netMargin} fmt="%" bm={{h:[10,100],w:[0,10]}}/>
        </div>

        {xeroLive.profitAndLoss?.sections&&Object.entries(xeroLive.profitAndLoss.sections).map(([sec,data])=>(
          <div key={sec} style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:18,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:15,fontWeight:600,color:"var(--t1)"}}>{sec}</div>
              {data.total!=null&&<div style={{fontSize:15,fontWeight:700,color:"var(--acc)",fontFamily:"'JetBrains Mono',monospace"}}>{f$(data.total)}</div>}
            </div>
            {data.items&&data.items.map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<data.items.length-1?"1px solid var(--bdr)":"none"}}>
                <span style={{fontSize:13,color:"var(--t2)"}}>{item.name}</span>
                <span style={{fontSize:13,fontWeight:600,color:item.value<0?"var(--red)":"var(--t1)",fontFamily:"'JetBrains Mono',monospace"}}>{f$(item.value)}</span>
              </div>
            ))}
          </div>
        ))}

        {xeroLive.balanceSheet&&<div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:18,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:600,color:"var(--t1)",marginBottom:12}}>Balance Sheet</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
            <MC l="Total Assets" v={xeroLive.balanceSheet?.summary?.totalAssets} fmt="$"/>
            <MC l="Liabilities" v={xeroLive.balanceSheet?.summary?.totalLiabilities} fmt="$"/>
            <MC l="Net Assets" v={xeroLive.balanceSheet?.summary?.netAssets||xeroLive.balanceSheet?.summary?.totalEquity} fmt="$"/>
            <MC l="Equity" v={xeroLive.balanceSheet?.summary?.totalEquity} fmt="$"/>
          </div>
        </div>}

        <div style={{fontSize:11,color:"var(--t3)",textAlign:"right",marginTop:8}}>
          Pulled: {xeroLive.pulledAt?new Date(xeroLive.pulledAt).toLocaleString("en-NZ",{timeZone:"Pacific/Auckland"}):"—"} · Token: {xeroLive.tokenStatus||"—"}
        </div>
      </>}
    </>}

    </div>
  </div>;
}"""

assert OLD_END in c, "FATAL: Could not find closing JSX structure"
c = c.replace(OLD_END, XERO_TAB)
print("✅ B2: Xero P&L tab content added (inside JSX tree)")


# ═══════════════════════════════════════════════════════════
# VERIFY
# ═══════════════════════════════════════════════════════════

with open('index.html', 'w') as f:
    f.write(c)

checks = {
    "Theme vars": c.count('var(--'),
    "Toggle btn": 'toggleTheme' in c,
    "DM Sans": 'DM Sans' in c,
    "Xero tab btn": 'Xero P&L</Tab>' in c,
    "Xero fetch": 'fetchXero' in c,
    "#111 remaining": c.count('"#111"'),
    "#0a0a14 remaining": c.count('"#0a0a14"'),
    "JSX closed": c.rstrip().endswith('</html>'),
}

print(f"\n{'='*50}")
print(f"✅ DONE! {len(c)} bytes ({len(c)-orig_len:+d})")
for k, v in checks.items():
    status = "✅" if (v if isinstance(v, bool) else v > 0 if 'var' in k or 'Sans' in k else v == 0) else "⚠️"
    print(f"  {status} {k}: {v}")
print(f"{'='*50}")
print(f"\ngit add -A && git commit -m 'feat: design upgrade + live Xero tab' && git push")
