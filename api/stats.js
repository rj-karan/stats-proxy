export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { platform } = req.query;
  try {
    if (platform === 'leetcode') {
      const r = await fetch('https://leetcode-stats-api.herokuapp.com/zoro_rj');
      const data = await r.json();
      return res.json(data);
    }
    if (platform === 'tryhackme') {
      const r = await fetch('https://tryhackme.com/api/v2/public-profile?username=zororj');
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