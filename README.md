# 鮎喰川ライフジャケット貸出アプリ

神山町の鮎喰川コモン前で、今日泳いでよいかを保守的に判定し、OKの場合のみライフジャケット貸出を受け付けるNext.jsアプリです。

## 構成

- Next.js App Router / TypeScript
- Supabase Auth / DB / Storage
- Google OAuth
- Vercelデプロイ前提
- デザインは `../MARUGOTODESIGN` のトークン、ロゴ、黒線、余白、円弧表現に寄せています。

## セットアップ

1. Supabaseでプロジェクトを作成
2. `supabase/migrations/0001_initial.sql` をSQL Editorで実行
3. Supabase AuthでGoogle Providerを有効化
4. `.env.example` を元にVercel Environment Variablesを設定
5. Vercelで `sekisuihouse/life` をインポートしてデプロイ

## 重要な環境変数

- `ALLOWED_EMAIL_REGEX`: 通常利用者のメール制限
- `ALLOWED_GOOGLE_HD`: Google `hd` claim
- `ADMIN_EMAIL_REGEX`: 教員用メール制限。初期値は `@kamiyama-marugoto.com`
- `ADMIN_EMAILS`: 個別管理者メール。カンマ区切り
- `SUPABASE_SERVICE_ROLE_KEY`: Route Handler / Server ActionのDB操作用

## 注意

このアプリは安全を保証しません。最終判断は現地の大人/管理者が行い、ライフジャケット必須です。警報・雷・増水・濁り・流れが速い場合は入らないでください。
