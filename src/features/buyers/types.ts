import type { BuyerPreferredSpecies } from "./constants";

export type BuyerProfileInput = {
  fullName: string;
  displayName: string;
  phone: string;
  prefecture: string;
  city: string;
  profileText: string;
  preferredSpecies: string;
  preferredBreed: string;
  notificationEnabled: boolean;
};

export type BuyerProfileFieldKey = keyof BuyerProfileInput;

export type BuyerProfileFieldErrors = Partial<Record<BuyerProfileFieldKey, string>>;

export type NormalizedBuyerProfileInput = {
  fullName: string;
  displayName: string;
  phone: string;
  prefecture: string;
  city: string;
  profileText: string | null;
  preferredSpecies: BuyerPreferredSpecies | null;
  preferredBreed: string | null;
  notificationEnabled: boolean;
};

export type BuyerProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  prefecture: string | null;
  city: string | null;
  profile_text: string | null;
  preferred_species: BuyerPreferredSpecies | null;
  preferred_breed: string | null;
  notification_enabled: boolean;
  profile_completed: boolean;
};

export type UpdateBuyerProfileData = {
  display_name: string;
  full_name: string;
  phone: string;
  prefecture: string;
  city: string;
  profile_text: string | null;
  preferred_species: BuyerPreferredSpecies | null;
  preferred_breed: string | null;
  notification_enabled: boolean;
  profile_completed: boolean;
};

export type SaveBuyerProfileResult =
  | { success: true; profileCompleted: boolean }
  | { success: false; fieldErrors?: BuyerProfileFieldErrors; error?: string };

export type BuyerProfilePageData = {
  email: string;
  profileCompleted: boolean;
  initialInput: BuyerProfileInput;
};

export type BuyerDashboardPageData = {
  displayName: string;
};

export const INITIAL_BUYER_PROFILE_INPUT: BuyerProfileInput = {
  fullName: "",
  displayName: "",
  phone: "",
  prefecture: "",
  city: "",
  profileText: "",
  preferredSpecies: "",
  preferredBreed: "",
  notificationEnabled: true,
};

export const BUYER_PREFERRED_SPECIES_OPTIONS = [
  { value: "", label: "選択しない" },
  { value: "dog", label: "犬" },
  { value: "cat", label: "猫" },
  { value: "both", label: "犬・猫どちらも" },
] as const;
