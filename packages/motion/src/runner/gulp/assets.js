import { $, gulp } from './lib/helpers'
import opts from '../opts'
import { p, mkdir, handleError, log } from '../lib/fns'

export async function assets() {
  try {
    await Promise.all([
      assetsApp(),
      assetsStatics()
    ])
  }
  catch(e) {
    handleError(e)
  }
}

// app images, fonts, etc
function assetsApp() {
  const assets = {
    glob: ['*', '**/*', '!**/*.js', , '!**/*.js.map', '!.motion{,/**}' ],
    out: opts('buildDir')
  }

  let stream = gulp.src(assets.glob)

  if (opts('watch'))
    stream = stream.pipe($.watch(assets.glob, { readDelay: 1 }))

  return new Promise((resolve, reject) => {
    stream
        .pipe($.plumber())
        // .pipe($.fn(out.goodFile('⇢')))
        // .pipe($.filterEmptyDirs)
        .pipe(gulp.dest(assets.out))
        .on('end', () => {
          log.gulp('finished assets')
          resolve()
        })
        .on('error', reject)
  })
}

// .motion/static
async function assetsStatics() {
  const statics = {
    dir: p(opts('motionDir'), 'static'),
    glob: ['*', '**/*', '!.motion{,/**}'],
    out: p(opts('buildDir'), '_', 'static')
  }

  await mkdir(statics.out)

  let stream = gulp.src(statics.glob, { cwd: statics.dir })

  if (opts('watch'))
    stream = stream.pipe($.watch(statics.glob, { readDelay: 1 }))

  return new Promise((resolve, reject) => {
    stream
        .pipe($.plumber())
        // .pipe($.fn(out.goodFile('⇢')))
        // .pipe($.filterEmptyDirs)
        .pipe(gulp.dest(statics.out))
        .on('end', () => {
          log.gulp('finished statics')
          resolve()
        })
        .on('error', reject)
  })
}