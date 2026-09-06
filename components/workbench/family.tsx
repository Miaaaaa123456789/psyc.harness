"use client";

import { useRef } from "react";
import {
  AlertTriangle, Bell, CalendarCheck2, CheckCircle2, ChevronRight, Crown, HeartPulse, Info,
  LockKeyhole, Route, Share2, Sparkles, TrendingUp, UsersRound,
} from "lucide-react";
import { PATIENT_EXPLANATIONS, STRATIFICATIONS, VIP_META } from "@/lib/copilot";
import { patients } from "@/lib/store";
import { useWorkbench } from "@/lib/store";
import { EmptyState, Mascot, PageHeading, useClientGsap } from "./primitives";

/**
 * 患者家属端 · 我的治疗与家庭支持
 * 只显示经过临床确认的内容；每条数据带可见范围标记。
 * 不显示：员工绩效、内部责任划分、未经确认的AI建议、完整心理治疗隐私。
 */
export function FamilyView() {
  const { role } = useWorkbench();
  const ref = useRef<HTMLDivElement>(null);
  useClientGsap((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current?.querySelectorAll(".fam-card") ?? [], { autoAlpha: 0, y: 14, duration: .45, stagger: .08, ease: "power2.out" });
  }, { scope: ref });

  const patient = patients.find((p) => p.id === "P-042")!;
  const strat = STRATIFICATIONS.find((s) => s.patientId === "P-042")!;
  const exp = PATIENT_EXPLANATIONS[0];
  const isGuardian = role.id === "family";

  const cards = [
    {
      key: "change", icon: Sparkles, label: "今天的治疗变化", tone: "blue",
      body: (
        <>
          <p className="fam-main">{exp.planChange}</p>
          <p className="fam-why"><Info size={12} />{exp.why}</p>
          <span className="fam-vis"><LockKeyhole size={10} />经医生确认后展示 · {exp.visibility}</span>
        </>
      ),
    },
    {
      key: "progress", icon: TrendingUp, label: "当前康复进度", tone: "green",
      body: (
        <>
          <p className="fam-main">{exp.progress}</p>
          <div className="fam-stages">
            {patient.voyage.map((v) => (
              <span key={v.stage} className={v.state}><i />{v.stage}</span>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "goal", icon: Route, label: "下一阶段目标", tone: "violet",
      body: <p className="fam-main">{exp.nextGoal}</p>,
    },
    {
      key: "todo", icon: CheckCircle2, label: "今天需要完成的事项", tone: "amber",
      body: (
        <ul className="fam-todo">
          <li><CheckCircle2 size={13} />晚间 21:30 前完成一次放松练习（治疗师布置）</li>
          <li><CheckCircle2 size={13} />家庭沟通练习：本周与患者通话时避免讨论学业压力</li>
          <li><CheckCircle2 size={13} />明日 09:00 晨间查房，家属可旁听 10 分钟</li>
        </ul>
      ),
    },
    {
      key: "alert", icon: AlertTriangle, label: "需要主动报告的情况", tone: "rose",
      body: (
        <ul className="fam-alerts">
          {exp.reportSignals.map((s) => <li key={s}><Bell size={12} />{s}</li>)}
        </ul>
      ),
    },
    {
      key: "followup", icon: CalendarCheck2, label: "随访与复诊安排", tone: "cyan",
      body: (
        <ul className="fam-todo">
          <li><CalendarCheck2 size={13} />下次复诊：09-20（出院后第 2 周）</li>
          <li><CalendarCheck2 size={13} />电话随访：每周三 15:00（管家 彭1）</li>
        </ul>
      ),
    },
    {
      key: "vip", icon: Crown, label: "VIP积分与可用权益", tone: "gold",
      body: (
        <>
          <p className="fam-vip-line">
            <span className={`vip-chip ${VIP_META[strat.vip].cls}`}>{VIP_META[strat.vip].label}</span>
            积分 {strat.vipProgress.points.toLocaleString()} · 配合度 {strat.vipProgress.adherence}%
          </p>
          <ul className="fam-todo">
            <li><Crown size={13} />专属管家随访（已开通）</li>
            <li><Crown size={13} />家属心理教育课程 2 次/月（可用）</li>
            <li><Crown size={13} />出院后远程睡眠监测（可用）</li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div className="view-stack">
      <PageHeading
        eyebrow="MY TREATMENT & FAMILY SUPPORT"
        title="我的治疗与家庭支持"
        description={`当前身份：${role.id === "patient" ? "患者本人" : isGuardian ? "家属 / 监护人" : "家庭成员"}。这里只显示医疗团队确认过的内容，保护隐私。`}
      />

      <div ref={ref} className="fam-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <section key={c.key} className={`fam-card panel fam-${c.tone}`}>
              <header>
                <span className={`fam-icon tone-${c.tone}`}><Icon size={16} /></span>
                <b>{c.label}</b>
              </header>
              {c.body}
            </section>
          );
        })}

        {/* 信息共享设置 */}
        <section className="fam-card panel fam-privacy">
          <header>
            <span className="fam-icon tone-violet"><Share2 size={16} /></span>
            <b>信息共享设置</b>
          </header>
          <ul className="fam-privacy-list">
            <li><UsersRound size={13} />母亲（监护人）<em>可查看全部</em></li>
            <li><UsersRound size={13} />父亲<em>可查看治疗进度与复诊安排</em></li>
            <li><LockKeyhole size={13} />心理治疗详细记录<em>仅医护可见</em></li>
            <li><LockKeyhole size={13} />员工绩效与内部管理数据<em>不对家属开放</em></li>
          </ul>
          <p className="fam-vis"><LockKeyhole size={10} />每条信息都按「患者/家属/监护人/仅医护」范围控制，紧急安全情况按医院规程开放。</p>
        </section>
      </div>

      <div className="fam-note">
        <Mascot mode="idle" size={36} />
        <p>以上内容均为医疗团队确认后的信息。如果你发现与患者实际情况不符，请立即联系值班护士，不要等待复诊。<ChevronRight size={12} /></p>
      </div>
    </div>
  );
}
