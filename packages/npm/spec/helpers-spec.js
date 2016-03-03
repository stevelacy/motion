'use babel'

import Path from 'path'
import { exists, versionFromRange, manifestPath } from '../lib/helpers'
const { it } = require(process.env.SPEC_HELPER_SCRIPT)
const rootDirectory = Path.normalize(Path.join(__dirname, '..'))

describe('exists', function() {
  it('works', async function() {
    expect(await exists(__filename)).toBe(true)
    expect(await exists('/tmp/non-existent-file')).toBe(false)
  })
})

describe('versionFromRange', function() {
  it('extracts a version from semver range', function() {
    const version = '^2.2.0'
    expect(versionFromRange(version)).toEqual(['2.2.0'])
  })
  it('works even on complex ranges', function() {
    const version = '>=1.4.0 <2.0.0'
    expect(versionFromRange(version)).toEqual(['1.4.0', '2.0.0'])
  })
})

describe('manifestPath', function() {
  it('works on children', async function() {
    expect(await manifestPath('sb-promisify', rootDirectory)).toBe(Path.join(rootDirectory, 'node_modules', 'sb-promisify', 'package.json'))
    try {
      await manifestPath('sb-hello', rootDirectory)
      expect(false).toBe(true)
    } catch (_) {
      expect(_.message).toContain('Unable to determine')
    }
  })
  it('works on parents', async function() {
    expect(await manifestPath('babel', rootDirectory)).toBe(Path.normalize(Path.join(rootDirectory, '..', '..', 'node_modules', 'babel', 'package.json')))
  })
})