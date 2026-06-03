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
        totalSolved:  data.solvedProblem  ?? 172,
        easySolved:   data.easySolved     ?? 132,
        mediumSolved: data.mediumSolved   ?? 37,
        hardSolved:   data.hardSolved     ?? 8,
        totalEasy: 850, totalMedium: 1800, totalHard: 800
      });
    }

    // ── TRYHACKME ─────────────────────────────────────────────
    if (platform === 'tryhackme') {
      // THM public profile — no auth needed, but needs a browser UA
      const r = await fetch('https://tryhackme.com/api/v2/public-profile?username=zororj', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://tryhackme.com/p/zororj'
        }
      });
      const text = await r.text();
      // If THM returned HTML (blocked), fall through to mock
      if (text.trim().startsWith('<')) throw new Error('THM blocked');
      const data = JSON.parse(text);
      const d = data.data || data;
      return res.json({
        rooms:       d.completedRoomsNumber ?? 70,
        streak:      d.streak               ?? 77,
        badges:      d.badgesNumber         ?? 7,
        rank:        (d.topPercentage ?? 5) + '%',
        points:      d.totalPoints          ?? 9232,
        level:       '0x9][MAGE',
        leagueTier:  d.leagueTier           ?? 'gold',
        globalRank:  d.rank                 ?? 112518
      });
    }

    // ── HACKTHEBOX ────────────────────────────────────────────
    if (platform === 'hackthebox') {
      const token = process.env.HTB_TOKEN;
      if (!token) throw new Error('HTB_TOKEN not set');

      const r = await fetch('https://labs.hackthebox.com/api/v4/user/profile/basic/3175444', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent':    'Mozilla/5.0',
          'Accept':        'application/json',
          'Content-Type':  'application/json'
        }
      });

      if (r.status === 401) throw new Error('HTB token invalid/expired');
      if (!r.ok) throw new Error(`HTB ${r.status}`);

      const raw = await r.json();
      // Log to Vercel function logs so you can see the real structure
      console.log('HTB raw:', JSON.stringify(raw).slice(0, 500));

      const u = raw.profile || raw.data || raw;
      return res.json({
        level:      u.level       ?? u.ranking   ?? 17,
        seasonRank: u.season_rank ? '#' + u.season_rank : (u.rank ? '#' + u.rank : '#unknown'),
        points:     u.points      ?? u.respects  ?? 45,
        flags:      u.user_owns   ? u.user_owns + '/24' : (u.owns ?? '2') + '/24',
        tier:       u.rank_text   ?? u.tier      ?? 'Silver'
      });
    }

    return res.status(400).json({ error: 'unknown platform' });

  } catch(e) {
    // Return the real error message so you can debug
    return res.status(500).json({ error: e.message, platform });
  }
}