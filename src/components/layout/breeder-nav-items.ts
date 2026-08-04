import {
  CalendarDays,
  Home,
  LayoutGrid,
  MessageCircle,
  PawPrint,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

export type BreederNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  title: string;
  match?: (pathname: string) => boolean;
};

export const BREEDER_SIDEBAR_ITEMS: BreederNavItem[] = [
  { label: "ダッシュボード", href: "/breeder", icon: Home, title: "ブリーダーダッシュボード" },
  { label: "犬猫管理", href: "/breeder/pets", icon: PawPrint, title: "犬猫管理" },
  { label: "見学管理", href: "/breeder/visits", icon: CalendarDays, title: "見学管理" },
  { label: "問い合わせ", href: "/breeder/inquiries", icon: MessageCircle, title: "問い合わせ" },
  { label: "プロフィール", href: "/breeder/profile", icon: User, title: "プロフィール" },
  { label: "設定", href: "/breeder/settings", icon: Settings, title: "設定" },
];

export const BREEDER_MOBILE_ITEMS: BreederNavItem[] = [
  { label: "ホーム", href: "/breeder", icon: Home, title: "ブリーダーダッシュボード" },
  { label: "犬猫", href: "/breeder/pets", icon: PawPrint, title: "犬猫管理" },
  { label: "見学", href: "/breeder/visits", icon: CalendarDays, title: "見学管理" },
  {
    label: "問い合わせ",
    href: "/breeder/inquiries",
    icon: MessageCircle,
    title: "問い合わせ",
  },
  {
    label: "メニュー",
    href: "/breeder/profile",
    icon: LayoutGrid,
    title: "メニュー",
    match: (pathname) =>
      pathname.startsWith("/breeder/profile") || pathname.startsWith("/breeder/settings"),
  },
];

export function isNavItemActive(pathname: string, item: BreederNavItem): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/breeder") return pathname === "/breeder";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getBreederPageTitle(pathname: string): string {
  const matched = BREEDER_SIDEBAR_ITEMS.find((item) => isNavItemActive(pathname, item));
  if (matched) return matched.title;

  if (pathname.startsWith("/breeder/pets/new")) return "犬猫新規登録";
  if (pathname.includes("/edit")) return "犬猫編集";

  return "ブリーダー管理";
}
