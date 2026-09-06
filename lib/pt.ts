/** 物理治疗共享类型（客户端与服务端共用；不含任何服务端依赖） */

export type PtRecord = {
  id: string;
  code: string;
  patientId: string;
  modality: string;
  status: string;
  abnormal: boolean;
  /** 临床类原因（患者拒绝/不适/临床暂停）导致的非正常完成，需医生端复核 */
  clinical: boolean;
  reason: string;
  willingness: string;
  during: string;
  feedback: string;
  adverse: string;
  planAt: string;
  reportAt: string;
  reporter: string;
  executor: string;
  source: string;
};

export type PtTally = { name: string; count: number };

export type PtSummary = {
  total: number;
  done: number;
  abnormal: number;
  clinical: number;
  byModality: PtTally[];
  byStatus: PtTally[];
  byExecutor: PtTally[];
};
