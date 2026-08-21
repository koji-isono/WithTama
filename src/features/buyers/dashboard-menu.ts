export type BuyerDashboardMenuItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  buttonLabel?: string;
  comingSoon?: boolean;
};

export const BUYER_DASHBOARD_MENU_ITEMS: BuyerDashboardMenuItem[] = [
  {
    id: "profile",
    title: "プロフィール",
    description: "登録情報や希望条件を確認・変更できます。",
    href: "/buyer/profile",
    buttonLabel: "プロフィールを確認",
  },
  {
    id: "pets",
    title: "犬猫を探す",
    description: "掲載されている犬猫から家族との出会いを探します。",
    href: "/pets",
    buttonLabel: "犬猫を探す",
  },
  {
    id: "favorites",
    title: "お気に入り",
    description: "気になる犬猫をあとから確認できます。",
    href: "/buyer/favorites",
    buttonLabel: "お気に入りを見る",
  },
  {
    id: "inquiries",
    title: "問い合わせ履歴",
    description: "ブリーダーへの問い合わせ内容を確認できます。",
    comingSoon: true,
  },
  {
    id: "visits",
    title: "見学予定",
    description: "見学希望や予定を確認できます。",
    comingSoon: true,
  },
];
