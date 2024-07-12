// import moment from 'moment';
/**
* @description 判断节点是否在自定义图元中
* @returns {boolean} true false
*/
export function isInCustomGraph(node) {
  return getIsInCustomGraph(node);
}
function getIsInCustomGraph(node) {
  let parent;
  if (node && node.getParent) {
    parent = node.getParent();
  }
  if (!parent) {
    return false;
  } else if (parent.a('symbolId')) {
    return true;
  } else {
    return getIsInCustomGraph(parent);
  }
}

/**
 * 对象选择器参数处理
 */

const getDataSource = ({ tab, selectedTemplate = {}, selectedInstance = {}, selectedProp = {}, subTab, key } = {}, split = ':', isCustomGraph = false, isReport = false) => {
  if (!key) {
    return getDataSourceV1({ tab, selectedInstance, selectedProp, subTab, key }, split);
  }
  let dataSource = '';
  const propsKey = subTab === 'service' ? 'name' : 'propertyName';
  if (tab === 'instance' && !_.isEmpty(selectedTemplate) && !_.isEmpty(selectedInstance)) {
    if (!_.isEmpty(selectedProp)) {
      dataSource = `${selectedTemplate.namespace}${split}${selectedTemplate.name}${split}${selectedInstance.name}${split}${selectedProp.namespace}${split}${selectedProp[propsKey]}`;
    } else {
      dataSource = `${selectedTemplate.namespace}${split}${selectedTemplate.name}${split}${selectedInstance.name}`;
    }
  }
  if (tab === 'template' && !_.isEmpty(selectedTemplate)) {
    dataSource = subTab === 'property' && !isCustomGraph ? `${selectedTemplate.namespace}${split}${selectedTemplate.name}` : `${selectedTemplate.namespace}${split}${selectedTemplate.name}${split}${selectedProp.namespace}${split}${selectedProp[propsKey]}`;
  }

  if (tab === 'network' && !_.isEmpty(selectedInstance)) {
    dataSource = selectedInstance.name;
  }

  if (tab === 'property' && !_.isEmpty(selectedTemplate) && !_.isEmpty(selectedProp)) {
    dataSource = [selectedTemplate.namespace, selectedTemplate.name, selectedInstance.name, selectedProp.namespace, selectedProp[propsKey]].filter(v => !!v).join(split);
  }

  if (tab === 'sql' && !_.isEmpty(selectedInstance) && !_.isEmpty(selectedProp)) {
    if (isReport) {
      dataSource = [selectedInstance.name, selectedProp.name].filter(v => !!v).join(':');
    } else {
      dataSource = [selectedInstance.name, selectedProp.name].filter(v => !!v).join('/');
    }
  }

  return dataSource;
};

// 2.7之前版本的数据源处理
const getDataSourceV1 = ({ tab, selectedInstance = {}, selectedProp = {}, subTab } = {}, split = ':') => {
  let dataSource = '';
  const [tempNamespace, tempName, propNamespace, serviceNamespace] = ['_default', '_default', '_default', '_default'];
  const propsKey = subTab === 'service' ? 'name' : 'propertyName';
  const subTabNamespace = subTab === 'service' ? serviceNamespace : propNamespace;
  if (tab === 'instance' && !_.isEmpty(selectedInstance)) {
    if (!_.isEmpty(selectedProp)) {
      dataSource = `${tempNamespace}${split}${tempName}${split}${selectedInstance.name}${split}${subTabNamespace}${split}${selectedProp[propsKey]}`;
    } else {
      dataSource = `${tempNamespace}${split}${tempName}${split}${selectedInstance.name}`;
    }
  }

  // 以前是大写
  if (tab === 'network' && tab === 'Network' && !_.isEmpty(selectedInstance)) {
    dataSource = selectedInstance.name;
  }

  if (tab === 'property' && !_.isEmpty(selectedProp)) {
    dataSource = `${tempNamespace}${split}${tempName}${split}${selectedInstance.name}${split}${propNamespace}${split}${selectedProp.propertyName}`;
  }
  return dataSource;
};

