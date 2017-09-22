'use strict'

let fs = require('fs')
let gulp = require('gulp')
let screeps = require('gulp-screeps')
let rename = require('gulp-rename')
let insert = require('gulp-insert')
let minimist = require('minimist')

let args = minimist(process.argv.slice(2))

gulp.task('copy', () => {
  return gulp.src('src/**').pipe(rename((path) => {
    let parts = path.dirname.match(/[^/\\]+/g)
    let name = ''
    for (let i in parts) {
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
      return `${contents}\nglobal.SCRIPT_VERSION = ${+new Date()}` // jshint ignore:line
    }
    return contents
  })).pipe(gulp.dest('dist/'))
})

gulp.task('deploy', ['copy'], () => {
  let config = require('./.screeps.json')
  let opts = config[args.server || 'main']
  let options = {}
  if (!opts) {
    let err = new Error(`No configuration exists for server "${args.server || 'main'}`)
    err.showStack = false
    throw err
  }

  // allow overrides from passed arguments
  for (let i in args) { // jshint ignore:line
    opts[i] = args[i]
  }

  options.ptr = opts.ptr || false
  options.branch = opts.branch || 'default'
  options.email = opts.email
  options.password = opts.password
  options.host = opts.host || 'screeps.com'
  options.secure = !!opts.ssl || (options.host === 'screeps.com')
  options.port = opts.port || 443

  return gulp.src('dist/*.js').pipe(screeps(options))
})

gulp.task('ci-config', ['ci-version'], (cb) => {
  fs.writeFile('.screeps.json', JSON.stringify({
    main: {
      ptr: !!process.env.SCREEPS_PTR,
      branch: process.env.SCREEPS_BRANCH,
      email: process.env.SCREEPS_EMAIL,
      password: process.env.SCREEPS_PASSWORD,
      host: process.env.SCREEPS_HOST,
      ssl: !!process.env.SCREEPS_SSL,
      port: process.env.SCREEPS_PORT
    }
  }), cb)
})
gulp.task('ci-version', (cb) => {
  let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  let now = new Date()
  let seconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds()
  let year = now.getFullYear()
  let month = now.getMonth()
  let day = now.getDate()
  pkg.version = `${year}.${month}.${day}-${seconds}`
  fs.writeFile('package.json', JSON.stringify(pkg, null, 2), cb)
})
gulp.task('default', ['copy', 'deploy'])
