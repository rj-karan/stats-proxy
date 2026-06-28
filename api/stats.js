export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
      if (!r.ok) throw new Error(`LeetCode API returned ${r.status}`);
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
    // =====================================================
    if (platform === 'tryhackme') {
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
    // FIX: uses the PUBLIC profile API — no token needed!
    // Your profile is public at:
    // https://app.hackthebox.com/public/users/3175444
    // =====================================================
    if (platform === 'hackthebox') {
      // Primary: public profile endpoint (no auth required)
      const r = await fetch(
        'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
        {
          headers: {
            // Sending Accept header mimics an API client, not a browser
            'Accept':     'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer':    'https://app.hackthebox.com/'
          }
        }
      );

      console.log('[HTB] public profile status:', r.status);

      // If public endpoint works (profile is public), use it
      if (r.ok) {
        const raw = await r.json();
        console.log('[HTB] raw keys:', Object.keys(raw));
        const p = raw.profile ?? raw;

        return res.json({
          level:      p.level      ?? 0,
          rank:       p.rank       ?? 'N/A',
          seasonRank: p.ranking    ? `#${p.ranking}` : 'N/A',
          points:     p.points     ?? 0,
          flags:      String(p.system_owns ?? p.user_owns ?? 0),
          tier:       p.rank_text  ?? p.rank ?? 'N/A',
          name:       p.name       ?? 'N/A',
          avatar:     p.avatar     ?? null
        });
      }

      // Fallback: use token if set (in case HTB changes public API access)
      const token = process.env.HTB_TOKEN;
      if (token) {
        console.log('[HTB] public failed, trying token...');
        const tr = await fetch(
          'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept':        'application/json',
              'User-Agent':    'Mozilla/5.0'
            }
          }
        );

        console.log('[HTB] token auth status:', tr.status);

        if (tr.status === 401) {
          return res.status(401).json({
            error: 'HTB token expired. Regenerate at: https://app.hackthebox.com/profile/settings → App Tokens'
          });
        }

        if (tr.ok) {
          const raw = await tr.json();
          const p = raw.profile ?? raw;
          return res.json({
            level:      p.level      ?? 0,
            rank:       p.rank       ?? 'N/A',
            seasonRank: p.ranking    ? `#${p.ranking}` : 'N/A',
            points:     p.points     ?? 0,
            flags:      String(p.system_owns ?? p.user_owns ?? 0),
            tier:       p.rank_text  ?? p.rank ?? 'N/A',
            name:       p.name       ?? 'N/A',
            avatar:     p.avatar     ?? null
          });
        }
      }

      return res.status(500).json({
        error: `HTB returned ${r.status}. Profile may not be public or token may be expired.`
      });
    }

    return res.status(400).json({ error: 'Unknown platform. Use: leetcode | tryhackme | hackthebox' });

  } catch (e) {
    console.error(`[handler] ${platform} error:`, e.message);
    return res.status(500).json({ error: e.message, platform });
  }
}
