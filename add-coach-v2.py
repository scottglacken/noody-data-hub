#!/usr/bin/env python3
"""
Add Coach panel to Equation tab - fixed unicode handling
"""

with open('index.html', 'rb') as f:
    raw = f.read()
c = raw.decode('utf-8', errors='surrogatepass')

print(f"Original: {len(c)} bytes")

# 1. ADD AI STATE
OLD_RANGE = '  const [range,setRange]=useState(30);'
NEW_RANGE = """  const [range,setRange]=useState(30);
  const [aiCoach,setAiCoach]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);"""

assert OLD_RANGE in c, "FATAL: Could not find range state"
c = c.replace(OLD_RANGE, NEW_RANGE)
print("  1: AI state added")

# 2. INSERT COACH PANEL
OLD_EQ_END = """        <MC l="LER" v={Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100} fmt="n" sub="Gross Margin / Wages" bm={{h:[2,100],w:[1.5,2]}}/>
      </div>
    </>}"""

COACH = """        <MC l="LER" v={Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100} fmt="n" sub="Gross Margin / Wages" bm={{h:[2,100],w:[1.5,2]}}/>
      </div>

      {/* COACH & DIAGNOSIS */}
      {(()=>{
        const vcPct=XERO_VAR/XERO.rev*100;
        const merPct=XERO_MKT/XERO.rev*100;
        const fcPct=XERO_FIXED/XERO.rev*100;
        const npPct=XERO_PROFIT/XERO.rev*100;
        const ler=Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100;
        const dtcMerVal=XERO_MKT/XERO.dtc*100;

        let situation=1,sitLabel="PROFITABLE",sitColor="var(--grn)",sitIcon="[OK]";
        let constraint="",rootCause="",action="",warning="";

        if(npPct>=10){
          situation=1;sitLabel="PROFITABLE";sitColor="var(--grn)";sitIcon="[OK]";
          constraint="Throughput";
          rootCause="Your equation is healthy. The constraint is volume - you need more orders flowing through this profitable system.";
          action="SCALE. Increase ad spend. Put upward pressure on marketing volume. The equation is working - do more of it.";
          warning="Do not tinker with what is working. Do not cut costs. Scale.";
        } else if(fcPct>25 && fcPct>merPct && fcPct>vcPct){
          situation=2;sitLabel="HIGH FIXED COSTS";sitColor="var(--ylw)";sitIcon="[!]";
          constraint="Efficiency (Fixed Costs)";
          rootCause="Fixed costs at "+fcPct.toFixed(1)+"% are the primary drag. At $"+fn(Math.round(XERO_FIXED/XERO.months))+"/mo, they eat too much of current revenue.";
          action="SCALE to spread fixed costs over more revenue. A $"+fn(Math.round(XERO_FIXED/XERO.months))+" fixed cost is "+fcPct.toFixed(0)+"% of $"+fn(Math.round(XERO.rev/XERO.months))+"/mo but would be "+(fcPct/2).toFixed(1)+"% if you doubled revenue.";
          warning="Do NOT cut costs as the primary strategy. The answer is almost always scale.";
        } else if(vcPct>40){
          situation=3;sitLabel="HIGH VARIABLE COSTS";sitColor="var(--red)";sitIcon="[!!]";
          constraint="Efficiency (Variable Costs)";
          rootCause="Variable costs at "+vcPct.toFixed(1)+"% are above the 40% benchmark. Unlike fixed costs, these do not improve with scale - they travel with every order.";
          action="Attack COGS ("+fp(XERO.cogs/XERO.rev*100)+"), shipping ("+fp(XERO.postage/XERO.rev*100)+"), and packaging ("+fp(XERO.pkg/XERO.rev*100)+"). Negotiate supplier terms, increase AOV to dilute shipping.";
          warning="Do NOT try to scale your way out of high variable costs. Fix margins first.";
        } else if(merPct>35){
          situation=4;sitLabel="HIGH MARKETING COST";sitColor="var(--red)";sitIcon="[!!]";
          constraint="Efficiency (Marketing)";
          rootCause="MER at "+merPct.toFixed(1)+"% is above the 35% benchmark. But check DTC-only MER ("+dtcMerVal.toFixed(1)+"%) - wholesale dilutes the blended figure.";
          action="Diagnose: is CPP too high (ad creative/targeting) or is RPV too low (conversion rate + AOV)? Revenue Per Visit = CR x AOV is the key lever.";
          warning="Do not just cut ad spend. That reduces revenue. Fix the efficiency of each dollar spent.";
        } else if(npPct<10 && npPct>=0){
          situation=5;sitLabel="LIVING ON THE EDGE";sitColor="var(--ylw)";sitIcon="[!]";
          constraint="Multiple";
          rootCause="No single metric is dramatically over, but everything is pushed to the upper bounds of each range. Combined effect: "+npPct.toFixed(1)+"% net profit.";
          action="Work multiple fronts in order: 1) Reduce MER (fix marketing efficiency), 2) Reduce variable costs, 3) Scale to reduce fixed cost ratio.";
          warning="Cannot scale first because marketing inefficiency will compound at higher spend.";
        } else {
          situation=5;sitLabel="UNPROFITABLE";sitColor="var(--red)";sitIcon="[!!]";
          constraint="Multiple (Critical)";
          rootCause="Net profit is negative at "+npPct.toFixed(1)+"%. This needs immediate attention across the equation.";
          action="Emergency sequence: 1) Check for stupid costs, 2) Fix MER, 3) Fix variable costs, 4) Then scale.";
          warning="Do not increase ad spend until the unit economics are fixed.";
        }

        const insights=[];
        if(dtcMerVal>50)insights.push({title:"DTC MER Critical",text:"Your true DTC-only MER is "+dtcMerVal.toFixed(1)+"%. You are spending "+Math.round(dtcMerVal)+" cents for every $1 of DTC revenue. Wholesale is masking this.",color:"var(--red)"});
        if(ler>=2)insights.push({title:"LER Healthy",text:"Labor Efficiency Ratio of "+ler.toFixed(2)+" exceeds the $2.00 benchmark. Every $1 in wages produces $"+ler.toFixed(2)+" of gross margin.",color:"var(--grn)"});
        else if(ler>=1.5)insights.push({title:"LER Warning",text:"LER at "+ler.toFixed(2)+" is below the $2.00 target. Do not add headcount until pretax profit hits 15%+.",color:"var(--ylw)"});
        else insights.push({title:"LER Critical",text:"LER at "+ler.toFixed(2)+" is well below $2.00. Profitability is being eroded by labor costs.",color:"var(--red)"});
        if(XERO.postage/XERO.rev*100>12)insights.push({title:"Shipping High",text:"Shipping at "+fp(XERO.postage/XERO.rev*100)+" of revenue. Increase AOV to dilute, negotiate carrier rates, or optimise packaging.",color:"var(--ylw)"});
        if(vcPct<34)insights.push({title:"Variable Costs Strong",text:"At "+vcPct.toFixed(1)+"%, your variable costs are well within the <40% benchmark.",color:"var(--grn)"});
        const whPct=Math.round(XERO.wh/XERO.rev*100);
        if(whPct>40)insights.push({title:"Wholesale Heavy",text:"Wholesale is "+whPct+"% of revenue. Great for baseline, but scaling DTC is the path to higher overall profitability.",color:"var(--acc)"});

        return <div style={{marginTop:24}}>
          <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:20,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:sitColor,background:sitColor+"15",padding:"6px 14px",borderRadius:8,fontFamily:"'JetBrains Mono',monospace"}}>{sitIcon}</div>
              <div>
                <div style={{fontSize:12,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>Equation Evaluation</div>
                <div style={{fontSize:22,fontWeight:700,color:sitColor}}>Situation {situation}: {sitLabel}</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t2)",marginBottom:6,textTransform:"uppercase"}}>Constraint</div>
                <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{constraint}</div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t2)",marginBottom:6,textTransform:"uppercase"}}>Root Cause</div>
                <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{rootCause}</div>
              </div>
            </div>

            <div style={{marginTop:16,padding:14,background:sitColor+"11",border:"1px solid "+sitColor+"33",borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:600,color:sitColor,marginBottom:4,textTransform:"uppercase"}}>Prescribed Action</div>
              <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{action}</div>
            </div>

            <div style={{marginTop:12,padding:14,background:"var(--red)"+"0a",border:"1px solid var(--red)"+"22",borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--red)",marginBottom:4,textTransform:"uppercase"}}>What NOT To Do</div>
              <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{warning}</div>
            </div>
          </div>

          {insights.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:16}}>
            {insights.map((ins,i)=><div key={i} style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:12,padding:16}}>
              <div style={{fontSize:14,fontWeight:600,color:ins.color,marginBottom:6}}>{ins.title}</div>
              <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.6}}>{ins.text}</div>
            </div>)}
          </div>}

          <div style={{background:"linear-gradient(135deg,rgba(79,110,247,0.04),rgba(124,58,237,0.04))",border:"1px solid rgba(79,110,247,0.15)",borderRadius:14,padding:18,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--acc)",marginBottom:10}}>What If You Doubled Revenue?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>CURRENT FC RATIO</div>
                <div style={{fontSize:22,fontWeight:700,color:fcPct>20?"var(--ylw)":"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>{fcPct.toFixed(1)}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>AT 2x REVENUE</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>{(fcPct/2).toFixed(1)}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>PROFIT GAIN</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>+{(fcPct/2).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{fontSize:12,color:"var(--t3)",marginTop:10,textAlign:"center"}}>Fixed costs stay roughly the same when revenue doubles. That {(fcPct/2).toFixed(1)}% IS the profit.</div>
          </div>

          <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:aiCoach?14:0}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--t1)"}}>AI Deep Analysis</div>
                <div style={{fontSize:12,color:"var(--t3)"}}>Full Ecommerce Equation coaching response</div>
              </div>
              <button onClick={async()=>{
                setAiLoading(true);setAiCoach(null);
                try{
                  const prompt="Analyse this ecommerce business using the Ecommerce Equation framework. Give: situation classification (1-5), constraint identification, root cause, prescribed action with specific numbers, what NOT to do, expected impact. Be direct and specific.\\n\\nData:\\n- Revenue: $"+XERO.rev+" ("+XERO.months+" months)\\n- DTC: $"+XERO.dtc+" ("+Math.round(XERO.dtc/XERO.rev*100)+"%)\\n- Wholesale: $"+XERO.wh+" ("+Math.round(XERO.wh/XERO.rev*100)+"%)\\n- International: $"+XERO.intl+"\\n- Variable Costs: "+vcPct.toFixed(1)+"%\\n- COGS: "+fp(XERO.cogs/XERO.rev*100)+", Shipping: "+fp(XERO.postage/XERO.rev*100)+"\\n- Marketing MER: "+merPct.toFixed(1)+"% (blended), DTC-only MER: "+dtcMerVal.toFixed(1)+"%\\n- Fixed Costs: "+fcPct.toFixed(1)+"% ($"+fn(Math.round(XERO_FIXED/XERO.months))+"/mo)\\n- Net Profit: "+npPct.toFixed(1)+"%\\n- LER: "+ler.toFixed(2)+"\\n- Ad Spend: $"+XERO.ads;
                  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
                  const d=await r.json();
                  const text=d.content?.map(b=>b.text||"").join("\\n")||"No response received";
                  setAiCoach(text);
                }catch(e){setAiCoach("Error: "+e.message);}
                setAiLoading(false);
              }} disabled={aiLoading} style={{padding:"12px 24px",fontSize:14,borderRadius:10,cursor:aiLoading?"wait":"pointer",background:aiLoading?"var(--bdr)":"var(--acc)",color:"#fff",border:"none",fontWeight:600,opacity:aiLoading?0.6:1,transition:"all .2s"}}>
                {aiLoading?"Analysing...":"Run Analysis"}
              </button>
            </div>
            {aiCoach&&<div style={{background:"var(--bg)",border:"1px solid var(--bdr)",borderRadius:10,padding:16,fontSize:14,color:"var(--t1)",lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:500,overflowY:"auto"}}>{aiCoach}</div>}
          </div>
        </div>;
      })()}
    </>}"""

assert OLD_EQ_END in c, "FATAL: Could not find Equation tab end"
c = c.replace(OLD_EQ_END, COACH)
print("  2: Coach panel inserted")

# WRITE with surrogate handling
with open('index.html', 'wb') as f:
    f.write(c.encode('utf-8', errors='surrogatepass'))

assert c.rstrip().endswith('</html>'), "JSX not closed"
print(f"\nDone! {len(c)} bytes")
print("git add -A && git commit -m 'feat: Equation coach + AI analysis' && git push")
