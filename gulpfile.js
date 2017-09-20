'use strict'

let fs = require('fs')
let gulp = require('gulp')
let screeps = require('gulp-screeps')
let rename = require('gulp-rename')
let insert = require('gulp-insert')


let rawArgs = process.argv.slice(2)
let args = {}
for (let i in rawArgs) { // jshint ignore:line
  let v = rawArgs[i].match(/--([^\s]+)=([^\s]+)/)
  args[v[1]] = v[2]
}

gulp.task('copy', () => {
  gulp.src('src/**').pipe(rename((path) => {
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

gulp.task('deploy', () => {
  let config = require('./.screeps.json')
  let opts = config[args.server || 'main']
  let options = {}
  if (!opts) {
    let err = new Error(`No configuration exists for server "${args.server || 'main'}`)
    err.showStack = false
    throw err
  }

  options.ptr = opts.ptr
  options.branch = opts.branch
  options.email = opts.email
  options.password = opts.password
  options.host = opts.hostname
  options.secure = !!opts.ssl
  options.port = opts.port

  // allow overrides from passed arguments
  for (let i in args) { // jshint ignore:line
    opts[i] = args[i]
  }

  return gulp.src('dist/*.js').pipe(screeps(options))
})

gulp.task('ci-config', (cb) => {
  fs.writeFile('.screeps.json', JSON.stringify({
    main: {
      ptr: !!process.env.SCREEPS_PTR,
      branch: process.env.SCREEPS_BRANCH || 'default',
      email: process.env.SCREEPS_EMAIL,
      password: process.env.SCREEPS_PASSWORD,
      host: process.env.SCREEPS_HOST || 'screeps.com',
      ssl: !!process.env.SCREEPS_SSL || (process.env.SCREEPS_HOST === 'screeps.com'),
      port: process.env.SCREEPS_PORT || 443
    }
  }))
})

gulp.task('default', ['copy', 'deploy'])
