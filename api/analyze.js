// api/analyze.js
// Vercel serverless function — proxies Groq API call (free tier)
// API key stays server-side, never exposed to browser

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sagnik26nik.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { logText } = req.body;
  if (!logText || typeof logText !== 'string') return res.status(400).json({ error: 'logText is required' });
  if (logText.length > 10000) return res.status(400).json({ error: 'Log too large. Max 10,000 characters.' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are a network security analyst performing intrusion detection on server logs.
Analyze the provided logs and respond in this EXACT format:

THREAT SUMMARY
--------------
[1-2 sentence overall assessment]

DETECTED THREATS
----------------
[List each threat with: IP | Type | Evidence | Severity]
If none found: "No threats detected."

RISK LEVEL: [NONE / LOW / MEDIUM / HIGH / CRITICAL]

RECOMMENDED ACTIONS
-------------------
[3-5 specific actionable steps based on what you found]

Be concise and technical. Reference actual IPs and log lines from the input.`
          },
          {
            role: 'user',
            content: `Analyze these server logs for security threats:\n\n${logText}`
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const result = data.choices?.[0]?.message?.content || 'No response from AI.';
    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}