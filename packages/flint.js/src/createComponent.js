import ReactDOMServer from 'react-dom/server'
import React from 'react'
import raf from 'raf'
import Radium from 'radium'

import phash from './lib/phash'
import log from './lib/log'
import hotCache from './mixins/hotCache'
import reportError from './lib/reportError'
import runEvents from './lib/runEvents'
import createElement from './tag/createElement'
import viewOn from './lib/viewOn'

const capitalize = str =>
  str[0].toUpperCase() + str.substring(1)

const pathWithoutProps = path =>
  path.replace(/\.[a-z0-9\-]+$/, '')

let views = {}
let viewErrorDebouncers = {}

export default function createComponent(Flint, Internal, name, view, options = {}) {
  const el = createElement(name)
  let isChanged = options.changed

  if (process.env.production)
    return createViewComponent()

  if (options.changed) {
    views[name] = createViewComponent()
  }

  // once rendered, isChanged is used to prevent
  // unnecessary props hashing, for faster hot reloads
  Flint.on('render:done', () => {
    isChanged = false
  })

  return createProxyComponent()

  // proxy components handle hot reloads
  function createProxyComponent() {
    return React.createClass({

      childContextTypes: {
        path: React.PropTypes.string,
        displayName: React.PropTypes.string
      },

      contextTypes: {
        path: React.PropTypes.string
      },

      getChildContext() {
        return {
          path: this.getPath()
        }
      },

      getPath() {
        if (!this.path) this.setPath()
        return this.path
      },

      getSep() {
        return name == 'Main' ? '' : ','
      },

      setPathKey() {
        const flint = this.props.__flint
        const key = flint && flint.key || '00'
        const index = flint && flint.index || '00'
        const parentPath = this.context.path || ''
        this.pathKey = `${parentPath}${this.getSep()}${name}-${key}/${index}`
      },

      setPath() {
        this.setPathKey()

        if (!isChanged) {
          const prevPath = Internal.paths[this.pathKey]
          if (prevPath) {
            this.path = prevPath
            return
          }
        }

        const propsHash = phash(this.props)
        this.path = `${this.pathKey}.${propsHash}`

        // for faster retrieval hot reloading
        Internal.paths[this.pathKey] = this.path
      },

      onMount(component) {
        const path = this.getPath()
        const lastRendered = component.lastRendered

        Internal.mountedViews[name] = Internal.mountedViews[name] || []
        Internal.mountedViews[name].push(this)
        Internal.viewsAtPath[path] = component

        if (lastRendered)
          Internal.lastWorkingRenders[pathWithoutProps(path)] = lastRendered

        Internal.lastWorkingViews[name] = { component }
      },

      render() {
        const View = views[name]

        let viewProps = Object.assign({}, this.props)

        viewProps.__flint = viewProps.__flint || {}
        viewProps.__flint.onMount = this.onMount
        viewProps.__flint.path = this.getPath()

        return React.createElement(View, viewProps)
      }
    })
  }

  // create view
  function createViewComponent() {
    const component = React.createClass({
      displayName: name,
      name,
      Flint,
      el,

      mixins: [hotCache({ Internal, options, name })],

      // TODO: shouldComponentUpdate based on hot load for perf
      shouldComponentUpdate() {
        return !this.isPaused
      },

      shouldUpdate(fn) {
        if (this.hasShouldUpdate) {
          reportError({ message: `You defined shouldUpdate twice in ${name}, remove one!`, fileName: `view ${name}` })
          return
        }

        this.hasShouldUpdate = true

        const flintShouldUpdate = this.shouldComponentUpdate.bind(this)

        this.shouldComponentUpdate = (nextProps) => {
          if (!flintShouldUpdate()) return false
          return fn(nextProps)
        }
      },

      // LIFECYCLES

      getInitialState() {
        const fprops = this.props.__flint

        Internal.getInitialStates[fprops ? fprops.path : 'Main'] = () => this.getInitialState()

        let u = null

        this.queuedUpdate = false
        this.firstRender = true
        this.isUpdating = true
        this.styles = { _static: {} }
        this.events = { mount: u, unmount: u, change: u, props: u }
        this.path = null

        // scope on() to view
        this.viewOn = viewOn(this)

        // cache Flint view render() (defined below)
        const flintRender = this.render

        this.renders = []

        // setter to capture view render
        this.render = renderFn => {
          this.renders.push(renderFn)
        }

        // call view
        if (process.env.production)
          view.call(this, this, this.viewOn, this.styles)
        else {
          try {
            view.call(this, this, this.viewOn, this.styles)
            this.recoveryRender = false
          }
          catch(e) {
            Internal.caughtRuntimeErrors++
            reportError(e)
            console.error(e.stack)
            this.recoveryRender = true
          }
        }

        // reset original render
        this.render = flintRender

        return null
      },

      runEvents(name) {
        runEvents(this.events, name)
      },

      componentWillReceiveProps(nextProps) {
        this.props = nextProps
        this.runEvents('props')
      },

      componentWillMount() {
        if (name === 'Main')
          Internal.firstRender = false

        // componentWillUpdate only runs after first render
        this.runEvents('props')
      },

      componentDidMount() {
        this.isRendering = false
        this.mounted = true
        this.isUpdating = false

        this.runEvents('mount')

        if (this.queuedUpdate) {
          this.queuedUpdate = false
          this.update()
        }

        if (!process.env.production) {
          this.props.__flint.onMount(this)
          this.setID()
        }
      },

      componentWillUnmount() {
        // fixes unmount errors github.com/flintjs/flint/issues/60
        if (!process.env.production)
          this.render()

        this.runEvents('unmount')
        this.mounted = false
      },

      componentWillUpdate() {
        this.isUpdating = true
        this.runEvents('change')
      },

      setID() {
        // set flintID for state inspect
        const node = ReactDOM.findDOMNode(this)
        if (node) node.__flintID = this.props.__flint.path
      },

      componentDidUpdate() {
        this.isRendering = false
        this.isUpdating = false

        if (this.queuedUpdate) {
          this.queuedUpdate = false
          this.update()
        }

        if (!process.env.production) {
          this.setID()
        }
      },

      // FLINT HELPERS

      // helpers for controlling re-renders
      pause() { this.isPaused = true },
      resume() { this.isPaused = false },

      // for looping while waiting
      delayUpdate() {
        if (this.queuedUpdate) return
        this.queuedUpdate = true
        this.update()
      },

      // soft = view.set()
      update(soft) {
        // view.set respects paused
        if (soft && this.isPaused)
          return

        // if during a render, wait
        if (this.isRendering || this.isUpdating || Internal.firstRender || !this.mounted) {
          this.queuedUpdate = true
        }
        else {
          this.isUpdating = true
          this.queuedUpdate = false

          if (soft)
            this.setState({ renders: 1 })
          else
            this.forceUpdate()
        }
      },

      // helpers for context
      childContext(obj) {
        if (!obj) return

        Object.keys(obj).forEach(key => {
          this.constructor.childContextTypes[key] =
            React.PropTypes[typeof obj[key]]
        })

        this.getChildContext = () => obj
      },

      getWrapper(tags, props, numRenders) {
        const wrapperName = name.toLowerCase()

        let tagProps = Object.assign({
          isWrapper: true
        }, props)

        return this.el(`view.${name}`, tagProps, ...tags)
      },

      getRender() {
        if (this.recoveryRender)
          return this.getLastGoodRender()

        let tags, props
        let addWrapper = true
        const numRenders = this.renders && this.renders.length

        if (!numRenders) {
          tags = []
          props = { yield: true }
        }

        else if (numRenders == 1) {
          tags = this.renders[0].call(this)

          addWrapper = (
            Array.isArray(tags) ||
            !tags.props
          )

          if (!Array.isArray(tags) && tags.props && tags.props.__flint && tags.props.__flint.tagName != name.toLowerCase()) {
            addWrapper = true
            tags = [tags]
          }
        }

        else if (numRenders > 1) {
          tags = this.renders.map(r => r.call(this))
        }

        // if $ = false, unwrap if possible
        // if (this.styles._static && this.styles._static.$ == false && tags.length == 1) {
        //   addWrapper = false
        //   tags = tags[0]
        // }

        // top level tag returned false
        if (!tags)
          addWrapper = true

        const wrappedTags = addWrapper ?
          this.getWrapper(tags, props, numRenders) :
          tags

        const cleanName = name.replace('.', '-')
        const viewClassName = `View${cleanName}`
        const parentClassName = wrappedTags.props.className
        const className = parentClassName
          ? `${viewClassName} ${parentClassName}`
          : viewClassName

        const withClass = React.cloneElement(wrappedTags, { className })

        return withClass
      },

      getLastGoodRender() {
        return Internal.lastWorkingRenders[pathWithoutProps(this.props.__flint.path)]
      },

      render() {
        const self = this

        self.isRendering = true
        self.firstRender = false

        if (process.env.production)
          return self.getRender()
        else {
          clearTimeout(viewErrorDebouncers[self.props.__flint.path])
        }

        // try render
        try {
          const els = self.getRender()
          self.lastRendered = els
          return els
        }
        catch(e) {
          Internal.caughtRuntimeErrors++

          // console warn, with debounce
          viewErrorDebouncers[self.props.__flint.path] = setTimeout(() => {
            console.groupCollapsed(`Render error in view ${name} (${e.message})`)
            console.warn(e.message)

            if (e.stack && Array.isArray(e.stack))
              console.error(...e.stack.split("\n"))
            else
              console.error(e)

            console.groupEnd()
          }, 500)

          reportError(e)

          const lastRender = self.getLastGoodRender()

          try {
            let inner = <span>Error in view {name}</span>

            if (Internal.isDevTools)
              return inner

            if (lastRender) {
              let __html = ReactDOMServer.renderToString(lastRender)
              __html = __html.replace(/\s*data\-react[a-z-]*\=\"[^"]*\"/g, '')
              inner = <span dangerouslySetInnerHTML={{ __html }} />
            }

            // highlight in red and return last working render
            return (
              <span style={{ display: 'block', position: 'relative' }}>
                <span className="__flintError" />
                {inner}
              </span>
            )
          }
          catch(e) {
            log("Error rendering last version of view after error")
          }
        }
      }
    })

    return Radium(component)
  }
}
