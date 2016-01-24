import './lib/checkForApp'
import Program from 'commander'
import colors from 'colors'
import { build } from '../runner'
import { name, version } from './info'

Program
  .option('-w, --watch', 'incremental builds')
  .option('-v, --debug [what]', 'output extra information for debugging')
  // .option('-i, --isomorphic', 'render template isomorphic')
  .option('--reset', 'resets cache, internals, bundles')
  .option('--cached', 'run from cache for speedup (may break)')
  .option('--nomin', 'avoid minification')
  .parse(process.argv)

build({
  name,
  version,
  watch: Program.watch,
  debug: Program.debug,
  reset: Program.reset,
  cached: Program.cached,
  nomin: Program.nomin,
  pretty: true,
})
