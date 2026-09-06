"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ChevronRight, ClipboardCheck, Radar, Share2, X, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { departments, type HospitalTask, type TaskStatus } from "@/lib/hospital";
import { useWorkbench } from "@/lib/store";
import { EmptyState, PageHeading, RiskBadge, TaskStatusPill } from "./primitives";

const STATUS_FILTERS: (TaskStatus | "全部")[] = ["全部", "机器人处理中", "等待人工确认", "已接受", "已转交", "处理中", "已完成", "已驳回", "已超时"];
const REJECT_REASONS = ["重复任务", "证据不足需要补充数据", "非本人职责范围", "临床判断暂不需要", "其他原因"];
const TRANSFER_TARGETS = departments.filter((d) => d.name !== "院领导").map((d) => d.name);

type DialogState = { kind: "reject" | "transfer"; task: HospitalTask } | null;

type TaskActionsApi = {
  openDialog: (d: DialogState) => void;
  accept: (id: string) => void;
  complete: (id: string) => void;
  reject: (id: string, reason: string) => void;
  transfer: (id: string, dept: string) => void;
};

const TaskApiContext = createContext<TaskActionsApi | null>(null);

function useTaskApi() {
  const ctx = useContext(TaskApiContext);
  if (!ctx) throw new Error("TaskApiContext missing");
  return ctx;
}

function TaskActions({ task, compact = false }: { task: HospitalTask; compact?: boolean }) {
  const api = useTaskApi();
  const done = task.status === "已完成" || task.status === "已驳回";
  if (done) return <span className="task-actions-done">{task.status === "已完成" ? "已闭环" : "已驳回"}</span>;
  return (
    <div className={compact ? "task-actions compact" : "task-actions"}>
      {task.status === "等待人工确认" && <button className="btn-accept" onClick={() => api.accept(task.id)}>接受</button>}
      {(task.status === "已接受" || task.status === "处理中" || task.status === "已转交") && <button className="btn-complete" onClick={() => api.complete(task.id)}>完成</button>}
      <button className="btn-transfer" onClick={() => api.openDialog({ kind: "transfer", task })}>转交</button>
      <button className="btn-reject" onClick={() => api.openDialog({ kind: "reject", task })}>驳回</button>
    </div>
  );
}

