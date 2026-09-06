/** 随访任务共享类型（客户端与服务端共用；不含任何服务端依赖） */

export type FollowupState = "overdue" | "today" | "never" | "soon" | "scheduled";

export type FollowupTask = {
  key: string;
  admissionNo: string;
  name: string;
  patientId: string;
  stage: string;
  risk: string;
  lastAt: string;
  lastContact: string;
  lastIssue: string;
  lastAction: string;
  nextAt: string;
  days: number | null;
  state: FollowupState;
  method: string;
  owner: string;
  unreached: boolean;
  source: string;
};

export type FollowupSummary = {
  total: number;
  overdue: number;
  today: number;
  never: number;
  soon: number;
  highRisk: number;
  unreached: number;
};

export const FU_STATE_LABEL: Record<FollowupState, string> = {
  overdue: "已逾期",
  today: "今日到期",
  never: "待排期",
  soon: "7日内",
  scheduled: "已排期",
};

/** 排序权重：越小越靠前 */
export const FU_STATE_WEIGHT: Record<FollowupState, number> = {
  overdue: 0, today: 1, never: 2, soon: 3, scheduled: 4,
};
