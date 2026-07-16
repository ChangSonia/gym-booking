# 健身房團課報名系統

取代 LINE 群組「+1 +2」報名的系統。會員在 LINE 裡開 LIFF 網頁報名，教練在同一個 app 管理課程。

## 📖 先讀這個

**[START-HERE.md](START-HERE.md)** ← 沒有程式背景的話，從這裡開始

## 文件

| 檔案 | 內容 |
|---|---|
| [START-HERE.md](START-HERE.md) | Claude Code 教學、帳號設定、開發順序 |
| [CLAUDE.md](CLAUDE.md) | 專案規則。Claude Code 會自動讀 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 產品決策**和理由** |
| [HANDOVER.md](HANDOVER.md) | 移轉給健身房 |
| [supabase/schema.sql](supabase/schema.sql) | 資料庫，可直接執行 |

## 技術棧

- Next.js（前後端同一專案）
- Supabase (PostgreSQL)
- Vercel
- LINE Login channel + LIFF

## 現況

**這是起點，還沒有程式碼。** 文件和資料庫設計已經完成，程式碼由 Claude Code 在你的電腦上寫。

前一個階段做了一個純前端的 demo（沒有資料庫），已驗證：
- LIFF 能在手機 LINE 裡跑
- UI 對長輩可用
- 產品決策都跟業主確認過

## 開始

1. 讀 [START-HERE.md](START-HERE.md)
2. 建 Supabase 專案，跑 `supabase/schema.sql`
3. 用 Claude Code 開啟這個資料夾
4. 第一句話：`請先讀 CLAUDE.md 和 docs/DECISIONS.md，然後告訴我你理解的專案現況，以及你建議的第一步。`
