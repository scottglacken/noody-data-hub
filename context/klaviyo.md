# Klaviyo (Email) — Noody Skincare Context

## The North Star
**Email should be 30% of TOTAL business revenue** — not DTC, total. This is the EE benchmark that separates brands relying on ads from brands that own their customer relationship. Email is the highest-margin channel: zero incremental ad cost, every dollar directly improves MER.

## The Three Pillars Framework
Email success requires all three pillars working together — weakness in any one undermines the others:

### Pillar 1: Growth (List Building)
- Signup form target: **3%+ submission rate** (5-15% achievable, 20%+ for best performers)
- **20% annual list churn** is normal — must continuously add subscribers just to stay flat
- With ~1,870 subscribers and 20% churn, Noody loses ~374/year. Need 30+ new subscribers/month just to maintain.
- **Micro-commitment forms**: Ask a question first ("What's your biggest skincare concern?") then ask for email. Increases submission rate by 3-4 percentage points with 70% hit rate.

### Pillar 2: Flows (Automated Revenue)
- Flow revenue should be **60%+ of total email revenue**
- Flows are the revenue floor — predictable, consistent, scalable without manual effort
- If campaigns dominate revenue split, you're relying on manual effort instead of systems

### Pillar 3: Campaigns (Manual Revenue Peaks)
- **Minimum 2-3x per week** to engaged subscribers
- Under-sending is more damaging than over-sending — subscribers forget you, open rates drop, deliverability suffers
- Campaign types: educational, product-focused, social proof, promotional (max 1/week), story/brand, seasonal

## Flow Priority Order
Build and optimize in this exact order:

### 1. Welcome Flow (Highest Priority)
- Highest revenue potential of any flow
- 5-email sequence over 7-10 days: Deliver incentive → Brand story → Social proof → Product education → Urgency/reminder
- Deliver incentive IMMEDIATELY — don't make them hunt for it
- Set expectations for future emails
- **Revenue target: $5+/recipient**
- **Noody current: $2.87K from 432 recipients = $6.68/recipient** (exceeds target ✅)

### 2. Abandoned Checkout (Highest Buying Intent)
- These people entered checkout details — something stopped them at the finish line
- 3-email sequence: **Reminder → Incentive → Final urgency**
- Timing: 1 hour → 24 hours → 48-72 hours
- **Revenue target: $3+/recipient**

### 3. Browse Abandonment (Lowest Buying Intent)
- Trigger: Product page view, no add-to-cart within 2 hours
- **Don't be too sales-pushy** — they didn't even add to cart. Provide value, education, social proof instead.
- 3-email sequence: "Still thinking about [product]?" → Social proof/reviews → Related products
- **Revenue target: $2+/recipient**
- **Noody current: $198 from 36 recipients — trigger is TOO NARROW.** Only 36 recipients means the flow isn't capturing enough browsers. Fix the trigger configuration.

### 4. Abandoned Cart
- Trigger: Added to cart, no checkout within 1 hour
- Medium buying intent — they liked it enough to add to cart
- 3-email sequence: Cart reminder → Social proof → Incentive + urgency
- **Revenue target: $3+/recipient**
- **Noody current: $1.18K from 372 recipients = $3.21/recipient** (meets target ✅)

### 5. Post-Purchase (Retention & Cross-sell)
- Trigger: Order confirmed
- 5-email sequence over 60 days: Thank you → Usage tips → Cross-sell → Review request → Replenishment reminder
- Cross-sell based on purchase: Calm Balm buyers → Lotion Potion
- **Revenue target: $1+/recipient**
- **Noody current: $185 from 711 recipients = $0.26/recipient** (significant cross-sell opportunity being missed)

## Campaign Strategy
- **Frequency: Minimum 2-3x per week** to engaged subscribers
- Campaign types rotation: Educational → Product → Social Proof → Promotional → Story → Seasonal
- Max 1 promotional/sale email per week — too many trains customers to wait for discounts
- **Subject lines: Under 50 characters.** A/B test systematically — one variable at a time.
- Revenue benchmark: $0.05-0.15 per recipient per campaign

## Segmentation
| Segment | Definition | Send Frequency |
|---------|-----------|---------------|
| **Engaged** | Opened/clicked last 90 days | Every campaign (2-3x/week) |
| **All Subscribers** | Everyone not suppressed | 1-2x/week max, best content only |
| **VIP** | Repeat purchasers (2+ orders) | 2-3x/week, early access, exclusive offers |
| **At-Risk** | No engagement 90-180 days | 1x/week, re-engagement content |
| **Sunset** | No engagement 180+ days | SUPPRESS — protect deliverability |

**Rule: Never email the full list for routine campaigns.** Email the Engaged segment. This alone will fix spam and unsub rates.

## Deliverability
### Authentication (Non-Negotiable)
- **SPF**, **DKIM**, **DMARC** must all be configured. Check in Klaviyo → Settings → Domains.
- Without these, emails land in spam regardless of content quality.

### Best Practices
- Sunset unengaged subscribers after 180 days
- Clean list regularly (hard bounces, spam complainers)
- Send consistently (not 0 emails for 2 weeks then 5 in one day)
- Avoid spam triggers: ALL CAPS, excessive punctuation, "FREE", misleading subjects

## Noody Current Deliverability
| Metric | Noody | Benchmark | Percentile | Status |
|--------|-------|-----------|------------|--------|
| Open Rate | 62.3% | 44% median | 88th | ✅ Excellent |
| Click Rate | 0.528% | 0.86% median | 26th | ❌ Needs work |
| Bounce Rate | 0.126% | 0.43% median | 88th | ✅ Excellent |
| Spam Rate | 0.019% | 0.007% target | — | ❌ Poor (2.7x benchmark) |
| Unsub Rate | 0.662% | 0.29% median | — | ❌ Poor (2.3x median) |
| List Size | ~1,870 | — | — | Small but clean |

### Diagnosis
- **Opens are great** — subject lines working, domain reputation healthy
- **Clicks are poor** — emails open but don't drive action. Need stronger CTAs, clearer content-to-click path, more compelling offers
- **Spam + Unsub are high** — sending to too-broad segments with irrelevant content. Fix: tighten segmentation, send campaigns to Engaged segment only

## Noody Flow Revenue (Feb 2026)
| Flow | Revenue | Recipients | Rev/Recipient | vs Target |
|------|---------|-----------|---------------|-----------|
| Welcome Series | $2,870 | 432 | $6.68 | ✅ Above $5.00 |
| Abandoned Cart | $1,180 | 372 | $3.21 | ✅ Meets $3.00 |
| Browse Abandonment | $198 | 36 | $5.50 | ⚠️ Good rate but LOW volume |
| Order Confirmation | $185 | 711 | $0.26 | ❌ Cross-sell opportunity |

## Priority Actions
1. **Fix Browse Abandonment trigger** — widen to capture more browsers (should be hundreds, not 36)
2. **Build Post-Purchase cross-sell flow** — currently $0.26/recipient vs $1.00 target
3. **Increase campaign frequency** to 2-3x/week (Engaged segment only)
4. **Strengthen CTAs** in all emails to fix 26th percentile click rate
5. **Tighten segmentation** to fix spam and unsub rates

## Products for Email
- Hero products: Calm Balm (eczema), Lotion Potion (daily moisturizer)
- Bundles in emails increase AOV
- Seasonal angles: winter = eczema/dry skin, summer = Sun Balm
- Cross-sell paths: Calm Balm → Lotion Potion → Soft Suds → Bedtime Bestie