const getShowDataSource = ({ tab = '', selectedTemplate = {}, selectedInstance = {}, selectedProp = {}, subTab = '', key } = {}, split = ':', isCustomGraph = false) => {
  if (!key) {
    return getShowDataSourceV1({ tab, selectedInstance, selectedProp, subTab, key }, split);
  }
  let dataSource = '';
  // const propsKey = subTab === 'service' ? 'name' : 'showName';
  if (tab === 'instance' && !_.isEmpty(selectedTemplate) && !_.isEmpty(selectedInstance)) {
    if (!_.isEmpty(selectedProp)) {
      dataSource = `${selectedProp[selectedProp.showName ? 'showName' : 'name']}${split}${selectedInstance.showName}${split}${selectedTemplate.showName}`;
    } else if (_.has(selectedProp, 'showName') || _.has(selectedProp, 'name')) {
      dataSource = `${selectedProp[selectedProp.showName ? 'showName' : 'name']}${split}${selectedInstance.showName}`;
    } else {
      dataSource = selectedInstance.showName;
    }
    if (_.isArray(selectedProp)) {
      dataSource = selectedInstance.showName || selectedInstance.name;
    }
  }
  if (tab === 'template' && !_.isEmpty(selectedTemplate)) {
    dataSource = subTab === 'property' && !isCustomGraph ? `${selectedTemplate.showName}` : `${selectedProp[selectedProp.showName ? 'showName' : 'name']}${split}${selectedTemplate.showName}`;
  }

  if (tab === 'network' && !_.isEmpty(selectedInstance)) {
    dataSource = selectedInstance.showName;
  }

  if (tab === 'property' && !_.isEmpty(selectedTemplate) && !_.isEmpty(selectedProp)) {
    dataSource = [selectedProp[selectedProp.showName ? 'showName' : 'name'], selectedInstance.showName, selectedTemplate.showName].filter(v => !!v).join(split);
  }

  if (tab === 'sql' && !_.isEmpty(selectedInstance) && !_.isEmpty(selectedProp)) {
    dataSource = [selectedProp.showName, selectedInstance.name].filter(v => !!v).join(split);
  }

  return dataSource;
};

// 2.7之前版本的数据源显示处理
const getShowDataSourceV1 = ({ tab = '', selectedInstance = {}, selectedProp = {}, subTab = '' } = {}, split = ':') => {
  let dataSource = '';
  const propsKey = subTab === 'service' ? 'name' : 'showName';
  if (tab === 'instance' && !_.isEmpty(selectedInstance) && !_.isEmpty(selectedProp)) {
    dataSource = `${selectedProp[propsKey]}${split}${selectedInstance.showName}`;
  }

  // 以前是大写
  if (tab === 'Network' && !_.isEmpty(selectedInstance)) {
    dataSource = selectedInstance.showName || selectedInstance.name;
  }

  if (tab === 'property' && !_.isEmpty(selectedProp)) {
    dataSource = [selectedProp[propsKey], selectedInstance.showName].filter(v => !!v).join(split);
  }
  return dataSource;
};

const dataSourceChange = (dataSource, split = '.') => {
  const arr = dataSource && dataSource.split(split);
  if (arr && arr.length === 2) {
    return ['_default', '_default', arr[0], '_default', arr[1]].join(':');
  }
  return dataSource;
};

const getType = ({ tab, subTab, selectedInstance = {} } = {}) => {
  let type = '';
  if (_.isEmpty(tab)) {
    return;
  }
  if (tab === 'instance') {
    switch (subTab) {
      case 'property':
        type = 'instance.property';
        break;
      case 'service':
        type = 'instance.service';
        break;
      default:
        type = 'instance.property';
    }
    return type;
  }
  if (tab === 'template') {
    switch (subTab) {
      case 'property':
        type = 'template.data';
        break;
      case 'service':
        type = 'template.service';
        break;
      default:
        type = 'template.property';
    }
    return type;
  }

  if (tab === 'network' || tab === 'Network') {
    type = 'Network';
  }

  if (tab === 'property') {
    type = !_.isEmpty(selectedInstance) ? 'instance.property' : 'template.property';
  }

  if (tab === 'sql') {
    type = 'sql';
  }

  return type;
};


