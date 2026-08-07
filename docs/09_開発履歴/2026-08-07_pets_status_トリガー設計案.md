# pets status 遷移トリガー設計（確定）

| 項目 | 内容 |
|------|------|
| 確定日 | 2026-08-07 |
| 方式 | `BEFORE UPDATE OF status` トリガー |
| 目的 | DB 側で不正な `pets.status` 遷移を防止 |
| Migration | `20260807130000_enforce_pets_status_transition.sql`（作成済み・未適用） |

## 関連ドキュメント

- [pets status セキュリティレビュー](./2026-08-07_pets_status_セキュリティレビュー.md)
- [Decision No.94](../01_設計変更管理/DecisionLog.md#decision-no94) — 専用業務操作
- [Decision No.96](../01_設計変更管理/DecisionLog.md#decision-no96) — 差戻し `under_review → draft`
- [Decision No.103](../01_設計変更管理/DecisionLog.md#decision-no103) — pets RLS 本番化
- [Decision No.105](../01_設計変更管理/DecisionLog.md#decision-no105) — pet_review_logs

---

## 設計概要

`public.pets` の **`status` 列が変わる UPDATE** の直前に、許可遷移だけを通す `BEFORE UPDATE OF status` トリガーを置く。

| レイヤー | 役割 |
|---------|------|
| **RLS** | 操作可能な行（誰の行を SELECT / INSERT / UPDATE できるか） |
| **トリガー** | status 遷移（`status` がどう変わってよいか） |

RLS とトリガーは別レイヤーとして併用する。RLS を変更・迂回しない。

---

## 第1期で許可する status 変更

**今回許可するのは 1 件のみ。**

| 主体 | 変更前 | 変更後 | 条件 |
|------|--------|--------|------|
| breeder（本人） | `draft` | `under_review` | 対象 `pets.breeder_id` がログインユーザーの `public.breeders.id` であること |

**それ以外の status 変更はすべて拒否**（明示 allowlist 方式）。

### status が変わらない UPDATE

| 条件 | 結果 |
|------|------|
| `OLD.status = NEW.status` | ✅ 許可 |

---

## admin の status 変更 — 今回は実装しない

管理者審査機能（AD-10 / AD-11）が未実装のため、admin による status 変更は **今回トリガーに含めない**。

将来、管理者審査実装時に以下を **一体で** 設計・実装する:

- `under_review → published`（承認）
- `under_review → draft`（差戻し）
- `published_at` 設定
- `pet_review_logs` への `approved` / `returned` 記録
- admin UPDATE 用 RLS ポリシー（または RPC）
- トリガーへの admin 許可遷移追加

`public.is_admin()` による status 変更許可は **将来対応**。

---

## 今回許可しない遷移（将来対応）

- admin: `under_review → published`、`under_review → draft`
- `published → paused` / `family_decided` / `closed`
- `paused → published`
- `draft → published` 等の迂回
- 管理者による訂正運用（pets.md「将来検討」）

---

## 関数・トリガー

### 関数名

```text
public.enforce_pets_status_transition()
```

- 戻り値: `TRIGGER`
- 言語: `plpgsql`
- **SECURITY INVOKER**（DEFINER にしない）
- **`SET search_path = public`**

### Trigger 名

```text
pets_enforce_status_transition
```

```sql
BEFORE UPDATE OF status ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pets_status_transition();
```

`OF status` により、**status 列を UPDATE 対象に含まない通常編集では発火しない**。

---

## 認証

status が変更される場合:

| 条件 | 扱い |
|------|------|
| `auth.uid() IS NULL` | **RAISE EXCEPTION** で拒否 |
| `auth.uid()` あり | 許可遷移表 + 所有者チェックを評価 |

Service Role Key 前提にしない。`auth.uid() IS NULL` の status 変更は拒否する。

---

## 所有者判定（breeder）

`draft → under_review` を許可する場合、RLS だけに依存せずトリガー内でも本人所有を確認する。

```sql
EXISTS (
  SELECT 1
  FROM public.breeders b
  WHERE b.id = OLD.breeder_id
    AND b.user_id = auth.uid()
)
```

---

## エラー

許可以外の status 変更は `RAISE EXCEPTION` で拒否する。

- メッセージに `OLD.status` と `NEW.status` を含める
- 機密情報（ユーザー ID、内部パス等）は含めない

---

## 通常の犬猫情報編集への影響

**影響なし。**

| 処理 | UPDATE 内容 | トリガー |
|------|------------|---------|
| `updatePetDraft()` | `management_name` 等のみ、`status` なし | **発火しない** |
| `submitPetForReview()` | `status: under_review` | **発火する** → `draft → under_review` + 所有者チェック |

---

## 既存公開申請が壊れない根拠

| チェック | 内容 |
|---------|------|
| 遷移 | `submitPetForReview()` は `draft → under_review` のみ |
| 主体 | 認証済みブリーダー JWT |
| 所有者 | Repository も `breeder_id` で絞り込み。トリガーも `breeders.user_id = auth.uid()` を確認 |
| RLS（適用後） | `pets_update_breeder_own` で本人 UPDATE 可 |
| `OF status` | 通常編集 `updatePetDraft()` は非発火 |

---

## Migration

| ファイル | 内容 |
|---------|------|
| `20260807130000_enforce_pets_status_transition.sql` | 関数 + トリガー |

適用順序: `20260807120000_harden_pets_rls.sql` → 本 Migration

**Supabase への適用は未実施。**

---

## 将来の拡張（Phase 2 以降）

### 公開申請 RPC 化

- `submit_pet_for_review(p_pet_id)` RPC
- 同時に `pet_review_logs` INSERT（`action = submitted`）
- Repository を RPC 呼び出しに差し替え

### 管理者審査（AD-10 / AD-11）

- `approve_pet_for_publish` / `return_pet_review` RPC または Server Action
- admin UPDATE RLS 追加
- トリガーに admin 許可遷移を追加
- `published_at` 設定、`pet_review_logs` 記録を一体実装

**移行原則:** トリガーは遷移不変条件、RPC / Server Action は業務ロジック + ログ追記。

---

## 未決定事項（将来）

| 項目 | 内容 |
|------|------|
| admin 兼 breeder アカウント | 審査実装時に admin / breeder 遷移の評価順を決定 |
| `published → paused` 等 | 公開後遷移は要件未確定 |
| `auth.uid() IS NULL` の運用例外 | Service Role / メンテナンス用バイパス要否 |
| 管理者訂正運用 | pets.md「将来検討」 |
