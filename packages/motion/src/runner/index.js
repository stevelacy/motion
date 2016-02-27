'use strict'

import { CLI } from './cli'
import { run as runStartup, build } from './startup'

// print - so we can easily weed out console.logs
// print = we want to log this out, keep it
global.print = console.log.bind(console)

async function run() {
  const cli = new CLI()
  cli.activate()
  return cli
}

// TODO: This is for backward compatibility only, remove this in the upcoming future
export default { build, run }
