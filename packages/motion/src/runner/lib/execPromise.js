import { exec } from 'child_process'
import { log, handleError } from './fns'

export default function execPromise(cmd, cwd) {
  return new Promise((res, rej) => {
    log('exec', cmd, cwd)
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) rej(stdout)
      else res(stdout)
    })
  })
}
