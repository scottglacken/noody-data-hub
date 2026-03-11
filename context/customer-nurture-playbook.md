# Customer Nurture Playbook — Condensed Context
Source: Ecommerce Equation / Jay Wright — 87 training modules on email, SMS, and customer lifecycle.

---

## The Three Pillars of Email Success

### Pillar 1: Growth (List Building)
- Signup form target: **3-5% submission rate** (best performers hit 15-20%)
- **20% annual list churn** is normal — must continuously add subscribers just to maintain list size
- Fewer input fields = higher submission rate. **Max 3 fields** (email + 1-2 others)
- Collect email + first name (for personalization) OR email + phone (for SMS)
- Always have separate mobile and desktop form designs

### Pillar 2: Flows (Automated Revenue)
- Flow revenue should be **60%+ of total email revenue**
- Flows are the revenue floor — predictable, scalable without manual effort
- If campaigns dominate revenue, you are relying on manual effort instead of systems

### Pillar 3: Campaigns (Manual Revenue Peaks)
- **Minimum 2-3x per week** to engaged subscribers
- Under-sending is more damaging than over-sending — subscribers forget you, open rates drop
- Campaign types rotation: Educational, Product, Social Proof, Promotional (max 1/week), Story/Brand, Seasonal

---

## Signup Form Strategy

### Incentive Types (Choose One)
1. **Monetary discount** (10% off, $10 off) — best for competitive/price-sensitive markets, high first-purchase rate, but positions as discount brand
2. **Giveaway** (1-in-5 win) — high signup rate, poor subscriber quality, good for fast list building
3. **Gift with purchase** — maintains margins, high-quality subscribers, lower signup rate
4. **Exclusive access / gated content** — maintains margins, highest-quality subscribers, lowest signup volume

### Dollar vs Percentage Off Rule
- Customers gravitate toward the **bigger number** regardless of actual value
- High AOV ($150+): prefer dollar-off amount to protect margins (e.g., $10 off vs 10% off)
- Low AOV: percentage-off can appear more generous

### Form Design Best Practices
- Match brand colors, fonts, and identity — form is first brand interaction
- **Incentive must be the headline** — don't bury it in body copy
- Use high-quality imagery (lifestyle or hero product)
- Strong CTA: avoid "Sign Up" or "Submit" — use "Unlock Your Code" / "Join the Team"
- Add **Klaviyo teaser tab** — increases submission rate by 1.8x
- Don't show to existing Klaviyo profiles (targeting setting)

### Form Targeting Settings
- Time delay: **8-15 seconds** after page load (never immediately)
- Exit intent trigger as secondary rule
- Re-display frequency: **14 days** after close
- Device targeting: separate desktop-only and mobile-only forms

### Micro-Commitment Forms (Advanced)
- Multi-step: Ask a question first ("What's your biggest skincare concern?") then ask for email
- Increases submission rate by **3-4 percentage points** with ~70% completion on second step
- Collects zero-party data for personalization

---

## Flow Setup & Optimization

### Priority Order
Build and optimize in this exact sequence:

### 1. Welcome Flow (Highest Revenue Potential)
- **5-6 emails over 10-18 days**
- Trigger: Added to list (from signup form)
- Flow filter: Placed order zero times since starting flow (auto-exit on purchase)
- **Email 1** (immediately, no delay): Deliver incentive + brand intro + category blocks. Keep simple.
- **Email 2** (day 2): Address #1 purchase barrier (price justification, sizing guide, sustainability). Include discount reminder in preview text.
- **Email 3** (day 5): Best sellers / product showcase with dynamic product feed. Discount reminder.
- **Email 4** (day 8): Social proof / testimonials / reviews. Discount reminder.
- **Email 5** (day 10-13): Offer expiring — urgency/countdown. "Last chance for 10% off"
- **Email 6** (optional, day 15-18): Flash deal — **upgrade discount** (e.g., 10% to 20%) for 48 hours only. Only non-purchasers receive this.
- Include discount reminder block in ALL mid-flow emails (top and bottom)
- **Revenue target: $5+/recipient**
- Time delays between emails: 2-3 days minimum

