import cache from '../cache'
import opts from '../opts'
import normalize from './lib/normalize'
import npm from './lib/npm'
import filterWithPath from './lib/filterWithPath'
import { readPackageJSON, readInstalled } from './lib/installed'
import { writeExternals } from './externals'
import { writeInstalled } from './lib/installed'
import { rm, p, _, log, handleError } from '../lib/fns'

const LOG = 'externals'

export async function uninstall(rebundle) {
  try {
    if (!opts('hasRunInitialBuild')) return

    // get installed
    const installed = await readInstalled()

    // get imported
    const importedPaths = cache.getExternals()
    const imported = normalize(importedPaths)

    // difference, uniq
    const toUninstall = _.difference(installed, imported)

    // log(LOG, 'uninstall',
    //   'installed', installed,
    //   'imported', imported,
    //   'toUninstall', toUninstall,
    // )

    if (!toUninstall.length)
      return

    print(`\n  Uninstalling...`.bold)

    // do uninstalls
    const attempted = await Promise.all(toUninstall.map(async dep => {
      try {
        await npm.unsave(dep, toUninstall.indexOf(dep), toUninstall.length)
        print(`  ✘ ${dep}`.red)
        return dep
      }
      catch(e) {
        handleError(e)
        return false
      }
    }))

    const uninstalled = attempted.filter(l => !!l)

    log('externals', 'uninstalled', uninstalled)

    // if uninstalled stuff, write
    if (uninstalled.length) {
      const nowInstalled = _.difference(imported, uninstalled)
      const nowInstalledPaths = filterWithPath(importedPaths, nowInstalled)
      log(LOG, 'uninstall', 'nowInstalled', nowInstalled, 'nowInstalledPaths', nowInstalledPaths)
      await writeInstalled(nowInstalledPaths)
    }

    // if asked to rebundle or uninstalled, rebundle
    if (rebundle || uninstalled.length) {
      await writeExternals()
    }

    return uninstalled
  }
  catch(e) {
    handleError(e)
  }
}
