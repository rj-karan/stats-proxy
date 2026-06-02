export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
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
        totalEasy: 850,
        totalMedium: 1800,
        totalHard: 800
      });
    }

    if (platform === 'tryhackme') {
      const r = await fetch('https://tryhackme.com/api/v2/public-profile?username=zororj', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await r.json();
      return res.json(data);
    }

    if (platform === 'hackthebox') {
      const r = await fetch('https://labs.hackthebox.com/api/v4/user/profile/basic/3175444', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      const data = await r.json();
      return res.json(data);
    }

    return res.status(400).json({ error: 'unknown platform' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}