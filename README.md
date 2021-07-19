# vue 源码解读
## 目录结构
benchmarks 性能、基准测试
dist  构建打包的输出目录
examples 案例目录
flow flow 语法的类型声明
packages 一些额外的包，比如：负责服务端渲染的包 vue-server-renderer、配合 vue-loader 使用的的 vue-template-compiler，还有 weex 相关的
scripts 所有的配置文件的存放位置，比如 rollup 的配置文件
src vue 源码目录
    compiler 编译器
    core 运行时的核心包
        components 全局组件，比如 keep-alive
        config.js 一些默认配置项
        global-api 全局 API，比如熟悉的：Vue.use()、Vue.component() 等
        instance Vue 实例相关的，比如 Vue 构造函数就在这个目录下
        observer 响应式原理
        util 工具方法
        vdom 虚拟 DOM 相关，比如熟悉的 patch 算法就在这儿
    platforms 平台相关的编译器代码
    server 服务端渲染相关
test 测试目录
types TS 类型声明

> 入口  /src/core/instance/index.js

> 记得回头看 vue git提交规范

### Vue 的初始化过程（new Vue(options)）都做了什么？
- 处理组件配置项
    - 初始化根组件时进行了选项合并操作，将全局配置合并到根组件的局部配置上
    - 初始化每个子组件时做了一些性能优化，将组件配置对象上的一些深层次属性放到 vm.$options选项中，以提高代码的执行效率
- 初始化组件实例的关系属性，比如$parent、$children、$root、$refs等
- 处理自定义事件
- 调用beforeCreate钩子函数
- 初始化组件的inject配置项，得到ret[key] = val 形式的配置对象，然后对该配置对象进行响应式处理，并代理每个key到vm实例上
- 数据响应式，处理props、methods、data、computed、watch等选项
- 解析组件配置项上的 provide 对象，将其挂载到 vm._provided 属性上
- 调用created钩子函数
- 如果发现配置上有el选项，则自动调用$mount方法，也就是说有了el选项，就不需要再手动调用$mount方法，反之，没提供el选项则必须调用$mount
- 接下来进入挂载阶段
