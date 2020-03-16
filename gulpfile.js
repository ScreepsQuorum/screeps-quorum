'use strict'

const fs = require('fs')
const gulp = require('gulp')
const screeps = require('gulp-screeps')
const rename = require('gulp-rename')
const insert = require('gulp-insert')
const del = require('del')
const minimist = require('minimist')
const git = require('git-rev-sync')

const args = minimist(process.argv.slice(2))
const commitdate = git.date()

gulp.task('clean', () => {
  return del('dist/*')
})

gulp.task('copy', gulp.series('clean', () => {
  const src = gulp.src('src/**/*.js')
  return src.pipe(rename((path) => {
    const parts = path.dirname.match(/[^/\\]+/g)
    let name = ''
    for (const i in parts) {
      if (parts[i] !== '.') {
        name += parts[i] + '_'
      }
    }
    name += path.basename
    path.basename = name
    path.dirname = ''
  })).pipe(insert.transform(function (contents, file) {
    let name = file.path.match(/[^/\\]+/g)
    name = name[name.length - 1]
    if (name === 'version.js') {
      return `${contents}\nglobal.SCRIPT_VERSION = ${+commitdate}` // jshint ignore:line
    }
    return contents
  })).pipe(gulp.dest('dist/'))
}))

function deploy () {
  const config = require('./.screeps.json')
  const opts = config[args.server || 'main']
  const options = {}
  if (!opts) {
    const err = new Error(`No configuration exists for server "${args.server || 'main'}`)
    err.showStack = false
    throw err
  }

  // allow overrides from passed arguments
  for (const i in args) { // jshint ignore:line
    opts[i] = args[i]
  }

  options.ptr = opts.ptr || false
  options.branch = opts.branch || 'default'

  if (opts.token) {
    options.token = opts.token
  } else {
    options.email = opts.email || opts.username
    options.password = opts.password
  }

  if (args.server && args.server !== 'main' && !opts.host) {
    options.host = args.server
  } else {
    options.host = opts.host || 'screeps.com'
  }
  options.secure = !!opts.ssl || (options.host === 'screeps.com')
  options.port = opts.port || 443

  return gulp.src('dist/*.js').pipe(screeps(options))
}

gulp.task('deploy', gulp.series('copy', () => {
  return deploy()
}))

gulp.task('ci-version', (cb) => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const seconds = (commitdate.getHours() * 3600) + (commitdate.getMinutes() * 60) + commitdate.getSeconds()
  const year = commitdate.getFullYear()
  const month = commitdate.getMonth() + 1
  const day = commitdate.getDate()
  pkg.version = `${year}.${month}.${day}-${seconds}`
  fs.writeFile('package.json', JSON.stringify(pkg, null, 2), cb)
})

gulp.task('ci-config', gulp.series('ci-version', (cb) => {
  fs.writeFile('.screeps.json', JSON.stringify({
    main: {
      ptr: !!process.env.SCREEPS_PTR,
      branch: process.env.SCREEPS_BRANCH,
      token: process.env.SCREEPS_TOKEN,
      host: process.env.SCREEPS_HOST,
      ssl: !!process.env.SCREEPS_SSL,
      port: process.env.SCREEPS_PORT
    }
  }), cb)
}))

gulp.task('default', gulp.series('deploy'))
