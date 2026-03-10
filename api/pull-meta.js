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
      var fbUrl = 'https://graph.facebook.com/v19.0/' + pageId + '/insights' +
        '?metric=page_impressions,page_post_engagements,page_views_total,page_fan_adds' +
        '&period=day&since=' + sinceDate + '&until=' + untilDate +
        '&access_token=' + token;

      var igInsightsUrl = 'https://graph.facebook.com/v19.0/' + igId + '/insights' +
        '?metric=reach,follower_count,profile_views,accounts_engaged,total_interactions' +
        '&period=day&since=' + sinceDate + '&until=' + untilDate +
        '&access_token=' + token;

      var igMediaUrl = 'https://graph.facebook.com/v19.0/' + igId + '/media' +
        '?fields=id,caption,media_type,like_count,comments_count,timestamp,permalink' +
        '&limit=20&access_token=' + token;

      var results = await Promise.all([
        fetch(fbUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
        fetch(igInsightsUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
        fetch(igMediaUrl).then(function(r) { return r.json(); }).catch(function(e) { return { _error: e.message }; }),
      ]);

      var fbData = results[0];
      var igInsights = results[1];
      var igMedia = results[2];

      // Parse Facebook Page insights
      var facebook = { pageLikes: 0, engagedUsers: 0, impressions: 0, daily: [], error: null };
      if (fbData._error || fbData.error) {
        facebook.error = fbData._error || fbData.error.message ||
          'Facebook Page insights failed. Ensure the token has pages_read_engagement permission.';
      } else {
        var fbMetrics = fbData.data || [];
        var impressionsMetric = fbMetrics.find(function(m) { return m.name === 'page_impressions'; });
        var engagedMetric = fbMetrics.find(function(m) { return m.name === 'page_post_engagements'; });
        var viewsMetric = fbMetrics.find(function(m) { return m.name === 'page_views_total'; });
        var fanAddsMetric = fbMetrics.find(function(m) { return m.name === 'page_fan_adds'; });

        var fanAddsValues = fanAddsMetric ? (fanAddsMetric.values || []) : [];
        facebook.newFans = fanAddsValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);

        var viewsValues = viewsMetric ? (viewsMetric.values || []) : [];
        facebook.pageViews = viewsValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);

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

      // Parse Instagram insights
      var instagram = { followers: 0, reach: 0, profileViews: 0, accountsEngaged: 0, totalInteractions: 0, daily: [], error: null };
      if (igInsights._error || igInsights.error) {
        instagram.error = igInsights._error || igInsights.error.message ||
          'Instagram insights failed. Ensure the token has instagram_basic and instagram_manage_insights permissions.';
      } else {
        var igMetrics = igInsights.data || [];
        var igReach = igMetrics.find(function(m) { return m.name === 'reach'; });
        var igFollowers = igMetrics.find(function(m) { return m.name === 'follower_count'; });
        var igProfileViews = igMetrics.find(function(m) { return m.name === 'profile_views'; });
        var igEngaged = igMetrics.find(function(m) { return m.name === 'accounts_engaged'; });
        var igInteractions = igMetrics.find(function(m) { return m.name === 'total_interactions'; });

        if (igFollowers && igFollowers.values && igFollowers.values.length > 0) {
          instagram.followers = igFollowers.values[igFollowers.values.length - 1].value || 0;
        }

        var igReachValues = igReach ? (igReach.values || []) : [];
        var igProfileValues = igProfileViews ? (igProfileViews.values || []) : [];
        var igEngagedValues = igEngaged ? (igEngaged.values || []) : [];
        var igInteractionValues = igInteractions ? (igInteractions.values || []) : [];

        instagram.reach = igReachValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);
        instagram.profileViews = igProfileValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);
        instagram.accountsEngaged = igEngagedValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);
        instagram.totalInteractions = igInteractionValues.reduce(function(s, v) { return s + (v.value || 0); }, 0);

        var igDailyMap = {};
        igReachValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d) igDailyMap[d] = { date: d, reach: v.value || 0, profileViews: 0, engaged: 0, interactions: 0 };
        });
        igProfileValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d && igDailyMap[d]) igDailyMap[d].profileViews = v.value || 0;
          else if (d) igDailyMap[d] = { date: d, reach: 0, profileViews: v.value || 0, engaged: 0, interactions: 0 };
        });
        igEngagedValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d && igDailyMap[d]) igDailyMap[d].engaged = v.value || 0;
        });
        igInteractionValues.forEach(function(v) {
          var d = v.end_time ? v.end_time.split('T')[0] : '';
          if (d && igDailyMap[d]) igDailyMap[d].interactions = v.value || 0;
        });
        instagram.daily = Object.keys(igDailyMap).sort().map(function(k) { return igDailyMap[k]; });
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
