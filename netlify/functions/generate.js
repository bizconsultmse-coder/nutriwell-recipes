const https = require("https");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not set" }) };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    const requestBody = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "Ти си лекар-нутриционист специалист по диабет. Отговаряш САМО с валиден JSON без markdown.",
      messages: [{ role: "user", content: prompt }],
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });
      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });

    return {
      statusCode: result.status,
      headers,
      body: result.body,
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
