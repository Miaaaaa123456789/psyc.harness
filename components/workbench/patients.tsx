"use client";

import { useRef, useState } from "react";
import { BedDouble, Briefcase, CheckCircle2, ChevronRight, Crown, HeartPulse, LockKeyhole, MapPin, Scale, ShieldCheck, TrendingUp, UserRound, WalletCards } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { careLevels, type Patient } from "@/lib/hospital";
import { patients, useWorkbench } from "@/lib/store";
import { STRATIFICATIONS, VIP_META, type Stratification } from "@/lib/copilot";
import { EmptyState, LighthouseBeacon, Mascot, PageHeading, RiskBadge, useClientGsap } from "./primitives";

function VoyageMap({ voyage, animate = true }: { voyage: Patient["voyage"]; animate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".voyage-node") ?? [], { autoAlpha: 0, scale: .8, duration: .4, stagger: .1, ease: "back.out(1.6)" });
    const current = ref.current?.querySelector(".voyage-node.current i");
    if (current) gsap.fromTo(current, { boxShadow: "0 0 0 0 rgba(122,96,230,.35)" }, { boxShadow: "0 0 0 12px rgba(122,96,230,0)", duration: 1.6, repeat: -1, ease: "power2.out" });
  }, { scope: ref });
  return (
    <div ref={ref} className="voyage-map">
      <div className="voyage-line" />
      {voyage.map((node) => (
        <div key={node.stage} className={`voyage-node ${node.state}`}>
          <i>{node.state === "done" ? <CheckCircle2 size={13} /> : node.state === "current" ? <HeartPulse size={13} /> : <span />}</i>
          <b>{node.stage}</b>
          <small>{node.state === "done" ? "已完成" : node.state === "current" ? "当前阶段" : "待完成"}</small>
        </div>
      ))}
    </div>
  );
}

function PatientCard({ patient, onOpen }: { patient: Patient; onOpen: () => void }) {
  const strat = STRATIFICATIONS.find((s) => s.patientId === patient.id);
  return (
    <article className={`patient-card panel care-${patient.care.toLowerCase()}`} onClick={onOpen}>
      <header>
        <span className="patient-avatar"><UserRound size={16} /></span>
        <div><b>{patient.id}</b><small>{patient.stage}</small></div>
        {strat && <RiskBadge risk={strat.risk} />}
        {strat && strat.vip !== "none" && <span className={`vip-chip ${VIP_META[strat.vip].cls}`}>{VIP_META[strat.vip].label}</span>}
        <span className="patient-state">{patient.state}</span>
      </header>
      {strat && <p className="strat-risk-reason">{strat.riskReason}</p>}
      <div className="patient-dims">
        <span className="dim-a"><small>照护需求</small><b>{patient.care} {careLevels[patient.care].name}</b></span>
        <span className="dim-b"><small>治疗阶段</small><b>{strat?.stage ?? patient.stage}</b></span>
      </div>
      <p className="patient-care-reason">{patient.careReason}</p>
      <div className="patient-events">
        {patient.events.slice(0, 3).map((e) => <span key={e}>{e}</span>)}
      </div>
      <footer>
        {strat && strat.vip !== "none" ? (
          <span className="vip-progress"><Crown size={12} />配合度 {strat.vipProgress.adherence}% · 积分 {strat.vipProgress.points.toLocaleString()}</span>
        ) : (
          <span>配合度 {strat?.vipProgress.adherence ?? "—"}%</span>
        )}
        <ChevronRight size={15} />
      </footer>
    </article>
  );
}

/* ==================== 临床风险 × VIP 等级矩阵 ====================
 * 临床风险决定医疗处理优先级；VIP 等级只决定服务权益与时限。
 * 排序原则：普通高风险患者优先于低风险钻石VIP的非紧急服务。 */
const RISK_ORDER = ["高", "中", "低"] as const;
const VIP_ORDER = ["none", "gold", "platinum", "diamond"] as const;

