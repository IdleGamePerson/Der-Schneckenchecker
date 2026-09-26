'use strict';
const TYPES={
 normal:{name:'Normale Schnecke',base:1,cost:10,effect:'Kein Zusatzeffekt.'},
 turbo:{name:'Turboschnecke',base:4,cost:50,effect:'Kein Zusatzeffekt.'},
 glue:{name:'Klebeschnecke',base:1,cost:200,effect:'Orthogonale Nachbarn: +⅓ Produktion.'},
 space:{name:'Freiraumschnecke',base:3,cost:500,effect:'Eigene Produktion × (1 + freie orthogonale Nachbarfelder).'},
 line:{name:'Linienschnecke',base:1,cost:2000,effect:'Alle Schnecken ihrer Reihe oder Spalte (auch sie selbst): +25 % Produktion. Mehrere stapeln nicht.'},
 amplifier:{name:'Verstärkerschnecke',base:1,cost:6000,effect:'Alle aktiven normalen Schnecken: +50 % Produktion je aktiver Verstärkerschnecke, additiv.'}
};
const UPGRADES={
 turboBase:{name:'Turbo-Zucht',cost:200,description:'Ab jetzt gekaufte Turboschnecken starten mit 50 % mehr Basisproduktion: 6 statt 4 Zellen/s. Bestehende Schnecken bleiben unverändert.'},
 turboTeam:{name:'Gemeinsam schneller',cost:300,description:'Turboschnecken produzieren +5 % pro aktiver normaler Schnecke. Additiv: 4 normale Schnecken geben +20 %. Die Basisproduktion bleibt unverändert.'},
 glueStack:{name:'Klebeverbund',cost:900,description:'Klebeboni stapeln multiplikativ: Jeder orthogonal angrenzende Klebenachbar gibt ×4/3 Produktion. Zwei geben ×16/9, drei ×64/27.'},
 edge:{name:'Randkolonie',cost:1800,description:'Schnecken auf Randfeldern erhalten +50 % Produktion; in den vier Ecken gilt stattdessen +125 %. Kein Bonus auf die Basisproduktion.'},
 spaceDiagonal:{name:'Freie Diagonalen',cost:3000,description:'Freiraumschnecken zählen zusätzlich alle diagonal angrenzenden leeren Felder innerhalb des Brettes.'},
 glueDiagonal:{name:'Diagonalkleber',cost:4500,description:'Klebeschnecken verstärken diagonal angrenzende Schnecken um +⅙ Produktion. Ohne Klebeverbund zählt nur der stärkste Klebebonus.'},
 lineAdd:{name:'Liniennetz',cost:10000,description:'Mehrere Linienschnecken stapeln additiv: +25 % pro aktiver Linienschnecke in derselben Reihe oder Spalte.'},
 amplifierTurbo:{name:'Turboverstärkung',cost:15000,description:'Der +50-%-Bonus jeder Verstärkerschnecke wird pro aktiver Turboschnecke um 5 % stärker, additiv.'},
 inactiveBoost:{name:'Inventarreserve',cost:25000,description:'Alle aktiven Schnecken erhalten +1 % Produktion pro inaktiver Schnecke, additiv. Die Basisproduktion bleibt gleich.'},
 lineMultiply:{name:'Linienpotenz',cost:75000,description:'Linienboni stapeln multiplikativ (×1,25 je Linienschnecke). Dies ersetzt die additive Stapelung von „Liniennetz“.'}
};
const Engine={
 fresh(){return {version:1,upgrades:[],cells:0,nextId:2,levels:Object.fromEntries(Object.keys(TYPES).map(type=>[type,0])),snails:[{id:1,type:'normal',base:1,effect:null,position:12}]};},
 price(type,level){let p=TYPES[type].cost;for(let i=0;i<level;i++)p*=1.1+.025*i;return p;},
 adjacent(a,b){return a!==null&&b!==null&&Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5)===1;},
 hasUpgrade(s,id){return (s.upgrades??[]).includes(id);},
 buyUpgrade(s,id){if(!Object.hasOwn(UPGRADES,id))throw Error('Unbekanntes Upgrade.');if(this.hasUpgrade(s,id))throw Error('Dieses Upgrade ist bereits gekauft.');const cost=UPGRADES[id].cost;if(s.cells<cost)throw Error('Nicht genug Zellen.');s.cells-=cost;(s.upgrades??=[]).push(id);},
 purchaseBase(s,type){return TYPES[type].base*(type==='turbo'&&this.hasUpgrade(s,'turboBase')?1.5:1);},
 diagonal(a,b){return a!==null&&b!==null&&Math.abs(Math.floor(a/5)-Math.floor(b/5))===1&&Math.abs(a%5-b%5)===1;},
 glueCounts(s,n){if(n.position===null)return {orthogonal:0,diagonal:0};let orthogonal=0,diagonal=0;for(const x of s.snails){if(x.id===n.id||x.position===null||x.effect!=='glue')continue;if(this.adjacent(x.position,n.position))orthogonal++;else if(this.hasUpgrade(s,'glueDiagonal')&&this.diagonal(x.position,n.position))diagonal++;}return {orthogonal,diagonal};},
 boosted(s,n){const {orthogonal,diagonal}=this.glueCounts(s,n);return orthogonal+diagonal>0;},
 glueFactor(s,n){const {orthogonal,diagonal}=this.glueCounts(s,n);if(this.hasUpgrade(s,'glueStack'))return (4/3)**orthogonal*(7/6)**diagonal;return orthogonal?4/3:diagonal?7/6:1;},
 turboFactor(s,n){return n.type==='turbo'&&this.hasUpgrade(s,'turboTeam')?1+.05*s.snails.filter(x=>x.type==='normal'&&x.position!==null).length:1;},
 emptyNeighborCount(s,n){if(n.position===null)return 0;const row=Math.floor(n.position/5),col=n.position%5,occupied=new Set(s.snails.filter(x=>x.position!==null).map(x=>x.position));let count=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr===0&&dc===0)continue;if(dr!==0&&dc!==0&&!this.hasUpgrade(s,'spaceDiagonal'))continue;const r=row+dr,c=col+dc;if(r>=0&&r<5&&c>=0&&c<5&&!occupied.has(r*5+c))count++;}return count;},
 lineFactor(s,n){const count=s.snails.filter(x=>x.type==='line'&&x.position!==null&&(Math.floor(x.position/5)===Math.floor(n.position/5)||x.position%5===n.position%5)).length;if(this.hasUpgrade(s,'lineMultiply'))return 1.25**count;if(this.hasUpgrade(s,'lineAdd'))return 1+.25*count;return count?1.25:1;},
 normalFactor(s,n){if(n.type!=='normal')return 1;const amplifiers=s.snails.filter(x=>x.type==='amplifier'&&x.position!==null).length,turbos=this.hasUpgrade(s,'amplifierTurbo')?s.snails.filter(x=>x.type==='turbo'&&x.position!==null).length:0;return 1+.5*amplifiers*(1+.05*turbos);},
 edgeFactor(s,n){if(!this.hasUpgrade(s,'edge'))return 1;const row=Math.floor(n.position/5),col=n.position%5;if((row===0||row===4)&&(col===0||col===4))return 2.25;return row===0||row===4||col===0||col===4?1.5:1;},
 inventoryFactor(s){return this.hasUpgrade(s,'inactiveBoost')?1+.01*s.snails.filter(x=>x.position===null).length:1;},
 production(s,n){if(n.position===null)return 0;const space=n.type==='space'?this.emptyNeighborCount(s,n)+1:1;return n.base*space*this.glueFactor(s,n)*this.turboFactor(s,n)*this.lineFactor(s,n)*this.normalFactor(s,n)*this.edgeFactor(s,n)*this.inventoryFactor(s);},
 total(s){return s.snails.reduce((v,n)=>v+this.production(s,n),0);},
 buy(s,type){if(!Object.hasOwn(TYPES,type))throw Error('Unbekannte Schneckenart.');const p=this.price(type,s.levels[type]??0);if(!Number.isFinite(p)||s.cells<p)throw Error('Nicht genug Zellen.');s.cells-=p;s.levels[type]=(s.levels[type]??0)+1;let n={id:s.nextId++,type,base:this.purchaseBase(s,type),effect:({glue:'glue',space:'space',line:'line',amplifier:'amplifier'})[type]??null,position:null};s.snails.push(n);return n;},
 sellPrice(s,n){return this.price(n.type,Math.max(0,s.levels[n.type]-1));},
 sell(s,id){const n=s.snails.find(x=>x.id===id);if(!n||n.position!==null)throw Error('Nur Schnecken im Inventar können verkauft werden.');const p=this.sellPrice(s,n);s.cells+=p;s.levels[n.type]=Math.max(0,s.levels[n.type]-1);s.snails=s.snails.filter(x=>x.id!==id);return p;},
 move(s,id,position){const n=s.snails.find(x=>x.id===id);if(!n)throw Error('Schnecke nicht gefunden.');if(position!==null&&(!Number.isInteger(position)||position<0||position>24))throw Error('Ungültiges Feld.');if(position!==null){const other=s.snails.find(x=>x.position===position&&x.id!==id);if(other)other.position=n.position;}n.position=position;},
 valid(s){if(!s||s.version!==1||!Number.isFinite(s.cells)||s.cells<0||!Array.isArray(s.snails)||!Number.isInteger(s.nextId))return false;if(s.upgrades!==undefined&&(!Array.isArray(s.upgrades)||new Set(s.upgrades).size!==s.upgrades.length||s.upgrades.some(id=>!Object.hasOwn(UPGRADES,id))))return false;let ids=new Set(),positions=new Set();for(const t of Object.keys(TYPES)){const level=s.levels?.[t]??0;if(!Number.isInteger(level)||level<0||level>10000)return false;}for(const n of s.snails){if(!Object.hasOwn(TYPES,n.type)||!Number.isInteger(n.id)||n.id>=s.nextId||ids.has(n.id)||!Number.isFinite(n.base)||n.base<0||n.effect!==(({glue:'glue',space:'space',line:'line',amplifier:'amplifier'})[n.type]??null))return false;ids.add(n.id);if(n.position!==null){if(!Number.isInteger(n.position)||n.position<0||n.position>24||positions.has(n.position))return false;positions.add(n.position);}}return true;}
};
if(typeof module!=='undefined')module.exports={Engine,TYPES,UPGRADES};
