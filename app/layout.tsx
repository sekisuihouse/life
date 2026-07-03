import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "鮎喰川ライフジャケット貸出",
  description: "神山町の鮎喰川コモン前でのライフジャケット貸出受付"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <Image src="/logos/logo.svg" alt="神山まるごと高専" width={252} height={58} priority />
          </Link>
          <nav className="nav" aria-label="主要ナビゲーション">
            <Link href="/">今日の判定</Link>
            <Link href="/borrow">今から借ります</Link>
            <Link href="/return">返却</Link>
            <Link href="/admin">教員用</Link>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <p>最終判断は現地の大人/管理者が行う。ライフジャケット必須。警報・雷・増水・濁り・流れが速い場合は入らない。</p>
        </footer>
      </body>
    </html>
  );
}
