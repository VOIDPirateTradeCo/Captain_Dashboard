
const http=require('http');
const https=require('https');
const fs=require('fs');
const targets=[
  {name:'PINKCADY_TAILSCALE',host:'100.106.235.103',port:3000,proto:'http'},
  {name:'PINKCADY_LAN',host:'192.168.0.180',port:3000,proto:'http'},
  {name:'STEALTHATTACK_TAILSCALE',host:'100.110.238.68',port:3000,proto:'http'}
];
const results={};
let pending=targets.length;
function finish(){if(!--pending){fs.writeFileSync('src/scripts/sir-green/proofs/pinkcady-direct-probe.json',JSON.stringify(results,null,2));console.log('WROTE src/scripts/sir-green/proofs/pinkcady-direct-probe.json');process.exit(0);}}
targets.forEach(t=>{
  const mod=t.proto==='https'?https:http;
  mod.get({hostname:t.host,port:t.port,path:'/',timeout:4000},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{results[t.name]={reachable:true,status:res.statusCode,snippet:d.slice(0,400)};finish();});}).on('error',e=>{results[t.name]={reachable:false,error:e.message};finish();});
});