### 2. Abandoned Checkout Flow (Highest Buying Intent)
- **3 emails** over 48-72 hours
- Trigger: Started checkout (Klaviyo metric)
- **Email 1** (1 hour): Simple reminder — "You left something behind." Show cart contents, checkout link.
- **Email 2** (24 hours): Add social proof + reviews for the specific product
- **Email 3** (48-72 hours): Incentive + urgency — limited-time discount or free shipping
- Smart sending: exclude if already purchased
- **Revenue target: $3+/recipient**
- Advanced: Add SMS as fallback if email not opened (conditional split after 20 hours)

### 3. Abandoned Cart Flow (Medium Intent)
- **3 emails** over 48-72 hours
- Trigger: Added to cart, no checkout within 1 hour
- **Email 1** (1 hour): Cart reminder with product image
- **Email 2** (24 hours): Social proof + reviews
- **Email 3** (48-72 hours): Incentive (discount/free shipping) + urgency
- **Revenue target: $3+/recipient**

### 4. Browse Abandonment Flow (Lowest Intent)
- **3 emails** over 5-7 days
- Trigger: Viewed product, no add-to-cart within 2 hours
- Flow filter: Has not been in flow in last 30 days (prevent over-messaging)
- **Don't be overly sales-pushy** — they didn't even add to cart
- **Email 1** (2 hours): "Still thinking about [product]?" — education + value
- **Email 2** (day 2-3): Social proof / reviews for that product category
- **Email 3** (day 5-7): Related/complementary products
- Ensure trigger is broad enough — if only capturing dozens, trigger is too narrow
- **Revenue target: $2+/recipient**

### 5. Post-Purchase Flow (Retention & Cross-sell)
- **5 emails over 60 days**
- Trigger: Order placed / fulfilled
- **Email 1** (immediately): Thank you + order confirmation + what to expect
- **Email 2** (day 3-5): Usage tips / how to get the most from your product
- **Email 3** (day 14): Cross-sell based on purchase (complementary products)
- **Email 4** (day 30): Review request (link to review platform)
- **Email 5** (day 45-60): Replenishment reminder (for consumables) or new arrivals
- Cross-sell paths should be specific: e.g., Calm Balm buyers -> Lotion Potion
- **Revenue target: $1+/recipient**

### 6. Sunset Flow (List Hygiene)
- Trigger: No email engagement in 90-180 days
- **3 emails** over 14-21 days
- Purpose: Re-engage or suppress unengaged subscribers
- **Email 1**: "We miss you" — compelling reason to re-engage
- **Email 2**: Last chance offer or content highlight
- **Email 3**: "We're removing you" — final warning with re-subscribe CTA
- If no engagement after all 3: **suppress the profile** to protect deliverability
- Critical for maintaining sender reputation and reducing Klaviyo costs

### SMS in Flows (Advanced)
- Use SMS as **fallback, not simultaneous** with email
- Add conditional split: "Has opened email zero times" -> send SMS
- Best placed in: Abandoned cart (20 hours after email), Welcome (final push)
- Include checkout/cart URL as merge field in SMS
- Keep SMS light-touch in flows — save heavy SMS for campaigns

---

## Campaign Strategy

### Sending Cadence
- **Minimum 2-3 campaigns per week** to engaged segment
- **Under-sending damages deliverability** — ISPs flag inconsistent senders
- Weekly cadence example: Tuesday (educational), Thursday (product/promo), Saturday (story/social proof)
- During sales: daily sends to engaged, 2x/day on launch + last chance days

### Campaign Content Rotation
- **Educational**: How-to, tips, ingredient spotlights, behind-the-scenes
- **Product-focused**: Hero product, new arrivals, best sellers, bundles
- **Social proof**: Customer reviews, UGC, testimonials, before/after
- **Promotional**: Sale, discount, free shipping (max 1/week in BAU)
- **Story/Brand**: Founder story, mission, team, community
- **Seasonal**: Holidays, weather-driven, events

