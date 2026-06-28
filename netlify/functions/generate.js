// netlify/functions/generate.js

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY не е зададен." }) };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    // Use https module (built-in Node.js) instead of fetch
    const https = require("https");

    const body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "Ти си лекар-нутриционист специалист по диабет. Отговаряш САМО с валиден JSON без markdown.",
      messages: [{ role: "user", content: prompt }],
    });

    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-length": Buffer.byteLength(body),
        },
      }, (res) => {
        let raw = "";
        res.on("data", chunk => raw += chunk);
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch(e) {
            reject(new Error("Invalid JSON from Anthropic: " + raw));
          }
        });
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });

    if (data.status !== 200) {
      return { statusCode: data.status, body: JSON.stringify({ error: data.data?.error?.message || "API грешка" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.data),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e?.message || "Сървърна грешка" }) };
  }
};
