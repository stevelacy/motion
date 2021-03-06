import { omit } from 'lodash'

function pathToName(path) {
  let p = path.split(',')
  return p[p.length - 1].split('-')[0]
}

function filterProps(props) {
  let leaveOut = ['if', 'repeat', 'style', 'yield', '__motion']
  return omit.apply(null, [props].concat(leaveOut))
}

view Inspector.View {
  prop highlight, closing, path, onClose

  const inspect = window.Motion.inspect
  let name
  let active = false
  let state = {}
  let props = null
  let writeBack = null

  on.delay(60, () => {
    active = true
  })

  on.unmount(() => {
    delete window._Motion.inspector[path]
  })

  on.props(() => {
    if (closing === true) active = false
    if (!path) return

    name = pathToName(path)

    // if not inspecting, inspect
    if (!_Motion.inspector[path]) {
      inspect(path, (_props, _state, _wb) => {
        props = filterProps(_props || {})
        state = _state || {}
        writeBack = _wb
        view.update()
      })
    }
  })

  let hasKeys = o => o && Object.keys(o).length > 0
  let edit = () => _DT.messageEditor({ type: 'focus:element', view: name })

  <view class={{ active, highlight }}>
    <Close onClick={onClose} fontSize={20} size={35} />
    <top>
      <name>{name}</name>
      <edit if={false} onClick={edit}>edit</edit>
    </top>

    <Inspector.Section title="Props" if={hasKeys(props)} class="props">
      <Tree editable={false} data={props} />
    </Inspector.Section>

    <Inspector.Section title="State" if={hasKeys(state)}>
      <Tree
        editable={true}
        onSet={(key, value) => {
          writeBack && writeBack(key, value)
        }}
        data={state}
      />
    </Inspector.Section>
  </view>

  $view = {
    position: 'relative',
    pointerEvents: 'auto',
    margin: 6,
    marginBottom: 0,
    padding: [0, 0, 1],
    minWidth: 220,
    minHeight: 34,
    fontSize: 12,
    userSelect: 'none',
    cursor: 'default',
    background: '#fff',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.15)',
    border: '1px solid #ccc',
    borderRadius: 4,
    color: '#333',
    transition: 'all ease-in 60ms',
    opacity: 0,
    transform: {
      x: 20
    }
  }

  $top = {
    flexFlow: 'row',
    paddingBottom: 10
  }

  $active = {
    opacity: 1,
    transform: {
      x: 0
    }
  }

  $highlight = {
    border: '2px solid #afb4e2'
  }

  $Close = {
    top: -5,
    right: -5,
    fontSize: 13
  }

  $name = {
    fontWeight: 400,
    color: 'rgba(0,0,0,0.8)',
    padding: [8, 8, 0],
    margin: [0, 0, -6],
    fontSize: 14
  }

  $edit = {
    padding: [8, 8, 0],
    fontSize: 14,
    margin: [0, 0, -6],
    marginLeft: 4,
    fontWeight: 400,
    color: 'rgba(24, 101, 227, 0.8)',
  }

  $expanded = {
    transform: { y: 0 }
  }

  $input = {
    borderRadius: 100,
    border: '1px solid #ccc',
    width: '100%',
    padding: [2, 12],
    color: '#333',
    fontSize: 14,
  }

  $title = {
    display: 'none',
    color: '#333',
    fontWeight: 200,
    fontSize: 12,
    margin: [3, 0]
  }

  $section = {
    background: [0,0,0,0.05]
  }
}
