#!/usr/bin/env python3
"""
Add Coach & Diagnosis panel to Equation tab
- Rule-based instant feedback from benchmarks
- AI-powered deep analysis button (Claude API)
"""

with open('index.html') as f:
    c = f.read()

print(f"Original: {len(c)} bytes")

# ═══════════════════════════════════════════
# 1. ADD AI STATE after theme state
# ═══════════════════════════════════════════

OLD_RANGE = '  const [range,setRange]=useState(30);'
NEW_RANGE = """  const [range,setRange]=useState(30);
  const [aiCoach,setAiCoach]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);"""

assert OLD_RANGE in c, "FATAL: Could not find range state"
c = c.replace(OLD_RANGE, NEW_RANGE)
print("✅ 1: AI state added")

# ═══════════════════════════════════════════
# 2. INSERT COACH PANEL before Equation tab closing
# ═══════════════════════════════════════════

# The exact anchor: LER card line followed by closing divs then </>}
OLD_EQ_END = """        <MC l="LER" v={Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100} fmt="n" sub="Gross Margin / Wages" bm={{h:[2,100],w:[1.5,2]}}/>
      </div>
    </>}"""

COACH_PANEL = '''        <MC l="LER" v={Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100} fmt="n" sub="Gross Margin / Wages" bm={{h:[2,100],w:[1.5,2]}}/>
      </div>

      {/* ═══ COACH & DIAGNOSIS ═══ */}
      {(()=>{
        const vcPct=XERO_VAR/XERO.rev*100;
        const merPct=XERO_MKT/XERO.rev*100;
        const fcPct=XERO_FIXED/XERO.rev*100;
        const npPct=XERO_PROFIT/XERO.rev*100;
        const ler=Math.round((XERO.rev-XERO_VAR)/XERO.wages*100)/100;
        const dtcMerVal=XERO_MKT/XERO.dtc*100;

        // Determine situation (1-5)
        let situation=1;let sitLabel="PROFITABLE";let sitColor="var(--grn)";let sitIcon="\u2705";
        let constraint="";let rootCause="";let action="";let warning="";

        if(npPct>=10){
          situation=1;sitLabel="PROFITABLE";sitColor="var(--grn)";sitIcon="\u2705";
          constraint="Throughput";
          rootCause="Your equation is healthy. The constraint is volume \u2014 you need more orders flowing through this profitable system.";
          action="SCALE. Increase ad spend. Put upward pressure on marketing volume. The equation is working \u2014 do more of it.";
          warning="Don\u2019t tinker with what\u2019s working. Don\u2019t cut costs. Scale.";
        } else if(fcPct>25 && fcPct>merPct && fcPct>vcPct){
          situation=2;sitLabel="HIGH FIXED COSTS";sitColor="var(--ylw)";sitIcon="\u26a0\ufe0f";
          constraint="Efficiency (Fixed Costs)";
          rootCause="Fixed costs at "+fcPct.toFixed(1)+"% are the primary drag. At $"+fn(Math.round(XERO_FIXED/XERO.months))+"/mo, they eat too much of current revenue.";
          action="SCALE to spread fixed costs over more revenue. A $"+fn(Math.round(XERO_FIXED/XERO.months))+" fixed cost is "+fcPct.toFixed(0)+"% of $"+fn(Math.round(XERO.rev/XERO.months))+"/mo but would be "+Math.round(XERO_FIXED/(XERO.rev*2)*10000)/100+"% if you doubled revenue.";
          warning="Do NOT cut costs as the primary strategy. The answer is almost always scale.";
        } else if(vcPct>40){
          situation=3;sitLabel="HIGH VARIABLE COSTS";sitColor="var(--red)";sitIcon="\ud83d\udea8";
          constraint="Efficiency (Variable Costs)";
          rootCause="Variable costs at "+vcPct.toFixed(1)+"% are above the 40% benchmark. Unlike fixed costs, these don\u2019t improve with scale \u2014 they travel with every order.";
          action="Attack COGS ("+fp(XERO.cogs/XERO.rev*100)+"), shipping ("+fp(XERO.postage/XERO.rev*100)+"), and packaging ("+fp(XERO.pkg/XERO.rev*100)+"). Negotiate supplier terms, increase AOV to dilute shipping.";
          warning="Do NOT try to scale your way out of high variable costs. Fix margins first.";
        } else if(merPct>35){
          situation=4;sitLabel="HIGH MARKETING COST";sitColor="var(--red)";sitIcon="\ud83d\udea8";
          constraint="Efficiency (Marketing)";
          rootCause="MER at "+merPct.toFixed(1)+"% is above the 35% benchmark. But check DTC-only MER ("+dtcMerVal.toFixed(1)+"%) \u2014 wholesale dilutes the blended figure.";
          action="Diagnose: is CPP too high (ad creative/targeting) or is RPV too low (conversion rate + AOV)? Revenue Per Visit = CR \u00d7 AOV is the key lever.";
          warning="Don\u2019t just cut ad spend. That reduces revenue. Fix the efficiency of each dollar spent.";
        } else if(npPct<10 && npPct>=0){
          situation=5;sitLabel="LIVING ON THE EDGE";sitColor="var(--ylw)";sitIcon="\u26a0\ufe0f";
          constraint="Multiple";
          rootCause="No single metric is dramatically over, but everything is pushed to the upper bounds of each range. Combined effect: "+npPct.toFixed(1)+"% net profit.";
          action="Work multiple fronts in order: 1) Reduce MER (fix marketing efficiency), 2) Reduce variable costs, 3) Scale to reduce fixed cost ratio.";
          warning="Cannot scale first because marketing inefficiency will compound at higher spend.";
        } else {
          situation=5;sitLabel="UNPROFITABLE";sitColor="var(--red)";sitIcon="\ud83d\udea8";
          constraint="Multiple (Critical)";
          rootCause="Net profit is negative at "+npPct.toFixed(1)+"%. This needs immediate attention across the equation.";
          action="Emergency sequence: 1) Check for stupid costs, 2) Fix MER, 3) Fix variable costs, 4) Then scale.";
          warning="Do not increase ad spend until the unit economics are fixed.";
        }

        // Additional insights
        const insights=[];
        if(dtcMerVal>50)insights.push({icon:"\ud83d\udea8",title:"DTC MER Critical",text:"Your true DTC-only MER is "+dtcMerVal.toFixed(1)+"%. You\u2019re spending "+Math.round(dtcMerVal)+" cents for every $1 of DTC revenue. Wholesale is masking this.",color:"var(--red)"});
        if(ler>=2)insights.push({icon:"\u2705",title:"LER Healthy",text:"Labor Efficiency Ratio of "+ler.toFixed(2)+" exceeds the $2.00 benchmark. Every $1 in wages produces $"+ler.toFixed(2)+" of gross margin.",color:"var(--grn)"});
        else if(ler>=1.5)insights.push({icon:"\u26a0\ufe0f",title:"LER Warning",text:"LER at "+ler.toFixed(2)+" is below the $2.00 target. Do not add headcount until pretax profit hits 15%+.",color:"var(--ylw)"});
        else insights.push({icon:"\ud83d\udea8",title:"LER Critical",text:"LER at "+ler.toFixed(2)+" is well below $2.00. Profitability is being eroded by labor costs.",color:"var(--red)"});

        if(XERO.postage/XERO.rev*100>12)insights.push({icon:"\u26a0\ufe0f",title:"Shipping High",text:"Shipping at "+fp(XERO.postage/XERO.rev*100)+" of revenue. Increase AOV to dilute, negotiate carrier rates, or optimise packaging.",color:"var(--ylw)"});
        if(vcPct<34)insights.push({icon:"\u2705",title:"Variable Costs Strong",text:"At "+vcPct.toFixed(1)+"%, your variable costs are an asset. Well within the <40% benchmark.",color:"var(--grn)"});

        const whPct=Math.round(XERO.wh/XERO.rev*100);
        if(whPct>40)insights.push({icon:"\ud83d\udcca",title:"Wholesale Heavy",text:"Wholesale is "+whPct+"% of revenue. Great for baseline, but DTC has higher contribution margins. Scaling DTC is the path to higher overall profitability.",color:"var(--acc)"});

        return <div style={{marginTop:24}}>
          {/* Situation Badge */}
          <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:20,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:28}}>{sitIcon}</span>
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
              <div style={{fontSize:12,fontWeight:600,color:sitColor,marginBottom:4,textTransform:"uppercase"}}>\u2192 Prescribed Action</div>
              <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{action}</div>
            </div>

            <div style={{marginTop:12,padding:14,background:"var(--red)"+"0a",border:"1px solid var(--red)"+"22",borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--red)",marginBottom:4,textTransform:"uppercase"}}>\u26d4 What NOT To Do</div>
              <div style={{fontSize:14,color:"var(--t1)",lineHeight:1.6}}>{warning}</div>
            </div>
          </div>

          {/* Insights */}
          {insights.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:16}}>
            {insights.map((ins,i)=><div key={i} style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:12,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{ins.icon}</span>
                <span style={{fontSize:14,fontWeight:600,color:ins.color}}>{ins.title}</span>
              </div>
              <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.6}}>{ins.text}</div>
            </div>)}
          </div>}

          {/* What If You Doubled */}
          <div style={{background:"linear-gradient(135deg,var(--acc)08,#7c3aed08)",border:"1px solid var(--acc)22",borderRadius:14,padding:18,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--acc)",marginBottom:10}}>\ud83d\ude80 What If You Doubled Revenue?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>CURRENT</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>Fixed Cost Ratio</div>
                <div style={{fontSize:22,fontWeight:700,color:fcPct>20?"var(--ylw)":"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>{fcPct.toFixed(1)}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>AT 2x REVENUE</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>Fixed Cost Ratio</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>{(fcPct/2).toFixed(1)}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--t3)"}}>PROFIT GAIN</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>From Fixed Cost Leverage</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--grn)",fontFamily:"'JetBrains Mono',monospace"}}>+{(fcPct/2).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{fontSize:12,color:"var(--t3)",marginTop:10,textAlign:"center"}}>Fixed costs don\u2019t change much when you double revenue. That {(fcPct/2).toFixed(1)}% IS the profit.</div>
          </div>

          {/* AI Deep Dive Button */}
          <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:aiCoach?14:0}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--t1)"}}>\ud83e\udde0 AI Deep Analysis</div>
                <div style={{fontSize:12,color:"var(--t3)"}}>Get a full Ecommerce Equation coaching response from AI</div>
              </div>
              <button onClick={async()=>{
                setAiLoading(true);setAiCoach(null);
                try{
                  const prompt="Analyse this ecommerce business using the Ecommerce Equation framework. Give a full diagnostic: situation classification (1-5), constraint identification, root cause, prescribed action with specific numbers, what NOT to do, and the expected impact.\\n\\nData:\\n- Revenue: $"+XERO.rev+"\\n- DTC: $"+XERO.dtc+" ("+Math.round(XERO.dtc/XERO.rev*100)+"%)\\n- Wholesale: $"+XERO.wh+" ("+Math.round(XERO.wh/XERO.rev*100)+"%)\\n- International: $"+XERO.intl+"\\n- Variable Costs: "+vcPct.toFixed(1)+"% (COGS "+fp(XERO.cogs/XERO.rev*100)+", Shipping "+fp(XERO.postage/XERO.rev*100)+", Packaging "+fp(XERO.pkg/XERO.rev*100)+")\\n- Marketing (MER): "+merPct.toFixed(1)+"% (Blended), DTC-only MER: "+dtcMerVal.toFixed(1)+"%\\n- Fixed Costs: "+fcPct.toFixed(1)+"% ($"+fn(Math.round(XERO_FIXED/XERO.months))+"/mo)\\n- Net Profit: "+npPct.toFixed(1)+"%\\n- LER: "+ler.toFixed(2)+"\\n- Ad Spend: $"+XERO.ads+" (Meta ~91%, Google ~9%)\\n- Period: "+XERO.months+" months\\n\\nBe specific. Use actual numbers. Reference the Three Constraints and Five Focusing Steps.";
                  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
                  const d=await r.json();
                  const text=d.content?.map(b=>b.text||"").join("\\n")||"No response";
                  setAiCoach(text);
                }catch(e){setAiCoach("Error: "+e.message);}
                setAiLoading(false);
              }} disabled={aiLoading} style={{padding:"12px 24px",fontSize:14,borderRadius:10,cursor:aiLoading?"wait":"pointer",background:aiLoading?"var(--bdr)":"var(--acc)",color:"#fff",border:"none",fontWeight:600,opacity:aiLoading?0.6:1,transition:"all .2s"}}>
                {aiLoading?"\u23f3 Analysing...":"\ud83d\udd2c Run Analysis"}
              </button>
            </div>
            {aiCoach&&<div style={{background:"var(--bg)",border:"1px solid var(--bdr)",borderRadius:10,padding:16,fontSize:14,color:"var(--t1)",lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:500,overflowY:"auto"}}>{aiCoach}</div>}
          </div>
        </div>;
      })()}
    </>}'''

assert OLD_EQ_END in c, "FATAL: Could not find Equation tab end"
c = c.replace(OLD_EQ_END, COACH_PANEL)
print("✅ 2: Coach panel inserted")

# ═══════════════════════════════════════════
# WRITE + VERIFY
# ═══════════════════════════════════════════

with open('index.html', 'w') as f:
    f.write(c)

assert 'Situation {situation}' in c, "Coach panel not found in output"
assert 'aiCoach' in c, "AI state not found in output"
assert c.rstrip().endswith('</html>'), "JSX not closed properly"

print(f"\n✅ DONE! {len(c)} bytes")
print("git add -A && git commit -m 'feat: Equation tab coach + AI analysis' && git push")
