# デザインシステム

WithTama の UI は **Tailwind CSS** + **shadcn/ui** を基盤とします（Decision No.28）。

## 技術構成

| 項目 | 採用技術 |
|------|---------|
| スタイリング | Tailwind CSS |
| コンポーネント | shadcn/ui（new-york スタイル） |
| アイコン | lucide-react |
| 設定 | `components.json`, `src/app/globals.css` |

## ブランドカラー（CSS 変数）

```css
--background: #fffdf8;
--foreground: #312c29;
--primary: #a7654f;
--primary-foreground: #ffffff;
--secondary: #f3e8dc;
--muted: #f7f2ec;
--border: #e7ddd4;
--radius: 0.875rem;
```

## コンポーネント一覧

### Button

- **パス:** `src/components/ui/button.tsx`
- **用途:** 主要アクション、フィルター、カード内操作
- **バリアント:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- **サイズ:** `default`, `sm`, `lg`, `icon`

### Input

- **パス:** `src/components/ui/input.tsx`
- **用途:** テキスト入力、検索ボックス
- **特徴:** フォーカスリング、プレースホルダー対応

### Textarea

- **パス:** `src/components/ui/textarea.tsx`
- **用途:** 複数行テキスト（紹介文、AI生成文の編集 等）

### Select

- **パス:** `src/components/ui/select.tsx`
- **用途:** ドロップダウン選択（犬種/猫種、性別、掲載状態 等）
- **基盤:** Radix UI Select

### Badge

- **パス:** `src/components/ui/badge.tsx`
- **用途:** ステータス表示、統計情報（写真枚数、ご縁件数）
- **バリアント:** `default`, `secondary`, `destructive`, `outline`

### Card

- **パス:** `src/components/ui/card.tsx`
- **用途:** コンテンツのグルーピング（犬猫カード、ダッシュボードサマリー 等）
- **構成:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

## Tailwind

- **設定:** Tailwind CSS v4（`@import "tailwindcss"` in `globals.css`）
- **方針:** ユーティリティクラス優先、ブランドカラーは CSS 変数経由
- **レスポンシブ:** スマホ優先（`sm:`, `lg:` ブレークポイント）

## shadcn/ui

- **追加コマンド:** `npx shadcn@latest add {component}`
- **エイリアス:** `@/components/ui`, `@/lib/utils`
- **ユーティリティ:** `cn()` 関数（`src/lib/utils.ts`）でクラス結合

## 命名規則（Decision No.29）

| 種別 | 配置 | 例 |
|------|------|-----|
| 汎用 UI | `src/components/ui/` | `Button`, `Card` |
| ドメイン固有 | `src/components/{domain}/` | `PetManagementList` |
| ページ専用 | `src/app/{route}/` | colocation 可 |

## ブリーダー共通レイアウト

BR-06〜BR-09 で共通利用する DashboardLayout。

| コンポーネント | パス | 用途 |
|---------------|------|------|
| BreederSidebar | `src/components/layout/breeder-sidebar.tsx` | PC 左固定サイドバー（240px） |
| BreederHeader | `src/components/layout/breeder-header.tsx` | 画面上部共通ヘッダー |
| BreederMobileNav | `src/components/layout/breeder-mobile-nav.tsx` | スマホ下部固定ナビ |
| BreederLayout | `src/app/breeder/layout.tsx` | `/breeder/*` 共通レイアウト |
| ナビ設定 | `src/components/layout/breeder-nav-items.ts` | メニュー項目・アクティブ判定 |

### レスポンシブ方針

| デバイス | サイドバー | ヘッダー | 下部ナビ |
|---------|-----------|---------|---------|
| PC（md以上） | 表示 | 表示 | 非表示 |
| スマホ | 非表示 | 表示 | 表示 |

### アクティブ表示

- 現在の URL（`usePathname`）でアクティブメニューを切り替え
- サイドバー: 背景 `--secondary` + 文字 `--primary`
- 下部ナビ: 文字 `--primary` + アイコン太線

## 関連ドキュメント

- [画面設計](../04_画面設計/README.md)
- [Decision Log](../01_設計変更管理/DecisionLog.md)
