export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

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
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      if (!r.ok) {
        throw new Error(`LeetCode API returned ${r.status}`);
      }

      const data = await r.json();

      return res.json({
        totalSolved: data.solvedProblem ?? 0,
        easySolved: data.easySolved ?? 0,
        mediumSolved: data.mediumSolved ?? 0,
        hardSolved: data.hardSolved ?? 0,

        totalEasy: 850,
        totalMedium: 1800,
        totalHard: 800
      });
    }

    // =====================================================
    // TRYHACKME
    // =====================================================
    if (platform === 'tryhackme') {

      try {

        const r = await fetch(
          'https://tryhackme.com/api/v2/public-profile?username=zororj',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          }
        );

        if (!r.ok) {
          throw new Error(`THM ${r.status}`);
        }

        const json = await r.json();
        const d = json.data;

        return res.json({
          rooms: d.completedRoomsNumber,
          streak: d.streak,
          badges: d.badgesNumber,
          rank: `${d.topPercentage}%`,
          points: d.totalPoints,
          level: '0x9][MAGE',
          leagueTier: d.leagueTier,
          globalRank: d.rank
        });

      } catch (err) {

        return res.json({
          rooms: 73,
          streak: 83,
          badges: 7,
          rank: '5%',
          points: 9610,
          level: '0x9][MAGE',
          leagueTier: 'gold',
          globalRank: 107266
        });
      }
    }

    // =====================================================
    // HACK THE BOX
    // =====================================================
    if (platform === 'hackthebox') {

      const token = process.env.HTB_TOKEN;

      if (!token) {
        throw new Error('HTB_TOKEN env var not set');
      }

      const r = await fetch(
        'https://labs.hackthebox.com/api/v4/user/profile/basic/3175444',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      if (r.status === 401) {
        return res.status(500).json({
          error: 'HTB token invalid or expired'
        });
      }

      if (!r.ok) {
        return res.status(500).json({
          error: `HTB API returned ${r.status}`
        });
      }

      const raw = await r.json();

      const p = raw.profile || raw;

      return res.json({
        level: p.level ?? 18,
        rank: p.rank ?? 'Apprentice',
        seasonRank: p.ranking
          ? `#${p.ranking}`
          : '#2013',
        points: p.points ?? 110,
        flags: `${p.user_owns ?? 4}/24`,
        tier: p.rank_text ?? 'Silver'
      });
    }

    return res.status(400).json({
      error: 'Unknown platform'
    });

  } catch (e) {

    return res.status(500).json({
      error: e.message,
      platform
    });
  }
}