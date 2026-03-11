# Google Ads — Noody Skincare Context

## Role: Capturing High-Intent Demand
Google captures **high-intent, bottom-of-funnel searches** — people actively looking for solutions. This is fundamentally different from Meta, which creates awareness by pushing products to people who don't know they want them.

- Meta creates demand → Google captures demand
- Google ROAS will almost always be higher than Meta — that doesn't mean Google is "better"
- Without Meta driving awareness, Google search volume would decline
- **They work together** — track blended MER, not individual platform ROAS

### Budget Allocation
Don't shift all budget to the highest-ROAS platform — each channel serves a different function:
- Meta: 60-70% of ad budget (drives demand)
- Google: 20-30% of ad budget (captures demand)
- Other: 5-10% for testing

## Campaign Types

### PMax (Performance Max)
- Automated, feed-based, broad reach across Google surfaces
- ROAS highly variable by asset group (0x to 15.5x for Noody)
- Best for: product-based campaigns, shopping intent
- Monitor asset groups individually — pause consistently 0x groups
- Feed quality is critical: optimized titles, descriptions, images

### Search — Brand Terms
- Highest ROAS, lowest cost — captures people already searching for "Noody"
- **Defensive campaign**: Always keep running to prevent competitors bidding on your brand
- Expected ROAS: 8x+ (people already know and want you)

### Search — Non-Brand Terms
- Acquisition campaign — captures problem-aware searchers ("children's eczema cream NZ")
- Lower ROAS than brand search but drives genuine new customer acquisition
- Key queries: "children's eczema cream NZ", "natural baby skincare", "eczema treatment NZ"

## EE Benchmarks for Google
| Metric | Target | Benchmark |
|--------|--------|-----------|
| MER (blended) | 20-35% | EE healthy range |
| DTC MER | <35% | All ad spend / DTC revenue |
| Google ROAS (PMax) | >5x | Shopping intent |
| Google ROAS (Brand Search) | >8x | Defensive |
| Google ROAS (Non-Brand) | >3x | Acquisition |
| Cost per conversion | <$15 ideal | <$25 acceptable |

## Noody Active Campaigns
| Campaign | Spend/30d | ROAS | Role |
|----------|----------|------|------|
| NZ_PMax_FeedOnly_AllProducts | ~$2,257 | 5.8x | Bulk spending, variable by asset group |
| NZ_PMax_FeedOnly_Brand | ~$698 | ~3.2x | Brand PMax, monitor overlap with brand search |
| NZ_Search_Brand_Core | ~$344 | 23.7-110x | Defensive, always-on |
| NZ_Search_NonBrand_EczemaSolutions | ~$441 | ~10x | High-intent eczema searchers |

## Noody Current Performance
| Metric | Google | Meta | Comparison |
|--------|--------|------|------------|
| Spend/30d | $3,741 | $4,437 | Google is 46% of ad spend |
| ROAS | 9.06x | 2.40x | Google 4x more efficient per dollar |
| Role | Captures demand | Creates demand | Complementary |

**Key insight:** Google's higher ROAS is expected because it captures demand Meta creates. Don't over-index on platform ROAS — the question is blended MER and total profitability.

## Optimization Priorities
1. **Product feed quality**: Titles, descriptions, images (biggest PMax lever)
2. **Negative keyword management**: Exclude irrelevant queries from search campaigns
3. **Bid strategy**: Target ROAS with portfolio bidding
4. **Audience signals**: Use customer lists and website visitors in PMax
5. **Asset groups**: Separate by product line (Calm Balm vs Sun Balm)
6. **PMax asset group audit**: Pause consistently 0x ROAS groups

## Common Issues
- Small NZ market = limited search volume (ceiling on Google growth)
- PMax can cannibalize brand search — monitor overlap
- Conversion tracking must match Shopify attribution
- Budget too small can prevent campaigns from learning
- Brand PMax ($698/30d at 3.2x) may overlap with Brand Search ($344 at 23.7x) — test pausing Brand PMax

## CTR Benchmarks
- Search (brand): >3%
- Search (non-brand): >1.5%
- Shopping/PMax: >1%
- Display: >0.5%

---

## Scalable Campaign Structure Framework

### Campaign Hierarchy
Account → Campaigns → Ad Groups (Search/Shopping) or Asset Groups (PMax) → Ads/Assets

### Structure by Budget Tier

