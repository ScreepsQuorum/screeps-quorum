'use strict'

class Performance {
  constructor () {
    if (!Memory.qos.performance) {
      Memory.qos.performance = {
        start: Game.time,
        programs: {}
      }
    }
  }

  addProgramStats (name, cpu) {
    if (!Memory.qos.performance.programs[name]) {
      Memory.qos.performance.programs[name] = {
        first: Game.time,
        count: 1,
        cpu: cpu,
        max: cpu
      }
      return
    }
    Memory.qos.performance.programs[name].count++
    Memory.qos.performance.programs[name].cpu += cpu
    if (Memory.qos.performance.programs[name].max < cpu) {
      Memory.qos.performance.programs[name].max = cpu
    }
  }

  report () {
    const programs = Object.keys(Memory.qos.performance.programs)
    programs.sort((a, b) => Memory.qos.performance.programs[b].cpu - Memory.qos.performance.programs[a].cpu)
    let report = 'Program\tAverage\tMax Cpu\t Total Cpu \t Ticks Run\n'
    for (const program of programs) {
      const max = Memory.qos.performance.programs[program].max
      const cpu = Memory.qos.performance.programs[program].cpu
      const count = Memory.qos.performance.programs[program].count
      const average = cpu / count
      report += `${program}\t ${average.toFixed(3)}\t${max.toFixed(3)}\t${cpu.toFixed(3)}\t${count}\n`
    }
    Logger.log(report, LOG_WARN, 'performance')
  }

  reportHtml () {
    const numTicks = (Game.time - Memory.qos.performance.start) + 1

    let report = '\n'

    const monitoriedPriorities = MONITOR_PRIORITIES
    monitoriedPriorities.sort()
    report += 'Priority Run Times (time between runs over last X ticks).'
    report += '<table width="350">'
    report += '<tr>'
    report += '<td>Priority</td>'
    report += '<td>200 Ticks</td>'
    report += '<td>1000 Ticks</td>'
    report += '<td>3000 Ticks</td>'
    report += '</tr>'

    for (const priority of monitoriedPriorities) {
      const stats = sos.lib.monitor.getPriorityRunStats(priority)
      if (stats) {
        report += '<tr>'
        report += `<td>${priority}</td>`
        report += `<td>${stats.short.toFixed(3)}</td>`
        report += `<td>${stats.medium.toFixed(3)}</td>`
        report += `<td>${stats.long.toFixed(3)}</td>`
        report += '</tr>'
      }
    }
    report += '</table>\n'

    report += `CPU Usage By Program - Stats collected for ${numTicks} ticks.`
    const programs = Object.keys(Memory.qos.performance.programs)
    programs.sort((a, b) => Memory.qos.performance.programs[b].cpu - Memory.qos.performance.programs[a].cpu)
    report += '<table width="500">'
    report += '<tr>'
    report += '<td>Program</td>'
    report += '<td>Average</td>'
    report += '<td>Max CPU</td>'
    report += '<td>Total CPU</td>'
    report += '<td>Ticks Run</td>'
    report += '</tr>'
    for (const program of programs) {
      const max = Memory.qos.performance.programs[program].max
      const cpu = Memory.qos.performance.programs[program].cpu
      const count = Memory.qos.performance.programs[program].count
      const average = cpu / count
      report += '<tr>'
      report += `<td>${program}</td>`
      report += `<td>${average.toFixed(3)}</td>`
      report += `<td>${max.toFixed(3)}</td>`
      report += `<td>${cpu.toFixed(3)}</td>`
      report += `<td>${count}</td>`
      report += '</tr>'
    }
    report += '</table>'
    Logger.log(report, LOG_WARN, 'performance')
  }

  clear () {
    Memory.qos.performance = {
      start: Game.time,
      programs: {}
    }
  }
}

module.exports = Performance
