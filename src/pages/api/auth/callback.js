// OAuth2 callback handler — принимает authorization code от Google
const { google } = require('googleapis');

module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="color:#ef4444;">❌ Authorization Failed</h1>
          <p style="color:#94a3b8;">${error}</p>
        </div>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="color:#eab308;">⚠️ No authorization code received</h1>
          <p style="color:#94a3b8;">Please open the auth link again and grant access.</p>
        </div>
      </body></html>
    `);
  }

  const clientId = process.env.VERCEL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.VERCEL_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send(`
      <html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="color:#ef4444;">❌ Server misconfigured</h1>
          <p style="color:#94a3b8;">OAuth credentials not set in environment variables.</p>
        </div>
      </body></html>
    `);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 
      'https://epicvin-dash.vercel.app/api/auth/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Сохраняем токены в ответе — пользователь скопирует их в Vercel
    const tokenJson = JSON.stringify(tokens, null, 2);

    res.status(200).send(`
      <html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;max-width:600px;width:100%;">
          <h1 style="color:#22c55e;">✅ Authorization Successful!</h1>
          <p style="color:#94a3b8;">OAuth token received. Copy the JSON below and send it to the setup bot:</p>
          <textarea id="token" style="width:100%;height:300px;background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;margin:16px 0;" readonly>${tokenJson}</textarea>
          <button onclick="copyToken()" style="background:#0ea5e9;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer;">📋 Copy to clipboard</button>
          <p style="color:#64748b;margin-top:12px;font-size:13px;">Then send it here: @OneManSEO or the Hermes bot</p>
        </div>
        <script>
          function copyToken() {
            const ta = document.getElementById('token');
            ta.select();
            document.execCommand('copy');
            this.textContent = '✅ Copied!';
          }
        </script>
      </body></html>
    `);
  } catch (err) {
    console.error('OAuth token exchange error:', err);
    res.status(500).send(`
      <html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="color:#ef4444;">❌ Token Exchange Failed</h1>
          <p style="color:#94a3b8;">${err.message}</p>
        </div>
      </body></html>
    `);
  }
};
