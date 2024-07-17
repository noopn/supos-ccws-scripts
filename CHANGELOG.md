# 1.4.5

fix: pull 命令下跟踪文件信息无效，修改 isNoTrack

# 1.4.6

fix: dev 运行是检测 lockfile,可编程组件 4.2 以上版本路径是 / 结尾， 编译获取到的路径没有 /， 导致不匹配

# 1.4.7

fix: push 修复新建或修改文件 是否以 / 结尾， （受版本影响， 不确定修改具体版本）

# 1.4.8

fix: webpack dev server socket 断开链接，意外退出

# 1.4.9

fix: 路径问题导致 build push， isTrack 模式下无法精确跟踪文件

# 1.4.11

fix: 缓存文件路径修改为项目目录

# 1.4.12

fix: 修复了 resolve.modules 路径范围
chore: 修改 dev 资源注入方式
chore: 添加页面全局的默认样式，组件打包时不引入
chore: 通过 link 引入的包，更改依赖查找路径

# 1.4.16

chore: 每次获取用户信息前，退出上一次登录

# 1.4.18

chore: 修改 sw 检测时间
chore: 静置页面时刷新token

# 1.4.19

chore: 增补了 scriptUtil 的功能

# 1.4.20

fixed: 修复 scriptUtil request 方法解析字段错误

# 1.4.21

fixed: 修复 scriptUtil 和主线相同

# 1.4.22

chore: 增加了 test 命令
