'use strict'

function getId () {
  if(!Memory.__sos_serverid) {
    Memory.__sos_serverid = sos.lib.uuid.v4().substring(24, 36)
  }
  return Memory.__sos_serverid
}

function getLabel () {
  if(!!Memory.__sos_serverlabel) {
    return Memory.__sos_serverlabel
  }
  return getId()
}

function setLabel (label) {
  Memory.__sos_serverlabel = label
}

module.exports = {
  getId: getId,
  getLabel: getLabel,
  setLabel: setLabel,
}
