/*
 * 常量文件
 * Copyright (c) 2018. supOS
 */
// import { pot, valve } from './sysTemp';
import commonMessage from './messages';

export function getMessageByCode(code) {
  const messagesObj = localStorage.getItem('composeManage_language_message') || '{}';
  const names = JSON.parse(messagesObj) || {};
  return names[code];
}

export const codeMessage = {
  200: getServiceMessage('common.service200'),
  201: getServiceMessage('common.service201'),
  202: getServiceMessage('common.service202'),
  204: getServiceMessage('common.service204'),
  400: getServiceMessage('common.service400'),
  401: getServiceMessage('common.service401'),
  403: getServiceMessage('common.service403'),
  404: getServiceMessage('common.service404'),
  406: getServiceMessage('common.service406'),
  410: getServiceMessage('common.service410'),
  422: getServiceMessage('common.service422'),
  500: getServiceMessage('common.service500'),
  502: getServiceMessage('common.service502'),
  503: getServiceMessage('common.service503'),
  504: getServiceMessage('common.service504')
};

export function tabsName(intl) {
  return {
    Controller: intl.formatMessage(commonMessage.chooseCompoent),
    Address: intl.formatMessage(commonMessage.URLparameter),
    Filter: intl.formatMessage(commonMessage.filterMachine),
    Camera: intl.formatMessage(commonMessage.StreamSource),
    instance: intl.formatMessage(commonMessage.objectInstance),
    template: intl.formatMessage(commonMessage.objectTemplate),
    feature: intl.formatMessage(commonMessage.featureCollection),
    network: intl.formatMessage(commonMessage.network),
    property: intl.formatMessage(commonMessage.attribute)
  };
}

export function allActions(intl) {
  const actions = [
    { value: 'onChange', label: intl.formatMessage(commonMessage.changeContent) },
    { value: 'onLoad', label: intl.formatMessage(commonMessage.loadContent) },
    { value: 'onSelect', label: intl.formatMessage(commonMessage.selected) },
    { value: 'onClick', label: intl.formatMessage(commonMessage.click) },
    { value: 'onDoubleClick', label: intl.formatMessage(commonMessage.dbclick) },
    { value: 'onFocus', label: intl.formatMessage(commonMessage.focus) },
    { value: 'onBlur', label: intl.formatMessage(commonMessage.onblur) },
    { value: 'onSelectCalendar', label: intl.formatMessage(commonMessage.selected) },
    { value: 'click', label: intl.formatMessage(commonMessage.click) },
    { value: 'didMount', label: intl.formatMessage(commonMessage.ComponentCompleted) },
    { value: 'interfaceAfter', label: intl.formatMessage(commonMessage.InterfaceAfter) },
    { value: 'pointClick', label: intl.formatMessage(commonMessage.singleClick) },
    { value: 'pointDubleClick', label: intl.formatMessage(commonMessage.doubleClick) },
    { value: 'onInit', label: intl.formatMessage(commonMessage.initContent) },
    { value: 'onUploadComplete', label: intl.formatMessage(commonMessage.uploadComplete) },
    { value: 'resetCell', label: intl.formatMessage(commonMessage.resetCell) },
    { value: 'openPage', label: intl.formatMessage(commonMessage.openNew) },
    { value: 'showModal', label: intl.formatMessage(commonMessage.openModal) },
    { value: 'editCell', label: intl.formatMessage(commonMessage.editCell) },
    { value: 'clickCell', label: intl.formatMessage(commonMessage.clickCell) },
    { value: 'editEnd', label: intl.formatMessage(commonMessage.editEnd) },
    { value: 'none', label: intl.formatMessage(commonMessage.null) }
  ];

  return actions;
}

export const fontSizeItems = ['8', '9', '10', '11', '12', '13', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];
export const fontFamilyItems = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria ',
  'Century ',
  'Courier New',
  'Comic Sans MS',
  'Garamond',
  'Georgia',
  'Malgun Gothic ',
  'Mangal ',
  ' Meiryo',
  'MS Gothic',
  'MS Mincho',
  'MS PGothic',
  'MS PMincho',
  'Roboto',
  'Tahoma',
  'Times',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Wingdings'
];

// TODO: 统一处理国际化
export function getServiceMessage(code) {
  return getMessageByCode(code) || '';
}

// 报表打印基本参数
export const printSetting = {
  orientation: 'portrait',
  size: 'a4',
  centering: ['horizontal'],
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  header: 0,
  footer: 0,
  scale: 'zoomScale',
  zoomScale: 100
};

// 组态文件版本号
export const JSON_VERSION = 'V2';

// 静态资源前缀
export const STATICBASE_DESIGN = '/inter-api/supide/v1/resource/';
export const STATICBASE_RUNTIME = '/supide-app/resources/';
