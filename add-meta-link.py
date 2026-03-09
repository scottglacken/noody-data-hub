#!/usr/bin/env python3
"""Add link to Meta Coach from main dashboard Meta tab"""

with open('index.html', 'rb') as f:
    c = f.read().decode('utf-8', errors='surrogatepass')

# Add a link at the top of the Meta tab
OLD = '    {tab==="meta"&&<>\n      <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 14px"}}>Meta Ads Performance</h2>'
NEW = '    {tab==="meta"&&<>\n      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>\n        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Meta Ads Performance</h2>\n        <a href="/meta-coach" style={{padding:"10px 20px",background:"var(--acc,#c94f8a)",color:"#fff",borderRadius:10,textDecoration:"none",fontSize:14,fontWeight:600,transition:"all .2s"}}>Open Meta Coach</a>\n      </div>'

assert OLD in c, "FATAL: Could not find Meta tab heading"
c = c.replace(OLD, NEW)
print("Done - added Meta Coach link")

with open('index.html', 'wb') as f:
    f.write(c.encode('utf-8', errors='surrogatepass'))
