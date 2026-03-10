export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  var token = process.env.META_ACCESS_TOKEN;
  var accountId = process.env.META_AD_ACCOUNT_ID;
  var days = parseInt(req.query.days) || 30;

  // ── Organic social data pull ──────────────────
  if (req.query.type === 'organic') {
    var pageId = process.env.META_PAGE_ID;
    var igId = process.env.META_IG_USER_ID;

    if (!pageId || !igId) {
      return res.status(200).json({
        success: false,
        setup: true,
        message: 'Add META_PAGE_ID and META_IG_USER_ID to Vercel env vars. ' +
          'To find your Page ID: go to your Facebook Page → About → Page ID. ' +
          'To find your IG User ID: use the Graph API Explorer with instagram_basic permission, ' +
          'call GET /{page-id}?fields=instagram_business_account to get the IG user ID.',
      });
    }

    if (!token) {
      return res.status(400).json({ error: 'Missing META_ACCESS_TOKEN' });
    }

    var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    var untilDate = new Date().toISOString().split('T')[0];

    try {
      // Step 1: Get Page Access Token (required for page insights)
      var pageTokenUrl = 'https://graph.facebook.com/v19.0/' + pageId +
        '?fields=access_token&access_token=' + token;
      var pageTokenResult = await fetch(pageTokenUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; });
      var pageToken = (pageTokenResult && pageTokenResult.access_token) ? pageTokenResult.access_token : null;

      // Step 2: Get page fan count (total likes) — uses page token or user token
      var fbPageUrl = 'https://graph.facebook.com/v19.0/' + pageId +
        '?fields=fan_count,name&access_token=' + (pageToken || token);

      // Step 3: Build API URLs
      // FB Page insights — skip entirely; page_impressions/page_post_engagements
      // return (#100) errors on many token configurations. We get fan_count from fbPageUrl above.
      var fbUrl = null;

      // IG daily metrics (period=day) — these support period=day natively
      var igDailyUrl = 'https://graph.facebook.com/v19.0/' + igId + '/insights' +
        '?metric=reach,follower_count' +
        '&period=day&since=' + sinceDate + '&until=' + untilDate +
        '&access_token=' + token;

      // IG total_value metrics — these REQUIRE metric_type=total_value
      var igTotalUrl = 'https://graph.facebook.com/v19.0/' + igId + '/insights' +
        '?metric=profile_views,accounts_engaged,total_interactions' +
        '&period=day&metric_type=total_value' +
        '&since=' + sinceDate + '&until=' + untilDate +
        '&access_token=' + token;

      // IG media (posts)
      var igMediaUrl = 'https://graph.facebook.com/v19.0/' + igId + '/media' +
        '?fields=id,caption,media_type,like_count,comments_count,timestamp,permalink' +
        '&limit=20&access_token=' + token;

      var fetches = [
        fbUrl ? fetch(fbUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }) : Promise.resolve({ _skipped: true }),
        fetch(igDailyUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
        fetch(igTotalUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
        fetch(igMediaUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
        fetch(fbPageUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
      ];
      var results = await Promise.all(fetches);

      var fbData = results[0];
      var igDailyInsights = results[1];
      var igTotalInsights = results[2];
      var igMedia = results[3];
      var fbPageInfo = results[4];

      // Parse Facebook Page info (fan_count = total page likes)
      var facebook = { pageLikes: 0, engagedUsers: 0, impressions: 0, pageViews: 0, newFans: 0, daily: [], error: null };
      if (fbPageInfo && !fbPageInfo._error && !fbPageInfo.error) {
        facebook.pageLikes = fbPageInfo.fan_count || 0;
      }

      // Parse Facebook Page insights (if available)
      if (fbData._skipped) {
        // FB insights skipped — fan_count from page info is sufficient
      } else if (fbData._error || fbData.error) {
        facebook.error = fbData._error || (fbData.error ? fbData.error.message : null) ||
          'Facebook Page insights failed.';
      } else {
        var fbMetrics = fbData.data || [];
        var impressionsMetric = fbMetrics.find(function(m) { return m.name === 'page_impressions'; });
        var engagedMetric = fbMetrics.find(function(m) { return m.name === 'page_post_engagements'; });

        var engagedValues = engagedMetric ? (engagedMetric.values || []) : [];
        var impressionValues = impressionsMetric ? (impressionsMetric.values || []) : [];

        facebook.engagedUsers = engagedValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);
        facebook.impressions = impressionValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);

        var fbDailyMap = {};
        impressionValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d) fbDailyMap[d] = { date: d, impressions: v.value || 0, engaged: 0 };
        });
        engagedValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d && fbDailyMap[d]) fbDailyMap[d].engaged = v.value || 0;
          else if (d) fbDailyMap[d] = { date: d, impressions: 0, engaged: v.value || 0 };
        });
        facebook.daily = Object.keys(fbDailyMap).sort().map(function(k) { return fbDailyMap[k]; });
      }
      if (!facebook.error) delete facebook.error;

      // Parse Instagram insights (from two separate API calls)
      var instagram = { followers: 0, reach: 0, avgDailyReach: 0, profileViews: 0, accountsEngaged: 0, totalInteractions: 0, daily: [], error: null };

      // A) Daily metrics (reach, follower_count)
      var igDailyError = null;
      if (igDailyInsights._error || igDailyInsights.error) {
        igDailyError = igDailyInsights._error || (igDailyInsights.error ? igDailyInsights.error.message : 'IG daily insights failed');
      } else {
        var igDailyMetrics = igDailyInsights.data || [];
        var igReach = igDailyMetrics.find(function(m) { return m.name === 'reach'; });
        var igFollowers = igDailyMetrics.find(function(m) { return m.name === 'follower_count'; });

        if (igFollowers && igFollowers.values && igFollowers.values.length > 0) {
          instagram.followers = igFollowers.values[igFollowers.values.length - 1].value || 0;
        }

        var igReachValues = igReach ? (igReach.values || []) : [];
        var totalReach = igReachValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);
        instagram.reach = totalReach;
        instagram.avgDailyReach = igReachValues.length > 0 ? Math.round(totalReach / igReachValues.length) : 0;

        igReachValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d) instagram.daily.push({ date: d, reach: v.value || 0, profileViews: 0, engaged: 0, interactions: 0 });
        });
      }

      // B) Total value metrics (profile_views, accounts_engaged, total_interactions)
      // These return a single total_value object per metric, not daily values
      var igTotalError = null;
      if (igTotalInsights._error || igTotalInsights.error) {
        igTotalError = igTotalInsights._error || (igTotalInsights.error ? igTotalInsights.error.message : 'IG total insights failed');
        instagram._totalValueDebug = igTotalInsights.error || igTotalInsights._error || 'unknown';
      } else {
        var igTotalMetrics = igTotalInsights.data || [];
        // Debug: include raw metric names found
        instagram._totalValueMetrics = igTotalMetrics.map(function(m) { return m.name; });
        instagram._totalValueRaw = igTotalMetrics.map(function(m) {
          return { name: m.name, total_value: m.total_value, values: (m.values || []).slice(0, 2) };
        });

        igTotalMetrics.forEach(function(m) {
          // total_value metrics may return {total_value: {value: N}} OR {values: [{value: N}]}
          var val = 0;
          if (m.total_value && typeof m.total_value.value === 'number') {
            val = m.total_value.value;
          } else if (m.values && m.values.length > 0) {
            val = m.values.reduce(function(s, v) { return s + (v.value || 0); }, 0);
          }
          if (m.name === 'profile_views') instagram.profileViews = val;
          else if (m.name === 'accounts_engaged') instagram.accountsEngaged = val;
          else if (m.name === 'total_interactions') instagram.totalInteractions = val;
        });
      }

      // Set error only if both calls failed
      if (igDailyError && igTotalError) {
        instagram.error = 'Daily: ' + igDailyError + ' | Total: ' + igTotalError;
      } else if (igDailyError) {
        instagram.error = igDailyError;
      }
      if (!instagram.error) delete instagram.error;

      // Parse Instagram recent media
      var recentPosts = [];
      if (!igMedia._error && !igMedia.error) {
        recentPosts = (igMedia.data || []).map(function(p) {
          return {
            date: p.timestamp ? p.timestamp.split('T')[0] : '',
            caption: p.caption ? p.caption.substring(0, 100) : '',
            likes: p.like_count || 0,
            comments: p.comments_count || 0,
            type: p.media_type || '',
            permalink: p.permalink || '',
          };
        });
      } else {
        var mediaError = igMedia._error || (igMedia.error ? igMedia.error.message : 'Unknown error');
        recentPosts = [];
        instagram.mediaError = mediaError;
      }

      // Follower estimation fallback: if API returned 0 followers but we have posts,
      // estimate from top post engagement (top post typically gets 5-10% of followers engaging)
      if (instagram.followers === 0 && recentPosts.length > 0) {
        var maxLikes = recentPosts.reduce(function(mx, p) { return p.likes > mx ? p.likes : mx; }, 0);
        if (maxLikes > 0) {
          instagram.followersEstimated = true;
          // Top post = ~7% engagement rate for small skincare accounts
          instagram.followers = Math.round(maxLikes / 0.07);
        }
      }

      // Also compute post-level engagement stats for the frontend
      if (recentPosts.length > 0) {
        var postTotalEng = recentPosts.reduce(function(s, p) { return s + p.likes + p.comments; }, 0);
        instagram.postAvgEngagement = Math.round(postTotalEng / recentPosts.length * 10) / 10;
        instagram.postEngagementRate = instagram.followers > 0
          ? Math.round(postTotalEng / recentPosts.length / instagram.followers * 10000) / 100
          : 0;
      }

      return res.status(200).json({
        success: true,
        pulledAt: new Date().toISOString(),
        dateRange: { start: sinceDate, end: untilDate },
        instagram: instagram,
        facebook: facebook,
        recentPosts: recentPosts,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
        hint: 'Ensure your META_ACCESS_TOKEN has the following permissions: pages_read_engagement, instagram_basic, instagram_manage_insights.',
      });
    }
  }

  var level = req.query.level || 'account'; // account, campaign, adset, ad

  if (!token || !accountId) {
    return res.status(400).json({ error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID' });
  }

  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  var untilDate = new Date().toISOString().split('T')[0];

  try {
    // ── Campaign / Adset / Ad level pull ──────────
    if (level === 'campaign' || level === 'adset' || level === 'ad') {
      var fields = 'campaign_name,campaign_id,spend,impressions,clicks,reach,frequency,actions,action_values,cpc,cpm,ctr';
      if (level === 'adset') fields = 'campaign_name,adset_name,adset_id,' + fields.replace('campaign_name,campaign_id,', '');
      if (level === 'ad') fields = 'campaign_name,adset_name,ad_name,ad_id,campaign_id,adset_id,spend,impressions,clicks,reach,frequency,actions,action_values,cpc,cpm,ctr';

      var allRows = [];
      var url = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
        'fields=' + fields +
        '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
        '&level=' + level + '&limit=500&access_token=' + token;

      while (url) {
        var response = await fetch(url);
        var data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message, type: data.error.type });

        var page = (data.data || []).map(function(row) {
          var purchases = (row.actions || []).find(function(a) { return a.action_type === 'purchase'; });
          var purchaseValue = (row.action_values || []).find(function(a) { return a.action_type === 'purchase'; });
          var pCount = parseInt(purchases ? purchases.value : 0);
          var pValue = parseFloat(purchaseValue ? purchaseValue.value : 0);
          var sp = parseFloat(row.spend) || 0;
          var item = {
            campaign_name: row.campaign_name || '',
            spend: Math.round(sp * 100) / 100,
            impressions: parseInt(row.impressions) || 0,
            clicks: parseInt(row.clicks) || 0,
            reach: parseInt(row.reach) || 0,
            frequency: Math.round((parseFloat(row.frequency) || 0) * 100) / 100,
            purchases: pCount,
            purchase_value: Math.round(pValue * 100) / 100,
            cpp: pCount > 0 ? Math.round((sp / pCount) * 100) / 100 : 0,
            roas: sp > 0 ? Math.round((pValue / sp) * 100) / 100 : 0,
            cpc: Math.round((parseFloat(row.cpc) || 0) * 100) / 100,
            cpm: Math.round((parseFloat(row.cpm) || 0) * 100) / 100,
            ctr: Math.round((parseFloat(row.ctr) || 0) * 100) / 100,
          };
          if (level === 'campaign') item.campaign_id = row.campaign_id;
          if (level === 'adset') { item.adset_name = row.adset_name || ''; item.adset_id = row.adset_id; }
          if (level === 'ad') {
            item.ad_name = row.ad_name || '';
            item.ad_id = row.ad_id;
            item.adset_name = row.adset_name || '';
            item.campaign_id = row.campaign_id;
            item.adset_id = row.adset_id;
          }
          return item;
        });
        allRows = allRows.concat(page);
        url = (data.paging && data.paging.next) ? data.paging.next : null;
      }

      var totalSpend = allRows.reduce(function(s, c) { return s + c.spend; }, 0);
      var totalPurchases = allRows.reduce(function(s, c) { return s + c.purchases; }, 0);
      var totalPurchaseValue = allRows.reduce(function(s, c) { return s + c.purchase_value; }, 0);

      return res.status(200).json({
        accountId: accountId,
        pulledAt: new Date().toISOString(),
        dateRange: { start: sinceDate, end: untilDate },
        level: level,
        data: allRows,
        summary: {
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalPurchases: totalPurchases,
          totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
          avgCPP: totalPurchases > 0 ? Math.round((totalSpend / totalPurchases) * 100) / 100 : null,
          roas: totalSpend > 0 ? Math.round((totalPurchaseValue / totalSpend) * 100) / 100 : 0,
        },
      });
    }

    // ── Account-level daily pull (original) ──────
    var allDaily = [];
    var url = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
      'fields=spend,impressions,clicks,actions,action_values,cpc,cpm,ctr' +
      '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
      '&time_increment=1&level=account&limit=500&access_token=' + token;

    while (url) {
      var response = await fetch(url);
      var data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message, type: data.error.type });

      var page = (data.data || []).map(function(day) {
        var purchases = (day.actions || []).find(function(a) { return a.action_type === 'purchase'; });
        var purchaseValue = (day.action_values || []).find(function(a) { return a.action_type === 'purchase'; });
        return {
          date: day.date_start,
          metaSpend: parseFloat(day.spend) || 0,
          impressions: parseInt(day.impressions) || 0,
          clicks: parseInt(day.clicks) || 0,
          purchases: parseInt(purchases ? purchases.value : 0),
          purchaseValue: parseFloat(purchaseValue ? purchaseValue.value : 0),
          cpc: parseFloat(day.cpc) || 0,
          cpm: parseFloat(day.cpm) || 0,
          ctr: parseFloat(day.ctr) || 0,
        };
      });
      allDaily = allDaily.concat(page);
      url = (data.paging && data.paging.next) ? data.paging.next : null;
    }

    var totalSpend = allDaily.reduce(function(s, d) { return s + d.metaSpend; }, 0);
    var totalPurchases = allDaily.reduce(function(s, d) { return s + d.purchases; }, 0);

    return res.status(200).json({
      accountId: accountId,
      pulledAt: new Date().toISOString(),
      dateRange: { start: sinceDate, end: untilDate },
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalDays: allDaily.length,
      totalPurchases: totalPurchases,
      avgCPP: totalPurchases > 0 ? Math.round((totalSpend / totalPurchases) * 100) / 100 : null,
      daily: allDaily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
