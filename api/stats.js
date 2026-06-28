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
          console.log(`[THM] ${url} → ${r.status}`);
          if (r.ok) { json = await r.json(); break; }
          if (r.status === 429) await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.error(`[THM] ${url} error:`, e.message);
        }
      }

      if (!json) {
        return res.status(429).json({ error: 'TryHackMe rate limiting. Try again in a few minutes.' });
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
    // Confirmed field mapping from browser network tab:
    //
    // Basic profile endpoint returns:
    //   rank: "Hacker"        → old HTB rank (NOT what shows on dashboard)
    //   ranking: 953          → global rank (NOT season rank #811)
    //   points: 74            → HTB points (NOT season points 350)
    //   user_owns: 11         → user flags
    //   system_owns: 11       → system flags
    //
    // Season data (Apprentice, #811, Ruby, 350pts, 12/26 flags)
    // comes from the season endpoint separately
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

      // --- Fetch basic profile ---
      const profileRes = await fetch(
        'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
        { headers }
      );
      console.log('[HTB] profile status:', profileRes.status);
      if (profileRes.status === 401) {
        return res.status(401).json({ error: 'HTB token expired. Regenerate at: https://app.hackthebox.com/profile/settings → App Tokens' });
      }
      if (!profileRes.ok) {
        return res.status(500).json({ error: `HTB profile API returned ${profileRes.status}` });
      }

      const profileData = await profileRes.json();
      const p = profileData.profile ?? profileData;
      console.log('[HTB] profile rank:', p.rank, '| ranking:', p.ranking, '| points:', p.points);

      // --- Fetch season data (has Apprentice rank, #811, Ruby tier, 350pts, 12/26 flags) ---
      // Try multiple possible season endpoints
      let seasonRank  = `#${p.ranking ?? 'N/A'}`;  // fallback to global rank
      let seasonTier  = p.rank ?? 'N/A';            // fallback to HTB rank
      let seasonPts   = p.points ?? 0;              // fallback to HTB points
      let htbRank     = p.rank ?? 'N/A';            // Hacker, Pro Hacker, etc.
      let htbLevel    = p.level ?? 0;
      let userFlags   = p.user_owns ?? 0;
      let systemFlags = p.system_owns ?? 0;

      const seasonEndpoints = [
        'https://labs.hackthebox.com/api/v4/season/list',
        'https://labs.hackthebox.com/api/v4/user/3175444/seasons',
        'https://labs.hackthebox.com/api/v4/rankings/user/3175444/seasons',
        'https://labs.hackthebox.com/api/v4/user/profile/season/activity/3175444',
      ];

      for (const url of seasonEndpoints) {
        try {
          const sr = await fetch(url, { headers });
          console.log(`[HTB] season ${url} → ${sr.status}`);
          if (sr.ok) {
            const sd = await sr.json();
            console.log('[HTB] season data:', JSON.stringify(sd).slice(0, 600));
            // Try to extract season rank, tier, points
            const s = sd.data ?? sd.profile ?? sd;
            if (s.rank)        seasonRank = `#${s.rank}`;
            if (s.tier)        seasonTier = s.tier;
            if (s.points)      seasonPts  = s.points;
            if (s.user_owns)   userFlags  = s.user_owns;
            break;
          }
        } catch (e) {
          console.warn(`[HTB] season endpoint error ${url}:`, e.message);
        }
      }

      const result = {
        // From screenshot: Level 28 | Apprentice | Ruby | #811 | 350pts | 12/26
        level:      p.level       ?? 0,          // 28
        htbRank:    p.rank        ?? 'N/A',       // "Hacker" (old system)
        globalRank: p.ranking     ?? 0,           // 953 (global)
        htbPoints:  p.points      ?? 0,           // 74
        userOwns:   p.user_owns   ?? 0,           // 11
        systemOwns: p.system_owns ?? 0,           // 11
        country:    p.country_name ?? 'N/A',
        name:       p.name        ?? 'N/A',
        avatar:     p.avatar      ?? null,

        // Season data (needs separate endpoint — logged above for debugging)
        seasonRank,   // #811 (from season endpoint, falls back to #953 global)
        seasonTier,   // Ruby (from season endpoint, falls back to "Hacker")
        seasonPts,    // 350 (from season endpoint, falls back to 74)

        // Flags: user_owns + system_owns from profile
        flags: `${p.user_owns ?? 0}/${(p.user_owns ?? 0) + (p.system_owns ?? 0)}`,
      };

      console.log('[HTB] final result:', JSON.stringify(result));
      setCache('hackthebox', result);
      return res.json(result);
    }

    return res.status(400).json({ error: 'Unknown platform' });

  } catch (e) {
    console.error(`[handler] ${platform} error:`, e.message);
    return res.status(500).json({ error: e.message, platform });
  }
}export default async function handler(req, res) {
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
