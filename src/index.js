// 公開ページの Worker。静的ファイル（public/）にないパスだけがここに来る。
// - /.well-known/apple-app-site-association: ユニバーサルリンクで /i/* をアプリに渡す（plan design §20）
// - /i/<token>: 招待リンクを、アプリが入っていない人（LINE 内ブラウザ等）が開いたときのページ

const APP_ID = "AWVL7YWJ6V.com.seiya.sakutabi";
// アプリ内のリンク（sakutabi://）。ユニバーサルリンクが効かないブラウザから開くためのボタンに使う
const APP_SCHEME = "sakutabi";
// App Store に登録したら URL を入れる。null の間は「App Store での公開は近日予定です。」と表示する
const APP_STORE_URL = null;
// 招待トークンは英数字22文字（API の invites.token と同じ形）
const TOKEN_PATTERN = /^[A-Za-z0-9]{22}$/;
// 招待リンクの有効期限。正本は sakutabi/packages/shared/constants.ts の INVITE_TTL_DAYS（別リポジトリなので手で揃える）
const INVITE_TTL_DAYS = 7;

const AASA = {
  applinks: {
    details: [{ appIDs: [APP_ID], components: [{ "/": "/i/*", comment: "招待リンク" }] }],
  },
};

export function appSiteAssociation() {
  return new Response(JSON.stringify(AASA), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}

export function invitePage(token) {
  const appLink = `${APP_SCHEME}://i/${token}`;
  const storeButton =
    APP_STORE_URL === null
      ? `<p class="note">App Store での公開は近日予定です。</p>`
      : `<a class="button secondary" href="${APP_STORE_URL}">App Store でサク旅を入手</a>`;
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <title>サク旅の旅に招待されました</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif; max-width: 640px; margin: 0 auto; padding: 48px 16px; line-height: 1.7; color: #222; background: #fff; }
    @media (prefers-color-scheme: dark) { body { color: #eee; background: #111; } .button { background: #eee; color: #111; } .button.secondary { background: transparent; color: #eee; border-color: #555; } .note { color: #aaa; } }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    ol { padding-left: 1.4em; }
    .button { display: block; text-align: center; padding: 14px 16px; margin: 12px 0; border-radius: 999px; background: #111; color: #fff; text-decoration: none; font-weight: 600; }
    .button.secondary { background: transparent; color: #111; border: 1px solid #ccc; }
    .note { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>サク旅の旅に招待されました</h1>
  <p>この旅に参加すると、みんなで行きたい場所を集めて、しおりを作れます。</p>
  <a class="button" href="${appLink}">サク旅で開く</a>
  <p class="note">開かないときは、次の順にお試しください。</p>
  <ol>
    <li>サク旅をインストールする</li>
    <li>もう一度このリンクを開いて「サク旅で開く」を押す</li>
  </ol>
  ${storeButton}
  <p class="note">招待リンクの有効期限は、作ってから${INVITE_TTL_DAYS}日間です。</p>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // 招待トークンを外部サイトへの Referer で漏らさない
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/apple-app-site-association") {
      return appSiteAssociation();
    }
    const invite = url.pathname.match(/^\/i\/([^/]+)\/?$/);
    if (invite !== null && TOKEN_PATTERN.test(invite[1])) {
      return invitePage(invite[1]);
    }
    return env.ASSETS.fetch(request);
  },
};
