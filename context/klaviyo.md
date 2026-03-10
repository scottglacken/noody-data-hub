# Klaviyo (Email) — Noody Skincare Context

## Business Context
- Email should be 30-40% of DTC revenue (EE benchmark)
- Highest-margin channel: zero incremental ad cost
- Email revenue stability reduces reliance on paid acquisition
- Flow revenue should be 60%+ of total email revenue (flows vs campaigns)

## Flow Architecture
### Welcome Series
- Trigger: New subscriber (popup, quiz, checkout opt-in)
- Sequence: Brand story → Product education → First purchase incentive
- Target: 3-5 emails over 7-10 days, $5+/recipient revenue
- Key metric: Subscriber-to-buyer conversion rate
- Noody current: $2.87K from 432 recipients ($6.64/recipient — above $5 target)

### Abandoned Cart
- Trigger: Cart created, no purchase within 1 hour
- Sequence: Reminder → Social proof → Urgency/incentive
- Target: 3 emails over 72 hours, $3+/recipient revenue
- Expected recovery rate: 5-10% of abandoned carts
- Noody current: $1.18K from 372 recipients ($3.17/recipient — hitting target)

### Browse Abandonment
- Trigger: Product page view, no add-to-cart within 2 hours
- Sequence: "Still interested?" → Product benefits → Related products
- Target: 2-3 emails over 48 hours, $2+/recipient revenue
- Often overlooked — rebuild if inactive
- Noody current: $198 from 36 recipients ($5.50/recipient — good but low volume)

### Post-Purchase
- Trigger: Order confirmed
- Sequence: Thank you → Usage tips → Cross-sell → Review request
- Target: 4-5 emails over 30 days
- Critical for repeat purchase and AOV growth
- Noody current: $185 from 711 recipients ($0.26/recipient — cross-sell opportunity)

### Winback
- Trigger: No purchase in 90-120 days
- Sequence: "We miss you" → New products → Exclusive offer
- Target: 3-4 emails over 21 days
- Re-engage lapsed customers before they churn

## Campaign Strategy
- Minimum 2 campaigns per month (ideally weekly)
- Campaign types: New product launches, educational content, seasonal promotions, bundle offers
- Best performing: Product education + limited-time bundles
- Revenue split target: 60% flows / 40% campaigns

## Segmentation
- VIP customers: 3+ purchases or $200+ LTV
- Active subscribers: Opened/clicked in last 90 days
- At-risk: No engagement in 60-90 days
- Sunset: No engagement in 120+ days (suppress to protect deliverability)

## Deliverability Benchmarks (Klaviyo industry data, skincare/ecommerce)
- Open rate: 44% median (>57% = Excellent, >35% = Good)
- Click rate: 0.86% median (>1.12% = Excellent, >0.69% = Good)
- Bounce rate: 0.43% median (<0.30% = Excellent, <0.56% = Acceptable)
- Unsubscribe rate: 0.29% median (<0.20% = Excellent, <0.38% = Acceptable)
- Spam complaint rate: 0.007% (<0.01% = Excellent, <0.03% = Acceptable)
- Email as % of DTC revenue: 30-40% target
- List growth rate: >5% monthly net growth

## Noody Current Deliverability
- Open Rate: 62.3% (88th percentile — excellent)
- Click Rate: 0.528% (26th percentile — needs work, below 0.86% median)
- Bounce Rate: 0.126% (excellent, well below 0.43%)
- Spam Complaint Rate: 0.019% (poor — above 0.007% benchmark, monitor closely)
- Unsubscribe Rate: 0.662% (poor — above 0.29% median, need better targeting)
- List Size: ~1,870 active subscribers (after -13K cleanup — list hygiene is good)

## Key Issues
- Click rate at 26th percentile — emails get opened but don't drive clicks. Needs stronger CTAs, better content-to-click path
- Spam rate 0.019% is concerning — some recipients marking as spam. Review frequency, segmentation
- Unsub rate 0.662% is high — tighten segmentation, reduce campaign frequency to engaged segments only
- Email % swings wildly (sometimes 10%, sometimes 40%+) — indicates reliance on campaign blasts not automated flows
- Flows provide stable revenue floor; campaigns add peaks
- Wild swings in email % directly impact DTC MER calculation

## Products for Email
- Hero products: Calm Balm (eczema), Lotion Potion (daily moisturizer)
- Bundling in emails increases AOV
- Seasonal angles: winter = eczema/dry skin, summer = sun protection (Sun Balm)
