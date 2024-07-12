import moment from 'moment';
import request from './request';
import getConfig from './config';

// /api/dam/template/normal/instance/query
export async function getVideoObjectQuery(params) {
  const { namespace, name, ...res } = params;
  const url = `${getConfig().domainDam}/template/normal/instance/query?namespace=${namespace}&name=${name}`;
  return request(url, {
    method: 'POST',
    body: {
      ...res
    }
  });
}

export async function getHistorySingleData({ dataSource, type, filters, appId, enableTotal }) {
  return request(`${getConfig().domainNewObject}/objectdata/query`,
    {
      method: 'POST',
      body: {
        dataSource,
        type,
        filters,
        appId,
        enableTotal
      },
      headers: {
        'OODM-UTC-OFFSET': moment().utcOffset(),
        'OODM-DATETIME-FORMAT': 'DEFAULT',
        'VALUE-TO-STRING': true
      }
    });
}

export async function getHistoryData(parameters) {
  return request(`${getConfig().domainNewObject}/objectdata/batchQuery`,
    {
      method: 'POST',
      body: {
        list: parameters
      },
      headers: {
        'OODM-UTC-OFFSET': moment().utcOffset(),
        'OODM-DATETIME-FORMAT': 'DEFAULT',
        'VALUE-TO-STRING': true
      }
    });
}

export async function queryVideoInfo({ list }) {
  return request(`${getConfig().domainIndustryApplication}/objectdata/batchQuery`, {
    method: 'POST',
    body: { list }, // 视频数据查询，暂不作扩展
    headers: { 'VALUE-TO-STRING': true }
  });
}

export async function queryInstanceData({ dataSource, resType, filters }) {
  return request(`${getConfig().domainIndustryApplication}/objectdata/query`, {
    method: 'POST',
    body: { dataSource, type: resType, filters }, // 实例数据查询，暂不作扩展,
    headers: { 'VALUE-TO-STRING': true }
  });
}

/** ***************实例, 模板, 功能集合相关接口**************** */

export async function getObjectProps({ originalSelectedObject: { selectedTemplate: { namespace, name }, selectedInstance: { name: instanceName } }, queryAll, pageNum = 1, pageSize = 20, searchKey }, hideMsg = false) {
  let url = `${getConfig().domainNewObject}/template/${namespace}/${name}/instance/${instanceName}/attributes?pageIndex=${pageNum}&pageSize=${pageSize}`;
  url = queryAll === false ? `${url}&queryAll=false` : url;
  url = searchKey ? `${url}&propName=${searchKey}` : url;
  return request(url, {}, hideMsg);
}

export async function editHistoryData(params) {
  return request(`${getConfig().domainObject}/v3/history/data`, {
    method: 'PUT',
    body: {
      input: params
    }
  }, true);
}

export async function getDataLinkProperties({ pageNum = 1, pageSize = 20, keyword, instanceName }) {
  let url = `${getConfig().domainObject}/attribute/search?pageIndex=${pageNum}&pageSize=${pageSize}&keyword=${keyword}`;
  if (instanceName) url += `&instanceName=${instanceName}`;
  return request(url);
}

// 查询单个服务详细信息
export async function getServiceInfo({ selectedTemplate: { namespace: tempNS, name: tempName }, selectedInstance: { name: instanceName }, selectedProp: { namespace: propNS, name: propName } }) {
  return request(`${getConfig().domainNewObject}/template/${tempNS}/${tempName}/instance/${instanceName}/service/${propNS}/${propName}`, {}, true);
}

// 查询单个表单模板信息
export async function getFormInfo({ originalSelectedObject: { selectedTemplate: { name, namespace } } }) {
  return request(`${getConfig().domainNewObject}/template/${namespace}/${name}/parents`);
}

// 查询模板属性列表
export async function getFormProperties({ originalSelectedObject: { selectedTemplate: { id } }, curPage, searchKey }) {
  let url = `${getConfig().domainNewObject}/${id}/type/property?pageIndex=${curPage}&pageSize=200`;
  url = searchKey ? `${url}&keyword=${searchKey}` : url;
  return request(url);
}

// 查询Sql
export async function getSqlExce({ name, appId, ...param }) {
  return request(`${getConfig().domainObject}/resource/scripts/exec`,
    {
      method: 'POST',
      body: {
        name,
        appId,
        ...param
      }
    });
}