export function TasksView() {
  const wb = useWorkbench();
  const { tasks } = wb;
  const [filter, setFilter] = useState<TaskStatus | "全部">("全部");
  const [detail, setDetail] = useState<HospitalTask | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [transferTarget, setTransferTarget] = useState("");

  const api: TaskActionsApi = useMemo(() => ({
    openDialog: setDialog,
    accept: wb.acceptTask,
    complete: wb.completeTask,
    reject: (id, reason) => wb.rejectTask(id, reason),
    transfer: (id, dept) => wb.transferTask(id, dept),
  }), [wb]);

  const filtered = useMemo(() => filter === "全部" ? tasks : tasks.filter((t) => t.status === filter), [tasks, filter]);
  const counts = useMemo(() => {
    const map: Record<string, number> = { 全部: tasks.length };
    for (const s of STATUS_FILTERS) if (s !== "全部") map[s] = tasks.filter((t) => t.status === s).length;
    return map;
  }, [tasks]);

  return (
    <TaskApiContext.Provider value={api}>
      <div className="view-stack">
        <PageHeading
          eyebrow="UNIFIED TASK CENTER"
          title="任务中心"
          description="机器人发现的问题自动转化为有责任人、有时限、有结果的任务。每一次操作都会写入审计。"
        />
        <nav className="task-filters" aria-label="任务状态筛选">
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s}{counts[s] ? <em>{counts[s]}</em> : null}
            </button>
          ))}
        </nav>

        {filtered.length ? (
          <div className="task-list">
            {filtered.map((task) => (
              <article key={task.id} className={`task-card panel ${task.risk === "高" ? "is-high" : ""}`} onClick={() => setDetail(task)}>
                <header>
                  <span className="task-id">{task.id}</span>
                  <span className="task-patient">{task.patient}</span>
                  <RiskBadge risk={task.risk} />
                  <TaskStatusPill status={task.status} />
                </header>
                <h3>{task.title}</h3>
                <dl className="task-meta">
                  <div><dt>触发</dt><dd>{task.triggerTime} · {task.source}</dd></div>
                  <div><dt>责任人</dt><dd>{task.owner}</dd></div>
                  <div><dt>截止</dt><dd>{task.deadline}</dd></div>
                </dl>
                <p className="task-evidence"><Radar size={13} />{task.evidence}</p>
                <div className="task-actions-wrap" onClick={(e) => e.stopPropagation()}>
                  <TaskActions task={task} compact />
                </div>
                <ChevronRight size={16} className="task-chevron" />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="没有符合筛选的任务" note="切换状态筛选，或等待机器人产生新任务。" />
        )}
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="work-sheet task-detail-sheet">
          {detail && <ScrollArea className="sheet-scroll">
            <SheetHeader>
              <div className="sheet-avatar accent-amber"><ClipboardCheck /></div>
              <SheetDescription>{detail.id} · {detail.patient}</SheetDescription>
              <SheetTitle>{detail.title}</SheetTitle>
              <p>{detail.source} 创建，交由 {detail.owner} 处理</p>
            </SheetHeader>
            <div className="sheet-content">
              <div className="task-sheet-state">
                <RiskBadge risk={detail.risk} />
                <TaskStatusPill status={detail.status} />
                <em>截止 {detail.deadline}</em>
              </div>
              <section>
                <span>原始证据</span>
                <div className="evidence-box"><Radar size={15} /><p><b>{detail.evidence}</b><small>每条证据可回溯原始记录与时间戳</small></p></div>
              </section>
              <section>
                <span>操作记录</span>
                <ol className="task-log">
                  {detail.log.map((entry, i) => (
                    <li key={i}><i /><div><b>{entry.actor}</b><p>{entry.action}</p><small>{entry.time}</small></div></li>
                  ))}
                </ol>
              </section>
              <section className="sheet-sticky-actions">
                <TaskActions task={detail} />
              </section>
            </div>
          </ScrollArea>}
        </SheetContent>
      </Sheet>

      {dialog && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setDialog(null)}>
          <div className="modal-card panel" onClick={(e) => e.stopPropagation()}>
            {dialog.kind === "reject" ? (
              <>
                <header><XCircle size={17} className="icon-red" /><b>驳回任务 {dialog.task.id}</b><button onClick={() => setDialog(null)} aria-label="关闭"><X size={15} /></button></header>
                <p className="modal-note">请选择驳回原因，原因将写入操作记录与审计日志。</p>
                <div className="reason-list">
                  {REJECT_REASONS.map((r) => (
                    <button key={r} className={rejectReason === r ? "selected" : ""} onClick={() => setRejectReason(r)}><i />{r}</button>
                  ))}
                </div>
                <footer>
                  <button className="secondary-action" onClick={() => setDialog(null)}>取消</button>
                  <button className="primary-action" disabled={!rejectReason} onClick={() => { api.reject(dialog.task.id, rejectReason); setRejectReason(""); setDialog(null); setDetail(null); }}>确认驳回</button>
                </footer>
              </>
            ) : (
              <>
                <header><Share2 size={17} /><b>转交任务 {dialog.task.id}</b><button onClick={() => setDialog(null)} aria-label="关闭"><X size={15} /></button></header>
                <p className="modal-note">当前责任人：{dialog.task.owner}。选择要转交的部门：</p>
                <div className="reason-list dept">
                  {TRANSFER_TARGETS.map((d) => (
                    <button key={d} className={transferTarget === d ? "selected" : ""} onClick={() => setTransferTarget(d)}><i />{d}</button>
                  ))}
                </div>
                <footer>
                  <button className="secondary-action" onClick={() => setDialog(null)}>取消</button>
                  <button className="primary-action" disabled={!transferTarget} onClick={() => { api.transfer(dialog.task.id, transferTarget); setTransferTarget(""); setDialog(null); setDetail(null); }}>确认转交</button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </TaskApiContext.Provider>
  );
}

export function TaskListInline({ limit = 5, title = "相关任务" }: { limit?: number; title?: string }) {
  const { tasks } = useWorkbench();
  const items = tasks.slice(0, limit);
  return (
    <section>
      <span>{title}</span>
      <div className="inline-task-list">
        {items.map((t) => (
          <p key={t.id}><span className="task-id">{t.id}</span><b>{t.title}</b><TaskStatusPill status={t.status} /></p>
        ))}
      </div>
    </section>
  );
}
