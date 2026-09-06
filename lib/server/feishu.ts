/**
 * 飞书通知适配器：任务状态变更时推送群消息卡片。
 *
 * 用法：设置环境变量 FEISHU_WEBHOOK_URL（飞书群 → 设置 → 群机器人 → 自定义机器人 Webhook）。
 * 未配置时静默跳过，不影响主流程。
 * 可选 FEISHU_SECRET 用于签名校验（自定义机器人开启"签名校验"时填写）。
 *
 * 生产建议：复杂审批走飞书开放平台应用（app_id/app_secret + 审批 API），
 * 演示阶段 Webhook 即可。患者敏感信息不要写入消息内容，只发任务号与动作。
 */

const WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
const SECRET = process.env.FEISHU_SECRET;

async function sign(secret: string, timestamp: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${timestamp}\n${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(""));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export type FeishuEvent = {
  taskId: string;
  actor: string;
  action: string;
  status: string;
};

export async function notifyFeishu(event: FeishuEvent): Promise<boolean> {
  if (!WEBHOOK) return false;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const body: Record<string, unknown> = {
      msg_type: "interactive",
      card: {
        header: {
          title: { tag: "plain_text", content: "任务状态变更 · AI医院工作台" },
          template: "blue",
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**${event.taskId}** ${event.action}\n操作人：${event.actor}\n当前状态：${event.status}`,
            },
          },
        ],
      },
    };
    if (SECRET) {
      body.timestamp = String(timestamp);
      body.sign = await sign(SECRET, timestamp);
    }
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
