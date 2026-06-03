export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { platform } = req.query;

  try {
    if (platform === 'leetcode') {
      const r = await fetch('https://alfa-leetcode-api.onrender.com/zoro_rj/solved');
      const data = await r.json();
      return res.json({
        totalSolved: data.solvedProblem || 172,
        easySolved: data.easySolved || 132,
        mediumSolved: data.mediumSolved || 34,
        hardSolved: data.hardSolved || 6,
        totalEasy: 850, totalMedium: 1800, totalHard: 800
      });
    }

    if (platform === 'tryhackme') {
      const r = await fetch('https://tryhackme.com/api/v2/public-profile?username=zororj', {
        headers: {
          'Cookie': `connect.sid=${process.env.THM_COOKIE}`,
          'User-Agent': 'Mozilla/5.0'
        }
      });
      const data = await r.json();
      const d = data.data || data;
      return res.json({
        rooms: d.completedRoomsNumber || 70,
        streak: d.streak || 77,
        badges: d.badgesNumber || 7,
        rank: (d.topPercentage || 5) + '%',
        points: d.totalPoints || 9232,
        level: '0x9][MAGE',
        leagueTier: d.leagueTier || 'gold',
        globalRank: d.rank || 112518
      });
    }

    if (platform === 'hackthebox') {
      const r = await fetch('https://labs.hackthebox.com/api/v4/user/profile/basic/3175444', {
        headers: {
          'Authorization': `Bearer ${process.env.HTB_TOKEN}`,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      const data = await r.json();
      const u = data.data || data;
      return res.json({
        level: u.level || 13,
        seasonRank: u.season_rank ? '#' + u.season_rank : '#3341',
        points: u.points || 45,
        flags: u.user_owns ? u.user_owns + '/24' : '2/24',
        tier: u.rank_tier || 'Bronze'
      });
    }

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}