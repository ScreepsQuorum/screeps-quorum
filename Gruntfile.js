'use strict'

module.exports = function (grunt) {
  require('time-grunt')(grunt)

  var currentdate = new Date()
  grunt.log.subhead('Task Start: ' + currentdate.toLocaleString())


  // Pull defaults (including username and password) from .screeps.json
  var config = require('./.screeps.json')


  var screeps_options = {}

  var server = grunt.option('server') || 'main'
  grunt.log.writeln('Server: ' + server)


  // If the server is PTR enable the PTR option but use the "main" server settings
  if(server === 'ptr') {
    server = 'main'
    screeps_options['ptr'] = true
  }

  // If there is no config for this setting just use defaults and command line overrides
  if(!config[server]) {
    config[server] = {}
  }

  // Use "sim" branch by default
  if(!config[server]['branch']) {
    config[server]['branch'] = 'sim'
  }

  // Allow grunt options to override default configuration
  screeps_options['branch'] = grunt.option('branch') || config[server].branch
  screeps_options['email'] = grunt.option('email') || config[server].email
  screeps_options['password'] = grunt.option('password') || config[server].password


  // Add private server settings.
  if (server !== 'main') {
    screeps_options['hostname'] = grunt.option('hostname') || config[server].hostname
    screeps_options['ssl'] = grunt.option('ssl') || !!config[server].ssl
    var port = grunt.option('ssl')
    if(!!port) {
      screeps_options['port'] = port
    }
  }

  if (screeps_options['hostname']) {
      grunt.log.writeln('Host: ' + screeps_options['hostname'])
  }

  grunt.log.writeln('Branch: ' + screeps_options['branch'])


  // Load needed tasks
  grunt.loadNpmTasks('grunt-screeps')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-file-append')

  grunt.initConfig({

    // Push all files in the dist folder to screeps. What is in the dist folder
    // and gets sent will depend on the tasks used.
    screeps: {
      options: screeps_options,
      dist: {
        src: ['dist/*.js']
      }
    },

    // Copy all source files into the dist folder, flattening the folder
    // structure by converting path delimiters to underscores
    copy: {
      // Pushes the game code to the dist folder so it can be modified before
      // being send to the screeps server.
      screeps: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**',
          dest: 'dist/',
          filter: 'isFile',
          rename: function (dest, src) {
            // Change the path name utilize underscores for folders
            return dest + src.replace(/\//g,'_')
          }
        }]
      }
    },

    // Add variable to mark this as packaged.
    // Change to git commit?
    file_append: {
      versioning: {
        files: [
          {
            append: `\nglobal.SCRIPT_VERSION = ${currentdate.getTime()}\n`,
            input: 'dist/version.js',
          }
        ]
      }
    },

    // Remove all files from the dist folder.
    clean: {
      'dist': ['dist']
    },
  })

  grunt.registerTask('default', ['package', 'screeps'])
  grunt.registerTask('package', ['clean', 'copy:screeps',  'file_append:versioning'])
  grunt.registerTask('reset',   ['clean'])
}
