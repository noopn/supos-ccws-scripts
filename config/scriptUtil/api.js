import { stringify } from 'qs';
import { Base64 } from 'js-base64';

import request from './request';
import getConfig from './config';

// 获取菜单列表
export async function getMenusList() {
  const basePath = `${getConfig().domainRbac}/menus1`;
  return request(`${basePath}/runtime`, {
    method: 'GET'
  });
}

export async function queryCompaniesList() {
  return request(`${getConfig().domain}/supide-app/ide/runtime/organization/v1/companies/sub/ref`, {
    method: 'GET'
  });
}

export async function newQueryRoleList({ companyCode = 1000, keyword, current, pageSize = 20 }) {
  let url = `${getConfig().domain}/supide-app/ide/runtime/rbac/v2/roles?companyCode=${companyCode}`;
  if (keyword) {
    url += `&key=${keyword}&current=${current}&pageSize=${pageSize}`;
  } else {
    url += `&current=${current}&pageSize=${pageSize}`;
  }
  return request(url, {
    method: 'GET'
  });
}

export async function queryRoleUser(params) {
  return request(`${getConfig().domainRbac}/roleUsers?current=1&pageSize=200&roleCode=${params.code}&cid=${params.cid}`, {
    method: 'GET'
  });
}

export async function queryRolesByUser(params) {
  return request(`${getConfig().domainRbac}/roles/queryRoleByUserId/${params.userId}`, {
    method: 'GET'
  });
}

// 列表
export async function getModelLabelList(params) {
  const keyWord = params.keyWord ? `&keyWord=${encodeURIComponent(params.keyWord)}` : '';
  const modelLabelsType = params.modelLabelsType ? `&modelLabelsType=${encodeURIComponent(params.modelLabelsType)}` : '';
  return request(
    `${getConfig().domain2}/api/metadata/modelLabels?page=${params.page || 1
    }&per_page=${params.per_page || 20000
    }${keyWord}${modelLabelsType}`
  );
}

// 编辑 树结构的改动
export async function updateFolderTree(data) {
  return request(`${getConfig().domainIndustryApplication}/order`, {
    method: 'PUT',
    body: data
  });
}

/*
 * 作用：配置报警颜色(获取)
 * 现有引用页面：systemInfoMgr(api) HistoryAlarm(api) RealAlarm(api)
*/
export async function getAlarmColor() {
  return request(`${getConfig().domainConfig}/user_widget_alarm_color`, {
    method: 'GET'
  });
}

/*
 * 作用：
 * 现有引用页面：HistoryAlarm(api)
*/
export async function alarmHisrtory(data) {
  return request(`${getConfig().domainOodm}/runtime/alert/history?${stringify(data)}`, {
    method: 'GET',
    timeout: 1000 * 300
  });
}


/*
 * 作用：
 * 现有引用页面：HistoryAlarm(api)
*/
export async function alarmHisrtoryExport(data) {
  return request(`${getConfig().domainOodm}/runtime/alert/history/export?${stringify(data)}`, {
    method: 'GET',
    timeout: 1000 * 300
  });
}


/*
 * 作用：静态资源管理－添加文件夹
 * 现有引用页面：StaticResource(api)
*/
export async function addNewFolderResource({ appId, path, folderName, isSuposRuntime = false, isBusiness = false }) {
  if (isBusiness) {
    return request(`${getConfig().domain11}/api/app/manager/images/folders`, {
      method: 'POST',
      body: {
        appId,
        path,
        folderName
      }
    });
  }
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/resources/folders`, {
    method: 'POST',
    body: {
      path,
      folderName
    }
  });
}

/*
 * 作用：静态资源管理－文件夹列表
 * 现有引用页面：StaticResource(api)
*/
export async function fetchFoldersList({ appId, path, isSuposRuntime = false, isBusiness = false }) {
  if (isBusiness) {
    const data = { appId, path };
    return request(`${getConfig().domain11}/api/app/manager/images/folders?${stringify(data)}`, {
      method: 'GET'
    });
  }
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/resources/folders?path=${path}`, {
    method: 'GET'
  });
}