function RiskVipMatrix({ onOpen }: { onOpen: (p: Patient) => void }) {
  const cells = RISK_ORDER.flatMap((risk) =>
    VIP_ORDER.map((vip) => ({
      risk, vip,
      items: patients
        .map((p) => ({ p, s: STRATIFICATIONS.find((s) => s.patientId === p.id) }))
        .filter((x): x is { p: Patient; s: Stratification } => x.s?.risk === risk && x.s?.vip === vip),
    })),
  );
  return (
    <section className="panel strat-matrix" aria-label="临床风险与VIP等级矩阵">
      <header className="panel-head-compact">
        <div><span>STRATIFICATION MATRIX</span><b>临床风险 × VIP等级</b></div>
        <small>红=临床优先级 · 金=服务权益，两者独立计算</small>
      </header>
      <div className="sm-grid">
        <div className="sm-corner"><TrendingUp size={12} />风险↓ / VIP→</div>
        {VIP_ORDER.map((v) => <div key={v} className={`sm-colhead ${VIP_META[v].cls}`}>{VIP_META[v].label}</div>)}
        {RISK_ORDER.map((risk) => (
          <div key={risk} className="sm-row">
            <div className={`sm-rowhead risk-${risk}`}><b>{risk}风险</b></div>
            {VIP_ORDER.map((vip) => {
              const cell = cells.find((c) => c.risk === risk && c.vip === vip);
              const items = cell?.items ?? [];
              return (
                <div key={vip} className={`sm-cell ${items.length ? "has" : ""} ${risk === "高" ? "risk-high" : ""}`}>
                  {items.map(({ p, s }) => (
                    <button key={p.id} className="sm-patient" onClick={() => onOpen(p)}>
                      <b>{p.id}</b>
                      <small>{s.stage}</small>
                      <em>{p.care}</em>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="sm-note"><ShieldCheck size={12} />临床风险决定医疗处理优先级；VIP等级仅决定额外服务权益与时限。普通高风险患者优先于低风险钻石VIP的非紧急服务。</p>
    </section>
  );
}

const DETAIL_TABS = ["概览", "治疗航图", "医疗", "治疗", "服务配置", "任务与审计"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function PatientDetailSheet({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const { role, tasks, p042Attention } = useWorkbench();
  const [tab, setTab] = useState<DetailTab>("概览");
  const attention = patient?.id === "P-042" ? p042Attention : patient?.attention ?? 0;
  const sensitiveVisible = ["butler", "ops", "leader"].includes(role.id);
  const patientTasks = patient ? tasks.filter((t) => t.patient === patient.id) : [];

  return (
    <Sheet open={Boolean(patient)} onOpenChange={(open) => { if (!open) { setTab("概览"); onClose(); } }}>
      <SheetContent side="right" className="work-sheet patient-detail-sheet">
        {patient && <ScrollArea className="sheet-scroll">
          <SheetHeader>
            <div className="sheet-avatar accent-cyan"><UserRound /></div>
            <SheetDescription>{patient.id} · {patient.stage}</SheetDescription>
            <SheetTitle>患者详情</SheetTitle>
            <p>{patient.state} · 临床照护 {patient.care}（{careLevels[patient.care].name}）</p>
          </SheetHeader>
          <div className="sheet-content">
            <nav className="detail-tabs" aria-label="患者详情区块">
              {DETAIL_TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
            </nav>

            {tab === "概览" && (
              <>
                <section>
                  <span>患者概览</span>
                  <div className="info-grid">
                    <p><b>匿名ID</b><span>{patient.id}</span></p>
                    <p><b>当前阶段</b><span>{patient.stage}</span></p>
                    <p><b>临床照护强度</b><span>{patient.care} · {careLevels[patient.care].name}</span></p>
                    <p><b>复杂度依据</b><span>{patient.careReason}</span></p>
                  </div>
                </section>
                <section>
                  <span>今日状态</span>
                  <div className="info-grid">
                    <p><b>状态</b><span>{patient.state}</span></p>
                    <p><b>关注度</b><span>{attention} / 100</span></p>
                    <p><b>今日事件</b><span>{patient.events.join(" · ")}</span></p>
                  </div>
                </section>
                <section>
                  <span>重要事件（时间线）</span>
                  <ol className="mini-timeline">
                    {patient.timeline.map((e, i) => (
                      <li key={i}><i className={`tl-dot ${e.source.includes("晚星") ? "tone-violet" : e.source.includes("护士") ? "tone-green" : "tone-cyan"}`} /><div><b>{e.time} {e.event}</b><small>{e.source}</small></div></li>
                    ))}
                  </ol>
                </section>
              </>
            )}

            {tab === "治疗航图" && (
              <>
                <section>
                  <span>治疗航图</span>
                  <VoyageMap voyage={patient.voyage} />
                </section>
                <section>
                  <span>个案概念化</span>
                  <div className="formulation-grid">
                    {patient.formulation.map((f) => (
                      <p key={f.label}><i>{f.label}</i><span><b>{f.value}</b><small>{f.note}</small></span></p>
                    ))}
                  </div>
                </section>
                {patient.id === "P-042" && (
                  <section>
                    <span>重要转折</span>
                    <div className="turning-point">
                      <LighthouseBeacon active />
                      <p><b>昨日夜间事件链</b><small>睡眠碎片化＋HRV下降＋拒药＋家庭通话后情绪波动，已进入人工复核。</small></p>
                    </div>
                  </section>
                )}
                <section>
                  <span>下一步任务与预测不确定性</span>
                  <div className="next-steps">
                    <p><CheckCircle2 size={13} />服药方案复核（等待医生确认）</p>
                    <p><CheckCircle2 size={13} />会谈靶点调整（等待治疗师确认）</p>
                    <p className="uncertain"><LockKeyhole size={13} />疗效预测存在不确定性：以真实结局持续校准，不做确定性结论。</p>
                  </div>
                </section>
              </>
            )}

            {tab === "医疗" && (
              <>
                <section>
                  <span>横向服药卡</span>
                  <div className="med-table">
                    <header><b>药物</b><b>剂量</b><b>频次</b><b>最近</b><b>状态</b></header>
                    {patient.medications.map((m) => (
                      <p key={m.name} className={`med-status-${m.status}`}>
                        <span>{m.name}</span><span>{m.dose}</span><span>{m.freq}</span><span>{m.lastTaken}</span><b>{m.status}</b>
                      </p>
                    ))}
                  </div>
                </section>
                <section>
                  <span>检查与量表</span>
                  <div className="med-table">
                    <header><b>项目</b><b>结果</b><b>状态</b></header>
                    {patient.checks.map((c) => (
                      <p key={c.item} className={`check-only check-state-${c.state}`}>
                        <span>{c.item}</span><span>{c.result}</span><b>{c.state}</b>
                      </p>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === "治疗" && (
              <>
                <section>
                  <span>治疗记录</span>
                  <div className="therapy-records">
                    {patient.id === "P-042" ? (
                      <>
                        <p><b>DAY 07 · 个体会谈</b><small>减少回避，识别家庭冲突后的情绪与行为链；主题确认已记录。</small></p>
                        <p><b>DAY 05 · 团体活动</b><small>庭院活动连续参加，日间节律恢复。</small></p>
                        <p><b>DAY 03 · 艺术治疗</b><small>主动完成作品并允许治疗师共同命名情绪。</small></p>
                      </>
                    ) : <EmptyState title="暂无治疗记录" note="治疗记录由治疗师端同步更新。" />}
                  </div>
                </section>
                <section>
                  <span>精彩瞬间</span>
                  {patient.moments.length ? (
                    <div className="moment-gallery">
                      {patient.moments.map((m) => (
                        <figure key={m.day}>
                          <img src={m.src} alt={m.title} loading="lazy" />
                          <figcaption><small>{m.day}</small><b>{m.title}</b><p>{m.note}</p></figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : <EmptyState title="暂无精彩瞬间" note="治疗进程中的情感锚点会出现在这里。" />}
                  <p className="moment-note"><Mascot mode="cheer" size={28} />图片仅作为治疗进程的情感锚点，不作为临床评价依据。</p>
                </section>
              </>
            )}

            {tab === "服务配置" && (
              <>
                <section>
                  <span>维度A · 临床照护强度（优先）</span>
                  <div className="dim-card dim-a-card">
                    <b>{patient.care} · {careLevels[patient.care].name}</b>
                    <p>{patient.careReason}</p>
                    <em><Scale size={12} />临床照护强度永远优先于消费能力和VIP身份</em>
                  </div>
                </section>
                <section>
                  <span>维度B · 服务配置（独立计算）</span>
                  <div className="service-field-grid">
                    <p><MapPin size={13} /><b>居住与距离</b><span>{patient.service.residence}</span></p>
                    <p><Briefcase size={13} /><b>工作/就学</b><span>{patient.service.occupation}</span></p>
                    <p><Crown size={13} /><b>就诊渠道</b><span>{sensitiveVisible ? patient.service.channel : "按权限隐藏"}</span></p>
                    <p><CheckCircle2 size={13} /><b>依从性</b><span>{patient.service.adherence}</span></p>
                    <p><WalletCards size={13} /><b>预算与支付意愿</b><span>{sensitiveVisible ? patient.service.budget : "按权限隐藏"}</span></p>
                    <p><UserRound size={13} /><b>家庭支持</b><span>{patient.service.familySupport}</span></p>
                    <p><WalletCards size={13} /><b>支付方式</b><span>{sensitiveVisible ? patient.service.payment : "按权限隐藏"}</span></p>
                    <p><HeartPulse size={13} /><b>服务偏好</b><span>{patient.service.preference}</span></p>
                  </div>
                  {!sensitiveVisible && (
                    <div className="perm-mask-note"><LockKeyhole size={13} />当前角色（{role.name}）仅可见完成工作所需字段，经济与渠道信息已按最小必要原则隐藏。</div>
                  )}
                </section>
                <section>
                  <span>匹配的服务配置</span>
                  <div className="service-field-grid">
                    <p><BedDouble size={13} /><b>病房价位</b><span>{patient.service.matched.ward}</span></p>
                    <p><UserRound size={13} /><b>服务管家</b><span>{patient.service.matched.butler}</span></p>
                    <p><HeartPulse size={13} /><b>医生团队</b><span>{patient.service.matched.doctorTeam}</span></p>
                    <p><CheckCircle2 size={13} /><b>治疗师配置</b><span>{patient.service.matched.therapist}</span></p>
                    <p><ShieldCheck size={13} /><b>院外随访</b><span>{patient.service.matched.followUp}</span></p>
                  </div>
                  <div className="guard-note"><ShieldCheck size={13} /><span>经济与VIP信息不降低临床安全标准；资深医生与治疗师配置首先依据病情复杂度。</span></div>
                </section>
              </>
            )}

            {tab === "任务与审计" && (
              <>
                <section>
                  <span>任务记录</span>
                  <div className="inline-task-list">
                    {patientTasks.length ? patientTasks.map((t) => (
                      <p key={t.id}><span className="task-id">{t.id}</span><b>{t.title}</b><em>{t.status}</em></p>
                    )) : <span className="muted">暂无任务</span>}
                  </div>
                </section>
                <section>
                  <span>权限与审计</span>
                  <div className="audit-note-list">
                    <p><ShieldCheck size={13} />当前查看角色：{role.name}，字段范围按最小必要原则展示。</p>
                    <p><LockKeyhole size={13} />所有敏感字段访问均记录访问者、时间与范围。</p>
                    <p><CheckCircle2 size={13} />本页数据均为匿名ID与模拟数据。</p>
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>}
      </SheetContent>
    </Sheet>
  );
}

export function PatientsView() {
  const [detail, setDetail] = useState<Patient | null>(null);
  const { p042Attention } = useWorkbench();
  const list = patients.map((p) => p.id === "P-042" ? { ...p, attention: p042Attention } : p);
  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="PATIENT STRATIFICATION"
        title="患者分层管理"
        description="每位患者同时具有临床风险、照护需求、VIP服务等级与治疗阶段四种属性；风险可解释，VIP不干预临床优先级。"
      />
      <RiskVipMatrix onOpen={setDetail} />
      <div className="patient-grid">
        {list.map((p) => <PatientCard key={p.id} patient={p} onOpen={() => setDetail(p)} />)}
      </div>
      <PatientDetailSheet patient={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