### Revenue Benchmark
- **$0.05-0.15 per recipient per campaign** (engaged segment)

---

## Email Design Best Practices

### Design Rules
- **Mobile-first**: 69%+ of traffic is mobile — design for phone screens first
- One primary CTA per email (can repeat it multiple times)
- CTA button: bold color, action-oriented text, above the fold AND at bottom
- Hero image at top — lifestyle or product shot
- Keep copy concise — scannable, not paragraphs
- Use dynamic product feeds (best sellers, recently viewed) where possible
- White space between sections for readability
- Preview text is critical — craft it deliberately, don't let it auto-generate

### Subject Line Framework
- **Under 50 characters** — shorter = higher open rate on mobile
- A/B test systematically: one variable at a time
- Types that work: Curiosity, Benefit-driven, Urgency, Personalized ([First Name]), Question-based
- Avoid: ALL CAPS, excessive punctuation (!!!), "FREE", misleading subjects
- Preview text should complement (not repeat) the subject line

---

## Segmentation Strategy

### Foundational Segments (Must-Have)
| Segment | Definition | Send Frequency |
|---------|-----------|---------------|
| **Engaged (90-day)** | Opened/clicked email in last 90 days | Every campaign (2-3x/week) |
| **Engaged (30-day)** | Opened/clicked in last 30 days | VIP treatment, highest frequency |
| **All Subscribers** | Everyone not suppressed | 1-2x/week max, best content only |
| **VIP / Repeat** | 2+ orders or high CLV | Early access, exclusive offers |
| **At-Risk** | No engagement 90-180 days | 1x/week, re-engagement content |
| **Sunset** | No engagement 180+ days | SUPPRESS — protect deliverability |
| **Non-purchasers** | Subscribed but never ordered | Welcome offers, first-purchase incentives |
| **Purchasers** | Placed 1+ orders | Cross-sell, replenishment, loyalty |

### Golden Rule
**Never email the full list for routine campaigns.** Send to the Engaged segment. This alone fixes spam and unsub rates.

### Sale Period Segments
- **VIP/Repeat**: Early access (1-2 days before general launch)
- **Engaged 30-day**: Launch day, all sale emails
- **Engaged 90-day**: Launch + key moments (mid-sale, last chance)
- **All Subscribers**: Launch email only, last chance only
- **Non-openers (from launch email)**: Re-send with different subject line 24 hours later

---

## A/B Testing Framework

### What to Test (In Priority Order)
1. **Subject lines** — biggest impact on open rates
2. **Send time** — morning vs afternoon vs evening
3. **Content type** — educational vs promotional vs social proof
4. **CTA text/color** — impact on click rates
5. **Offer type** — % off vs $ off vs free shipping vs GWP
6. **Design** — image-heavy vs minimal vs plain text

### Testing Rules
- **One variable at a time** — otherwise you can't attribute results
- Minimum sample size: 1,000+ recipients per variant
- Test duration: 4-24 hours before selecting winner
- Document results — build a playbook of what works for YOUR audience
- Run tests monthly to continuously improve

---

## Deliverability

### Authentication (Non-Negotiable)
- **SPF**, **DKIM**, **DMARC** must all be configured
- Check in Klaviyo Settings -> Domains
- Without these, emails land in spam regardless of content quality

### Key Benchmarks
| Metric | Good | Great | Danger |
|--------|------|-------|--------|
| Open Rate | 35-45% | 45%+ | <25% |
| Click Rate | 0.8-1.5% | 1.5%+ | <0.5% |
| Bounce Rate | <0.5% | <0.2% | >1% |
| Spam Rate | <0.01% | <0.005% | >0.01% |
| Unsub Rate | <0.3% | <0.15% | >0.5% |

