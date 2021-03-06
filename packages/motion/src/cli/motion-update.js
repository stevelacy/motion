console.log(`\nUpdating...`)

var colors = require('colors')
var execSync = require('child_process').execSync

let progValue = execSync('npm get progress').toString().trim()

// this makes npm faster
execSync('npm set progress=false')

try {
  console.log('cleaning npm cache...')
  execSync('npm cache clean --loglevel=error')

  console.log('npm install -g motion...')
  execSync('npm install -g motion --loglevel=error')
}
catch(e) {
  console.log('Error attempting to install new motion version, attempting uninstall + reinstall...')

  execSync('npm uninstall -g motion --loglevel=error')
  execSync('npm install -g motion --loglevel=error')
}

execSync(`npm set progress=${progValue}`)