**Tier 1: <$100/day BAU (Noody's current tier)**
- Brand Search (always-on, $20-30/day)
- PMax Feed-Only (remaining budget)
- Total: 2 campaigns

**Tier 2: $100-300/day BAU**
- Brand Search
- Brand Shopping (Standard Shopping, manual CPC)
- PMax Feed-Only (all products)
- Non-Brand Search (top 1-2 themes)
- Total: 3-4 campaigns

**Tier 3: $300-1000/day BAU**
- Brand Search
- Brand Shopping
- PMax Feed-Only (segmented by product category or margin)
- Non-Brand Search (multiple themes)
- Competitor Search (custom segments)
- Total: 5-7 campaigns

**Tier 4: >$1000/day BAU**
- All of Tier 3 plus:
- Demand Gen (YouTube/Discover/Gmail)
- Multiple PMax asset groups segmented by custom labels
- Separate search campaigns per keyword theme
- Total: 8+ campaigns

### Campaign Naming Convention
Format: `Country | Campaign Type | Focus`
- Examples: `NZ | Shopping | Brand`, `NZ | PMax | FeedOnly | AllProducts`, `NZ | Search | NonBrand | Eczema`
- Consistent naming enables quick filtering and reporting

---

## Custom Labels Framework (Product Organisation)

Use 5 custom labels in Google Merchant Center to segment products for targeting and bidding:

| Label | Purpose | Example Values |
|-------|---------|---------------|
| Custom Label 0 | Product Category | Calm Balm, Sun Balm, Gift Set |
| Custom Label 1 | Margin Tier | High, Medium, Low, Loss Leader |
| Custom Label 2 | Performance Tier | Bestseller, Strong, Average, New |
| Custom Label 3 | Stock Status | In Stock, Low Stock, Pre-Order |
| Custom Label 4 | Category-Specific Variable | Size, Scent, Bundle Type |

### How to Use Custom Labels
- **Segment PMax asset groups** by margin tier (bid higher on high-margin products)
- **Create separate shopping campaigns** for bestsellers vs new products
- **Exclude loss leaders** from paid campaigns or bid lower
- **Feed-only asset groups** can target specific custom label values
- Tools: Product Hero (paid) or Flowboost Labeliser (free) for automated labeling

---

## PMax Setup & Optimization

### Feed-Only Asset Groups (Recommended for Ecommerce)
Feed-only means: products in the feed only, **no headlines, descriptions, images, or video assets**. This forces Google to serve only Shopping placements (not Search/Display/YouTube).

**Setup:**
- Create asset group with product feed only
- Do NOT add any text assets, images, or videos
- Do NOT add search themes (forces shopping-only)
- Remove all sitelink and callout extensions from the campaign
- Use custom labels to select which products appear

**When to use feed-only:**
- Default for most ecommerce brands
- When you want Shopping-only traffic from PMax
- When you don't have strong creative assets for Display/YouTube

### PMax Bid Strategies
- **Launch phase**: Maximize Conversion Value (no target ROAS) for first 2-4 weeks to gather data
- **Optimization phase**: Switch to Target ROAS once you have 30+ conversions in 30 days
- **Target ROAS calculation**: Target ROAS = (1 / target ad-spend-to-revenue ratio). E.g., if target MER is 25%, target ROAS = 4x

### PMax Optimization Cadence

**Weekly:**
- Check asset group performance — pause any at 0x ROAS after 2+ weeks of spend
- Review search terms report (Insights tab) — add negatives for irrelevant queries
- Monitor budget pacing — ensure not limited by budget on top performers

**Monthly:**
- Run Channel Performance Report: compare Shopping vs Search vs Display vs Video ROAS/CPC
- If Shopping significantly outperforms → add more feed-only asset groups
- If Search outperforms Shopping → consider breaking out a separate Search campaign
- Review audience signal performance
- Refresh any creative assets (if using full asset groups)

**Quarterly:**
- Full product feed audit (titles, descriptions, images)
- Review custom label assignments (update performance tiers)
- Test new asset group segmentation strategies
- Evaluate PMax vs Standard Shopping split

### PMax Channel Performance Analysis
Use the Google Ads channel performance report to see where PMax is spending:
- **Shopping dominates with high ROAS** → Working well, consider feed-only for more control
- **Search has high ROAS but low spend** → Break out a dedicated Search campaign to capture more
- **Display/Video spending with low ROAS** → Switch to feed-only asset groups to eliminate
- **Brand terms in search report** → PMax is cannibalizing Brand Search; add brand exclusions

---

## PMax vs Standard Shopping Decision Framework

| Factor | PMax | Standard Shopping |
|--------|------|-------------------|
| Recommended for | Most brands (Google's flagship, 90+ optimizations in 2 years) | Brands wanting granular control and data |
| Bid strategy | Must use Maximize Conversion Value or Target ROAS | Manual CPC, Enhanced CPC, or Smart Bidding (needs 30 conv/30d) |
| Data visibility | Limited (channel report only) | Full search term, placement, and bid data |
| Complexity | Low (set and monitor) | Higher (manual bid management, negatives) |
| Best for small budgets | Yes — fewer campaigns, simpler | No — needs volume for smart bidding |
| Shopping + Search + Display + Video | All in one | Shopping only |

**Recommendation for Noody:** PMax feed-only is the right choice at current budget levels. Consider adding Standard Shopping for Brand terms only if Brand PMax cannibalizes Brand Search.

---

## Branded Shopping Campaign (Standard Shopping)

### Setup
- Campaign type: Standard Shopping
- Priority: High (catches brand terms before PMax)
- Bid strategy: Manual CPC, starting bid $0.51
- Budget: $20-30/day
- Products: All products

### Brand Shopping Script
Run a **daily automated script** that checks search terms and auto-negatives any non-brand queries:
- Script checks search terms daily
- Any term not containing your brand name gets added as a negative keyword
- This keeps the Standard Shopping campaign brand-only
- Prevents non-brand terms leaking in and inflating CPC

### Why Brand Shopping Matters
- Defends brand terms in Shopping results (complements Brand Search which covers text ads)
- Manual CPC keeps costs predictable ($0.51 per click)
- High priority setting means it captures brand queries before PMax does
- Expected ROAS: 10x+ (brand intent shoppers)

---

## Search Campaign Setup

### Brand Search
- **Bid strategy**: Target Impression Share — 100% top of page
- **Max CPC cap**: $0.51 (brand terms are cheap)
- **Budget**: $20-30/day
- **Match type**: Broad match for brand terms (brand terms are specific enough)
- **Ad copy**: Pin 1-2 headlines with brand name; include current offers
- **Always-on**: Never pause — competitors will bid on your brand

### Non-Brand Search
- **Bid strategy**: Target ROAS (after 30 conversions/30 days), else Maximize Conversion Value
- **Budget**: Allocate based on keyword volume and CPA targets
- **Match type**: Start with Phrase and Exact match; add Broad match cautiously
- **Ad copy**: Use relevance anchors (1-3 keyword-matching headlines)
- **Negative keywords**: Critical — review search terms weekly

### Keyword Match Types
| Type | Syntax | Example | Behavior |
|------|--------|---------|----------|
| Broad | keyword | eczema cream | Widest reach, includes related terms |
| Phrase | "keyword" | "eczema cream" | Must contain phrase in order |
| Exact | [keyword] | [eczema cream] | Must match exact intent |

**Best practice**: Start with Phrase + Exact for control, layer in Broad match once you have conversion data for smart bidding to optimize against.

### AI Max for Search (Newer Feature)
- Google's AI-powered search campaign enhancement
- Automatically generates ad variations and matches to queries
- Broader reach than manual keyword targeting
- Use cautiously — monitor search terms closely for relevance
- Better suited for accounts with strong conversion data

---

## Keyword Research Methodology

### Process
1. **Seed keywords**: Start with product names, categories, and problems solved (e.g., "eczema cream", "natural baby skincare")
2. **Google Keyword Planner**: Get volume estimates and related terms
3. **Search terms report**: Mine existing campaign data for converting queries
4. **Competitor research**: Check what terms competitors rank for
5. **Category expansion**: Branch into adjacent problem terms ("dry skin baby", "sensitive skin children")

### Keyword Organisation
- Group keywords by theme (1 theme per ad group)
- Each ad group should have 5-15 keywords max
- Write ad copy specific to each theme (relevance = higher Quality Score = lower CPC)
- Separate brand vs non-brand into different campaigns (different bid strategies)

### Negative Keywords
- Add negatives proactively: free, DIY, recipe, how to make, wholesale, bulk
- Review search terms weekly for the first month, then bi-weekly
- Use shared negative keyword lists across campaigns for efficiency
- Negative exact match for competitor brand names in non-brand campaigns (unless running competitor campaigns)

---

## Audience Strategy

### Four Audience Types
1. **Customer Match (First-Party Data)** — Shopify/Klaviyo customer lists
2. **GA4 Website Visitors** — Retargeting audiences from Google Analytics
3. **Custom Segments** — Keyword/URL/app-based interest audiences
4. **YouTube Users** — People who viewed/engaged with your YouTube content

### Audience Sizing Thresholds
| Audience Type | Minimum Size | Notes |
|---------------|-------------|-------|
| GA4 (Search/Shopping) | 1,000 users in 30 days | Below this, audience won't serve |
| Customer Match lists | 100 users | Lower threshold than GA4 |
| Custom Segments | No minimum | Google builds from signals |

### Audience Usage Modes
| Mode | Campaign Type | Behavior |
|------|--------------|----------|
| **Observation** | Search, Shopping | Bids on everyone; tracks audience performance for data |
| **Targeting** | Display, Video | Only shows ads to audience members |
| **Signals** | PMax | Trains AI on who to target; not hard targeting |

**For Noody:** Use Observation mode on Search/Shopping to gather data. Use Signals in PMax with customer lists and website visitors.

### Shopify Customer Match Setup
- Install "Google & YouTube" Shopify app
- Syncs customer email list automatically
- Membership duration: 540 days
- Updates daily — no manual uploads needed

### Klaviyo Audiences to Sync
Build and sync these 4 Klaviyo segments to Google Ads:
1. **All email subscribers** (broadest signal)
2. **Previous customers** (purchase history)
3. **Engaged last 30 days** (high-intent recent engagers)
4. **Engaged last 1 year** (warm audience)

### Custom Segments (Competitor & Category)
Build custom segments in Google Ads for Targeting/Signals:

**Competitor search terms** (10-15 terms):
- Competitor brand names, competitor product names
- Do NOT include Amazon, Temu, Shein (too broad, wastes budget)

**Competitor URLs** (10-15 URLs):
- Competitor website homepages and key product pages
- Google uses these to find users who browse those sites

**Category search terms** (10-15 per category):
- Problem-aware terms: "baby eczema treatment", "natural children's moisturiser"
- Category terms: "organic skincare NZ", "sensitive skin cream"

---

## Ad Creative Formula

### Headline Framework (15 headlines max in RSAs)
1. **Relevance anchors (1-3 headlines)**: Match the search query exactly — "Children's Eczema Cream NZ"
2. **Value proposition (2-3 headlines)**: Core benefit — "Soothes Eczema in 3 Days"
3. **Problem/Pain (1-2 headlines)**: Agitate the problem — "Tired of Itchy, Irritated Skin?"
4. **USP (1-2 headlines)**: What makes you different — "100% Natural Ingredients"
5. **Benefit (1-2 headlines)**: End result — "Happy Kids, Happy Parents"
6. **Risk removal (1-2 headlines)**: Reduce friction — "Free Shipping NZ Wide"
7. **Offer (1-2 headlines)**: Current promotion — "20% Off First Order"

### Description Framework (4 descriptions max)
- Description 1: Core value prop + call to action
- Description 2: Social proof / trust signal ("Loved by 10,000+ NZ Parents")
- Description 3: Product details / ingredients
- Description 4: Offer / urgency

### Pinning Strategy
- Pin brand name to Headline Position 1 (brand search)
- Pin top relevance anchor to Position 1 (non-brand search)
- Don't over-pin — let Google test combinations
- Pin max 2-3 headlines, leave the rest flexible

---

## Product Feed Optimization

### Title Formula
`Brand + Product Type + Key Attribute + Size/Variant`
- Example: "Noody Calm Balm Natural Eczema Cream 100ml"
- Front-load the most important keywords (Google truncates after ~70 chars in Shopping)
- Include the problem/solution term ("eczema", "sensitive skin")

### Description Best Practices
- 150-500 words (longer = more keyword signals for Google)
- Include primary keywords naturally in first 1-2 sentences
- List key ingredients and benefits
- Include size, variant, and use case information

### Image Requirements
- White background product shots (primary image)
- Lifestyle images showing product in use
- High resolution (min 800x800, ideally 1200x1200)
- No text overlays, watermarks, or promotional content on primary image

### Feed Health Checklist
- All required attributes populated (title, description, price, availability, image, GTIN/MPN)
- No disapproved products in Merchant Center
- Shipping and tax settings correct for NZ
- Product categories mapped to Google taxonomy
- Custom labels assigned for campaign segmentation

---

## Sale & Seasonal Strategy

### Pre-Sale Preparation (2-4 Weeks Before)
1. **Warm up spend**: Gradually increase daily budgets by 20-30% per week leading into the sale
2. **Check conversion tracking**: Verify Shopify purchase event fires correctly
3. **Set up Google Merchant Center promotions**: Create promotion with sale details, auto-applies to Shopping ads
4. **Prepare ad copy**: Draft sale-specific headlines and descriptions
5. **Review audience lists**: Ensure customer match lists are synced and sized

### Seasonal Bid Adjustments
- Use for **short, sharp windows** only: first 1-2 days of sale + last 1-2 days
- Apply **+50% conversion rate adjustment** (tells Google conversion rates will be higher than usual)
- Apply to **non-brand campaigns only** (brand search doesn't need it)
- Post-sale: Apply **negative adjustment** to account for drop in conversion rate (e.g., post-Christmas slump)
- Set adjustments in advance — they take effect immediately

### ROAS Target Adjustments During Sales
- **Lower target ROAS by 20-30%** during sale periods (more volume at slightly lower efficiency)
- Sale ROAS will naturally be lower due to discounting, but volume compensates
- Return to BAU targets 2-3 days after sale ends

### Sale Campaign Structure by Budget

**<$100/day BAU:**
- Keep existing campaigns running
- Lower target ROAS during sale
- Add sale messaging to ad copy
- Set up Merchant Center promotion

**$300/day BAU:**
- All of above, plus:
- Increase budgets 2-3x during peak sale days
- Add seasonal bid adjustments
- Consider a dedicated sale PMax asset group

**>$1000/day BAU:**
- All of above, plus:
- Dedicated sale search campaigns with sale-specific keywords
- Demand Gen campaign for YouTube/Discover pre-sale hype
- Separate PMax asset groups for sale vs BAU products
- Auction insights monitoring (competitors will also increase spend)

---

## Account Settings Checklist

### Critical Settings to Review
- [ ] **Turn OFF auto-apply recommendations** — Google will auto-change bids, budgets, and keywords if left on
- [ ] **Turn OFF automatically created assets** — Prevents Google from generating headlines/descriptions you haven't approved
- [ ] **Turn OFF Search Partners** in Search campaigns — Low quality traffic, inflate spend
- [ ] **Turn OFF Display Network** in Search campaigns — Leaks budget to low-intent placements
- [ ] **Brand exclusions in PMax** — Add competitor brand names as exclusions so PMax doesn't bid on them
- [ ] **Conversion actions**: Verify only "Purchase" is set as primary conversion action (not "Add to Cart" or "Page View")
- [ ] **Attribution model**: Use data-driven attribution (Google default since 2023)
- [ ] **Location targeting**: Set to "Presence" not "Presence or interest" (prevents showing to people outside NZ)

---

## Competitor Campaign Strategy

### Custom Segment Approach (Recommended over Keyword Targeting)
- Build custom segments with competitor brand names as search terms
- Add competitor website URLs (10-15 URLs)
- Use in PMax as audience signals or in Display/Video as targeting
- **Do NOT target competitor brand names as keywords in Search** unless budget allows (expensive, low Quality Score)

### When to Run Competitor Campaigns
- Only at Tier 3+ budget levels ($300+/day)
- When brand and non-brand campaigns are fully optimized
- When you have strong differentiators to communicate in ad copy
- Monitor CPA closely — competitor campaigns typically have 2-3x higher CPA than brand campaigns

---

## Demand Gen Campaigns (YouTube / Discover / Gmail)

### When to Use
- Budget Tier 3+ ($300+/day BAU)
- Strong video creative available
- Goal: upper-funnel awareness and consideration
- Pre-sale hype periods

### Setup
- Campaign type: Demand Gen
- Placements: YouTube in-feed, Discover, Gmail
- Bidding: Maximize Conversions or Target CPA
- Audiences: Custom segments + customer match + GA4 website visitors
- Creative: Video ads (15-30 seconds), image ads, carousel ads

### Expected Performance
- Lower ROAS than Shopping/Search (1-3x typical)
- Measured value is in assisted conversions and brand lift
- Check Google Ads attribution reports for cross-campaign influence

---

## Key Metrics & Benchmarks Summary

| Metric | Brand Search | Non-Brand Search | PMax (Feed-Only) | Brand Shopping | Competitor | Demand Gen |
|--------|-------------|-----------------|-------------------|---------------|------------|------------|
| Target ROAS | >8x | >3x | >5x | >10x | >2x | >1.5x |
| Target CPC | <$0.50 | <$2.00 | <$1.00 | <$0.50 | <$3.00 | <$1.50 |
| Target CTR | >3% | >1.5% | >1% | >2% | >0.5% | >0.5% |
| Bid Strategy | Imp Share 100% | Target ROAS | Target ROAS | Manual CPC | Target ROAS | Max Conv |
| Priority | Always-on | High | High | Medium | Low | Low |

### Target ROAS Calculation
Target ROAS = 1 / (target ad spend as % of revenue)
- If target MER is 20% → Target ROAS = 5x
- If target MER is 25% → Target ROAS = 4x
- If target MER is 33% → Target ROAS = 3x
- Adjust by campaign type: Brand campaigns should exceed target; non-brand/acquisition campaigns can be at or slightly below target if they drive new customers
