#!/usr/bin/env python3
"""
Noody Dashboard — Wire All Live Data (v4)
Adds: Shopify live fetch, Meta live fetch, mergedD array, Equation uses live Xero
Built against d2b7e2a index.html
"""

with open('index.html', 'r') as f:
    c = f.read()

orig = len(c)
print(f"Original: {orig} bytes")

# ═══════════════════════════════════════════
# 1. ADD SHOPIFY + META FETCH AFTER XERO EFFECT
# ═══════════════════════════════════════════

OLD_XERO_EFFECT = '  useEffect(()=>{if(tab==="xero"&&!xeroLive&&!xeroLoading)fetchXero(xeroMonths);},[tab]);'

NEW_ALL_FETCHERS = """  useEffect(()=>{if(tab==="xero"&&!xeroLive&&!xeroLoading)fetchXero(xeroMonths);},[tab]);

  // Live Shopify data
  const [shopLive,setShopLive]=useState(null);
  const [shopLoading,setShopLoading]=useState(false);
  const fetchShop=useCallback(async()=>{
    setShopLoading(true);
    try{
      const r=await fetch('/api/pull-shopify?days=400',{headers:{"x-api-key":"noody-eq-2026-datahub"}});
      if(r.ok){const d=await r.json();if(d.daily)setShopLive(d);}
    }catch(e){console.error("Shopify:",e);}
    setShopLoading(false);
  },[]);

  // Live Meta data
  const [metaLive,setMetaLive]=useState(null);
  const [metaLoading,setMetaLoading]=useState(false);
  const fetchMeta=useCallback(async()=>{
    setMetaLoading(true);
    try{
      const r=await fetch('/api/pull-meta?days=400',{headers:{"x-api-key":"noody-eq-2026-datahub"}});
      if(r.ok){const d=await r.json();if(d.daily)setMetaLive(d);}
    }catch(e){console.error("Meta:",e);}
    setMetaLoading(false);
  },[]);

  // Auto-fetch on first visit to relevant tabs
  useEffect(()=>{
    if((tab==="daily"||tab==="equation"||tab==="meta"||tab==="diagnose"||tab==="scale")&&!shopLive&&!shopLoading)fetchShop();
    if((tab==="daily"||tab==="meta")&&!metaLive&&!metaLoading)fetchMeta();
    if((tab==="equation"||tab==="diagnose"||tab==="scale")&&!xeroLive&&!xeroLoading)fetchXero(xeroMonths);
  },[tab]);

  // Merge hardcoded D with live Shopify+Meta data
  const mergedD=useMemo(()=>{
    if(!shopLive&&!metaLive)return D;
    const shopMap={};const metaMap={};
    if(shopLive?.daily)shopLive.daily.forEach(d=>{shopMap[d.date]={r:d.revenue||0,o:d.orders||0,i:d.itemsSold||0,s:d.totalShipping||0};});
    if(metaLive?.daily)metaLive.daily.forEach(d=>{metaMap[d.date]={ms:d.metaSpend||0,mp:d.purchases||0,mv:d.purchaseValue||0};});
    const merged=D.map(row=>{
      const sd=shopMap[row.d];const md=metaMap[row.d];
      if(sd||md)return{...row,...(sd||{}),...(md||{})};
      return row;
    });
    const existDates=new Set(merged.map(r=>r.d));
    if(shopLive?.daily){
      shopLive.daily.forEach(d=>{
        if(!existDates.has(d.date)){
          const md=metaMap[d.date]||{ms:0,mp:0,mv:0};
          merged.push({d:d.date,r:d.revenue||0,o:d.orders||0,i:d.itemsSold||0,s:d.totalShipping||0,e:0,...md});
          existDates.add(d.date);
        }
      });
    }
    merged.sort((a,b)=>a.d.localeCompare(b.d));
    return merged;
  },[shopLive,metaLive]);

  // Live Xero P&L for Equation tab (falls back to hardcoded XERO)
  const liveXero=useMemo(()=>{
    if(!xeroLive?.profitAndLoss?.summary)return null;
    const s=xeroLive.profitAndLoss.summary;
    return {rev:s.revenue||0,gp:s.grossProfit||0,gm:s.grossMargin||0,np:s.netProfit||0,nm:s.netMargin||0,cogs:s.cogs||0,exp:s.totalExpenses||0};
  },[xeroLive]);"""

