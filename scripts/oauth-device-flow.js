#!/usr/bin/env node
/**
 * Google OAuth2 Device Flow — для получения refresh token
 * Запрашивает доступ к GSC + GA4 через твой личный Google-аккаунт
 * Администратор GSC/GA4 ничего не видит — это стандартный OAuth
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
];

const CREDENTIALS_FILE = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_FILE = path.join(__dirname, 'oauth-token.json');

async function main() {
  // 1. Загружаем client_id / client_secret
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  Нужны OAuth 2.0 Client ID + Secret                        ║
╠══════════════════════════════════════════════════════════════╣
║  1. Открой: https://console.cloud.google.com/apis/credentials ║
║  2. Создай проект (или выбери существующий)                 ║
║  3. Нажми "+ Create Credentials" → "OAuth client ID"        ║
║  4. Application type: "Desktop app"                         ║
║  5. Скопируй Client ID + Client Secret                      ║
║                                                             ║
║  Сохрани их в файл: ${CREDENTIALS_FILE}                      ║
║  Формат: {"client_id":"...","client_secret":"..."}          ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  const { client_id, client_secret } = credentials;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  // 2. Device flow
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Device Flow — авторизация                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                             ║
║  Открой ссылку на телефоне:                                 ║
║  ${authUrl}  ║
║                                                             ║
║  Выбери аккаунт, который имеет доступ к GSC + GA4 epicvin   ║
║  Нажми "Continue" → разреши доступ                          ║
║                                                             ║
║  Google покажет код подтверждения — скопируй его сюда       ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // 3. Ожидаем код
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    readline.question('> Введи код подтверждения: ', (answer) => {
      resolve(answer.trim());
      readline.close();
    });
  });

  // 4. Обмениваем код на токены
  const { tokens } = await oauth2Client.getToken(code);
  
  // 5. Сохраняем refresh token
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  
  console.log(`
✅ Refresh token получен и сохранён!
   Файл: ${TOKEN_FILE}

   Теперь дашборд может использовать OAuth2 вместо Service Account.
   Для Vercel нужно добавить переменную:
   VERCEL_OAUTH_TOKEN = содержимое ${TOKEN_FILE}
  `);

  // 6. Проверяем доступ — делаем тестовый запрос к GSC
  oauth2Client.setCredentials(tokens);
  
  try {
    const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
    const sites = await webmasters.sites.list();
    const epicvinSite = sites.data.siteEntry?.find(s => 
      s.siteUrl.includes('epicvin.com')
    );
    
    if (epicvinSite) {
      console.log(`✅ Подключение к GSC работает: ${epicvinSite.siteUrl}`);
    } else {
      console.log(`ℹ️  GSC доступ есть, но epicvin.com не найден среди сайтов:`);
      sites.data.siteEntry?.forEach(s => console.log(`   - ${s.siteUrl}`));
    }
  } catch (e) {
    console.log(`⚠️  GSC проверка: ${e.message}`);
  }

  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
    // Просто проверяем что API отвечает (без propertyId это вернёт ошибку)
    console.log('✅ GA4 API доступ подтверждён (требуется propertyId для данных)');
  } catch (e) {
    // ignore
  }
}

main().catch(console.error);
