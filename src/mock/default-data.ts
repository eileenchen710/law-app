import type { LawFirmMock, LegalServiceMock, MockDataSnapshot } from "./types";

export const defaultLawFirms: LawFirmMock[] = [
  {
    id: "1",
    name: "金诚律师事务所",
    description: "专业提供全方位法律服务，拥有20年执业经验",
    price: "¥3000起",
    services: [
      "刑事案件无罪辩护",
      "民事纠纷调解诉讼",
      "合同纠纷处理",
      "法律风险评估",
      "专业律师团队",
    ],
    rating: 4.9,
    cases: 2500,
  },
  {
    id: "2",
    name: "盛世律师事务所",
    description: "专注刑事辩护和民事诉讼，成功案例众多",
    price: "¥2500起",
    services: [
      "交通事故理赔",
      "工伤赔偿案件",
      "刑事辩护服务",
      "债权债务纠纷",
      "24小时咨询热线",
      "快速响应服务",
    ],
    rating: 4.8,
    cases: 1800,
    recommended: true,
  },
  {
    id: "3",
    name: "卓越律师事务所",
    description: "家庭法律专家，为您的家庭保驾护航",
    price: "¥2000起",
    services: [
      "离婚财产分割",
      "子女抚养权争议",
      "婚前财产协议",
      "家庭暴力维权",
      "遗产继承纠纷",
      "专业家事调解",
    ],
    rating: 4.7,
    cases: 3200,
  },
];

export const defaultLegalServices: LegalServiceMock[] = [
  {
    id: "s1",
    title: "刑事案件辩护",
    description:
      "提供全方位刑事案件辩护服务，包括侦查阶段、审查起诉阶段和审判阶段的法律代理",
    category: "criminal",
    lawFirmId: "1",
    price: "¥20,000起",
    duration: "根据案件复杂度",
    lawyerName: "张伟律师",
    lawyerTitle: "高级合伙人 · 20年刑辩经验",
  },
  {
    id: "s2",
    title: "企业法律顾问",
    description:
      "为企业提供全面的法律咨询服务，包括合同审查、风险评估、纠纷处理等",
    category: "corporate",
    lawFirmId: "1",
    price: "¥50,000/年",
    duration: "长期服务",
    lawyerName: "李明律师",
    lawyerTitle: "合伙人 · 企业法务专家",
  },
  {
    id: "s3",
    title: "家庭婚姻法律咨询",
    description:
      "专业处理离婚财产分割、子女抚养权争议、婚前财产协议等家庭法律问题",
    category: "family",
    lawFirmId: "3",
    price: "¥3,500起",
    duration: "1-2周",
    lawyerName: "王芳律师",
    lawyerTitle: "家事法律专家 · 15年经验",
  },
  {
    id: "s4",
    title: "劳动争议仲裁",
    description:
      "提供劳动纠纷调解、仲裁及诉讼全流程服务，确保您的合法权益",
    category: "corporate",
    lawFirmId: "2",
    price: "¥4,500起",
    duration: "2-4周",
    lawyerName: "刘强律师",
    lawyerTitle: "劳动法专家 · 18年经验",
  },
  {
    id: "s5",
    title: "交通事故索赔",
    description:
      "协助处理交通事故理赔、伤残鉴定、保险纠纷等相关法律事务",
    category: "traffic",
    lawFirmId: "2",
    price: "¥2,800起",
    duration: "1-3周",
    lawyerName: "赵敏律师",
    lawyerTitle: "交通事故专业律师",
  },
  {
    id: "s6",
    title: "移民法律服务",
    description:
      "提供移民申请、签证办理、身份调整等全流程移民法律服务",
    category: "immigration",
    lawFirmId: "1",
    price: "¥30,000起",
    duration: "1-3个月",
    lawyerName: "陈立律师",
    lawyerTitle: "移民法律顾问",
  },
];

export const defaultMockSnapshot: MockDataSnapshot = {
  lawFirms: defaultLawFirms,
  legalServices: defaultLegalServices,
};
