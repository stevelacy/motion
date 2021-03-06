import { handleError, log, writeFile, readFile } from './fns'

// uses a simple lock to ensure reads and writes are done safely

export default async function createWriter(filePath, { debug = '', json = false, defaultValue = '' }) {
  // helpers
  const logw = log.writer.bind(null, debug.yellow)

  // internal state
  let cache = null
  let cacheStr = null
  let isChanged = true

  // init
  try {
    await read()
  }
  catch(e) {
    try {
      await write((_, write) => write(defaultValue))
    }
    catch(e) {
      handleError(e)
    }
  }

  // public
  async function read() {
    try {
      if (cache) return cache
      logw('reading file', filePath)
      let state = await readFile(filePath)

      cacheStr = state

      if (json) {
        state = JSON.parse(state)
        cache = state
      }

      return state
    }
    catch(e) {
      logw(e, e.stack)
      return defaultValue
    }
  }

  async function write(writer) {
    try {
      // logw('waiting...')
      if (lock) await lock
      const unlock = getLock()
      const state = await read()
      let result = await stateWriter(writer, state, unlock)
    }
    catch(e) {
      handleError(e)
    }
  }

  function hasChanged() {
    let result = isChanged
    logw('hasChanged?', result)
    isChanged = false
    return result
  }


  // private
  let lock = null
  let unlock = null

  function getLock() {
    // logw('lock', lock)

    if (lock)
      return unlock
    else {
      // logw('no lock, returning new')
      lock = new Promise(res => {
        unlock = () => {
          lock = null
          res()
        }
      })

      return unlock
    }
  }

  function stateWriter(writer, state, unlock) {
    // logw('about to call writer...')
    return new Promise((res, rej) => {
      writer(state, async toWrite => {
        const finish = () => {
          unlock()
          res()
        }

        let toWriteRaw

        // do this before doing equality checks for cache
        if (json) {
          toWriteRaw = toWrite
          toWrite = JSON.stringify(toWrite, null, 2)
        }

        if (cacheStr == toWrite) {
          logw('hasnt changed!'.bold)
          finish()
          return
        }

        try {
          await writeFile(filePath, toWrite)

          isChanged = true
          cacheStr = toWrite
          cache = toWriteRaw

          finish()
        }
        catch(e) {
          rej(e)
        }
      })
    })
  }



  // API
  return {
    read,
    write,
    hasChanged
  }
}