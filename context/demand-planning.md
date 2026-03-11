# Winning Demand Plan — Ecommerce Equation Framework

> Source: The Winning Demand Plan module from the Ecommerce Equation program (Jay Wright, Coach Sophie). Covers inventory planning, cash flow forecasting, stock management, supplier relations, demand signals, and financial mindset.

---

## 1. Two Approaches to Demand Planning

### Top-Down (Dollar Budgets)
- Start with revenue targets and work backward to stock investment needed
- Monthly/quarterly budget allocations per category; aligns with the ecommerce equation
- Risk: disconnected from actual unit-level reality

### Bottom-Up (Unit Tracking)
- Track individual SKU movement: stock on hand, sales per period, stock incoming
- Build up from product-level data to category totals; more accurate for reorder decisions
- Risk: can lose sight of big-picture financial targets

### The Bridge
- Use BOTH: top-down sets the budget, bottom-up validates whether the plan is achievable
- Demand planning spreadsheet connects both: master planning sheet + 3 sheets per category (style tracker, range plan, open-to-buy)

---

## 2. Choosing Categories

- Demand planning categories are NOT the same as website navigation categories
- **Three criteria:**
  1. **Logical**: One product belongs to exactly one category
  2. **Accessible**: Not too many categories (manageable to track)
  3. **Meaningful**: Categories should reveal trends that matter for buying decisions
- Example: "Kids cushions" as a single demand category even if website shows them across multiple collections

---

## 3. The Style Tracker

### What It Tracks (Monthly, Per SKU, Per Category)
- **Stock on hand** at month end (from Shopify inventory snapshot report)
- **Sales** during the month (from Shopify sales by product report)
- **Stock in** (units received from purchase orders)

### How to Populate from Shopify
1. Run "Month-end inventory snapshot" report for closing stock
2. Run "Sales by product" filtered to the month for units sold
3. Use VLOOKUP to match product names across months
4. Product name matching is critical — standardize names

### Key Insight
- The style tracker gives you a historical record of sell-through by product
- Trends become visible: which products accelerate, which stall
- Foundation for all forward planning

---

## 4. The Range Plan (Purchase Order Tracking)

### Structure
- Gantt chart of purchase orders per category, showing landing dates
- Visual conventions: **Bold** = landed, Normal = ordered, Highlight = planned
- Split by: Core (replenishment) vs Seasonal (one-time buys)

### Purpose
- See all incoming stock at a glance across a 12-month horizon
- Identify gaps where no stock is landing
- Coordinate PO timing with promotional calendar and seasonal peaks

---

## 5. Open-to-Buy (OTB) — Category Level View

### What It Shows
For each month, per category:
- **Opening stock** (units)
- **Stock in** (from purchase orders landing that month)
- **Sales** (projected units sold)
- **Closing stock** = Opening + Stock In - Sales

### How to Use
- Daisy-chain months: closing stock of May = opening stock of June
- Plug in projected sales based on prior year + seasonality adjustments
- Immediately reveals **stock crunches** — months where closing stock goes negative
- Forward-looking: catches problems 2-3 months before they happen

### Live Example: Cushy Kids
- Brand went from $20K to $200K/month in 5 months
- OTB showed an August stock crunch — current POs couldn't cover projected sales
- Solution: air freight 1,500 units to bridge the gap until September sea freight landed
- Without OTB, they would have stumbled into July/August sellouts blind
- **Insight**: 50+ weeks cover = opportunity cost — capital trapped in slow stock, redirect to new product testing

---

## 6. The Weekly Demand Snapshot

### Data Source
- Shopify report: "Average inventory sold per day" over 28-day rolling window
- Import current stock on hand + daily sales rate

### Calculations
- **Daily sales rate** per product (units/day average over 28 days)
- **Weeks cover** = Stock on hand / (Daily sales rate x 7)
- **Reorder gap** = Weeks cover minus production/shipping timeline
- Green = healthy cover; Red = approaching stockout

### What It Reveals
- **Best sellers**: Products moving fastest — protect stock levels at all costs
- **Slow movers**: Products sitting too long — candidates for clearance, bundling, or GWP
- **Potential stockouts**: Products that will run out before new stock arrives
- **Reorder triggers**: When weeks cover drops below lead time + safety stock

