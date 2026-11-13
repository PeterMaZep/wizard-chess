const $ = id => document.getElementById(id);

const G = {p:'\u265F\uFE0E', n:'\u265E', b:'\u265D', r:'\u265C', q:'\u265B', k:'\u{1F9D9}'};
const N = {p:'Pawn', n:'Knight', b:'Bishop', r:'Rook', q:'Queen', k:'King'};
const SD = {w:'White', b:'Black', x:'Both sides'};

const D = {
  r: [[1,0],[-1,0],[0,1],[0,-1]],
  b: [[1,1],[1,-1],[-1,1],[-1,-1]]
};
D.q = D.k = D.r.concat(D.b);

const KN = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];

const PV = {p:100, n:320, b:330, r:500, q:900};

const CP = {
  range: ['b','r','q'],
  freeze: ['p','n','b','r','q'],
  nocap: ['p','n','b','r','q','k']
};

const KINDS = {
  borrow: 'Shapeshift: piece also moves like another',
  leap: 'Levitation: piece can jump over one piece',
  range: 'Haste: piece moves up to N squares',
  immune: 'Ward: piece is immune to a type',
  back: 'Time slip: pawns can also move backward',
  extra: 'Chain spell: move again after a capture'
};

const NEED = {borrow:'ab', leap:'a', range:'an', immune:'ab', back:'', extra:'a'};

const PRE = [
  ['Shapeshift: knight moves like a king', {k:'borrow', side:'x', a:'n', b:'k'}],
  ['Rooks levitate over one piece', {k:'leap', side:'x', a:'r'}],
  ['Pawns slip back in time', {k:'back', side:'x', a:'p'}],
  ['King haste (2 squares)', {k:'range', side:'x', a:'k', n:2}],
  ['Chain spell: queen', {k:'extra', side:'x', a:'q'}],
  ['Ward the queen against pawns', {k:'immune', side:'x', a:'q', b:'p'}]
];

const ELO_MIN = 300;
const ELO_MAX = 3200;
const ELO_SNAP = 50;
const eloText = e => e >= ELO_MAX ? "Full strength" : `${e} Elo`;

let S;
let sel = null;
let legal = [];
let hist = [];
let rules = [];
let human = 'w';
let elo = 1500;
let busy = false;
let tok = 0;
let since = 0;
let two = false;
let gid = 0;
let badge = null;
let judged = {};
let endDismissed = false;
let recordedGid = -1;
let lastDelta = 0;

let online = null;
let replaying = false;