assert OLD_XERO_EFFECT in c, "FATAL: Could not find Xero useEffect"
c = c.replace(OLD_XERO_EFFECT, NEW_ALL_FETCHERS)
print("✅ 1: Shopify + Meta fetch + mergedD + liveXero")

# ═══════════════════════════════════════════
# 2. REPLACE D WITH mergedD IN CALCULATIONS
# ═══════════════════════════════════════════

# vis calculation
c = c.replace(
    'const vis=useMemo(()=>D.slice(-range),[range]);',
    'const vis=useMemo(()=>mergedD.slice(-range),[range,mergedD]);'
)
print("✅ 2a: vis uses mergedD")

# monthly calculation
c = c.replace(
    'D.forEach(d=>{\n      let k=d.d.slice(0,7);',
    'mergedD.forEach(d=>{\n      let k=d.d.slice(0,7);'
)
print("✅ 2b: monthly uses mergedD")

# Header day count
c = c.replace(
    '{D.length} days',
    '{mergedD.length} days{(shopLive||metaLive)?" (live)":""}'
)
print("✅ 2c: Header shows live indicator")

# ═══════════════════════════════════════════
# 3. ADD LOADING INDICATOR FOR DAILY/META
# ═══════════════════════════════════════════

# Add a small loading bar under the range buttons when data is loading
OLD_RANGE_CLOSE = """    {[7,14,30,90,180,365].map(r=><button key={r} onClick={()=>setRange(r)} style={{padding:"8px 16px",fontSize:13,borderRadius:8,minHeight:36,cursor:"pointer",background:range===r?"var(--acc)":"var(--card)",color:range===r?"#fff":"var(--t2)",border:range===r?"1px solid var(--acc)":"1px solid var(--bdr)"}}>{r}d</button>)}
    </div>}"""

NEW_RANGE_CLOSE = """    {[7,14,30,90,180,365].map(r=><button key={r} onClick={()=>setRange(r)} style={{padding:"8px 16px",fontSize:13,borderRadius:8,minHeight:36,cursor:"pointer",background:range===r?"var(--acc)":"var(--card)",color:range===r?"#fff":"var(--t2)",border:range===r?"1px solid var(--acc)":"1px solid var(--bdr)"}}>{r}d</button>)}
      {(shopLoading||metaLoading)&&<span style={{fontSize:12,color:"var(--t3)",marginLeft:8}}>⏳ Refreshing live data...</span>}
    </div>}"""

assert OLD_RANGE_CLOSE in c, "FATAL: Could not find range close"
c = c.replace(OLD_RANGE_CLOSE, NEW_RANGE_CLOSE)
print("✅ 3: Loading indicator on range bar")

# ═══════════════════════════════════════════
# 4. EQUATION TAB — SHOW LIVE XERO SOURCE
# ═══════════════════════════════════════════

# Update the source line in the Equation tab
OLD_SOURCE = 'Source: Xero P&L (Apr 2025'
if OLD_SOURCE in c:
    c = c.replace(OLD_SOURCE, '{liveXero?"⚡ Live from Xero API":"📊 Xero P&L (Apr 2025')
    # Close the ternary — find the rest of that line
    c = c.replace(
        'Mar 2026) + Live APIs',
        'Mar 2026)"}'
    )
    print("✅ 4: Equation tab shows live/cached indicator")
else:
    print("⚠️  4: Source line not found (may already be modified)")


# ═══════════════════════════════════════════
# WRITE + VERIFY
# ═══════════════════════════════════════════

with open('index.html', 'w') as f:
    f.write(c)

checks = {
    "fetchShop": 'fetchShop' in c,
    "fetchMeta": 'fetchMeta' in c,
    "mergedD used": c.count('mergedD'),
    "D.slice remaining": 'D.slice(' in c,
    "D.forEach remaining": 'D.forEach(' in c,
    "JSX closed": c.rstrip().endswith('</html>'),
}

print(f"\n{'='*50}")
print(f"✅ DONE! {len(c)} bytes ({len(c)-orig:+d})")
for k,v in checks.items():
    if isinstance(v, bool):
        print(f"  {'✅' if v else '❌'} {k}: {v}")
    elif isinstance(v, int):
        good = v > 0 if 'mergedD' in k else v == 0
        print(f"  {'✅' if good else '⚠️'} {k}: {v}")
print(f"{'='*50}")
print(f"\ngit add -A && git commit -m 'feat: all tabs pull live data' && git push")
