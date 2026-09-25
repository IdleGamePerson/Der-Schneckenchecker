'use strict';
const TYPES={normal:{name:'Normale Schnecke',base:1,cost:10,effect:'Kein Zusatzeffekt.'},turbo:{name:'Turboschnecke',base:4,cost:50,effect:'Kein Zusatzeffekt.'},glue:{name:'Klebeschnecke',base:1,cost:200,effect:'Orthogonale Nachbarn: +⅓ Produktion.'}};
const UPGRADES={
 turboBase:{name:'Turbo-Zucht',cost:200,description:'Ab jetzt gekaufte Turboschnecken starten mit 50 % mehr Basisproduktion: 6 statt 4 Zellen/s. Bestehende Schnecken bleiben unverändert.'},
 turboTeam:{name:'Gemeinsam schneller',cost:300,description:'Turboschnecken produzieren +5 % pro aktiver normaler Schnecke. Additiv: 4 normale Schnecken geben +20 %. Die Basisproduktion bleibt unverändert.'},
 glueStack:{name:'Klebeverbund',cost:900,description:'Klebeboni stapeln multiplikativ: Jeder orthogonal angrenzende Klebenachbar gibt ×4/3 Produktion. Zwei geben ×16/9, drei ×64/27.'}
};
const Engine={
 fresh(){return {version:1,upgrades:[],cells:0,nextId:2,levels:{normal:0,turbo:0,glue:0},snails:[{id:1,type:'normal',base:1,effect:null,position:12}]};},
 price(type,level){let p=TYPES[type].cost;for(let i=0;i<level;i++)p*=1.1+.025*i;return p;},
 adjacent(a,b){return a!==null&&b!==null&&Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5)===1;},
 hasUpgrade(s,id){return (s.upgrades??[]).includes(id);},
 buyUpgrade(s,id){if(!Object.hasOwn(UPGRADES,id))throw Error('Unbekanntes Upgrade.');if(this.hasUpgrade(s,id))throw Error('Dieses Upgrade ist bereits gekauft.');const cost=UPGRADES[id].cost;if(s.cells<cost)throw Error('Nicht genug Zellen.');s.cells-=cost;(s.upgrades??=[]).push(id);},
 purchaseBase(s,type){return TYPES[type].base*(type==='turbo'&&this.hasUpgrade(s,'turboBase')?1.5:1);},
 glueCount(s,n){return n.position===null?0:s.snails.filter(x=>x.id!==n.id&&x.position!==null&&x.effect==='glue'&&this.adjacent(x.position,n.position)).length;},
 boosted(s,n){return this.glueCount(s,n)>0;},
 glueFactor(s,n){const count=this.glueCount(s,n);return (4/3)**(this.hasUpgrade(s,'glueStack')?count:Math.min(count,1));},
 turboFactor(s,n){return n.type==='turbo'&&this.hasUpgrade(s,'turboTeam')?1+.05*s.snails.filter(x=>x.type==='normal'&&x.position!==null).length:1;},
 production(s,n){return n.position===null?0:n.base*this.glueFactor(s,n)*this.turboFactor(s,n);},
 total(s){return s.snails.reduce((v,n)=>v+this.production(s,n),0);},
 buy(s,type){if(!Object.hasOwn(TYPES,type))throw Error('Unbekannte Schneckenart.');const p=this.price(type,s.levels[type]);if(!Number.isFinite(p)||s.cells<p)throw Error('Nicht genug Zellen.');s.cells-=p;s.levels[type]++;let n={id:s.nextId++,type,base:this.purchaseBase(s,type),effect:type==='glue'?'glue':null,position:null};s.snails.push(n);return n;},
 sellPrice(s,n){return this.price(n.type,Math.max(0,s.levels[n.type]-1));},
 sell(s,id){const n=s.snails.find(x=>x.id===id);if(!n||n.position!==null)throw Error('Nur Schnecken im Inventar können verkauft werden.');const p=this.sellPrice(s,n);s.cells+=p;s.levels[n.type]=Math.max(0,s.levels[n.type]-1);s.snails=s.snails.filter(x=>x.id!==id);return p;},
 move(s,id,position){const n=s.snails.find(x=>x.id===id);if(!n)throw Error('Schnecke nicht gefunden.');if(position!==null&&(!Number.isInteger(position)||position<0||position>24))throw Error('Ungültiges Feld.');if(position!==null){const other=s.snails.find(x=>x.position===position&&x.id!==id);if(other)other.position=n.position;}n.position=position;},
 valid(s){if(!s||s.version!==1||!Number.isFinite(s.cells)||s.cells<0||!Array.isArray(s.snails)||!Number.isInteger(s.nextId))return false;if(s.upgrades!==undefined&&(!Array.isArray(s.upgrades)||new Set(s.upgrades).size!==s.upgrades.length||s.upgrades.some(id=>!Object.hasOwn(UPGRADES,id))))return false;let ids=new Set(),positions=new Set();for(const t of Object.keys(TYPES))if(!Number.isInteger(s.levels?.[t])||s.levels[t]<0||s.levels[t]>10000)return false;for(const n of s.snails){if(!Object.hasOwn(TYPES,n.type)||!Number.isInteger(n.id)||n.id>=s.nextId||ids.has(n.id)||!Number.isFinite(n.base)||n.base<0||![null,'glue'].includes(n.effect))return false;ids.add(n.id);if(n.position!==null){if(!Number.isInteger(n.position)||n.position<0||n.position>24||positions.has(n.position))return false;positions.add(n.position);}}return true;}
};
if(typeof module!=='undefined')module.exports={Engine,TYPES,UPGRADES};