---

## 7. Reorder Point Formula

**Reorder Point = Average daily units sold x Lead time (days) + Safety stock**

- **Safety stock**: 20-30% buffer for popular items (A-grade SKUs)
- **Seasonal adjustment**: 2x stock for peak seasons (BFCM, winter for skincare)
- **Lead time includes**: Production time + shipping time + customs/receiving

### Stock-Out Cost
Every day a hero product is out of stock costs:
- Lost direct revenue
- Wasted ad spend (driving traffic to OOS product)
- Customer disappointment (may not return)
- Algorithm penalty (Meta/Google learn from conversion failures)
- **Rule**: Never let hero products go OOS. This is the #1 preventable revenue loss.

---

## 8. A/B/C Grade Stock Classification

### Grade A (Stars) — Top 20% of SKUs
- Drive 60-80% of revenue
- Highest turnover rate
- **Action**: Never run out. Reorder early. Allocate premium warehouse space.
- Monitor: weekly

### Grade B (Workhorses) — Next 30% of SKUs
- Steady sellers, moderate turnover
- **Action**: Maintain steady stock levels. Reorder on schedule.
- Monitor: bi-weekly

### Grade C (Slow Movers) — Bottom 50% of SKUs
- Low turnover, high carrying cost
- **Action**: Clear through sales, bundles, or GWP. Reduce reorder quantities.
- **Dead stock rule**: If it hasn't sold in 90 days at full price, it's a cash trap
- Monitor: monthly, with quarterly clearance reviews

### Moving Dead Stock (Priority Order)
1. Bundle with A-grade products (adds perceived value)
2. Use as GWP to add value without discounting heroes
3. Flash sale to clear (accept margin hit to free up cash)
4. Donate for tax benefit or liquidate at deep discount as last resort

---

## 9. Cash Flow is Oxygen

### The Cash Conversion Cycle
Time between paying for stock and receiving payment from customers:
**Pay supplier (deposit) -> Receive stock -> Sell product -> Receive payment**

- Shorter cycle = healthier cash flow
- Long cycles kill growing businesses — funding growth from cash reserves
- Speed of stock turnover directly fuels ability to grow

### Cash Flow Killers in Ecommerce
- **Inventory prepayment**: Paying 3-6 months before selling; **Seasonal loading**: Heavy stock investment before peak
- **Ad spend timing**: Paying today, revenue arrives 3-30 days later; **Wholesale terms**: Net 30-60 delays
- **Dead stock**: Money trapped in products that won't sell

---

## 10. The Cash Flow Forecast

### The Problem It Solves
The ecommerce equation deliberately smooths costs (annual averages), but reality is lumpy — big stock payments cluster, revenue fluctuates seasonally. "The equation says there's profit, but where's the money?"

### Structure
- **12-week rolling forecast**, updated weekly
- **Inflows**: Shopify payouts (M-F), wholesale payments, other income
- **Outflows**: Stock purchases (deposits + balance), ad spend, fixed costs (rent, payroll), tax obligations
- **Running balance**: Cash position week by week

### Key Inputs
- Historical revenue patterns (seasonality)
- Planned promotional calendar (sale events boost inflows)
- Upcoming stock orders (deposits and balance payment dates)
- Known fixed cost commitments
- Tax payment dates (GST, PAYG, provisional tax)

### Early Warning Signals
- Cash balance trending toward zero within 4-6 weeks
- Large stock payment due during known low-revenue period
- Multiple outflows clustering in same week
- Wholesale receivables overdue (cash delayed)

### Bank Account Bucketing (Profit First Concept)
- **Tax account**: Set aside 25% of profit automatically
- **GST/PAYG account**: Separate for tax obligations
- **Product replenishment bucket**: Ring-fenced for stock purchases
- **Operating account**: Day-to-day expenses
- Separate accounts prevent accidentally spending tax money or stock money on operations

---

## 11. Supplier Strategy

### Get It Cheaper
- **Shop around**: Test multiple factories via trade fairs; ask trusted suppliers for referrals
- **Play factories off each other**: Use competing quotes for leverage
- **Bulk raw materials**: Buy fabric/ingredients in bulk across POs for volume discounts
- **Flip the negotiation**: "You give me your best price" instead of counter-offering

