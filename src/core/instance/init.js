/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0
/**
 * 定义 Vue.prototype._init 方法
 * @param {*} Vue 构造函数
 */
export function initMixin (Vue: Class<Component>) {
    // 负责 Vue 初始化过程
  Vue.prototype._init = function (options?: Object) {
      // Vue 实例
    const vm: Component = this
    // 每个 Vue 实例都有一个 _uid，并且是依次递增的
    vm._uid = uid++

    // 避免被观察的标志 
    // TODO: 不明白
    vm._isVue = true
    // 合并选项
    // 处理组件配置项
    if (options && options._isComponent) {
      // 优化内部组件实例化
      // 因为动态选项合并非常慢，而且
      // 内部组件选项需要特殊处理
      // 每个子组件初始化时走这里，这里只做了一些性能优化，减少了原型链的动态查找
      // 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
      initInternalComponent(vm, options)
    } else {
        // 根组件： 选项合并，将全局配置选项合并到跟组件的局部配置上
        // 组件选项合并，发生在三个地方
        // 1. Vue.component(compName,Comp),做了选项合并，合并的 Vue 内置的全局组件和用户自己的注册的全局组件，最终都会放到全局的components选项中
        // 2. {components:{xxx}} 局部注册，执行编译器生成的 render 函数时做了选项合并，会合并全局配置项到组件局部配置项上
        // 3. 这里的根组件
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
        // 设置代理，将vm实例上的属性代理到 vm._renderProxy
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm

    // 重点： 整个初始化最重要的部分，核心

    // 组件关系属性的初始化，比如：$parent $root $children $refs
    initLifecycle(vm)
    // 初始化自定义事件
    // <comp @click="handleClick"></comp> 谁在监听 点击事件
    // 组件上事件的监听其实是子组件自己在监听，也就是说谁触发谁监听
    // 最终结果 this.$emit('click), this.$on('click', function handleClick(){})
    initEvents(vm)
    // 解析组件的插槽信息，等到 vm.$slot，处理渲染函数，得到vm.$createElement 方法，即 h 函数。
    initRender(vm)
    // 执行 beforeCreate 生命周期函数
    callHook(vm, 'beforeCreate')
    // 初始化 inject 选项，等到 result[key] = val 形式的配置对象，并做响应式处理，并代理每个 key 到 vm 实例
    initInjections(vm) // resolve injections before data/props
    // 响应式原理的核心，处理props methods computed data watch 
    initState(vm)
    // 解析组件配置项上的 provide 对象，将其挂载到 vm._provided 属性上。
    initProvide(vm) // resolve provide after data/props
    // 调用created生命周期
    callHook(vm, 'created')

    // 如果发现配置项上面有 el 选项，则自动调用 $mount 方法，也就是说有了 el 选项，就不需要再手动调用 $mount
    // 反之，如果没有 el 选项 则必须手动调用$mount
    if (vm.$options.el) {
        // 调用 $mount 方法，进入挂载阶段
      vm.$mount(vm.$options.el)
    }
  }
}
// 性能优化，打平配置对象上的属性，减少运行是原型链的查找，提高执行效率。
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
    // 基于 构造函数 上的配置对象创建 vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // 这样做是因为它比动态枚举更快。
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag
    // 有render函数，将其赋值到 vm.$options
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从构造函数上解析配置项
export function resolveConstructorOptions (Ctor: Class<Component>) {
    // 从实例构造函数上获取资源
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
        // 说明基类的配置项发生了更改
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 找到更改的选项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
          // 将更改的选项和 extend 选项合并
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 将新的选项赋值给 options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