### Deliverability Best Practices
- Sunset unengaged subscribers after 180 days (sunset flow)
- Clean list regularly: remove hard bounces, spam complainers
- Send consistently — not 0 for 2 weeks then 5 in a day
- Warm up new sending domains gradually (start with engaged segment)
- Monitor Google Postmaster Tools for domain reputation
- Avoid spam triggers in content and subject lines

---

## Sale Strategy Framework (Grow, Nurture, Convert)

### Pre-Sale Phase (2-4 weeks before)
- **Grow**: Ramp up list building — sale-specific popup ("Get early access to our upcoming sale")
- **Nurture**: Increase campaign frequency, tease upcoming sale, build anticipation
- **Convert**: Early access for VIPs 1-2 days before public launch

### Sale Sending Schedule
- **Hype (pre-launch)**: 1-3 emails building anticipation. Tease the offer. Countdown.
- **Launch day**: 2 emails — morning launch + evening reminder to non-openers
- **Mid-sale**: Daily emails — new angles, product spotlights, social proof, best sellers, gift guides
- **Last chance**: 2 emails on final day — morning "final hours" + evening "closing tonight"
- **Post-sale**: Thank you email, transition back to BAU content

### Sale Segmentation Strategy
- VIPs -> every email
- Engaged 30-day -> every email
- Engaged 90-day -> launch, mid-sale highlights, last chance
- Full list -> launch email only, last chance only
- Non-openers -> re-send key emails with different subject lines

---

## SMS Strategy

### SMS Philosophy
- SMS is for **peak events and major moments** — not routine communication
- 90-97% open rate within 2 minutes of sending
- SMS builds your own channel — reduces dependency on paid ads
- Best for: Sale launches, last chance, restocks, new releases, free shipping days

### Building SMS List (4 Methods)
1. **Checkout opt-in**: Shopify checkbox ("Text me with news and offers") — low opt-in rate (<1%) but fully compliant
2. **Competitions**: Collect phone number as entry requirement — high volume
3. **Two-step popup**: Email on step 1, phone on step 2 — **60-80% of email signups also leave phone number** (Klaviyo data)
4. **Dedicated email to existing list**: "Join our SMS club" with incentive

### SMS Best Practices
- **Sender ID**: Use brand name (max 11 characters) — distinguishes from spam
- **Preview text matters**: First line shows on lock screen — lead with key message, not "Hey [name]"
- **Naked URL** preferred over shortened links — shortened links look spammy
- **Keep under 160 characters** — longer = 2 messages = double cost
- **Time of send**: 9AM-12PM or 4PM-7PM. Never before 8AM.
- Use SMS sparingly: 1-4x per month for most brands. Only for genuinely important moments.
- MMS (with image/GIF): 25c+ per send but much higher engagement — use for biggest events

### SMS Campaign Types (When to Send)
1. **Sale announcement** — primary reason. "BFCM Sale live now. Shop: [url]"
2. **Last chance** — "Final hours. Sale ends midnight. [url]"
3. **Restock** — "Best seller back in stock. [url]"
4. **New release** — major collection drops only
5. **Hype** — rare, only biggest events (BFCM, EOFY)
6. **Community** — holiday wishes, thank you (non-commercial, builds goodwill)
7. **Free shipping Friday** — low-commitment offer that drives 2x normal daily revenue

### SMS in Flows
- Add SMS as **fallback after email** (conditional split: "has not opened email")
- Best in: Abandoned cart (20 hours after email), Welcome (final urgency push)
- Include dynamic merge fields (checkout URL, product name)
- Keep flow SMS to 1-2 messages max — light touch

---

## Zero Party Data (ZPD) in Flows

### What is ZPD
- Information customers **voluntarily share** that you couldn't know otherwise
- Examples: skincare concerns, product preferences, skin type, purchase intent, gift vs self
- Collected via: micro-commitment forms, quizzes, post-purchase surveys, preference centers

