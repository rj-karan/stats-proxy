export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { platform } = req.query;

  try {
    // =====================================================
    // LEETCODE
    // =====================================================
    if (platform === 'leetcode') {
      const r = await fetch(
        'https://alfa-leetcode-api.onrender.com/zoro_rj/solved',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!r.ok) {
        throw new Error(`LeetCode API returned ${r.status}`);
      }

      const data = await r.json();

      return res.json({
        totalSolved:  data.solvedProblem ?? 0,
        easySolved:   data.easySolved    ?? 0,
        mediumSolved: data.mediumSolved  ?? 0,
        hardSolved:   data.hardSolved    ?? 0,
        totalEasy:    850,
        totalMedium:  1800,
        totalHard:    800
      });
    }

    // =====================================================
    // TRYHACKME
    // FIX: removed silent catch+fallback, switched endpoint,
    //      added Referer header, added console logs for debugging
    // =====================================================
    if (platform === 'tryhackme') {
      // THM's /api/v2/public-profile blocks server-side requests.
      // /api/user/summary works without a browser cookie session.
      const r = await fetch(
        'https://tryhackme.com/api/user/summary?username=zororj',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            'Referer':    'https://tryhackme.com/',
            'Accept':     'application/json'
          }
        }
      );

      console.log('[THM] status:', r.status);

      if (!r.ok) {
        const body = await r.text();
        console.error('[THM] error body:', body.slice(0, 300));
        throw new Error(`THM API returned ${r.status}: ${body.slice(0, 200)}`);
      }

      const json = await r.json();
      console.log('[THM] raw response:', JSON.stringify(json).slice(0, 500));

      // Handle both response shapes THM may return
      const d = json.data ?? json;

      return res.json({
        rooms:      d.completedRoomsCount   ?? d.completedRoomsNumber ?? 0,
        streak:     d.streak                ?? 0,
        badges:     d.badgesCount           ?? d.badgesNumber         ?? 0,
        rank:       d.topPercentage != null  ? `${d.topPercentage}%`  : (d.userRank ?? 'N/A'),
        points:     d.points                ?? d.totalPoints           ?? 0,
        level:      d.level                 ?? '0x9][MAGE',
        leagueTier: d.leagueTier            ?? 'N/A',
        globalRank: d.globalRank            ?? d.rank                  ?? 0
      });
    }

    // =====================================================
    // HACK THE BOX
    // FIX: better 401 message, owns count from activity endpoint,
    //      correct field mapping, console logs for debugging
    // =====================================================
    if (platform === 'hackthebox') {
      const token = process.env.HTB_TOKEN;

      if (!token) {
        throw new Error('HTB_TOKEN env var not set');
      }

      // --- Basic profile ---
      const profileRes = await fetch(
        'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept':        'application/json',
            'User-Agent':    'Mozilla/5.0'
          }
        }
      );

      console.log('[HTB] profile status:', profileRes.status);

      if (profileRes.status === 401) {
        return res.status(401).json({
          error: 'HTB token expired. Regenerate at: https://app.hackthebox.com/profile/settings (App Tokens tab)'
        });
      }

      if (!profileRes.ok) {
        const body = await profileRes.text();
        console.error('[HTB] profile error body:', body.slice(0, 300));
        return res.status(500).json({ error: `HTB API returned ${profileRes.status}` });
      }

      const raw = await profileRes.json();
      console.log('[HTB] raw profile keys:', Object.keys(raw));

      // HTB wraps in { profile: { ... } }
      const p = raw.profile ?? raw;

      // --- Activity endpoint for accurate machine owns ---
      let userOwns = p.system_owns ?? p.user_owns ?? 0;
      try {
        const actRes = await fetch(
          'https://labs.hackthebox.com/api/v4/user/profile/activity/3175444',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept':        'application/json',
              'User-Agent':    'Mozilla/5.0'
            }
          }
        );

        if (actRes.ok) {
          const actData = await actRes.json();
          const activity = actData.profile?.activity ?? actData.activity ?? [];
          const machineOwns = activity.filter(a => a.object_type === 'machine').length;
          if (machineOwns > 0) userOwns = machineOwns;
          console.log('[HTB] machine owns from activity:', machineOwns);
        } else {
          console.warn('[HTB] activity endpoint returned:', actRes.status);
        }
      } catch (actErr) {
        console.warn('[HTB] activity fetch failed (non-fatal):', actErr.message);
      }

      return res.json({
        level:      p.level      ?? 0,
        rank:       p.rank       ?? 'N/A',
        seasonRank: p.ranking    ? `#${p.ranking}` : 'N/A',
        points:     p.points     ?? 0,
        flags:      String(userOwns),
        tier:       p.rank_text  ?? p.rank ?? 'N/A',
        name:       p.name       ?? 'N/A',
        avatar:     p.avatar     ?? null
      });
    }

    // Unknown platform
    return res.status(400).json({ error: 'Unknown platform. Use: leetcode | tryhackme | hackthebox' });

  } catch (e) {
    console.error(`[handler] ${platform} unhandled error:`, e.message);
    return res.status(500).json({ error: e.message, platform });
  }
}
