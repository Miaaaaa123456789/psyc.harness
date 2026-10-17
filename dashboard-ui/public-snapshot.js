/* Real aggregate values; anonymous staff codes; no patient records or identity map. */
(function(root){const snapshot = {
  "schemaVersion": 1,
  "mode": "deidentified-actual",
  "institution": "经营分析看板",
  "asOf": "2026-10-15",
  "targetYuan": 2600000,
  "revenue": [
    {
      "date": "2026-10-01",
      "outpatient": 105281.13,
      "inpatient": 56919.14,
      "first": 7,
      "repeat": 50,
      "ward": 40,
      "admit": 7,
      "discharge": 1
    },
    {
      "date": "2026-10-02",
      "outpatient": 46439.81,
      "inpatient": 58004.6,
      "first": 1,
      "repeat": 45,
      "ward": 42,
      "admit": 3,
      "discharge": 1
    },
    {
      "date": "2026-10-03",
      "outpatient": 9030.53,
      "inpatient": 52909.64,
      "first": 1,
      "repeat": 10,
      "ward": 42,
      "admit": 1,
      "discharge": 1
    },
    {
      "date": "2026-10-04",
      "outpatient": 16872.55,
      "inpatient": 30229.12,
      "first": 0,
      "repeat": 16,
      "ward": 39,
      "admit": 0,
      "discharge": 3
    },
    {
      "date": "2026-10-05",
      "outpatient": 8510.61,
      "inpatient": 62256.06,
      "first": 1,
      "repeat": 14,
      "ward": 37,
      "admit": 0,
      "discharge": 2
    },
    {
      "date": "2026-10-06",
      "outpatient": 82599.7,
      "inpatient": 42475.88,
      "first": 5,
      "repeat": 65,
      "ward": 33,
      "admit": 1,
      "discharge": 5
    },
    {
      "date": "2026-10-07",
      "outpatient": 111519,
      "inpatient": 46419.12,
      "first": 7,
      "repeat": 57,
      "ward": 31,
      "admit": 4,
      "discharge": 6
    },
    {
      "date": "2026-10-08",
      "outpatient": 2380.13,
      "inpatient": 29596.95,
      "first": 4,
      "repeat": 19,
      "ward": 29,
      "admit": 0,
      "discharge": 2
    },
    {
      "date": "2026-10-09",
      "outpatient": 8186.33,
      "inpatient": 37342.64,
      "first": 4,
      "repeat": 10,
      "ward": 29,
      "admit": 0,
      "discharge": 0
    },
    {
      "date": "2026-10-10",
      "outpatient": 19504.73,
      "inpatient": 37290.07,
      "first": 5,
      "repeat": 25,
      "ward": 30,
      "admit": 1,
      "discharge": 0
    },
    {
      "date": "2026-10-11",
      "outpatient": 126900.1,
      "inpatient": 34451.41,
      "first": 11,
      "repeat": 81,
      "ward": 31,
      "admit": 5,
      "discharge": 4
    },
    {
      "date": "2026-10-12",
      "outpatient": 15989.78,
      "inpatient": 34554.98,
      "first": 1,
      "repeat": 19,
      "ward": 32,
      "admit": 3,
      "discharge": 2
    },
    {
      "date": "2026-10-13",
      "outpatient": 25292.71,
      "inpatient": 37283.02,
      "first": 6,
      "repeat": 12,
      "ward": 32,
      "admit": 1,
      "discharge": 1
    },
    {
      "date": "2026-10-14",
      "outpatient": 55741.34,
      "inpatient": 41495.24,
      "first": 12,
      "repeat": 18,
      "ward": 32,
      "admit": 3,
      "discharge": 3
    },
    {
      "date": "2026-10-15",
      "outpatient": 15606.47,
      "inpatient": 34949.26,
      "first": 3,
      "repeat": 13,
      "ward": 31,
      "admit": 3,
      "discharge": 4
    }
  ],
  "departments": {
    "doctor": {
      "name": "医生组",
      "start": "2026-10-05",
      "end": "2026-10-11",
      "source": "已核验台账快照，未完成本轮线上全量刷新",
      "rows": [
        {
          "id": "doctor-01",
          "name": "医生01",
          "attributedYuan": 98366.25,
          "load": 8,
          "discharges": 4
        },
        {
          "id": "doctor-02",
          "name": "医生02",
          "attributedYuan": 87052.64,
          "load": 5,
          "discharges": 5
        },
        {
          "id": "doctor-03",
          "name": "医生03",
          "attributedYuan": 81817.2,
          "load": 6,
          "discharges": 5
        },
        {
          "id": "doctor-04",
          "name": "医生04",
          "attributedYuan": 48748.55,
          "load": 3,
          "discharges": 4
        },
        {
          "id": "doctor-05",
          "name": "医生05",
          "attributedYuan": 16224.65,
          "load": 8,
          "discharges": 1
        }
      ]
    },
    "nursing": {
      "name": "护理组",
      "start": "2026-10-01",
      "end": "2026-10-10",
      "source": "已核验台账快照，未完成本轮线上全量刷新",
      "rows": [
        {
          "id": "nursing-01",
          "name": "护理01",
          "score": 92.9,
          "workload": 88.8,
          "quality": 68.5,
          "days": 3,
          "needsReview": false
        },
        {
          "id": "nursing-02",
          "name": "护理02",
          "score": 85.6,
          "workload": 84.5,
          "quality": 61.2,
          "days": 5,
          "needsReview": false
        },
        {
          "id": "nursing-03",
          "name": "护理03",
          "score": 84.2,
          "workload": 68.4,
          "quality": 70.6,
          "days": 7,
          "needsReview": false
        },
        {
          "id": "nursing-04",
          "name": "护理04",
          "score": 82,
          "workload": 72.5,
          "quality": 64.6,
          "days": 5,
          "needsReview": false
        },
        {
          "id": "nursing-05",
          "name": "护理05",
          "score": 78.7,
          "workload": 69.6,
          "quality": 62,
          "days": 9,
          "needsReview": false
        },
        {
          "id": "nursing-06",
          "name": "护理06",
          "score": 74,
          "workload": 58.7,
          "quality": 63.1,
          "days": 7,
          "needsReview": false
        },
        {
          "id": "nursing-07",
          "name": "护理07",
          "score": 74,
          "workload": 59.4,
          "quality": 62.6,
          "days": 7,
          "needsReview": false
        },
        {
          "id": "nursing-08",
          "name": "护理08",
          "score": 71.2,
          "workload": 58.5,
          "quality": 59.2,
          "days": 6,
          "needsReview": false
        },
        {
          "id": "nursing-09",
          "name": "护理09",
          "score": 71.2,
          "workload": 55.2,
          "quality": 61.5,
          "days": 9,
          "needsReview": false
        },
        {
          "id": "nursing-10",
          "name": "护理10",
          "score": 71,
          "workload": 55.4,
          "quality": 61.2,
          "days": 6,
          "needsReview": false
        },
        {
          "id": "nursing-11",
          "name": "护理11",
          "score": 70.5,
          "workload": 62,
          "quality": 55.8,
          "days": 6,
          "needsReview": false
        },
        {
          "id": "nursing-12",
          "name": "护理12",
          "score": 69.9,
          "workload": 54.9,
          "quality": 59.9,
          "days": 8,
          "needsReview": true
        },
        {
          "id": "nursing-13",
          "name": "护理13",
          "score": 69.3,
          "workload": 58.7,
          "quality": 56.4,
          "days": 5,
          "needsReview": false
        },
        {
          "id": "nursing-14",
          "name": "护理14",
          "score": 69.2,
          "workload": 57.9,
          "quality": 56.8,
          "days": 5,
          "needsReview": true
        },
        {
          "id": "nursing-15",
          "name": "护理15",
          "score": 65.3,
          "workload": 63.4,
          "quality": 47.4,
          "days": 8,
          "needsReview": true
        },
        {
          "id": "nursing-16",
          "name": "护理16",
          "score": 62.9,
          "workload": 43.9,
          "quality": 57.8,
          "days": 5,
          "needsReview": true
        },
        {
          "id": "nursing-17",
          "name": "护理17",
          "score": 53.9,
          "workload": 34.9,
          "quality": 51.4,
          "days": 7,
          "needsReview": false
        }
      ],
      "execution": {
        "start": "2026-09-20",
        "end": "2026-09-26",
        "should": 1278,
        "done": 1177
      },
      "qualityAnomalies": {
        "zeroScoreRecords": 1,
        "score42Records": 5,
        "note": "单日异常记录，非质控均分0；复核前不擅自删除。"
      }
    },
    "psychology": {
      "name": "心理咨询组",
      "start": "2026-10-01",
      "end": "2026-10-07",
      "source": "已核验台账快照，未完成本轮线上全量刷新",
      "rows": [
        {
          "id": "psychology-01",
          "name": "咨询01",
          "score": 0.9855,
          "contacts": 22,
          "consults": 12
        },
        {
          "id": "psychology-02",
          "name": "咨询02",
          "score": 0.7272,
          "contacts": 8,
          "consults": 11
        },
        {
          "id": "psychology-03",
          "name": "咨询03",
          "score": 0.7221,
          "contacts": 23,
          "consults": 7
        },
        {
          "id": "psychology-04",
          "name": "咨询04",
          "score": 0.674,
          "contacts": 12,
          "consults": 9
        }
      ],
      "previousConsults": 43,
      "plannedGroups": 4,
      "registeredGroups": 2
    },
    "service": {
      "name": "客服服务部",
      "start": "2026-10-05",
      "end": "2026-10-11",
      "source": "已核验台账快照，未完成本轮线上全量刷新",
      "rows": [
        {
          "id": "service-01",
          "name": "客服01",
          "followups": 41,
          "arrived": 20
        },
        {
          "id": "service-02",
          "name": "客服02",
          "followups": 21,
          "arrived": 14
        },
        {
          "id": "service-03",
          "name": "客服03",
          "followups": 12,
          "arrived": 2
        }
      ]
    },
    "marketing": {
      "name": "营销组",
      "start": "2026-10-05",
      "end": "2026-10-11",
      "source": "已核验台账快照，未完成本轮线上全量刷新",
      "rows": [
        {
          "id": "marketing-01",
          "name": "管家01",
          "contacts": 33,
          "admissions": 2,
          "psych": 6
        },
        {
          "id": "marketing-02",
          "name": "管家02",
          "contacts": 22,
          "admissions": 4,
          "psych": 10
        },
        {
          "id": "marketing-03",
          "name": "管家03",
          "contacts": 17,
          "admissions": 2,
          "psych": 3
        },
        {
          "id": "marketing-04",
          "name": "管家04",
          "contacts": 15,
          "admissions": 1,
          "psych": 4
        },
        {
          "id": "marketing-05",
          "name": "管家05",
          "contacts": 2,
          "admissions": 2,
          "psych": null
        }
      ],
      "previousComplete": false,
      "channels": {
        "start": "2026-09-28",
        "end": "2026-09-28",
        "channelCount": 15,
        "arrivals": 44
      },
      "entertainment": null
    }
  },
  "refresh": {
    "checkedAt": "2026-10-17",
    "onlineTables": 6,
    "fullyImported": 0,
    "status": "WPS导出需要登录，本轮未取得完整明细。部门保持原截止期。"
  },
  "privacy": {
    "patientRowsIncluded": false,
    "realEmployeeNamesIncluded": false,
    "identityMapIncluded": false,
    "sourceAccessUrlsIncluded": false,
    "financialValuesChanged": false
  }
};
if(typeof module!=='undefined'&&module.exports)module.exports=snapshot;else root.OPS_PUBLIC_SNAPSHOT=snapshot;
})(typeof window!=='undefined'?window:globalThis);
