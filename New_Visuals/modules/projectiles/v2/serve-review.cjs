const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const experiment=path.resolve(__dirname,'../../../../outputs/experiments/2026-10-09-attack-vfx-v2');
const server=http.createServer((request,response)=>{
  const routes={
    '/':['Drift_Bastion_Playtest.html','text/html; charset=utf-8'],
    '/recording':['qa/attacks-in-motion-1920x1080.webm','video/webm']
  };
  const route=routes[new URL(request.url,'http://localhost').pathname];
  if(!route){response.writeHead(404).end();return;}
  fs.readFile(path.join(experiment,route[0]),(error,data)=>{
    if(error){response.writeHead(404).end();return;}
    response.setHeader('Content-Type',route[1]);response.setHeader('Cache-Control','no-store');response.end(data);
  });
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}/`));
