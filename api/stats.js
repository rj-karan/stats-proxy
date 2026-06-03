export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { platform } = req.query;

  try {

    // ── LEETCODE ──────────────────────────────────────────────
    if (platform === 'leetcode') {
      const r = await fetch('https://alfa-leetcode-api.onrender.com/zoro_rj/solved', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok) throw new Error(`LC ${r.status}`);
      const data = await r.json();
      return res.json({
        totalSolved:  data.solvedProblem  ?? 187,
        easySolved:   data.easySolved     ?? 142,
        mediumSolved: data.mediumSolved   ?? 37,
        hardSolved:   data.hardSolved     ?? 8,
        totalEasy: 850, totalMedium: 1800, totalHard: 800
      });
    }

    // ── TRYHACKME ─────────────────────────────────────────────
    if (platform === 'tryhackme') {
      try {
        const r = await fetch('https://tryhackme.com/api/v2/public-profile?username=zororj', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://tryhackme.com/',
            'Origin': 'https://tryhackme.com'
          }
        });

        if (r.status === 429) throw new Error('THM rate limited');
        if (!r.ok) throw new Error(`THM ${r.status}`);

        const text = await r.text();
        if (text.trim().startsWith('<')) throw new Error('THM returned HTML');

        const data = JSON.parse(text);
        const d = data.data || data;

        return res.json({
          rooms:      d.completedRoomsNumber ?? 70,
          streak:     d.streak               ?? 77,
          badges:     d.badgesNumber         ?? 7,
          rank:       (d.topPercentage ?? 5) + '%',
          points:     d.totalPoints          ?? 9232,
          level:      '0x9][MAGE',
          leagueTier: d.leagueTier           ?? 'gold',
          globalRank: d.rank                 ?? 112518
        });

      } catch(e) {
        // Fallback to last known real stats when THM blocks/rate-limits
        return res.json({
          rooms:      70,
          streak:     77,
          badges:     7,
          rank:       '5%',
          points:     9232,
          level:      '0x9][MAGE',
          leagueTier: 'gold',
          globalRank: 112518
        });
      }
    }

    // ── HACKTHEBOX ────────────────────────────────────────────
    if (platform === 'hackthebox') {
      const token = process.env.HTB_TOKEN;
      if (!token) throw new Error('HTB_TOKEN env var not set in Vercel');

      const r = await fetch('https://labs.hackthebox.com/api/v4/user/profile/basic/3175444', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent':    'Mozilla/5.0',
          'Accept':        'application/json'
        }
      });

      if (r.status === 401) return res.status(500).json({ error: 'HTB token invalid or expired — regenerate on HTB settings' });
      if (!r.ok) return res.status(500).json({ error: `HTB API returned ${r.status}` });

      const raw = await r.json();
      const p = raw.profile;

      if (!p) return res.status(500).json({ error: 'No profile key in HTB response', raw });

      return res.json({
        level:      p.level      ?? 18,
        rank:       p.rank       ?? 'Apprentice',
        seasonRank: p.ranking    ? '#' + p.ranking : '#2013',
        points:     p.points     ?? 110,
        flags:      (p.user_owns ?? 4) + '/24',
        tier:       p.rank_text  ?? 'Silver'
      });
    }

    return res.status(400).json({ error: 'unknown platform' });

  } catch(e) {
    return res.status(500).json({ error: e.message, platform });
  }
}