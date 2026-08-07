import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProfileFormField } from "@/features/breeder-profile/components/profile-form-field";
import { cn } from "@/lib/utils";

import {
  PET_PRICE_COMMENT_MAX_LENGTH,
  PET_SPECIES_OPTIONS,
  PET_SEX_OPTIONS,
  PET_TEMPERAMENT_MAX_LENGTH,
} from "../constants";
import type { CreatePetDraftFieldErrors, CreatePetDraftInput } from "../types";

const inputClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const selectTriggerClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const textareaClassName = "min-h-[100px] rounded-xl border-[var(--border)] bg-white resize-y";

export type PetDraftFormFieldsProps = {
  form: CreatePetDraftInput;
  fieldErrors: CreatePetDraftFieldErrors;
  isSubmitting: boolean;
  onFieldChange: <K extends keyof CreatePetDraftInput>(
    key: K,
    value: CreatePetDraftInput[K],
  ) => void;
};

export function PetDraftFormFields({
  form,
  fieldErrors,
  isSubmitting,
  onFieldChange,
}: PetDraftFormFieldsProps) {
  return (
    <>
      <ProfileFormField
        id="management_name"
        label="管理名"
        required
        description="ブリーダー内部で管理する名称。購入希望者には表示しません。"
        error={fieldErrors.managementName}
      >
        <Input
          id="management_name"
          name="management_name"
          value={form.managementName}
          onChange={(event) => onFieldChange("managementName", event.target.value)}
          placeholder="例）2026-001 タマ"
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.managementName)}
          className={cn(inputClassName, fieldErrors.managementName && "border-red-400")}
        />
      </ProfileFormField>

      <ProfileFormField
        id="public_display_name"
        label="公開表示名"
        required
        error={fieldErrors.publicDisplayName}
      >
        <Input
          id="public_display_name"
          name="public_display_name"
          value={form.publicDisplayName}
          onChange={(event) => onFieldChange("publicDisplayName", event.target.value)}
          placeholder="例）タマちゃん"
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.publicDisplayName)}
          className={cn(inputClassName, fieldErrors.publicDisplayName && "border-red-400")}
        />
      </ProfileFormField>

      <ProfileFormField id="species" label="犬猫種別" required error={fieldErrors.species}>
        <Select
          value={form.species || undefined}
          onValueChange={(value) =>
            onFieldChange("species", value as CreatePetDraftInput["species"])
          }
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="species"
            aria-invalid={Boolean(fieldErrors.species)}
            className={cn(selectTriggerClassName, fieldErrors.species && "border-red-400")}
          >
            <SelectValue placeholder="犬猫種別を選択" />
          </SelectTrigger>
          <SelectContent>
            {PET_SPECIES_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ProfileFormField>

      <ProfileFormField id="breed" label="犬種・猫種" required error={fieldErrors.breed}>
        <Input
          id="breed"
          name="breed"
          value={form.breed}
          onChange={(event) => onFieldChange("breed", event.target.value)}
          placeholder="例）ラグドール"
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.breed)}
          className={cn(inputClassName, fieldErrors.breed && "border-red-400")}
        />
      </ProfileFormField>

      <ProfileFormField id="sex" label="性別" required error={fieldErrors.sex}>
        <Select
          value={form.sex || undefined}
          onValueChange={(value) => onFieldChange("sex", value as CreatePetDraftInput["sex"])}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="sex"
            aria-invalid={Boolean(fieldErrors.sex)}
            className={cn(selectTriggerClassName, fieldErrors.sex && "border-red-400")}
          >
            <SelectValue placeholder="性別を選択" />
          </SelectTrigger>
          <SelectContent>
            {PET_SEX_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ProfileFormField>

      <ProfileFormField id="birthday" label="誕生日" optional error={fieldErrors.birthday}>
        <Input
          id="birthday"
          name="birthday"
          type="date"
          value={form.birthday}
          onChange={(event) => onFieldChange("birthday", event.target.value)}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.birthday)}
          className={cn(inputClassName, fieldErrors.birthday && "border-red-400")}
        />
      </ProfileFormField>

      <ProfileFormField id="color" label="毛色" optional error={fieldErrors.color}>
        <Input
          id="color"
          name="color"
          value={form.color}
          onChange={(event) => onFieldChange("color", event.target.value)}
          placeholder="例）ブルーポイントバイカラー"
          disabled={isSubmitting}
          className={inputClassName}
        />
      </ProfileFormField>

      <ProfileFormField id="temperament" label="性格" optional error={fieldErrors.temperament}>
        <div className="space-y-1">
          <Textarea
            id="temperament"
            name="temperament"
            value={form.temperament}
            onChange={(event) => onFieldChange("temperament", event.target.value)}
            placeholder="例）おだやかで人懐っこい"
            disabled={isSubmitting}
            maxLength={PET_TEMPERAMENT_MAX_LENGTH}
            rows={4}
            aria-invalid={Boolean(fieldErrors.temperament)}
            className={cn(
              textareaClassName,
              fieldErrors.temperament && "border-red-400 focus-visible:ring-red-400",
            )}
          />
          <p className="text-right text-xs text-neutral-500">
            {form.temperament.length} / {PET_TEMPERAMENT_MAX_LENGTH}
          </p>
        </div>
      </ProfileFormField>

      <ProfileFormField
        id="price"
        label="価格"
        optional
        description="円（税込）。未入力でも登録できます。"
        error={fieldErrors.price}
      >
        <Input
          id="price"
          name="price"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={form.price}
          onChange={(event) => onFieldChange("price", event.target.value)}
          placeholder="例）250000"
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.price)}
          className={cn(inputClassName, fieldErrors.price && "border-red-400")}
        />
      </ProfileFormField>

      <ProfileFormField id="price_comment" label="価格補足" optional error={fieldErrors.priceComment}>
        <div className="space-y-1">
          <Textarea
            id="price_comment"
            name="price_comment"
            value={form.priceComment}
            onChange={(event) => onFieldChange("priceComment", event.target.value)}
            placeholder="例）ワクチン接種費用込み"
            disabled={isSubmitting}
            maxLength={PET_PRICE_COMMENT_MAX_LENGTH}
            rows={3}
            aria-invalid={Boolean(fieldErrors.priceComment)}
            className={cn(
              textareaClassName,
              fieldErrors.priceComment && "border-red-400 focus-visible:ring-red-400",
            )}
          />
          <p className="text-right text-xs text-neutral-500">
            {form.priceComment.length} / {PET_PRICE_COMMENT_MAX_LENGTH}
          </p>
        </div>
      </ProfileFormField>
    </>
  );
}
