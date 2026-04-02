// API 代理：前端只调用此接口，Key 只存在于服务端，永不暴露
module.exports = async function handler(req, res) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { outline, prompt, versionCount = 2 } = req.body || {};

  if (!outline || !prompt) {
    return res.status(400).json({ error: '缺少 outline 或 prompt 参数' });
  }

  const count = Math.min(Math.max(parseInt(versionCount) || 2, 1), 5);

  // 服务端读取环境变量，Key 永不泄露给前端
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key，请联系管理员' });
  }

  try {
    const results = [];

    for (let i = 0; i < count; i++) {
      const versionPrompt = prompt + `\n\n【重要】这是第 ${i + 1} 个版本，请用不同的角度和表达方式撰写。同样的内容，不同的开头、结构和表达。`;
      const fullPrompt = `【任务】请根据以下大纲撰写小红书脚本（900-1000字）：\n\n${outline}\n\n【要求】\n${versionPrompt}\n\n请直接输出脚本内容，不需要任何前缀说明。`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: fullPrompt }],
          temperature: 0.8,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();
      const text =
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

      results.push(text.trim() || '（生成内容为空）');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).json({ results });
  } catch (err) {
    console.error('DeepSeek API 错误:', err);
    res.status(500).json({ error: 'AI 生成失败，请稍后重试' });
  }
};
