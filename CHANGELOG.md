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

# 1.4.10

fix: 缓存文件路径修改为项目目录