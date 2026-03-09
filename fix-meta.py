#!/usr/bin/env python3
c = open('index.html').read()

OLD = '''<MC l="12mo Spend" v={195991} fmt="$" big/>
        <MC l="Purchases" v={6243} fmt="n"/>
        <MC l="Avg CPP" v={31.39} fmt="$"/>
        <MC l="Meta ROAS" v={2.21} fmt="n" sub="last-click"/>
        <MC l="% of Ad Budget" v={91} fmt="%" sub="Meta dominates"/>'''

NEW = '''<MC l={range+"d Spend"} v={agg?agg.tms:0} fmt="$" big/>
        <MC l="Purchases" v={agg?agg.tmp:0} fmt="n"/>
        <MC l="Avg CPP" v={agg&&agg.tmp>0?agg.tms/agg.tmp:0} fmt="$"/>
        <MC l="Meta ROAS" v={agg&&agg.tms>0?agg.tmv/agg.tms:0} fmt="n" sub="last-click"/>
        <MC l="% of Ad Budget" v={agg&&agg.tms>0?100:0} fmt="%" sub="Meta"/>'''

assert OLD in c, "FATAL: Could not find hardcoded Meta cards"
c = c.replace(OLD, NEW)
open('index.html', 'w').write(c)
print("Done")
