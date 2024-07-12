// 创建随机字符
export function createNonceStr(length = 16) {
  const chars = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
    'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
    'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
  ];
  const result = [];
  for (let i = 0; i < length; i += 1) {
    const n = parseInt(Math.random() * 51, 10);
    result.push(chars[n]);
  }
  return result.join('');
}

// 创建client标识并使用base64编码
export function createClientSymbol(clientID = 'supOS') {
  // 格式：{客户端id}$${时间戳}$${16位随机字符串}
  // 示例：
  //     编码前：supOS$$1691032840166$$gZwJUjBydiWRpAUV
  //     编码后：c3VwT1MkJDE2OTEwMzI4NDAxNjYkJGdad0pVakJ5ZGlXUnBBVVY=
  return window.btoa(`${clientID}$$${+new Date()}$$${createNonceStr()}`);
}