### Pay for It Later (Payment Terms Progression)
1. Start: 30% deposit, 70% FOB (standard)
2. Negotiate to: 30% deposit, 70% post-shipment
3. Target: 30% deposit, 70% after goods land
4. Advanced: Some suppliers accept small premium for extended terms
5. **Approach**: Frame as "company policy" — "Our policy is to pay balance after goods land"
- Better terms free up capital for growth without external debt
- Build relationship over time to earn progressively better terms

### Reduce Risk
- **Lower MOQs**: Use stock fabrics/standard formulations; factory templates reduce minimums
- **Surcharges for small runs**: Often only 10% more — worth it for testing
- **Flexible POs**: Negotiate ability to adjust size curves, variants, or cancel portions
- **Stage production**: Order in tranches rather than one large PO; test small, go deep on winners

### Sell It Faster
- **Right product**: Use PMF snapshot to identify what to restock
- **Regular drops**: New products/colorways keep customers engaged
- **Pre-sales**: Pull demand forward, validate before committing to full production
- **Double down on winners**: When something sells, reorder immediately
- **Move slow items fast**: Bundle, email campaigns, flash sales, GWP
- **Avoid sellouts on heroes**: Lost revenue + algorithm penalties

---

## 12. Stock Planning Cadence

| Frequency | Activity |
|-----------|----------|
| Weekly | Review demand snapshot, check weeks cover for A-grade items |
| Monthly | Review full inventory, identify B/C items trending down, update style tracker |
| Quarterly | Full inventory audit, dead stock clearance, supplier review |
| Annually | Full range plan aligned with promotional calendar |

---

## 13. Funding Growth Without Debt

### 5 Ways to Fund Growth (Before Borrowing)
1. **Improve cash conversion cycle**: Faster turns, better payment terms
2. **Pre-sell**: Validate demand and collect cash before committing to production
3. **Supplier payment terms**: Negotiate extended terms (pay after landing/selling)
4. **Revenue-based financing**: Only if ROI is clear and immediate
5. **Cut dead stock**: Free up cash trapped in slow movers

### When Debt Makes Sense
- Clear ROI calculation (e.g. stock purchase for confirmed sale event), short-term bridge only
- Favourable terms that are fully understood; can service repayments from existing cash flow

### Debt Traps to Avoid
- Cash flow lending with high interest, using debt to fund operational losses (fix the equation first)
- Multiple overlapping facilities creating compounding obligations, borrowing without sell-through projection

---

## 14. Demand Planning for Noody

### Current Context
- DTC: ~$383K/year (41% of total revenue)
- Wholesale: ~$423K/year (45%)
- International: ~$125K/year (13%)
- Hero products: Calm Balm, Lotion Potion

### Key Actions
1. **Weekly demand snapshot**: Track Calm Balm and Lotion Potion stock levels religiously
2. **Seasonal stock-up**: Double inventory before winter (Jun-Aug eczema season in NZ/AU)
3. **BFCM preparation**: 3-4 months lead time for stock orders (order by August for November)
4. **Wholesale vs DTC allocation**: Ensure wholesale orders don't deplete DTC stock
5. **Cash flow forecast**: Map stock payment dates against expected revenue cycles
6. **ABC grading**: Identify which SKUs are A-grade (likely Calm Balm, Lotion Potion) vs C-grade for clearance
7. **Supplier terms**: Negotiate toward post-landing payment to improve cash conversion cycle

### Key Metrics
| Metric | Target | Why |
|--------|--------|-----|
| Weeks cover (heroes) | 8-12 weeks | Never stockout on Calm Balm/Lotion Potion |
| Weeks cover (B-grade) | 4-8 weeks | Adequate without over-investing |
| Dead stock (>90 days) | <10% of inventory value | Cash trapped in non-sellers |
| Cash conversion cycle | <90 days | Speed of stock -> cash -> restock |
| Sellout days per quarter | 0 for heroes | #1 preventable revenue loss |

---

*Copyright Disclaimer: All contents are the property of Ecommerce Equation. Reproduced for internal reference only.*
