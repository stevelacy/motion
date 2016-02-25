import opts from '../opts'
import execPromise from '../lib/execPromise'
import handleError from '../lib/handleError'
import { difference, without, last } from 'lodash'

const fileName = path => last(path.split('/'))
const toCompilerError = ({ path, message, line, start }) =>
  ({ type: 'flow', stack: '', loc: { line, col: start }, path, file: fileName(path), message })


// so we can send compile:success after issues are fixed
let errorPaths = []

export default class Flow {
  constructor(bridge) {
    this.running = false
    this.queued = false
    this.bridge = bridge
  }

  activate() {
    this.run()
  }

  success(out) {
    console.log('no flow errors');
    this.bridge.broadcast('compile:success', '', 'error')
    errorPaths = []
  }

  error(out) {
    try {
      const { errors } = JSON.parse(out)
      let first = errors[0]
      first.path = first.message[0].path
      first.message = first.message
        .map(({ descr }) => descr).join(' ')

      errorPaths = without(errorPaths, first.path).concat([first.path])
      //const firstMessage
      handleError(toCompilerError(first))
    } catch (e) {
      console.log(handleError(e));
    }
  }

  queue() {
    if (!this.running) this.run()
    this.queued = true
  }

  async run() {
    const cmd = `
      flow check ${opts('appDir')} --json
    `

    this.running = true
    this.startTime = +(new Date())
    try {
      console.log('cmd is ', cmd);
      const out = await execPromise(cmd)
      this.success(out)
    } catch (e) {
      this.error(e);
    }

    this.running = false

    console.log('Flow took ', +(new Date()) - this.startTime);
    if (this.queued) this.run()

    this.queued = false
  }
}