// // todo he dataStruct 一样
const getSelectedProp = (objects, detailed) => {
  if (detailed && detailed.isUpdateData) {
    if (objects.subTab === 'service') {
      const struct = _.get(detailed, 'output.primitiveTypeDefinition.property.aspect.format', '{}');
      return struct;
    }
    return detailed.dataStruct;
  }
  return getDataStruct(objects);
  // if (_.isEmpty(objects)) return '';
  // if (_.isArray(objects) && _.isArray(objects[0] && objects[0].selectedProp)) {
  //   return _.get(objects, '[0].selectedProp', []);
  // }
  // if (!_.isArray(objects) && _.isArray(objects.selectedProp)) {
  //   return _.get(objects, 'selectedProp', []);
  // }
  // return _.get(objects, 'selectedProp', {});
};


const getDataStruct = (objects) => {
  const object = _.isArray(objects) ? objects[0] : objects;
  const subTab = _.get(object, 'subTab', '');
  const tab = _.get(object, 'tab', '');
  const key = _.get(object, 'key', '');
  // 兼容2.7之前版本数据源
  if (!key) {
    if (subTab === 'property') {
      return _.get(object, 'selectedProp.dataStruct', []);
    }
  }
  if (subTab === 'property' && tab === 'template') {
    return _.get(object, 'selectedProp', []);
  }
  return [];
};

const getServiceJSON = (objects) => {
  const object = _.isArray(objects) ? objects[0] : objects;
  const tab = _.get(object, 'tab', '');
  const subTab = _.get(object, 'subTab', '');
  const key = _.get(object, 'key', '');
  let struct;
  if (subTab === 'service' || tab === 'sql') {
    // 兼容2.7之前版本数据源
    if (!key) {
      try { struct = JSON.parse(_.get(object, 'selectedProp.output.primitiveTypeDefinition.property.aspect.format', '{}') || '{}'); } catch (error) { struct = {}; }
      return struct;
    }
    try { struct = JSON.parse(_.get(object, 'selectedProp.output.jsonDesc', '{}') || '{}'); } catch (error) { struct = {}; }
    return struct;
  }
  return {};
};


const getServiceInputs = (objects) => {
  const object = _.isArray(objects) ? objects[0] : objects;
  const subTab = _.get(object, 'subTab', '');
  if (subTab === 'service') {
    return _.get(object, 'selectedProp.inputs', []);
  }
  return [];
};

const splitNameToObj = (item) => {
  const keyArr = item.fullName.split(':');
  const newItem = {
    object: {
      key: 'instance',
      selectedInstance: {
        name: item.instanceEnName || keyArr[2] || '',
        showName: item.instanceDisplayName || ''
      },
      selectedProp: {
        ioPath: item.fullName,
        namespace: item.namespace || keyArr[3] || '_default',
        [item.dataType ? 'propertyName' : 'name']: item.enName || keyArr[4] || '',
        primitiveType: item.dataType,
        showName: item.displayName
      },
      selectedTemplate: {
        name: item.templateEnName || keyArr[1] || '',
        namespace: item.templateNamespace || keyArr[0] || '_default',
        showName: item.templateDisplayName || ''
      },
      subTab: item.dataType ? 'property' : 'service',
      tab: 'instance'
    },
    dataSource: item.fullName,
    description: item.comment,
    max: item.max,
    min: item.min,
    name: `${item.instanceDisplayName}\\${item.enName}`,
    objectSelectorShowName: `${item.enName}:${item.instanceDisplayName}:${item.templateDisplayName}`,
    unit: item.unit || '',
    primitiveType: item.dataType,
    propertyType: item.dataType ? 'property' : 'service'
  };
  return newItem;
};

// 兼容 图元设计中的数据格式 todo 本身就是不对的 后期要改的
const getDefaultKey = (object = {}, node) => {
  if (_.isObject(object) && !_.isArray(object) && isInCustomGraph(node)) {
    const { tab, subTab, selectedProp } = object;
    if (tab === 'template' && subTab === 'property' && !_.isArray(selectedProp)) {
      return selectedProp.namespace ? `${selectedProp.namespace}.${selectedProp.propertyName}` : selectedProp.propertyName;
    }
  }
  return '';
};

export {
  getType,
  getDataSource,
  getShowDataSource,
  getSelectedProp,
  getDataStruct,
  getServiceJSON,
  getServiceInputs,
  dataSourceChange,
  splitNameToObj,
  getDefaultKey,
  getDataSourceV1
};
