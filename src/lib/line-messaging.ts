import "server-only";

// 推播失敗不該擋住報名/停課本身的流程（那些已經成功了），這裡只是盡力通知
export async function sendLinePush(lineUserId: string, text: string): Promise<void> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // 還沒設定推播金鑰之前先不推，不要讓其他功能因此掛掉

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });
    if (!res.ok) {
      console.error("LINE push failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("LINE push error", e);
  }
}
