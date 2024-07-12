/*
 * 配置文件
 * #####################################################################
 * # 注意：本配置文件需要提交到发布服务器上
 * # 保持变量的赋值为空值，除非有新变量的产生，请不要提交到git上去
 * # 可以使用config.development.js文件替代
 * #####################################################################
 * Copyright (c) 2018. supOS
 */

const configProduction = {
  domain: "",
  domain2: "",
  domain12: "/api/runtime",
  domainDam: "/supide-app/ide/runtime/oodm",
  domainOodm: "/supide-app/ide/runtime/oodm",
  domainDamRuntime: "/supide-app/ide/runtime/oodm-runtime",
  domain11: "",
  domainObject: "/api/compose/manage",
  domainNewObject: "/api/compose/manage/v3/objectselector",
  domainObjectSelect: "",
  domainIndustryApplication: "/api/compose/manage",
  domainIDE: "/inter-api/supide/v1",
  domainIDERuntime: "/inter-api/lcdp-runtime/v1",
  domainVideo: "/supide-app/ide/runtime/video",
  domainRbac: "/supide-app/ide/runtime/rbac/v1",
  domainFlow: "/supide-app/ide/runtime/flow-service/v1",
  domainConfig: "/supide-app/ide/runtime/config/configInfo",
  domainAuth: "/supide-app/ide/runtime/auth/v1",
  domainOpenapi: "/open-api",
  version: "0.1",
  domainPrefix: `${location.origin}/main`,
  domainPrefixTemp: `${location.origin}`,
  lzCloudDomain: "https://gateway-cloud.supos.com", // 蓝卓云相关接口服务地址
  environment: "prod", //* 由于 app-creator 拆包原因 , 为方便开发人员 通过 config.environment 指定不同的页面
  lzCloudLoginPage: "https://cloud.supos.com/internal?loginChannel=3",
};
export default () => configProduction;
