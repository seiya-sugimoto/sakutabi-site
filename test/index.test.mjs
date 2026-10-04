// 実行: node --test（リポジトリ直下で。test/ の *.test.mjs を自動で探す）
import assert from "node:assert/strict";
import { test } from "node:test";

import worker from "../src/index.js";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv"; // 英数字22文字
const ASSET_RESPONSE = "static-asset";
const env = { ASSETS: { fetch: async () => new Response(ASSET_RESPONSE, { status: 404 }) } };

function get(path) {
  return worker.fetch(new Request(`https://sakutabi-site.sugimon.workers.dev${path}`), env);
}

test("AASA は JSON で /i/* をサク旅に割り当てる", async () => {
  const response = await get("/.well-known/apple-app-site-association");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  const body = await response.json();
  assert.deepEqual(body.applinks.details[0].appIDs, ["AWVL7YWJ6V.com.seiya.sakutabi"]);
  assert.equal(body.applinks.details[0].components[0]["/"], "/i/*");
});

test("正しい形のトークンなら招待ページを返す", async () => {
  const response = await get(`/i/${TOKEN}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const html = await response.text();
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes("7日間"));
  assert.ok(html.includes(`href="sakutabi://i/${TOKEN}"`));
  assert.ok(html.includes("近日予定"));
});

test("末尾のスラッシュ付きでも招待ページを返す", async () => {
  const response = await get(`/i/${TOKEN}/`);
  assert.equal(response.status, 200);
});

test("形の違うトークンは静的ファイル側（404）に回す", async () => {
  for (const path of ["/i/short", `/i/${TOKEN}x`, "/i/%3Cscript%3EAAAAAAAAAAAAAA", "/i/", `/i/${TOKEN}/extra`]) {
    const response = await get(path);
    assert.equal(await response.text(), ASSET_RESPONSE, path);
  }
});

test("それ以外のパスは静的ファイルに回す", async () => {
  const response = await get("/index.html");
  assert.equal(await response.text(), ASSET_RESPONSE);
});