### Using ZPD in Flows
- Welcome flow: Conditional splits based on signup form answers -> personalized product recommendations
- Post-purchase: Different cross-sell paths based on what they bought or told you
- Browse abandonment: Personalized messaging based on stated concerns
- Must have in 2026 — ISPs reward engagement; personalization drives engagement

---

## Customer Lifecycle Stages

### Stage 1: Prospect
- On email list but hasn't purchased
- Focus: Welcome flow, educational content, first-purchase incentive

### Stage 2: First-Time Buyer
- Made one purchase
- Focus: Post-purchase flow, cross-sell, review request, replenishment

### Stage 3: Repeat Customer
- 2+ purchases
- Focus: VIP treatment, loyalty program, early access, exclusive offers

### Stage 4: Lapsed Customer
- Previously purchased, now inactive (90-180+ days)
- Focus: Win-back campaigns, re-engagement offers, sunset flow

### Stage 5: Churned
- 180+ days no engagement, no purchase
- Action: Suppress from active sending to protect deliverability

---

## Reviewing & Improving Performance

### Campaign Performance Review
- Check weekly: open rate, click rate, revenue, unsub rate, spam rate
- Compare against your own benchmarks (not just industry averages)
- Low opens -> subject line problem or deliverability issue
- Low clicks -> content/CTA problem (email opens but doesn't drive action)
- High unsubs/spam -> wrong audience (segmentation) or irrelevant content

### Flow Performance Review
- Review monthly: revenue per recipient, conversion rate per email in flow
- Identify drop-off points — where do people stop engaging?
- Test subject lines and content within flows (A/B test in Klaviyo)
- Add/remove emails based on performance data
- Ensure flow filters are working (not sending to wrong people)

### Improving Flow Performance
- Test different time delays, swap content types, add/remove emails based on data
- Add plain text emails as alternatives to designed emails
- Refresh content every 3-6 months to prevent fatigue

---

## BFCM / Major Sale Playbook

### Timeline
- **8-12 weeks out**: Plan offer, creative, sending schedule
- **4-6 weeks out**: Build sale-specific signup form, ramp list building
- **2-4 weeks out**: Build emails and flows, prepare segments
- **1-2 weeks out**: Hype phase — teaser campaigns, early access signup
- **Launch day**: Execute sending schedule, monitor performance live
- **During sale**: Daily campaigns, multiple angles, segment-specific sends
- **Final day**: Last chance urgency, countdown timers, 2x sends
- **Post-sale**: Thank you, transition to BAU, debrief performance

### BFCM Specific Tactics
- Replace BAU popup with sale-specific early access form
- Pause/update abandonment flows with sale messaging
- Send broader than usual (all subscribers for launch + last chance)
- SMS for launch + last chance. Re-send to non-openers with different subject lines.
- Add countdown timers for urgency. Monitor deliverability closely.

---

## Key Benchmarks Summary

| Metric | Target | Notes |
|--------|--------|-------|
| Signup form submission rate | 3-5% | 15-20% with strong offer |
| Welcome flow rev/recipient | $5+ | Highest-value flow |
| Abandoned checkout rev/recipient | $3+ | Highest buying intent |
| Abandoned cart rev/recipient | $3+ | Medium intent |
| Browse abandonment rev/recipient | $2+ | Lowest intent, needs volume |
| Post-purchase rev/recipient | $1+ | Cross-sell opportunity |
| Campaign rev/recipient | $0.05-0.15 | Engaged segment |
| Flow vs campaign revenue split | 60/40 flows | Flows should dominate |
| Email as % of total revenue | 30%+ | North star metric |
| Campaign open rate | 45%+ | Engaged segment |
| Campaign click rate | 1.5%+ | Content quality indicator |
| Spam complaint rate | <0.01% | Danger above 0.01% |
| Unsub rate | <0.3% | Danger above 0.5% |
| SMS open rate | 90-97% | Within 2 minutes |
| Two-step form SMS capture | 60-80% | Of email signups |
| Annual list churn | ~20% | Normal — must replenish |
