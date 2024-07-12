// 用浏览器内部转换器实现html转码
export const htmlEncode = function (html) {
  // 1.首先动态创建一个容器标签元素，如DIV
  let temp = document.createElement('div');
  // 2.然后将要转换的字符串设置为这个元素的innerText(ie支持)或者textContent(火狐，google支持)
  if (temp.textContent !== undefined) {
    temp.textContent = html;
  } else {
    temp.innerText = html;
  }
  // 3.最后返回这个元素的innerHTML，即得到经过HTML编码转换的字符串了
  const output = temp.innerHTML;
  temp = null;
  return output;
};
// 用浏览器内部转换器实现html解码
export const htmlDecode = function (text) {
  // 1.首先动态创建一个容器标签元素，如DIV
  let temp = document.createElement('div');
  // 2.然后将要转换的字符串设置为这个元素的innerHTML(ie，火狐，google都支持)
  temp.innerHTML = text;
  // 3.最后返回这个元素的innerText(ie支持)或者textContent(火狐，google支持)，即得到经过HTML解码的字符串了。
  const output = temp.innerText || temp.textContent;
  temp = null;
  return output;
};
// 用正则表达式实现html转码
export const htmlEncodeByRegExp = function (str) {
  let s = '';
  if (str.length === 0) return '';
  s = str.replace(/&/g, '&amp;');
  s = s.replace(/</g, '&lt;');
  s = s.replace(/>/g, '&gt;');
  s = s.replace(/ /g, '&nbsp;');
  s = s.replace(/'/g, '&#39;');
  s = s.replace(/'/g, '&quot;');
  return s;
};
// 用正则表达式实现html解码
export const htmlDecodeByRegExp = function (str) {
  let s = '';
  if (str.length === 0) return '';
  s = str.replace(/&amp;/g, '&');
  s = s.replace(/&lt;/g, '<');
  s = s.replace(/&gt;/g, '>');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/&quot;/g, "'");
  return s;
};