/*
 * 作用：静态资源管理－图片列表
 * 现有引用页面：StaticResource(api)
*/
export async function fetchFileList({ appId, path, current = 1, keywords = '', filters, isSuposRuntime = false, isBusiness = false }) {
  if (isBusiness) {
    const data = { appId, path, current, pageSize: 1000, keywords };
    return request(`${getConfig().domain11}/api/app/manager/images/files?${stringify(data)}`, {
      method: 'GET'
    });
  }
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/resources/folders/files?keywords=${keywords}&path=${path}&current=${current}&pageSize=20${filters ? `&filters=${filters}` : ''}`, {
    method: 'GET'
  });
}

/*
 * 作用：静态资源管理－删除图片
 * 现有引用页面：StaticResource(api)
*/
export async function deleteImg({ appId, path, isSuposRuntime = false, isBusiness = false }) {
  if (isBusiness) {
    const data = { appId, filepath: path };
    return request(`${getConfig().domain11}/api/app/manager/images/files?${stringify(data)}`, {
      method: 'DELETE'
    });
  }
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/resources/folders/fileAndFolder?path=${path}`, {
    method: 'DELETE'
  });
}

/*
 * 作用：静态资源管理－云上资源
 * 现有引用页面：CloudResources(api)
*/
export async function fetchCloudFoldersList() {
  return request(`${localStorage.getItem('lzCloudDomain') || getConfig().lzCloudDomain}/store-components/component/graphicElement/listCategory`, {
    method: 'GET'
  });
}

/*
 * 作用：静态资源管理－云上资源
 * 现有引用页面：CloudResources(api)
*/
export async function fetchCloudFileList({ categoryCode, current }) {
  return request(`${localStorage.getItem('lzCloudDomain') || getConfig().lzCloudDomain}/store-components/component/graphicElement/pageByCategoryCode`, {
    method: 'POST',
    body: {
      categoryCode,
      current,
      pageSize: 1000
    }
  });
}
/*
 * 作用：静态资源管理－云上资源
 * 现有引用页面：CloudResources(api)
*/
export async function uploadImageBase64({ appId, path, Base64Data, filename }) {
  return request(`${getConfig().domain11}/api/app/manager/images/uploadImageBase64`, {
    method: 'POST',
    body: {
      appId,
      path,
      base64: Base64Data,
      filename
    }
  });
}

/*
 * 作用：实时报警
 * 现有引用页面：RealAlarm(api)
*/
export async function realAlarmList(data) {
  return request(`${getConfig().domainDam}/runtime/alert/current?${stringify(data)}`, {
    method: 'GET',
    timeout: 1000 * 300
  });
}

// 确认报警
export async function queryRealAlarm(data) {
  return request(`${getConfig().domainDam}/runtime/alert/ack`, {
    method: 'POST',
    body: data
  });
}

// 查询报警确认人
export async function ackUsersList() {
  // /api/dam/runtime/alert/ackUsers
  return request(`${getConfig().domainDam}/runtime/alert/ackUsers`, {
    method: 'GET'
  });
}

/*
 * 作用：批量查找属性和服务信息
 * 现有引用页面：DataSourceList(api)
*/
export async function queryPAndSBatchQuery(data) {
  return request(`${getConfig().domainDam}/instance/metadata/batchQuery`, {
    method: 'POST',
    body: data,
    headers: { 'VALUE-TO-STRING': true }
  });
}

