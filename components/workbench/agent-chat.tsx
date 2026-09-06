"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, CircleDot } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorkbench } from "@/lib/store";
import { portalOf, type PortalId } from "@/lib/copilot";

/* ==================== Copilot Agent 对话入口 ====================
 * 所有角色端可用的悬浮 AI 助手：
 * - 回答患者档案 / 随访 / 物理治疗 / 安全事件 / 给药 / 工作量等问题
 * - 数据实时读飞书多维表格；回答中的患者姓名一律脱敏（林X雨）
 * - 快捷提问按当前角色端定制，降低输入成本 */

type ChatMessage = {
  id: string;
  from: "user" | "agent";
  text: string;
  sources?: string[];
  tookMs?: number;
  /** 界面操作指令：回答可携带跳转，替角色端直接打开对应页面 */
  action?: { type: "navigate"; view: string; label: string };
};

/** 各角色端快捷提问（与后端意图一一对应） */
const QUICK_PROMPTS: Record<PortalId, string[]> = {
  doctor: ["P-042 最近情况", "待处置的安全事件", "最近给药异常记录"],
  nurse: ["今天要随访哪些患者", "P-042 最近情况", "最近给药异常记录"],
  therapist: ["物理治疗执行情况", "P-042 最近情况", "今天要随访哪些患者"],
  butler: ["今天要随访哪些患者", "P-051 最近情况", "物理治疗执行情况"],
  familyPortal: ["物理治疗执行情况"],
  governancePortal: ["各端工作量统计", "待处置的安全事件", "随访任务总览"],
};

const WELCOME: ChatMessage = {
  id: "welcome",
  from: "agent",
  text:
    "你好，我是护理 Copilot 助手。我可以实时检索飞书数据底座，回答患者档案、随访任务、物理治疗、安全事件、给药记录、工作量统计等问题。\n\n所有回答中的患者姓名均已脱敏（林X雨 格式）。试试下面的快捷提问，或直接输入问题。",
};

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

export function AgentChat() {
  const { role, setView } = useWorkbench();
  const [open, setOpen] = useState(false);
  /** 最近一次携带界面操作的回答（同 key 渲染按钮，点击执行跳转） */
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const portal = portalOf(role.id);
  const prompts = QUICK_PROMPTS[portal.id] ?? QUICK_PROMPTS.nurse;

  useEffect(() => {
    /* 新消息后滚到底部 */
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, role: role.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean; reply?: string; sources?: string[]; tookMs?: number; error?: string;
        action?: { type: "navigate"; view: string; label: string };
      };
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          from: "agent",
          text: data.reply ?? data.error ?? "服务异常，请稍后重试。",
          sources: data.sources,
          tookMs: data.tookMs,
          action: data.action,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { id: nextId(), from: "agent", text: "网络异常，请稍后重试。" }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* 悬浮入口：所有角色端可见（桌面右下角 / 手机在底部导航上方） */}
      <button
        className="agent-fab"
        aria-label="AI 助手"
        title="AI 助手 · 问我任何患者与运行问题"
        onClick={() => setOpen(true)}
      >
        <Bot size={20} />
        <span className="agent-fab-tag">AI 助手</span>
      </button>

      <Sheet open={open} onOpenChange={(v) => setOpen(v)}>
        <SheetContent side="right" className="work-sheet agent-sheet">
          <SheetHeader>
            <div className="sheet-avatar accent-violet"><Bot /></div>
            <SheetDescription>CARE COPILOT AGENT · {role.name}</SheetDescription>
            <SheetTitle>Copilot 助手</SheetTitle>
            <p>实时检索飞书数据底座回答问题；患者姓名一律脱敏展示（林X雨）。</p>
          </SheetHeader>

          <div className="agent-body">
            <div className="agent-scroll" ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id} className={`agent-msg ${m.from}`}>
                  {m.from === "agent" && <span className="agent-msg-avatar"><Sparkles size={11} /></span>}
                  <div className="agent-msg-bubble">
                    <p>{m.text}</p>
                    {m.from === "agent" && m.sources && m.sources.length > 0 && (
                      <footer className="agent-msg-meta">
                        <em>来源：{m.sources.join("、")}</em>
                        {typeof m.tookMs === "number" && m.tookMs > 0 && <em>{(m.tookMs / 1000).toFixed(1)}s</em>}
                      </footer>
                    )}
                    {m.from === "agent" && m.action?.type === "navigate" && (
                      <button
                        className="agent-nav-btn"
                        onClick={() => { setView(m.action!.view as never); setOpen(false); }}
                      >
                        打开{m.action.label} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="agent-msg agent">
                  <span className="agent-msg-avatar"><Sparkles size={11} /></span>
                  <div className="agent-msg-bubble agent-thinking">
                    <i /><i /><i />
                    <span>正在检索飞书数据…</span>
                  </div>
                </div>
              )}
            </div>

            <div className="agent-prompts" aria-label="快捷提问">
              {prompts.map((p) => (
                <button key={p} onClick={() => void send(p)} disabled={thinking}>
                  <CircleDot size={10} />{p}
                </button>
              ))}
            </div>

            <form
              className="agent-input"
              onSubmit={(e) => { e.preventDefault(); void send(); }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问任何问题，如：P-042 最近情况 / 今天要随访哪些患者…"
                maxLength={500}
              />
              <button type="submit" disabled={!input.trim() || thinking} aria-label="发送">
                <Send size={14} />
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
