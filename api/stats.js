const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

module.exports = async function handler(req, res) {
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
      const cached = getCached('leetcode');
      if (cached) return res.json(cached);

      const r = await fetch(
        'https://alfa-leetcode-api.onrender.com/zoro_rj/solved',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (!r.ok) throw new Error(`LeetCode API returned ${r.status}`);
      const data = await r.json();

      const result = {
        totalSolved:  data.solvedProblem ?? 0,
        easySolved:   data.easySolved    ?? 0,
        mediumSolved: data.mediumSolved  ?? 0,
        hardSolved:   data.hardSolved    ?? 0,
        totalEasy:    850,
        totalMedium:  1800,
        totalHard:    800
      };
      setCache('leetcode', result);
      return res.json(result);
    }

    // =====================================================
    // TRYHACKME
    // =====================================================
    if (platform === 'tryhackme') {
      const cached = getCached('tryhackme');
      if (cached) { console.log('[THM] from cache'); return res.json(cached); }

      const endpoints = [
        'https://tryhackme.com/api/user/summary?username=zororj',
        'https://tryhackme.com/api/v2/public-profile?username=zororj',
      ];

      let json = null;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
              'Referer':    'https://tryhackme.com/',
              'Accept':     'application/json'
            }
          });
          console.log(`[THM] ${url} status: ${r.status}`);
          if (r.ok) { json = await r.json(); break; }
          if (r.status === 429) await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          console.error(`[THM] ${url} error:`, e.message);
        }
      }

      if (!json) {
        return res.status(429).json({ error: 'TryHackMe is rate limiting. Try again in a few minutes.' });
      }

      const d = json.data ?? json;
      const result = {
        rooms:      d.completedRoomsCount ?? d.completedRoomsNumber ?? 0,
        streak:     d.streak              ?? 0,
        badges:     d.badgesCount         ?? d.badgesNumber         ?? 0,
        rank:       d.topPercentage != null ? `${d.topPercentage}%` : (d.userRank ?? 'N/A'),
        points:     d.points              ?? d.totalPoints           ?? 0,
        level:      d.level               ?? 'N/A',
        leagueTier: d.leagueTier          ?? 'N/A',
        globalRank: d.globalRank          ?? d.rank                  ?? 0
      };
      setCache('tryhackme', result);
      return res.json(result);
    }

    // =====================================================
    // HACK THE BOX
    // Confirmed fields from browser network tab:
    //   p.rank        = "Hacker"  (old HTB rank)
    //   p.ranking     = 953       (global rank)
    //   p.points      = 74        (HTB points)
    //   p.user_owns   = 11
    //   p.system_owns = 11
    // Season data (Apprentice/#811/Ruby/350pts/12/26)
    // comes from season endpoint — logged below for discovery
    // =====================================================
    if (platform === 'hackthebox') {
      const cached = getCached('hackthebox');
      if (cached) { console.log('[HTB] from cache'); return res.json(cached); }

      const token = process.env.HTB_TOKEN;
      if (!token) return res.status(500).json({ error: 'HTB_TOKEN env var not set' });

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        'User-Agent':    'Mozilla/5.0'
      };

      // 1. Basic profile
      const profileRes = await fetch(
        'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
        { headers }
      );
      console.log('[HTB] profile status:', profileRes.status);

      if (profileRes.status === 401) {
        return res.status(401).json({
          error: 'HTB token expired. Go to: https://app.hackthebox.com/profile/settings → App Tokens → delete old → create new → copy value → paste in Vercel env vars'
        });
      }
      if (!profileRes.ok) {
        return res.status(500).json({ error: `HTB profile API returned ${profileRes.status}` });
      }

      const profileData = await profileRes.json();
      const p = profileData.profile ?? profileData;
      console.log('[HTB] rank:', p.rank, '| ranking:', p.ranking, '| points:', p.points, '| user_owns:', p.user_owns, '| system_owns:', p.system_owns);

      // 2. Try season endpoints to discover correct one
      let seasonRank = `#${p.ranking ?? 'N/A'}`;
      let seasonTier = 'N/A';
      let seasonPts  = p.points ?? 0;
      let totalFlags = 26;
      let ownedFlags = p.user_owns ?? 0;

      const seasonEndpoints = [
        'https://labs.hackthebox.com/api/v4/user/profile/graph/activity/3175444',
        'https://labs.hackthebox.com/api/v4/rankings/user/3175444/best',
        'https://labs.hackthebox.com/api/v4/user/3175444/season/current',
        'https://labs.hackthebox.com/api/v4/season/current/user/3175444',
        'https://labs.hackthebox.com/api/v4/user/profile/3175444/season',
      ];

      for (const url of seasonEndpoints) {
        try {
          const sr = await fetch(url, { headers });
          console.log(`[HTB] trying ${url} → ${sr.status}`);
          if (sr.ok) {
            const sd = await sr.json();
            console.log(`[HTB] season data from ${url}:`, JSON.stringify(sd).slice(0, 800));
            const s = sd.data ?? sd.profile ?? sd;
            if (s.rank || s.position)       seasonRank = `#${s.rank ?? s.position}`;
            if (s.tier || s.league_tier)    seasonTier = s.tier ?? s.league_tier;
            if (s.points || s.total_points) seasonPts  = s.points ?? s.total_points;
            if (s.total || s.total_flags)   totalFlags = s.total ?? s.total_flags;
            if (s.owned || s.owned_flags)   ownedFlags = s.owned ?? s.owned_flags;
            break;
          }
        } catch (e) {
          console.warn(`[HTB] ${url} error:`, e.message);
        }
      }

      const result = {
        name:       p.name         ?? 'N/A',
        avatar:     p.avatar       ?? null,
        country:    p.country_name ?? 'N/A',
        htbRank:    p.rank         ?? 'N/A',
        globalRank: p.ranking      ?? 0,
        htbPoints:  p.points       ?? 0,
        userOwns:   p.user_owns    ?? 0,
        systemOwns: p.system_owns  ?? 0,
        level:      p.level        ?? 28,
        seasonRank,
        seasonTier,
        seasonPts,
        flags:      ownedFlags,
        totalFlags,
      };

      console.log('[HTB] final result:', JSON.stringify(result));
      setCache('hackthebox', result);
      return res.json(result);
    }

    return res.status(400).json({ error: 'Unknown platform. Use: leetcode | tryhackme | hackthebox' });

  } catch (e) {
    console.error(`[handler] ${platform} error:`, e.message, e.stack);
    return res.status(500).json({ error: e.message, platform });
  }
};
