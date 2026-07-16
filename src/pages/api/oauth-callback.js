// OAuth2 callback handler — принимает authorization code от Google
const { google } = require('googleapis');

export default async function oauthCallback(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(errorPage(`❌ Authorization Failed: ${error}`));
  }

  if (!code) {
    return res.status(400).send(errorPage('⚠️ No authorization code received'));
  }

  const clientId = process.env.VERCEL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.VERCEL_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send(errorPage('❌ OAuth credentials not set in environment variables.'));
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId, clientSecret,
      'https://epicvin-dash.vercel.app/api/oauth-callback'
    );

    const { tokens } = await oauth2Client.getToken(code);
    const tokenJson = JSON.stringify(tokens, null, 2);

    res.status(200).send(successPage(tokenJson));
  } catch (err) {
    console.error('OAuth token exchange error:', err);
    res.status(500).send(errorPage(`❌ Token Exchange Failed: ${err.message}`));
  }
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
<div style="text-align:center;max-width:500px;">
  <h1 style="color:#ef4444;">${msg}</h1>
  <p style="color:#94a3b8;margin-top:16px;">Try the auth link again.</p>
</div>
</body></html>`;
}

function successPage(json) {
  return `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
<div style="text-align:center;max-width:600px;width:100%;">
  <h1 style="color:#22c55e;">✅ Authorization Successful!</h1>
  <p style="color:#94a3b8;">Copy the JSON below and paste it to the Hermes bot:</p>
  <textarea id="token" style="width:100%;height:200px;background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;margin:16px 0;white-space:pre;overflow:auto;" readonly>${json}</textarea>
  <button onclick="navigator.clipboard.writeText(document.getElementById('token').value);this.textContent='✅ Copied!'" style="background:#0ea5e9;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer;">📋 Copy</button>
  <p style="color:#64748b;margin-top:12px;font-size:13px;">Then send the copied text to the Telegram chat.</p>
</div>
</body></html>`;
}
