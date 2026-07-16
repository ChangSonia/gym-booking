# 移轉給健身房

**原則：健身房擁有資產，開發者只是把程式接上去。**

健身房擁有 LINE 官方帳號、擁有資料庫、擁有會員資料。開發者交出程式碼就能走人。

這樣老闆接受度最高——他不會擔心被綁架。

---

## 為什麼移轉是簡單的

**所有金鑰都走環境變數，沒有寫進程式碼。**

```
.env.local          ← 不進 GitHub
  LINE_CHANNEL_ID=...
  SUPABASE_URL=...
```

移轉 = 換一組值。**程式碼一個字都不用改。**

---

## 要移轉的四樣東西

| 資產 | 怎麼交接 |
|---|---|
| 程式碼 | GitHub repo 轉移擁有權 |
| LINE Channel | 見下方兩條路 |
| 資料庫 | Supabase 專案轉移擁有權 |
| 部署 | Vercel 專案轉移 |

---

## LINE Channel 的兩條路

### A. 健身房自己建（推薦）

1. 健身房用他們的 LINE 帳號建 Provider
2. 建 LINE Login channel（LIFF 用）
3. 建 Messaging API channel（推播用，要跟 Login channel 放**同一個 Provider**）
4. 把金鑰給你，填進 `.env.local`
5. 完成

**優點**：資產從一開始就是他們的。

⚠️ **Provider 建好後不能移動 channel**。而且**不同 Provider 的 user ID 不一樣**——如果換 Provider，所有會員的 `line_user_id` 會全部失效，等於資料庫要重來。

**所以這個決定要在一開始就做對。**

### B. 轉移現有的 Provider

LINE Developers Console 可以把 Provider 的管理權轉給別人。

**優點**：會員的 `line_user_id` 不變，資料庫不用動。
**缺點**：要走 LINE 的轉移流程。

---

## Supabase 移轉

Settings → General → **Transfer project**

可以轉給另一個 Organization。健身房要先有 Supabase 帳號。

**或者**：他們自己建一個專案，你把 `schema.sql` 跑一次，再把資料匯出匯入。

---

## Vercel 移轉

Project Settings → **Transfer project**

轉給健身房的 Vercel 帳號／團隊。

---

## 移轉檢查清單

```
□ GitHub repo 轉移，或給他們一份完整拷貝
□ LINE Provider + 兩個 Channel（Login / Messaging API）
□ Supabase 專案轉移，或重建 + 匯資料
□ Vercel 專案轉移
□ .env.local 的值交給他們（用安全的方式，不要用 LINE 傳）
□ 把 CLAUDE.md、DECISIONS.md、START-HERE.md 一起給
□ 教他們怎麼在 Supabase 改 settings 表
□ 至少陪跑一次「加開課程」「停課」的完整流程
```

---

## 交接後他們要會的三件事

### 1. 改課表

**不用找工程師。** 教練後台的「每週固定」頁就能改。

### 2. 改設定

Supabase → Table Editor → `settings` 表：

| key | 意思 |
|---|---|
| `open_days_before` | 提前幾天開放報名 |
| `open_time` | 幾點開放 |
| `max_qty` | 每筆最多幾人 |
| `weeks_visible` | 會員端顯示幾週 |
| `archive_after_days` | 課程結束幾天後歸檔 |

點兩下改值，存檔，立刻生效。**不用重新部署。**

### 3. 設定誰是教練

**教練要先自己用 LINE 打開系統一次**（這時他還是普通會員），系統才會有他的紀錄。

然後管理員在後台把他標記成教練。

⚠️ **你拿不到別人的 LINE ID**。那是一串像 `U4af4980629...` 的亂碼，只有那個人自己登入過，你才會知道。

---

## 成本（給老闆看的）

| 項目 | 免費層 | 超過的話 |
|---|---|---|
| Supabase | 500MB 資料庫 | 一年的報名紀錄大概幾 MB，用不完 |
| Vercel | 個人專案免費 | 商業用途要 Pro，約 $20/月 |
| LINE 推播 | 200 則/月 | 約 NT$800/月 5,000 則 |
| LINE Login | 無限 | — |

**推播是主要成本。** 估算：候補遞補通知 + 加開課通知 + 停課通知，一個月大概幾十到幾百則。

如果超過，可以改成「每日彙整推播」（一天一則，把當天的變動整合起來）。

---

## 如果健身房要換人維護

這包文件就是為了這件事寫的：

- `CLAUDE.md` — 專案規則，新的 AI 或工程師讀完就懂
- `docs/DECISIONS.md` — **為什麼**這樣設計。想改之前先看理由還成不成立
- `START-HERE.md` — 怎麼跑起來
- `supabase/schema.sql` — 資料庫設計，有註解

**最重要的是 DECISIONS.md。** 程式碼會告訴你「怎麼做」，只有它會告訴你「為什麼」。
