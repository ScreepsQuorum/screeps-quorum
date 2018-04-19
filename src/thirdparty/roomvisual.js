'use strict'
const colors = {
  gray: '#555555',
  light: '#AAAAAA',
  road: '#666', // >:D
  energy: '#FFE87B',
  rampart: '#434C43',
  power: '#F53547',
  dark: '#181818',
  outline: '#8FBB93',
  speechText: '#000000',
  speechBackground: '#2ccf3b'
}

const speechSize = 0.5
const speechFont = 'Times New Roman'

RoomVisual.prototype.structure = function(x,y,type,opts={}){
  opts = Object.assign({
    opacity: 1
  }, colors, opts)
  switch(type){
    case STRUCTURE_EXTENSION:
      this.circle(x,y,{
        radius: 0.5,
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.circle(x,y,{
        radius: 0.35,
        fill: opts.gray,
        opacity: opts.opacity
      })
      break
    case STRUCTURE_SPAWN:
      this.circle(x,y,{
        radius: 0.65,
        fill: opts.dark,
        stroke: '#CCCCCC',
        strokeWidth: 0.10,
        opacity: opts.opacity
      })
      this.circle(x,y,{
        radius: 0.40,
        fill: opts.energy,
        opacity: opts.opacity
      })

      break;
    case STRUCTURE_POWER_SPAWN:
      this.circle(x,y,{
        radius: 0.65,
        fill: opts.dark,
        stroke: opts.power,
        strokeWidth: 0.10,
        opacity: opts.opacity
      })
      this.circle(x,y,{
        radius: 0.40,
        fill: opts.energy,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_LINK:
    {
      let osize = 0.3
      let isize = 0.2
      let outer = [
        [0.0,-0.5],
        [0.4,0.0],
        [0.0,0.5],
        [-0.4,0.0]
      ]
      let inner = [
        [0.0,-0.3],
        [0.25,0.0],
        [0.0,0.3],
        [-0.25,0.0]
      ]
      outer = relPoly(x,y,outer)
      inner = relPoly(x,y,inner)
      outer.push(outer[0])
      inner.push(inner[0])
      this.poly(outer,{
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.poly(inner,{
        fill: opts.gray,
        stroke: false,
        opacity: opts.opacity
      })
      break;
    }
    case STRUCTURE_TERMINAL:
    {
      let outer = [
        [0.0,-0.8],
        [0.55,-0.55],
        [0.8,0.0],
        [0.55,0.55],
        [0.0,0.8],
        [-0.55,0.55],
        [-0.8,0.0],
        [-0.55,-0.55],
      ]
      let inner = [
        [0.0,-0.65],
        [0.45,-0.45],
        [0.65,0.0],
        [0.45,0.45],
        [0.0,0.65],
        [-0.45,0.45],
        [-0.65,0.0],
        [-0.45,-0.45],
      ]
      outer = relPoly(x,y,outer)
      inner = relPoly(x,y,inner)
      outer.push(outer[0])
      inner.push(inner[0])
      this.poly(outer,{
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.poly(inner,{
        fill: opts.light,
        stroke: false,
        opacity: opts.opacity
      })
      this.rect(x-0.45,y-0.45,0.9,0.9,{
        fill: opts.gray,
        stroke: opts.dark,
        strokeWidth: 0.1,
        opacity: opts.opacity
      })
      break;
    }
    case STRUCTURE_LAB:
      this.circle(x,y-0.025,{
        radius: 0.55,
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.circle(x,y-0.025,{
        radius: 0.40,
        fill: opts.gray,
        opacity: opts.opacity
      })
      this.rect(x-0.45,y+0.3,0.9,0.25,{
        fill: opts.dark,
        stroke: false,
        opacity: opts.opacity
      })
      {
        let box = [
          [-0.45,0.3],
          [-0.45,0.55],
          [0.45,0.55],
          [0.45,0.3],
        ]
        box = relPoly(x,y,box)
        this.poly(box,{
          stroke: opts.outline,
          strokeWidth: 0.05,
          opacity: opts.opacity
        })
      }
      break
    case STRUCTURE_TOWER:
      this.circle(x,y,{
        radius: 0.6,
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.rect(x-0.4,y-0.3,0.8,0.6,{
        fill: opts.gray,
        opacity: opts.opacity
      })
      this.rect(x-0.2,y-0.9,0.4,0.5,{
        fill: opts.light,
        stroke: opts.dark,
        strokeWidth: 0.07,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_ROAD:
      this.circle(x,y,{
        radius: 0.175,
        fill: opts.road,
        stroke: false,
        opacity: opts.opacity
      })
      if(!this.roads) this.roads = []
      this.roads.push([x,y])
      break;
    case STRUCTURE_RAMPART:
      this.circle(x,y,{
        radius: 0.65,
        fill: opts.rampart,
        stroke: opts.gray,
        strokeWidth: 0.10,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_WALL:
      this.circle(x,y,{
        radius: 0.40,
        fill: opts.dark,
        stroke: opts.light,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_STORAGE:
      let outer = [
        [-0.6, -.7],
        [0, -.8],
        [0.6, -.7],
        [0.65, 0],
        [0.6, .7],
        [0, .8],
        [-0.6, .7],
        [-0.65, 0],
      ];
      outer = relPoly(x, y, outer);
      outer.push(outer[0]);
      this.poly(outer, {
        fill: opts.dark,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.rect(x - .5, y - 0.6, 1, 1.2, {
        fill: opts.gray,
        stroke: opts.dark,
        strokeWidth: 0.1,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_OBSERVER:
      this.circle(x, y, {
        fill: opts.dark,
        radius: 0.45,
        stroke: opts.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      })
      this.circle(x + 0.225, y, {
        fill: opts.outline,
        radius: 0.20,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_NUKER:
      let outline = [
        [0,-1],
        [-0.47,0.2],
        [-0.5,0.5],
        [0.5,0.5],
        [0.47,0.2],
        [0,-1],
      ];
      outline = relPoly(x,y,outline)
      this.poly(outline,{
        stroke: opts.outline,
        strokeWidth: 0.05,
        fill: opts.dark,
        opacity: opts.opacity
      })
      let inline = [
        [0,-.80],
        [-0.40,0.2],
        [0.40,0.2],
        [0,-.80],
      ]
      inline = relPoly(x,y,inline)
      this.poly(inline,{
        stroke: opts.outline,
        strokeWidth: 0.01,
        fill: opts.gray,
        opacity: opts.opacity
      })
      break;
    case STRUCTURE_CONTAINER:
			this.rect(x - 0.225, y - 0.3, 0.45, 0.6,{
					fill: "yellow",
					opacity: opts.opacity,
					stroke: opts.dark,
					strokeWidth: 0.10,
				});
			break;
    default:
      this.circle(x, y, {
        fill: opts.light,
        radius: 0.35,
        stroke: opts.dark,
        strokeWidth: 0.20,
        opacity: opts.opacity
      })
      break;
  }
}

const dirs = [
  [],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1]
]

RoomVisual.prototype.connectRoads = function(opts={}){
  let color = opts.color || opts.road || 'white'
  if(!this.roads) return
  // this.text(this.roads.map(r=>r.join(',')).join(' '),25,23)
  this.roads.forEach(r=>{
    // this.text(`${r[0]},${r[1]}`,r[0],r[1],{ size: 0.2 })
    for(let i=1;i<=4;i++){
      let d = dirs[i]
      let c = [r[0]+d[0],r[1]+d[1]]
      let rd = _.some(this.roads,r=>r[0] == c[0] && r[1] == c[1])
      // this.text(`${c[0]},${c[1]}`,c[0],c[1],{ size: 0.2, color: rd?'green':'red' })
      if(rd){
        this.line(r[0],r[1],c[0],c[1],{
          color: color,
          width: 0.35,
          opacity: opts.opacity || 1
        })
      }
    }
  })
}


RoomVisual.prototype.speech = function(text, x, y, opts={}) {
  var background = !!opts.background ? opts.background : opts.speechBackground
  var textcolor = !!opts.textcolor ? opts.textcolor : opts.speechText
  var textstyle = !!opts.textstyle ? opts.textstyle : false
  var textsize = !!opts.textsize ? opts.textsize : speechSize
  var textfont = !!opts.textfont ? opts.textfont : speechFont
  var opacity = !!opts.opacity ? opts.opacity : 1

  var fontstring = ''
  if(textstyle) {
    fontstring = textstyle + ' '
  }
  fontstring += textsize + ' ' + textfont

  let pointer = [
    [-0.2, -0.8],
    [ 0.2, -0.8],
    [ 0,   -0.3]
  ]
  pointer = relPoly(x,y,pointer)
  pointer.push(pointer[0])

  this.poly(pointer,{
    fill: background,
    stroke: background,
    opacity: opacity,
    strokeWidth: 0.0
  })

  this.text(text, x, y-1, {
    color: textcolor,
    backgroundColor: background,
    backgroundPadding: 0.1,
    opacity: opacity,
    font: fontstring
  })
}


RoomVisual.prototype.animatedPosition = function (x, y, opts={}) {

  let color = !!opts.color ? opts.color : 'blue'
  let opacity = !!opts.opacity ? opts.opacity : 0.5
  let radius = !!opts.radius ? opts.radius : 0.75
  let frames = !!opts.frames ? opts.frames : 6


  let angle = (Game.time % frames * 90 / frames) * (Math.PI / 180);
  let s = Math.sin(angle);
  let c = Math.cos(angle);

  let sizeMod = Math.abs(Game.time % frames - frames / 2) / 10;
  radius += radius * sizeMod;

  let points = [
      rotate(0, -radius, s, c, x, y),
      rotate(radius, 0, s, c, x, y),
      rotate(0, radius, s, c, x, y),
      rotate(-radius, 0, s, c, x, y),
      rotate(0, -radius, s, c, x, y),
  ];

  return this.poly(points, {stroke: color, opacity: opacity});
}

function rotate(x, y, s, c, px, py) {
  let xDelta = x * c - y * s;
  let yDelta = x * s + y * c;
  return { x: px + xDelta, y: py + yDelta };
}


function relPoly(x,y,poly){
  return poly.map(p=>{
    p[0] += x
    p[1] += y
    return p
  })
}

RoomVisual.prototype.test = function test(){
  let demopos = [19,24]
  this.clear()
  this.structure(demopos[0]+0,demopos[1]+0,STRUCTURE_LAB)
  this.structure(demopos[0]+1,demopos[1]+1,STRUCTURE_TOWER)
  this.structure(demopos[0]+2,demopos[1]+0,STRUCTURE_LINK)
  this.structure(demopos[0]+3,demopos[1]+1,STRUCTURE_TERMINAL)
  this.structure(demopos[0]+4,demopos[1]+0,STRUCTURE_EXTENSION)
  this.structure(demopos[0]+5,demopos[1]+1,STRUCTURE_SPAWN)
}
