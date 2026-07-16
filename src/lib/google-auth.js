/**
 * Google API auth helper — поддерживает два способа:
 * 1. Service Account (VERCEL_SECRET_GOOGLE_CREDENTIALS)
 * 2. OAuth2 refresh token (VERCEL_OAUTH_TOKEN)
 */
const { google } = require('googleapis');

function getAuth(scopes) {
  const oauthToken = process.env.VERCEL_OAUTH_TOKEN;
  const serviceAccount = process.env.VERCEL_SECRET_GOOGLE_CREDENTIALS;

  if (oauthToken) {
    // OAuth2 с refresh token
    const tokens = JSON.parse(oauthToken);
    const oauth2Client = new google.auth.OAuth2(
      process.env.VERCEL_OAUTH_CLIENT_ID,
      process.env.VERCEL_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);
    
    // Автоматический refresh токена при необходимости
    oauth2Client.on('tokens', (newTokens) => {
      console.log('OAuth tokens refreshed');
    });
    
    return oauth2Client;
  }

  if (serviceAccount) {
    // Service Account
    const credentials = JSON.parse(serviceAccount);
    return new google.auth.GoogleAuth({
      credentials,
      scopes,
    });
  }

  throw new Error('No auth configured. Set VERCEL_OAUTH_TOKEN or VERCEL_SECRET_GOOGLE_CREDENTIALS');
}

module.exports = { getAuth };