export async function getAuthMenu({ appId, isSuposRuntime = false }) {
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/folders`);
}

export async function getAuthMenuSupos({ appId, isSuposRuntime = false }) {
  return request(`${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/menus/${appId}/all/compView`);
}

export async function getAuthMenuBusiness({ appId }) {
  const param = appId ? `?appId=${appId}` : '';
  return request(`${getConfig().domainRbac}/menus/runtime${param}`);
}

// 查询系统配置
export async function getConfigInfo(data) {
  return request(`${getConfig().domainConfig}/${data}`, {
    method: 'GET'
  });
}

/*
 * 作用：
 * 现有引用页面：workflow
*/
export async function getSingleRuntimeSetting(mkey) {
  return request(`${getConfig().domainAuth}/user/config/dashboard/${mkey}`, {
    method: 'GET'
  });
}

export async function getRuntimeSetting(mkeys) {
  return request(`${getConfig().domainAuth}/user/config/dashboard?${mkeys}`, {
    method: 'GET'
  });
}

/*
 * 作用：更新运行期保存用户配置信息接口
 * 现有引用页面：workflow
*/
export async function saveRuntimeSetting({ mkey, configInfo }) {
  const fields = JSON.stringify({ version: 'v1.0' });
  return request(`${getConfig().domainAuth}/user/config/dashboard`, {
    method: 'PUT',
    body: {
      mkey,
      configInfo,
      fields
    }
  });
}

/*
 * 作用：对象属性的详细信息
 * 现有引用页面：workflow(api)
*/
export async function queryPropertyBatchQuery(data) {
  return request(`${getConfig().domainNewObject}/objectdata/propertyBatchQuery`, {
    method: 'POST',
    body: data,
    headers: { 'VALUE-TO-STRING': true }
  });
}

export async function queryServiceBatchQuery(data) {
  return request(`${getConfig().domainObject}/serviceBatchQuery`, {
    method: 'POST',
    body: data
  });
}

/*
 * 作用：根据pageId获取页面及layout信息
 * 现有引用页面：workflow(api/models)
*/
export async function queryIndustryApplicationLayouts(pageId, kind, isDraft) {
  const parameter = kind || isDraft ? `?kind=${kind}&isDraft=${isDraft}` : '';
  const remoteDebug = false;
  return request(`${getConfig().domainIndustryApplication}/pages/${pageId}${parameter}`, {
    method: 'GET',
    headers: {
      'Cache-Control': 'public',
      Pragma: 'public'
    }
  }, false, true, false, remoteDebug);
}

/*
 * 作用：根据pageId修改页面及layout信息
 * 现有引用页面：workflow(api/models)
*/
export async function updateIndustryApplicationPage(pageId, appId, params) {
  const URI = `${getConfig().domainIndustryApplication}/pages/${pageId}?appId=${appId}`;
  return request(URI, {
    method: 'PUT',
    body: {
      ...params
    }
  });
}

/*
 * 作用：
 * 现有引用页面：workflow(api/models)
*/
export async function queryIndustryApplicationLayout(layoutId) {
  return request(`${getConfig().domainIndustryApplication}/layouts/${layoutId}`, {
    method: 'GET'
  });
}

/*
 * 作用：
 * 现有引用页面：workflow
*/
export async function updateIndustryApplicationLayout(data, params = {}) {
  const context = Object.assign(JSON.parse(data.context), { version: 'v1.0' });
  const extraBody = {};
  if (data.screenshot) extraBody.screenshot = data.screenshot;
  if (data.pageId) extraBody.pageId = data.pageId;
  if (data.plugins) extraBody.plugins = data.plugins;
  return request(`${getConfig().domainIndustryApplication}/layouts/${data.id}?appId=${data.appId}`, {
    method: 'PUT',
    headers: {
      loginMsg: Base64.encode(localStorage.getItem('loginMsg') || '{}')
    },
    body: {
      context: JSON.stringify(context),
      ...extraBody,
      ...params
    }
  });
}

/*
 * 作用：上传图标
 * 现有引用页面：workflow
*/
export async function uploadIcon(appId, file, isSuposRuntime = false) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', '');
  return request(
    `${isSuposRuntime ? getConfig().domainIDERuntime : getConfig().domainIDE}/apps/${appId}/resources/uploadResource`,
    {
      method: 'POST',
      body: formData,
      fetchType: 'file'
    }
  );
}

/*
 * 作用：运行期数据源配置
 * 现有引用页面：workflow
*/
export async function addPageConfig({ appId, pageId, content }) {
  return request(`${getConfig().domainIndustryApplication}/page_config`, {
    method: 'POST',
    body: {
      appId, pageId, content
    }
  });
}


/*
 * 作用：运行期数据源配置修改
 * 现有引用页面：workflow
*/
export async function editPageConfig({ content, configId }) {
  return request(`${getConfig().domainIndustryApplication}/page_config/${configId}`, {
    method: 'PUT',
    body: {
      content
    }
  });
}


/*
 * 作用：获取运行期数据源配置
 * 现有引用页面：workflow
*/
export async function getPageConfig({ pageId }) {
  return request(`${getConfig().domainIndustryApplication}/page_config?pageId=${pageId}`, {
    method: 'GET'
  });
}

/*
 * 作用：保活接口
*/
export async function keepLogin() {
  return request(`${getConfig().domain}/inter-api/auth/token/refresh`, {
    method: 'PUT'
  });
}


// 校验DataLink的表达式是否为表达式
export async function checkExpression(expression, isHiddenNote) {
  // if (isSuposRuntime) {
  return request(`${getConfig().domainDam}/check/Expression`, {
    method: 'POST',
    body: {
      parentType: 'instance',
      // encodeURIComponent(expression)
      expression
    }
  }, isHiddenNote);
  // }
  // return request(`${getConfig().domainDam}/check/Expression?parentType=instance&expression=${encodeURIComponent(expression)}`, {
  //   method: 'GET'
  // }, isHiddenNote);
}

// 校验sql的表达式是否为表达式
export async function checkSql(appId, sqlArr) {
  return request(`${getConfig().domainIndustryApplication}/resource/scripts/${appId}/checkExist`, {
    method: 'POST',
    body: sqlArr
  });
}

// 校验sql的表达式是否为表达式
export async function checkSingleSql(appId, sql) {
  return request(`${getConfig().domainIndustryApplication}/resource/scripts/getByName?appId=${appId}&name=${sql}&scriptTypes=SELECT`, {
    method: 'GET'
  });
}

// 获取列表
export async function getWorkprocessList(params) {
  return request(`${getConfig().domainFlow}/diagrams?appId=${params.appId}&current=${params.current}&pageSize=${params.pageSize}${params.enable ? `&enable=${params.enable}` : ''}`);
}

export async function getAllSymbolV3(symbols) {
  return request(`${getConfig().domain2}/api/compose/manage/symbol/batchQuery`,
    {
      method: 'POST',
      body: symbols
    }
  );
}

export async function getSymbol(id) {
  return request(
    `${getConfig().domain2}/api/compose/manage/symbol/${id}`,
    { method: 'GET' }
  );
}

// 获取自定义图元文件夹数据
export async function fetchTree(id) {
  return request(`${getConfig().domain2}/api/compose/manage/symbol/tree/${id}`);
}

// 编辑 图元
export async function editSymbol({ id, ...params }) {
  return request(`${getConfig().domain2}/api/compose/manage/symbol/${id}`,
    {
      method: 'PUT',
      body: { ...params }
    }
  );
}

// 更新当前页面对自定义组件的引用情况
export async function updateCustomWidgetReference({ appId, pageId, savedPlugins, lockId, elementKey }) {
  const plugins = savedPlugins.map(x => ({ pluginUid: x }));
  return request(`${getConfig().domainIDE}/apps/${appId}/files/${pageId}`,
    {
      method: 'PUT',
      body: {
        name: pageId,
        type: 'compView',
        plugins,
        lockId,
        elementKey
      }
    }
  );
}
