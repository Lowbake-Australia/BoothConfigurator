import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import * as THREE from "three";
import lowbakeLogo from "./lowbake-logo.png";
import lowbakeLogoWhite from "./lowbake-logo-white.png";

var PAD_WIDTH=0.75, PAD_HEIGHTS=[1.0,1.2,1.5,2.0], PLENUM_DEPTH=1.05, DESK_PLENUM_DEPTH=0.6;
var DESK_LIFT=0.9, DESK_SHELF_DEPTH=0.6, DESK_THICK=0.04, DESK_WALL_DEPTH=0.6;
var LIGHT_W=1.2, LIGHT_D=0.3;

var BOOTH_TYPES=[{value:"extraction_wall",label:"Extraction Wall"},{value:"open_face",label:"Open Face Spray Booth"},{value:"desk_booth",label:"Hobby Booth"}];

function maxRoofForWidth(w){return w>=2.25?2:1;}
function autoFilterCols(w){return Math.max(1,Math.floor(w/PAD_WIDTH));}

function makeRoofArr(n,w,val){var m=maxRoofForWidth(w),a=[];for(var i=0;i<n;i++)a.push(Math.min(val===undefined?1:val,m));return a;}
function makeWallArr(n,val){var a=[];for(var i=0;i<n;i++)a.push({left:val!==undefined?val:true,right:val!==undefined?val:true});return a;}

function getDefaults(type){
  if(type==="extraction_wall")return{boothType:type,width:3,depth:0,height:2.75,lightMode:"simple",lightPosition:"none",filterPadHeight:2,roofLightConfig:[],wallLightConfig:[]};
  if(type==="desk_booth")return{boothType:type,width:1.5,depth:DESK_WALL_DEPTH,height:2,lightMode:"simple",lightPosition:"none",filterPadHeight:1,roofLightConfig:[1],wallLightConfig:[]};
  return{boothType:type,width:3,depth:3,height:2.75,lightMode:"simple",lightPosition:"both",filterPadHeight:2,roofLightConfig:makeRoofArr(3,3,1),wallLightConfig:makeWallArr(3,true)};
}
function getLimits(type){
  if(type==="extraction_wall")return{width:{min:1.5,max:4.5,step:0.75}};
  if(type==="desk_booth")return{width:{min:1.5,max:2.25,step:0.75}};
  return{width:{min:1.5,max:4.5,step:0.75},depth:{min:1,max:6,step:1}};
}

// Apply simple mode to arrays
function applySimple(cfg){
  var n=cfg.boothType==="desk_booth"?1:(cfg.depth>0?Math.ceil(cfg.depth/1):0);
  var lp=cfg.lightPosition;
  var hasRoof=lp==="roof"||lp==="both";
  var hasWall=lp==="sides"||lp==="both";
  var rc=makeRoofArr(n,cfg.width,hasRoof?1:0);
  var wc=makeWallArr(n,hasWall);
  return{roofLightConfig:rc,wallLightConfig:wc};
}

function addBox(g,gx,gy,gz,mat,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(gx,gy,gz),mat);m.position.set(x,y,z);g.add(m);return m;}
function disposeGroup(g){for(var i=g.children.length-1;i>=0;i--){var c=g.children[i];if(c.children&&c.children.length)disposeGroup(c);if(c.geometry)c.geometry.dispose();if(c.material){if(Array.isArray(c.material))c.material.forEach(function(m){m.dispose();});else c.material.dispose();}g.remove(c);}}

function buildBooth(group,config){
  disposeGroup(group);
  var bt=config.boothType,W=config.width,D=config.depth,H=config.height,fpH=config.filterPadHeight;
  var rlc=config.roofLightConfig||[],wlc=config.wallLightConfig||[];
  var isDesk=bt==="desk_booth",isOF=bt==="open_face";
  var PD=isDesk?DESK_PLENUM_DEPTH:PLENUM_DEPTH;
  var fCols=autoFilterCols(W),wt=0.04;
  var nSP=D>0?Math.ceil(D/1):0,fBY=isDesk?DESK_LIFT:0.05;
  var fZ_=D/2,fWZ=-D/2,oBZ=-(D/2+PD);

  var wM=new THREE.MeshStandardMaterial({color:0xf0f0f0,metalness:0.05,roughness:0.55,side:THREE.DoubleSide});
  var sM=new THREE.MeshStandardMaterial({color:0xc0c0c0,metalness:0.15,roughness:0.4});
  var bM=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:0.2,roughness:0.8});
  var lM=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfffde8,emissiveIntensity:1.2});
  var lHM=new THREE.MeshStandardMaterial({color:0xe8e8e8,metalness:0.3,roughness:0.5});
  var fiM=new THREE.MeshStandardMaterial({color:0x2aaa6a,metalness:0.02,roughness:0.9,side:THREE.DoubleSide});
  var fpM=new THREE.MeshStandardMaterial({color:0xf2f2f2,metalness:0.0,roughness:0.75,side:THREE.DoubleSide});
  var ffM=new THREE.MeshStandardMaterial({color:0xd0d0d0,metalness:0.2,roughness:0.45});
  var pM=new THREE.MeshStandardMaterial({color:0xdadada,metalness:0.08,roughness:0.65,side:THREE.DoubleSide});
  var dM=new THREE.MeshStandardMaterial({color:0xd8d8d8,metalness:0.12,roughness:0.5});
  var eM=new THREE.LineBasicMaterial({color:0xaaaaaa});
  var ss=[-1,1];

  for(var si=0;si<2;si++){var sd=ss[si],xO=sd*(W/2+wt/2);
    if(D>0){if(isDesk){var dp=addBox(group,wt,H,D,wM,xO,H/2,0);dp.castShadow=true;dp.receiveShadow=true;}
    else{for(var p=0;p<nSP;p++){var pd=(p===nSP-1&&D%1!==0)?(D%1):1,pz=fWZ+p+pd/2;var wp=addBox(group,wt,H,pd-0.003,wM,xO,H/2,pz);wp.castShadow=true;wp.receiveShadow=true;if(p>0){var sz=fWZ+p;addBox(group,wt+0.005,H,0.006,sM,xO,H/2,sz);addBox(group,0.002,H,0.002,sM,sd*(W/2)+sd*0.001,H/2,sz);}}}
    addBox(group,wt+0.02,H,0.025,sM,xO,H/2,fZ_+0.005);}
    var ps=addBox(group,wt,H,PD,pM,xO,H/2,fWZ-PD/2);ps.castShadow=true;}

  var fGH=fpH,fGW=fCols*PAD_WIDTH,uH=H-(fBY+fGH);
  if(uH>0.02)addBox(group,W,uH,wt,wM,0,H-uH/2,fWZ);
  if(fBY>0.1){var loH=fBY-0.05;if(loH>0.02)addBox(group,W,loH,wt,wM,0,loH/2,fWZ);}
  var sfW=(W-fGW)/2;if(sfW>0.02)for(var sfi=0;sfi<2;sfi++)addBox(group,sfW,fGH,wt,wM,ss[sfi]*(W/2-sfW/2),fBY+fGH/2,fWZ);

  var ob=addBox(group,W+wt*2,H,wt,pM,0,H/2,oBZ);ob.castShadow=true;var oe=new THREE.LineSegments(new THREE.EdgesGeometry(ob.geometry),eM);oe.position.copy(ob.position);group.add(oe);
  addBox(group,W+wt*2,wt,PD,pM,0,H+wt/2,fWZ-PD/2);addBox(group,W+wt*2,wt,PD,pM,0,-wt/2,fWZ-PD/2);

  if(D>0){var cl=addBox(group,W+wt*2,wt,D,wM,0,H+wt/2,0);cl.castShadow=true;if(!isDesk)for(var cp=1;cp<nSP;cp++)addBox(group,W+wt*2,wt+0.003,0.005,sM,0,H+wt/2,fWZ+cp);}

  var tH=0.04;addBox(group,W,tH,0.01,bM,0,tH/2,fWZ+wt/2+0.005);
  if(D>0){for(var ti=0;ti<2;ti++)addBox(group,0.01,tH,D,bM,ss[ti]*(W/2-0.005),tH/2,0);addBox(group,W+wt*2+0.02,tH,0.01,bM,0,tH/2,fZ_+0.005);}

  if(isDesk){var sCZ=fWZ+wt+DESK_SHELF_DEPTH/2,sFZ=fWZ+wt+DESK_SHELF_DEPTH;var sh=addBox(group,W,DESK_THICK,DESK_SHELF_DEPTH,dM,0,DESK_LIFT-DESK_THICK/2,sCZ);sh.castShadow=true;sh.receiveShadow=true;addBox(group,W,0.05,DESK_THICK,dM,0,DESK_LIFT-0.025,sFZ+DESK_THICK/2);var se=new THREE.LineSegments(new THREE.EdgesGeometry(sh.geometry),eM);se.position.copy(sh.position);group.add(se);}

  var fW_=PAD_WIDTH,fH_=fpH,gW=fCols*fW_,fX0=-gW/2+fW_/2,fZ=fWZ+wt/2+0.01,ft=0.035,fY_=fBY+fH_/2;
  addBox(group,gW+ft*2,ft,0.03,ffM,0,fBY+fH_+ft/2,fZ);addBox(group,gW+ft*2,ft,0.03,ffM,0,fBY-ft/2,fZ);
  addBox(group,ft,fH_+ft*2,0.03,ffM,-gW/2-ft/2,fY_,fZ);addBox(group,ft,fH_+ft*2,0.03,ffM,gW/2+ft/2,fY_,fZ);
  for(var fc=1;fc<fCols;fc++)addBox(group,0.025,fH_,0.028,ffM,-gW/2+fc*fW_,fY_,fZ);
  for(var fc2=0;fc2<fCols;fc2++){var fx=fX0+fc2*fW_,fy=fBY+fH_/2;
    // Green background
    addBox(group,fW_-0.015,fH_-0.015,0.025,fiM,fx,fy,fZ+0.002);
    // White diamond lattice - horizontal zigzag ridges
    var rowH=0.06, ridgeW=0.018, halfPad=fW_/2-0.02;
    var numRows=Math.floor(fH_/rowH);
    for(var pr=0;pr<numRows;pr++){
      var rowY=fy-fH_/2+0.03+pr*rowH;
      if(rowY>fy+fH_/2-0.02)continue;
      // Diagonal segments forming zigzag
      var segW=0.045, numSegs=Math.floor((fW_-0.04)/segW);
      for(var ps=0;ps<numSegs;ps++){
        var segX=fx-halfPad+0.02+ps*segW+segW/2;
        if(segX>fx+halfPad)continue;
        var tilt=(ps%2===0)?0.35:-0.35;
        tilt=((pr%2===0)?tilt:-tilt);
        var seg=new THREE.Mesh(new THREE.BoxGeometry(segW,ridgeW,0.012),fpM);
        seg.position.set(segX,rowY,fZ+0.016);
        seg.rotation.z=tilt;
        group.add(seg);
      }
    }
  }

  // ROOF LIGHTS from config array
  if(D>0){var rPn=isDesk?1:nSP;for(var rp=0;rp<rPn;rp++){var lC=rp<rlc.length?rlc[rp]:0;if(lC<=0)continue;
    var rpd,rpcz;if(isDesk){rpcz=0;}else{rpd=(rp===nSP-1&&D%1!==0)?(D%1):1;rpcz=fWZ+rp+rpd/2;}
    var eg=(W-lC*LIGHT_W)/(lC+1),gp=Math.max(0.05,eg);
    for(var ri=0;ri<lC;ri++){var rx=-W/2+gp+LIGHT_W/2+ri*(LIGHT_W+gp);addBox(group,LIGHT_W+0.03,0.035,LIGHT_D+0.03,lHM,rx,H-0.005,rpcz);addBox(group,LIGHT_W,0.015,LIGHT_D,lM,rx,H-0.025,rpcz);var rpl=new THREE.PointLight(0xfff5e0,0.4,H*2.5,1.5);rpl.position.set(rx,H-0.2,rpcz);group.add(rpl);}}}

  // WALL LIGHTS from config array (open face only)
  if(isOF&&D>0){var lW2=0.3,lH2=1.2,lY2=H/2;
    for(var slp=0;slp<nSP;slp++){var slpd=(slp===nSP-1&&D%1!==0)?(D%1):1,slpcz=fWZ+slp+slpd/2;
      var wlcP=slp<wlc.length?wlc[slp]:{left:false,right:false};
      if(wlcP.left){var xL=-(W/2-0.005);addBox(group,0.035,lH2+0.03,lW2+0.03,lHM,xL,lY2,slpcz);addBox(group,0.015,lH2,lW2,lM,xL+0.015,lY2,slpcz);var pl1=new THREE.PointLight(0xfff5e0,0.35,W*2,1.5);pl1.position.set(xL+0.3,lY2,slpcz);group.add(pl1);}
      if(wlcP.right){var xR=W/2-0.005;addBox(group,0.035,lH2+0.03,lW2+0.03,lHM,xR,lY2,slpcz);addBox(group,0.015,lH2,lW2,lM,xR-0.015,lY2,slpcz);var pl2=new THREE.PointLight(0xfff5e0,0.35,W*2,1.5);pl2.position.set(xR-0.3,lY2,slpcz);group.add(pl2);}
    }}
}

/* ========== UI ========== */
var LIGHT={A:"#2858a5",PB:"#f5f7fa",SB:"#ffffff",BC:"#dde1e8",TP:"#1a2a40",TS:"#6b7a8d",ST:"#e8ecf1",RED:"#e4202a",canvasBg:0xe8ecf2};
var DARK={A:"#4a7fd4",PB:"#141927",SB:"#1e2538",BC:"#2d3550",TP:"#e8ecf4",TS:"#8b9ab5",ST:"#252d42",RED:"#e4202a",canvasBg:0x141927};
var ThemeCtx=createContext(LIGHT);

function ConfigSlider({label,value,min,max,step,unit,onChange}){var {A,TS,ST}=useContext(ThemeCtx);var pct=((value-min)/(max-min))*100;return(<div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:TS,fontWeight:500}}>{label}</span><span style={{fontSize:15,color:A,fontFamily:"monospace",fontWeight:600}}>{value}{unit}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={function(e){onChange(parseFloat(e.target.value));}} style={{width:"100%",height:6,WebkitAppearance:"none",appearance:"none",background:"linear-gradient(to right,"+A+" "+pct+"%,"+ST+" "+pct+"%)",borderRadius:3,outline:"none",cursor:"pointer"}}/></div>);}
function Seg({options,value,onChange}){var {A,ST,TS}=useContext(ThemeCtx);return(<div style={{display:"flex",gap:2,background:ST,borderRadius:8,padding:3}}>{options.map(function(o){return(<button key={String(o.value)} onClick={function(){onChange(o.value);}} style={{flex:1,padding:"8px 6px",fontSize:12,fontWeight:600,border:"none",borderRadius:6,cursor:"pointer",transition:"all 0.2s",background:value===o.value?A:"transparent",color:value===o.value?"#fff":TS}}>{o.label}</button>);})}</div>);}
function Sec({title,icon,children}){var {SB,BC,TP}=useContext(ThemeCtx);return(<div style={{background:SB,borderRadius:10,padding:"16px 18px",marginBottom:12,border:"1px solid "+BC}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:10,borderBottom:"1px solid "+BC}}>{icon&&<span style={{fontSize:16}}>{icon}</span>}<span style={{fontSize:13,fontWeight:700,color:TP,letterSpacing:"0.08em",textTransform:"uppercase"}}>{title}</span></div>{children}</div>);}
function IR({label,value}){var {TS,TP}=useContext(ThemeCtx);return(<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}><span style={{fontSize:12,color:TS}}>{label}</span><span style={{fontSize:13,color:TP,fontFamily:"monospace",fontWeight:600}}>{value}</span></div>);}

/* ========== LIGHTING PLAN VIEW POPUP ========== */
function LightEditor({width,depth,roofLightConfig,wallLightConfig,maxRoof,numPanels,isDesk,isOF,onUpdateRoof,onUpdateWall,onClose}){
  const[hovered,setHovered]=useState(null);
  var {A,PB,SB,BC,TP,TS,ST}=useContext(ThemeCtx);
  var sc=window.innerWidth<768?70:110,pad=window.innerWidth<768?30:50;
  var drawD=isDesk?0.6:Math.max(depth,1);
  var svgW=width*sc+pad*2+(isOF?60:0);
  var svgH=drawD*sc+pad*2;
  var boothX=isOF?pad+30:pad, boothY=pad;

  function setRoof(idx,val){var a=[];for(var i=0;i<numPanels;i++)a.push(i<roofLightConfig.length?roofLightConfig[i]:0);a[idx]=val;onUpdateRoof(a);}
  function setWall(idx,side,val){var a=[];for(var i=0;i<numPanels;i++){var p=i<wallLightConfig.length?wallLightConfig[i]:{left:false,right:false};a.push({left:p.left,right:p.right});}if(side==="left")a[idx].left=val;else a[idx].right=val;onUpdateWall(a);}
  function setAllRoof(v){var a=[];for(var i=0;i<numPanels;i++)a.push(Math.min(v,maxRoof));onUpdateRoof(a);}
  function setAllWall(v){var a=[];for(var i=0;i<numPanels;i++)a.push({left:v,right:v});onUpdateWall(a);}

  var panels=[];for(var p=0;p<numPanels;p++){
    var ph=isDesk?0.6:((p===numPanels-1&&depth%1!==0)?(depth%1):1);
    var py_=isDesk?0:p*1;
    panels.push({idx:p,y:py_,h:ph,roof:p<roofLightConfig.length?roofLightConfig[p]:0,wall:p<wallLightConfig.length?wallLightConfig[p]:{left:false,right:false}});}

  return(
    <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:SB,borderRadius:window.innerWidth<768?"16px 16px 0 0":16,padding:0,maxWidth:600,width:window.innerWidth<768?"100%":"92%",maxHeight:window.innerWidth<768?"95vh":"92vh",display:"flex",flexDirection:"column",border:"1px solid "+BC,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",position:window.innerWidth<768?"fixed":"relative",bottom:window.innerWidth<768?0:"auto",left:window.innerWidth<768?0:"auto",overflow:"hidden"}} onClick={function(e){e.stopPropagation();}}>

        {/* Fixed header */}
        <div style={{padding:window.innerWidth<768?"16px 16px 12px":"24px 24px 12px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:A,textTransform:"uppercase",marginBottom:4}}>Lighting Configuration</div><div style={{fontSize:16,fontWeight:700,color:TP}}>Plan View — Looking Down</div></div>
            <button onClick={onClose} style={{background:"none",border:"none",color:TS,fontSize:24,cursor:"pointer",padding:"4px 8px"}}>✕</button>
          </div>

          {/* Quick set */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:TS,alignSelf:"center"}}>Roof:</span>
            {[0,1].concat(maxRoof>=2?[2]:[]).map(function(n){return(<button key={"r"+n} onClick={function(){setAllRoof(n);}} style={{padding:"5px 12px",fontSize:11,fontWeight:600,border:"1px solid "+BC,borderRadius:6,background:SB,color:TP,cursor:"pointer"}}>{n===0?"None":n}</button>);})}
            {isOF&&<><span style={{fontSize:12,color:TS,alignSelf:"center",marginLeft:8}}>Walls:</span>
            <button onClick={function(){setAllWall(true);}} style={{padding:"5px 12px",fontSize:11,fontWeight:600,border:"1px solid "+BC,borderRadius:6,background:SB,color:TP,cursor:"pointer"}}>All On</button>
            <button onClick={function(){setAllWall(false);}} style={{padding:"5px 12px",fontSize:11,fontWeight:600,border:"1px solid "+BC,borderRadius:6,background:SB,color:TP,cursor:"pointer"}}>All Off</button></>}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:window.innerWidth<768?"0 16px":"0 24px",WebkitOverflowScrolling:"touch"}}>

        {/* SVG Plan */}
        <div style={{background:PB,borderRadius:10,padding:12,border:"1px solid "+BC}}>
          <svg viewBox={"0 0 "+svgW+" "+svgH} style={{display:"block",width:"100%",height:"auto"}}>
            {/* Booth outline */}
            <rect x={boothX} y={boothY} width={width*sc} height={drawD*sc} fill={ST} stroke={BC} strokeWidth="2" rx="2"/>
            <text x={boothX+width*sc/2} y={boothY-8} textAnchor="middle" fill={TS} fontSize="10" fontFamily="monospace">{width}m width</text>
            <text x={boothX+width*sc/2} y={svgH-4} textAnchor="middle" fill={TS} fontSize="9" fontFamily="monospace">FRONT (open face)</text>
            {isOF&&<text x={boothX-8} y={boothY+drawD*sc/2} textAnchor="middle" fill={TS} fontSize="9" fontFamily="monospace" transform={"rotate(-90,"+(boothX-8)+","+(boothY+drawD*sc/2)+")"}>Left Wall</text>}
            {isOF&&<text x={boothX+width*sc+8} y={boothY+drawD*sc/2} textAnchor="middle" fill={TS} fontSize="9" fontFamily="monospace" transform={"rotate(90,"+(boothX+width*sc+8)+","+(boothY+drawD*sc/2)+")"}>Right Wall</text>}

            {panels.map(function(pr){
              var pyPx=boothY+pr.y*sc, phPx=pr.h*sc;
              var els=[];
              // Panel divider
              if(pr.idx>0)els.push(<line key={"d"+pr.idx} x1={boothX} y1={pyPx} x2={boothX+width*sc} y2={pyPx} stroke="#b0b8c4" strokeWidth="1" strokeDasharray="4,4"/>);

              // Roof lights
              var lC=pr.roof;
              if(lC>0){var eg=(width-lC*LIGHT_W)/(lC+1),gp=Math.max(0.02,eg);
                for(var li=0;li<lC;li++){
                  (function(li_){
                    var lx=gp+LIGHT_W/2+li_*(LIGHT_W+gp);
                    var lxPx=boothX+(lx-LIGHT_W/2)*sc, lyPx=pyPx+(pr.h/2-LIGHT_D/2)*sc;
                    var rk="rl"+pr.idx+"_"+li_;
                    els.push(<rect key={rk} x={lxPx} y={lyPx} width={LIGHT_W*sc} height={LIGHT_D*sc} fill={hovered===rk?"#f5d060":"#fbbf24"} rx="3" style={{cursor:"pointer"}} onMouseEnter={function(){setHovered(rk);}} onMouseLeave={function(){setHovered(null);}} onClick={function(){setRoof(pr.idx,pr.roof<maxRoof?pr.roof+1:0);}}/>);
                    els.push(<text key={"rlt"+pr.idx+"_"+li_} x={lxPx+LIGHT_W*sc/2} y={lyPx+LIGHT_D*sc/2+3} textAnchor="middle" fill="#000" fontSize="8" fontWeight="700" fontFamily="monospace" style={{pointerEvents:"none"}}>1200x300</text>);
                  })(li);
                }}

              // Wall light slots (open face only) — always shown, dim when off
              if(isOF){
                var wl=pr.wall||{left:false,right:false};
                var wlH=1.2*sc, wlW=0.3*sc;
                var wlY=pyPx+(pr.h*sc-wlH)/2;
                var lk="wl"+pr.idx+"_l", rk2="wl"+pr.idx+"_r";
                els.push(<rect key={lk} x={boothX-wlW/2-2} y={wlY} width={wlW} height={wlH} fill={wl.left?(hovered===lk?"#93c5fd":"#60a5fa"):(hovered===lk?"#9ab0cc":"#c0cad8")} rx="2" style={{cursor:"pointer"}} onMouseEnter={function(){setHovered(lk);}} onMouseLeave={function(){setHovered(null);}} onClick={function(){setWall(pr.idx,"left",!wl.left);}}/>);
                els.push(<rect key={rk2} x={boothX+width*sc-wlW/2+2} y={wlY} width={wlW} height={wlH} fill={wl.right?(hovered===rk2?"#93c5fd":"#60a5fa"):(hovered===rk2?"#9ab0cc":"#c0cad8")} rx="2" style={{cursor:"pointer"}} onMouseEnter={function(){setHovered(rk2);}} onMouseLeave={function(){setHovered(null);}} onClick={function(){setWall(pr.idx,"right",!wl.right);}}/>);
              }
              return els;})}

            {/* Legend */}
            <rect x={4} y={svgH-24} width={12} height={8} fill="#fbbf24" rx="1"/><text x={20} y={svgH-16} fill={TS} fontSize="8" fontFamily="monospace">Roof Light</text>
            {isOF&&<><rect x={80} y={svgH-24} width={12} height={8} fill="#60a5fa" rx="1"/><text x={96} y={svgH-16} fill={TS} fontSize="8" fontFamily="monospace">Wall Light</text></>}
          </svg>
        </div>

        {/* Per-panel controls */}
        <div style={{marginTop:16}}>
          {panels.map(function(pr){
            var roofOpts=[0,1];if(maxRoof>=2)roofOpts.push(2);
            return(
              <div key={pr.idx} style={{padding:"10px 0",borderBottom:pr.idx<panels.length-1?"1px solid "+BC:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"nowrap"}}>
                  <div style={{minWidth:70,flexShrink:0}}><span style={{fontSize:13,color:TP,fontWeight:600}}>Panel {pr.idx+1}</span><br/><span style={{fontSize:10,color:TS}}>{pr.h.toFixed(1)}m</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontSize:10,color:TS}}>Roof:</span>
                    {roofOpts.map(function(n){var active=pr.roof===n;return(<button key={n} onClick={function(){setRoof(pr.idx,n);}} style={{width:28,height:26,fontSize:11,fontWeight:700,border:active?"2px solid "+A:"1px solid "+BC,borderRadius:5,background:active?A:"transparent",color:active?"#fff":TS,cursor:"pointer",padding:0}}>{n}</button>);})}
                  </div>
                  {isOF&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,marginLeft:"auto"}}>
                    <span style={{fontSize:10,color:TS}}>Walls:</span>
                    {["L","R"].map(function(side,si){var key=si===0?"left":"right";var on=pr.wall&&pr.wall[key];return(
                      <button key={key} onClick={function(){setWall(pr.idx,key,!on);}} style={{padding:"3px 10px",fontSize:10,fontWeight:600,border:on?"2px solid #60a5fa":"1px solid "+BC,borderRadius:5,background:on?"rgba(96,165,250,0.15)":"transparent",color:on?"#60a5fa":TS,cursor:"pointer"}}>{side}{on?" ✓":""}</button>);})}
                  </div>}
                </div>
              </div>);
          })}
        </div>
        <div style={{height:8}}/>
        </div>{/* end scrollable */}

        {/* Sticky footer */}
        <div style={{padding:window.innerWidth<768?"12px 16px":"16px 24px",borderTop:"1px solid "+BC,flexShrink:0,display:"flex",justifyContent:"flex-end",background:SB}}>
          <button onClick={onClose} style={{padding:"10px 24px",background:A,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ========== QUOTE REQUEST MODAL ========== */
function QuoteMiniPlan({width,depth,roofLightConfig,wallLightConfig,isDesk,isOF,numPanels}){
  var {TS,A,ST,BC}=useContext(ThemeCtx);
  var sc=window.innerWidth<768?55:80,pad=window.innerWidth<768?25:35;var drawD=isDesk?0.6:Math.max(depth,0.5);
  var svgW=width*sc+pad*2+(isOF?40:0);var svgH=drawD*sc+pad*2;
  var bx=isOF?pad+20:pad,by=pad;
  var panels=[];for(var p=0;p<numPanels;p++){var ph=isDesk?0.6:((p===numPanels-1&&depth%1!==0)?(depth%1):1);panels.push({y:isDesk?0:p*1,h:ph,roof:p<roofLightConfig.length?roofLightConfig[p]:0,wall:p<wallLightConfig.length?wallLightConfig[p]:{left:false,right:false}});}
  return(
    <svg width={svgW} height={svgH} viewBox={"0 0 "+svgW+" "+svgH} style={{display:"block",margin:"0 auto"}}>
      <rect x={bx} y={by} width={width*sc} height={drawD*sc} fill={ST} stroke={BC} strokeWidth="1.5" rx="2"/>
      <text x={bx+width*sc/2} y={by-6} textAnchor="middle" fill={TS} fontSize="8" fontFamily="monospace">{width}m</text>
      {panels.map(function(pr,idx){
        var pyPx=by+pr.y*sc,phPx=pr.h*sc;var els=[];
        if(idx>0)els.push(<line key={"d"+idx} x1={bx} y1={pyPx} x2={bx+width*sc} y2={pyPx} stroke="#b0b8c4" strokeWidth="1" strokeDasharray="3,3"/>);
        if(pr.roof>0){var eg=(width-pr.roof*LIGHT_W)/(pr.roof+1),gp=Math.max(0.02,eg);
          for(var li=0;li<pr.roof;li++){var lx=gp+LIGHT_W/2+li*(LIGHT_W+gp);els.push(<rect key={"r"+idx+"_"+li} x={bx+(lx-LIGHT_W/2)*sc} y={pyPx+(pr.h/2-LIGHT_D/2)*sc} width={LIGHT_W*sc} height={LIGHT_D*sc} fill={A} rx="2" opacity="0.85"/>);}}
        if(isOF){var wl=pr.wall||{};var wlH=1.0*sc,wlW=0.2*sc,wlY=pyPx+(phPx-wlH)/2;
          if(wl.left)els.push(<rect key={"wl"+idx} x={bx-wlW/2-1} y={wlY} width={wlW} height={wlH} fill={A} rx="1" opacity="0.8"/>);
          if(wl.right)els.push(<rect key={"wr"+idx} x={bx+width*sc-wlW/2+1} y={wlY} width={wlW} height={wlH} fill={A} rx="1" opacity="0.8"/>);}
        return els;})}
      <rect x={3} y={svgH-16} width={8} height={5} fill={A} rx="1"/><text x={14} y={svgH-11} fill={TS} fontSize="7" fontFamily="monospace">Roof</text>
      {isOF&&<><rect x={50} y={svgH-16} width={8} height={5} fill={A} rx="1"/><text x={61} y={svgH-11} fill={TS} fontSize="7" fontFamily="monospace">Wall</text></>}
    </svg>
  );
}

function QuoteModal({config,onClose,boothLabel,totalRoof,totalWall,fCols,activePD,totalD,numPanels}){
  var {A,PB,SB,BC,TP,TS,RED}=useContext(ThemeCtx);
  var isDesk=config.boothType==="desk_booth",isOF=config.boothType==="open_face";
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({name:"",company:"",phone:"",email:""});
  const[sending,setSending]=useState(false);
  const[sent,setSent]=useState(false);
  const[error,setError]=useState("");

  function setField(k,v){setForm(function(p){var n={};for(var x in p)n[x]=p[x];n[k]=v;return n;});}

  function buildBOM(){
    var lines=[];
    lines.push("EQUIPMENT TYPE: "+boothLabel);
    lines.push("Width: "+config.width+"m");
    if(isOF)lines.push("Depth: "+config.depth+"m");
    lines.push("Height: "+config.height+"m");
    lines.push("Overall Depth (incl. plenum): "+totalD+"m");
    lines.push("");
    lines.push("--- LIGHTING ---");
    lines.push("Roof Lights: "+totalRoof);
    if(isOF)lines.push("Wall Lights: "+totalWall);
    lines.push("Total Lights: "+(totalRoof+totalWall));
    if(config.roofLightConfig){lines.push("Roof config per panel: "+config.roofLightConfig.join(", "));}
    if(isOF&&config.wallLightConfig){
      for(var i=0;i<config.wallLightConfig.length;i++){var w=config.wallLightConfig[i];lines.push("Panel "+(i+1)+" walls: Left="+(w.left?"ON":"OFF")+" Right="+(w.right?"ON":"OFF"));}
    }
    lines.push("");
    lines.push("--- EXHAUST ---");
    lines.push("Filter Pad Size: 750 x "+(config.filterPadHeight*1000)+"mm");
    lines.push("Pads Across: "+fCols);
    lines.push("Total Pads: "+fCols);
    lines.push("Plenum Depth: "+activePD+"m");
    if(isDesk){lines.push("Desk Height: "+DESK_LIFT+"m");lines.push("Side Panel Depth: "+DESK_WALL_DEPTH+"m");}
    return lines.join("\n");
  }

  function handleSubmit(){
    if(!form.name||!form.email||!form.phone){setError("Please fill in all required fields.");return;}
    setSending(true);setError("");
    var bom=buildBOM();
    var payload={contact:form,configuration:config,bom:bom,boothType:boothLabel,totalRoof:totalRoof,totalWall:totalWall,filterPads:fCols,summary:boothLabel+" — "+config.width+"m W × "+(isOF?config.depth+"m D × ":"")+config.height+"m H"};

    // === CONFIGURE YOUR ENDPOINT HERE ===
    // Option 1: Vercel serverless function
    // fetch("/api/quote", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
    // Option 2: EmailJS (replace IDs)
    // emailjs.send("service_xxx","template_xxx",{...payload},"user_xxx")
    // Option 3: Formspree
    // fetch("https://formspree.io/f/YOUR_ID", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
    
    // For now, simulate success after 1.5s — replace with real endpoint
    setTimeout(function(){setSending(false);setSent(true);},1500);
  }

  var inputStyle={width:"100%",padding:"10px 14px",fontSize:14,border:"1px solid "+BC,borderRadius:8,background:SB,color:TP,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};

  return(
    <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:SB,borderRadius:window.innerWidth<768?"16px 16px 0 0":16,padding:0,maxWidth:560,width:window.innerWidth<768?"100%":"92%",maxHeight:window.innerWidth<768?"95vh":"92vh",overflowY:"auto",border:"1px solid "+BC,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",position:window.innerWidth<768?"fixed":"relative",bottom:window.innerWidth<768?0:"auto",left:window.innerWidth<768?0:"auto",WebkitOverflowScrolling:"touch"}} onClick={function(e){e.stopPropagation();}}>

        {/* Header */}
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid "+BC,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <img src={lowbakeLogo} alt="Lowbake" style={{height:24,display:"block",marginBottom:6}}/>
            <div style={{fontSize:18,fontWeight:700,color:TP}}>{sent?"Quote Requested!":"Request a Quote"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:TS,fontSize:24,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>

        {sent?(
          <div style={{padding:"40px 24px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>✓</div>
            <div style={{fontSize:18,fontWeight:700,color:TP,marginBottom:8}}>Thank you!</div>
            <div style={{fontSize:14,color:TS,lineHeight:1.6}}>Your quote request has been submitted. Our sales team will review your configuration and get back to you shortly.</div>
            <button onClick={onClose} style={{marginTop:24,padding:"12px 32px",background:A,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
        ):step===1?(
          <div style={{padding:"20px 24px"}}>
            <div style={{fontSize:13,fontWeight:600,color:TP,marginBottom:12}}>Configuration Summary</div>

            {/* Summary grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {l:"Equipment",v:boothLabel},
                {l:"Internal Width",v:config.width+"m"},
                ...(isOF?[{l:"Depth",v:config.depth+"m"}]:[]),
                {l:"Internal Height",v:config.height+"m"},
                {l:"Overall Depth",v:totalD+"m"},
                {l:"Roof Lights",v:totalRoof,accent:"#fbbf24"},
                ...(isOF?[{l:"Wall Lights",v:totalWall,accent:"#60a5fa"}]:[]),
                {l:"Filter Pads",v:fCols+" × "+config.filterPadHeight+"m"},
                {l:"Plenum Depth",v:activePD+"m"},
              ].map(function(item){return(
                <div key={item.l} style={{background:item.accent?"rgba(0,0,0,0.03)":PB,borderRadius:6,padding:"8px 12px",border:"2px solid "+(item.accent||BC)}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                    {item.accent&&<div style={{width:8,height:8,borderRadius:2,background:item.accent,flexShrink:0}}/>}
                    <div style={{fontSize:10,color:TS,fontWeight:600,letterSpacing:"0.04em"}}>{item.l}</div>
                  </div>
                  <div style={{fontSize:14,color:TP,fontWeight:600}}>{item.v}</div>
                </div>
              );})
              }
            </div>

            {/* Mini lighting plan */}
            {numPanels>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:TS,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Lighting Layout</div>
                <div style={{background:"#f5f7fa",borderRadius:8,padding:10,border:"1px solid "+BC}}>
                  <QuoteMiniPlan width={config.width} depth={config.depth} roofLightConfig={config.roofLightConfig||[]} wallLightConfig={config.wallLightConfig||[]} isDesk={isDesk} isOF={isOF} numPanels={numPanels}/>
                </div>
              </div>
            )}

            <button onClick={function(){setStep(2);}} style={{width:"100%",padding:"14px",background:A,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.03em"}} onMouseEnter={function(e){e.target.style.background="#1e4580";}} onMouseLeave={function(e){e.target.style.background=A;}}>
              Confirm & Continue
            </button>
          </div>
        ):(
          <div style={{padding:"20px 24px"}}>
            <div style={{fontSize:13,fontWeight:600,color:TP,marginBottom:4}}>Your Details</div>
            <div style={{fontSize:12,color:TS,marginBottom:16}}>Our sales team will contact you with a detailed quote.</div>

            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:TP,display:"block",marginBottom:4}}>Full Name *</label>
                <input type="text" value={form.name} onChange={function(e){setField("name",e.target.value);}} placeholder="John Smith" style={inputStyle}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:TP,display:"block",marginBottom:4}}>Company</label>
                <input type="text" value={form.company} onChange={function(e){setField("company",e.target.value);}} placeholder="Company name" style={inputStyle}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:TP,display:"block",marginBottom:4}}>Phone Number *</label>
                <input type="tel" value={form.phone} onChange={function(e){setField("phone",e.target.value);}} placeholder="04XX XXX XXX" style={inputStyle}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:TP,display:"block",marginBottom:4}}>Email Address *</label>
                <input type="email" value={form.email} onChange={function(e){setField("email",e.target.value);}} placeholder="john@company.com.au" style={inputStyle}/>
              </div>
            </div>

            {error&&<div style={{color:"#e4202a",fontSize:12,fontWeight:600,marginBottom:12}}>{error}</div>}

            <div style={{display:"flex",gap:10}}>
              <button onClick={function(){setStep(1);}} style={{flex:1,padding:"14px",background:"#f5f7fa",color:TS,border:"1px solid "+BC,borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer"}}>Back</button>
              <button onClick={handleSubmit} disabled={sending} style={{flex:2,padding:"14px",background:sending?"#93a8c8":RED,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:sending?"default":"pointer",letterSpacing:"0.03em"}} onMouseEnter={function(e){if(!sending)e.target.style.background="#c41820";}} onMouseLeave={function(e){if(!sending)e.target.style.background=RED;}}>
                {sending?"Submitting...":"Submit Quote Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== MAIN ========== */
export default function BoothConfigurator(){
  const[config,setConfig]=useState(getDefaults("open_face"));
  const[showEditor,setShowEditor]=useState(false);
  const[showQuote,setShowQuote]=useState(false);
  const[showPanel,setShowPanel]=useState(true);
  const[isMobile,setIsMobile]=useState(false);
  const[darkMode,setDarkMode]=useState(false);
  var theme=darkMode?DARK:LIGHT;
  var {A,PB,SB,BC,TP,TS,ST,RED}=theme;
  const pinchRef=useRef({active:false,startDist:0,startRadius:0});
  const swipeRef=useRef({startY:0});
  const canvasRef=useRef(null),sceneRef=useRef({}),boothCenter=useRef(new THREE.Vector3(0,1.5,0)),boothSize=useRef(5);
  const cameraState=useRef({theta:Math.PI*0.25,phi:Math.PI*0.22,radius:0,panX:0,panY:0}),dragRef=useRef({active:false,lastX:0,lastY:0,shift:false});

  var limits=getLimits(config.boothType),isOF=config.boothType==="open_face",isDesk=config.boothType==="desk_booth",isEW=config.boothType==="extraction_wall";

  useEffect(function(){
    function check(){var m=window.innerWidth<768;setIsMobile(m);if(!m)setShowPanel(true);}
    check();window.addEventListener("resize",check);return function(){window.removeEventListener("resize",check);};
  },[]);
  var boothLabel=BOOTH_TYPES.find(function(t){return t.value===config.boothType;})?.label||"";
  var mlp=maxRoofForWidth(config.width);
  var numPanels=isDesk?1:(config.depth>0?Math.ceil(config.depth/1):0);
  var hasLighting=isOF||isDesk;

  var switchType=useCallback(function(t){setConfig(getDefaults(t));cameraState.current={theta:Math.PI*0.25,phi:Math.PI*0.22,radius:0,panX:0,panY:0};},[]);

  var update=useCallback(function(k,v){
    setConfig(function(p){
      var n={};for(var x in p)n[x]=p[x];n[k]=v;
      // Sync arrays on width/depth change
      if(k==="width"||k==="depth"){
        var nW=k==="width"?v:n.width, nD=k==="depth"?v:n.depth;
        var nMax=maxRoofForWidth(nW);
        var nPanels=n.boothType==="desk_booth"?1:(nD>0?Math.ceil(nD/1):0);
        var oR=n.roofLightConfig||[],oW=n.wallLightConfig||[];
        var nR=[],nWL=[];
        for(var i=0;i<nPanels;i++){nR.push(Math.min(i<oR.length?oR[i]:1,nMax));nWL.push(i<oW.length?oW[i]:{left:true,right:true});}
        n.roofLightConfig=nR;n.wallLightConfig=nWL;
      }
      // Simple mode: sync arrays from lightPosition
      if(k==="lightPosition"&&n.lightMode==="simple"){var s=applySimple(n);n.roofLightConfig=s.roofLightConfig;n.wallLightConfig=s.wallLightConfig;}
      if(k==="lightMode"&&v==="simple"){var s2=applySimple(n);n.roofLightConfig=s2.roofLightConfig;n.wallLightConfig=s2.wallLightConfig;}
      // Clamp filter pad if switching to 2m height
      if(k==="height"&&v<=2&&n.filterPadHeight>=2)n.filterPadHeight=1.5;
      return n;
    });
  },[]);

  var updateCamera=useCallback(function(){var cam=sceneRef.current.camera;if(!cam)return;var s=cameraState.current,c=boothCenter.current,sz=boothSize.current;s.radius=Math.max(2,Math.min(30,s.radius));if(s.panY<0)s.panY=0;var r=s.radius,tx=c.x+s.panX,ty=c.y+s.panY,tz=c.z;var mC=(0.5-ty)/r;var mP=mC>=1?0.15:mC<=-1?Math.PI*0.48:Math.min(Math.PI*0.48,Math.acos(mC));s.phi=Math.max(0.08,Math.min(mP,s.phi));cam.position.set(tx+r*Math.sin(s.phi)*Math.sin(s.theta),ty+r*Math.cos(s.phi),tz+r*Math.sin(s.phi)*Math.cos(s.theta));cam.lookAt(new THREE.Vector3(tx,ty,tz));},[]);

  useEffect(function(){var cv=canvasRef.current;if(!cv)return;var rr=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false});rr.setPixelRatio(Math.min(window.devicePixelRatio,2));rr.setClearColor(0xe8ecf2);rr.shadowMap.enabled=true;rr.shadowMap.type=THREE.PCFSoftShadowMap;rr.toneMapping=THREE.ACESFilmicToneMapping;rr.toneMappingExposure=1.3;var sc=new THREE.Scene();sc.fog=new THREE.Fog(0xe8ecf2,20,50);var cm=new THREE.PerspectiveCamera(45,1,0.1,100);sc.add(new THREE.AmbientLight(0xc8d0e0,0.7));var dl=new THREE.DirectionalLight(0xfff8f0,1.0);dl.position.set(6,10,8);dl.castShadow=true;dl.shadow.mapSize.set(2048,2048);dl.shadow.camera.near=0.1;dl.shadow.camera.far=30;dl.shadow.camera.left=-10;dl.shadow.camera.right=10;dl.shadow.camera.top=10;dl.shadow.camera.bottom=-5;sc.add(dl);var fl=new THREE.DirectionalLight(0xc0d0ff,0.3);fl.position.set(-5,4,-3);sc.add(fl);var bl=new THREE.DirectionalLight(0xffeedd,0.15);bl.position.set(0,3,-6);sc.add(bl);var gr=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:0xc8ccd4,roughness:0.95}));gr.rotation.x=-Math.PI/2;gr.position.y=-0.02;gr.receiveShadow=true;sc.add(gr);var gd=new THREE.GridHelper(30,30,0xb0b8c4,0xbcc4d0);gd.position.y=-0.01;gd.material.opacity=0.3;gd.material.transparent=true;sc.add(gd);var bg=new THREE.Group();sc.add(bg);sceneRef.current={renderer:rr,scene:sc,camera:cm,boothGroup:bg,groundMat:gr.material,grid:gd};var rs=function(){var p=cv.parentElement;if(!p)return;rr.setSize(p.clientWidth,p.clientHeight);cm.aspect=p.clientWidth/p.clientHeight;cm.updateProjectionMatrix();};var ro=new ResizeObserver(rs);ro.observe(cv.parentElement);rs();var id;var lp=function(){id=requestAnimationFrame(lp);rr.render(sc,cm);};lp();return function(){cancelAnimationFrame(id);ro.disconnect();rr.dispose();};},[]);
  useEffect(function(){var sr=sceneRef.current;if(!sr.renderer)return;var bg=theme.canvasBg;sr.renderer.setClearColor(bg);if(sr.scene&&sr.scene.fog)sr.scene.fog.color.setHex(bg);if(sr.groundMat)sr.groundMat.color.setHex(darkMode?0x252d42:0xc8ccd4);if(sr.grid){sr.grid.material.opacity=darkMode?0.12:0.3;};},[darkMode]);
  useEffect(function(){var cv=canvasRef.current;if(!cv)return;
    var dn=function(e){dragRef.current={active:true,lastX:e.clientX,lastY:e.clientY,shift:e.shiftKey};};
    var mv=function(e){if(!dragRef.current.active)return;var dx=e.clientX-dragRef.current.lastX,dy=e.clientY-dragRef.current.lastY;if(dragRef.current.shift||e.shiftKey){var ps=cameraState.current.radius*0.002;cameraState.current.panX-=dx*ps;cameraState.current.panY+=dy*ps;if(cameraState.current.panY<0)cameraState.current.panY=0;}else{cameraState.current.theta-=dx*0.005;cameraState.current.phi-=dy*0.005;}dragRef.current.lastX=e.clientX;dragRef.current.lastY=e.clientY;updateCamera();};
    var up=function(){dragRef.current.active=false;pinchRef.current.active=false;};
    var wh=function(e){e.preventDefault();cameraState.current.radius+=e.deltaY*0.01;updateCamera();};
    // Touch: 1 finger orbit, 2 finger pinch zoom
    var ts=function(e){
      if(e.touches.length===1){dragRef.current={active:true,lastX:e.touches[0].clientX,lastY:e.touches[0].clientY,shift:false};}
      if(e.touches.length===2){dragRef.current.active=false;var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pinchRef.current={active:true,startDist:Math.sqrt(dx*dx+dy*dy),startRadius:cameraState.current.radius};}
    };
    var tm=function(e){
      e.preventDefault();
      if(e.touches.length===1&&dragRef.current.active){var dx=e.touches[0].clientX-dragRef.current.lastX,dy=e.touches[0].clientY-dragRef.current.lastY;cameraState.current.theta-=dx*0.005;cameraState.current.phi-=dy*0.005;dragRef.current.lastX=e.touches[0].clientX;dragRef.current.lastY=e.touches[0].clientY;updateCamera();}
      if(e.touches.length===2&&pinchRef.current.active){var dx2=e.touches[0].clientX-e.touches[1].clientX,dy2=e.touches[0].clientY-e.touches[1].clientY;var dist=Math.sqrt(dx2*dx2+dy2*dy2);var scale=pinchRef.current.startDist/dist;cameraState.current.radius=Math.max(2,Math.min(30,pinchRef.current.startRadius*scale));updateCamera();}
    };
    cv.addEventListener("pointerdown",dn);window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
    cv.addEventListener("wheel",wh,{passive:false});
    cv.addEventListener("touchstart",ts,{passive:true});cv.addEventListener("touchmove",tm,{passive:false});cv.addEventListener("touchend",up);
    return function(){cv.removeEventListener("pointerdown",dn);window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);cv.removeEventListener("wheel",wh);cv.removeEventListener("touchstart",ts);cv.removeEventListener("touchmove",tm);cv.removeEventListener("touchend",up);};},[updateCamera]);
  useEffect(function(){var bg=sceneRef.current.boothGroup;if(!bg)return;buildBooth(bg,config);var bx=new THREE.Box3().setFromObject(bg);var ct=new THREE.Vector3(),sz=new THREE.Vector3();bx.getCenter(ct);bx.getSize(sz);boothCenter.current.copy(ct);boothSize.current=Math.max(sz.x,sz.y,sz.z);cameraState.current.panX=0;cameraState.current.panY=0;cameraState.current.radius=boothSize.current*2+2;updateCamera();},[config,updateCamera]);

  var fCols=autoFilterCols(config.width),activePD=isDesk?DESK_PLENUM_DEPTH:PLENUM_DEPTH,totalD=(config.depth+activePD).toFixed(2),aPH=isDesk?[1.0]:(config.height<=2?PAD_HEIGHTS.filter(function(h){return h<2;}):PAD_HEIGHTS);
  var totalRoof=0,totalWall=0;
  if(config.roofLightConfig)for(var i=0;i<config.roofLightConfig.length;i++)totalRoof+=config.roofLightConfig[i];
  if(config.wallLightConfig)for(var j=0;j<config.wallLightConfig.length;j++){if(config.wallLightConfig[j].left)totalWall++;if(config.wallLightConfig[j].right)totalWall++;}

  return(
    <ThemeCtx.Provider value={theme}>
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100vh",width:"100vw",background:darkMode?"#0e1420":PB,fontFamily:"'Segoe UI','SF Pro Display',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      {/* 3D Viewport */}
      <div style={{flex:1,position:"relative",minWidth:0,minHeight:isMobile?"100vh":"auto"}}>
        <canvas ref={canvasRef} style={{display:"block",width:"100%",height:"100%",cursor:"grab",touchAction:"none"}}/>
        <div style={{position:"absolute",top:isMobile?12:20,left:isMobile?16:24,pointerEvents:"none"}}><img src={darkMode?lowbakeLogoWhite:lowbakeLogo} alt="Lowbake" style={{height:isMobile?28:36,maxWidth:isMobile?"45vw":"200px",display:"block",opacity:0.95,pointerEvents:"none"}}/><div style={{fontSize:isMobile?14:16,fontWeight:700,color:TP,marginTop:4}}>{boothLabel}</div></div>
        {/* Dark mode toggle */}
        <div onClick={function(){setDarkMode(function(d){return !d;});}} style={{position:"absolute",top:isMobile?12:20,right:isMobile?16:24,display:"flex",alignItems:"center",gap:7,cursor:"pointer",userSelect:"none",background:darkMode?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:20,padding:"5px 12px",backdropFilter:"blur(4px)"}}>
          <span style={{fontSize:11,fontWeight:600,color:darkMode?"#e8ecf4":"#1a2a40",letterSpacing:"0.04em"}}>{darkMode?"Light Mode":"Dark Mode"}</span>
          <div style={{width:34,height:18,borderRadius:9,background:darkMode?"#4a7fd4":"rgba(0,0,0,0.25)",position:"relative",transition:"background 0.25s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:darkMode?16:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.25s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>
        {/* Controls hint — desktop only */}
        {!isMobile&&<div style={{position:"absolute",bottom:16,left:24,pointerEvents:"none",display:"flex",gap:16}}>{[["Drag","Rotate"],["Shift+Drag","Pan"],["Scroll","Zoom"]].map(function(pr){return(<div key={pr[1]} style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,color:"#fff",background:"rgba(40,88,165,0.7)",padding:"3px 8px",borderRadius:4,fontWeight:600}}>{pr[0]}</span><span style={{fontSize:11,color:"#4a5568"}}>{pr[1]}</span></div>);})}</div>}
        {/* Mobile: floating configure button */}
        {isMobile&&!showPanel&&(
          <button onClick={function(){setShowPanel(true);}} style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",padding:"14px 28px",background:A,color:"#fff",border:"none",borderRadius:30,fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(40,88,165,0.4)",zIndex:10,display:"flex",alignItems:"center",gap:8,letterSpacing:"0.03em"}}>
            Configure
          </button>
        )}
        {/* Mobile: floating quote button when panel is hidden */}
        {isMobile&&!showPanel&&(
          <button onClick={function(){setShowQuote(true);}} style={{position:"absolute",bottom:20,right:16,padding:"14px 20px",background:RED,color:"#fff",border:"none",borderRadius:30,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(228,32,42,0.35)",zIndex:10}}>
            Quote
          </button>
        )}
      </div>

      {/* Config Panel — desktop sidebar or mobile bottom sheet */}
      {(showPanel||!isMobile)&&(
        <div style={{
          width:isMobile?"100%":340,
          height:isMobile?"85vh":"100%",
          position:isMobile?"absolute":"relative",
          bottom:isMobile?0:"auto",
          left:isMobile?0:"auto",
          background:PB,
          borderLeft:isMobile?"none":"1px solid "+BC,
          borderTop:isMobile?"1px solid "+BC:"none",
          borderRadius:isMobile?"20px 20px 0 0":"0",
          display:"flex",flexDirection:"column",overflow:"hidden",
          zIndex:isMobile?20:1,
          boxShadow:isMobile?"0 -8px 30px rgba(0,0,0,0.15)":"none",
          transition:"transform 0.3s ease"
        }}>
          {/* Mobile drag handle + close */}
          {isMobile&&(
            <div
              style={{display:"flex",alignItems:"center",padding:"12px 16px 10px"}}
              onTouchStart={function(e){swipeRef.current.startY=e.touches[0].clientY;}}
              onTouchMove={function(e){if(e.touches[0].clientY-swipeRef.current.startY>80)setShowPanel(false);}}
            >
              <div style={{flex:1}}/>
              <div style={{width:44,height:5,background:BC,borderRadius:3}}/>
              <div style={{flex:1,display:"flex",justifyContent:"flex-end"}}>
                <button onClick={function(){setShowPanel(false);}} style={{background:"none",border:"none",color:TS,fontSize:22,cursor:"pointer",padding:"4px 0",lineHeight:1}}>✕</button>
              </div>
            </div>
          )}
          <div style={{padding:isMobile?"8px 20px 12px":"20px 22px 16px",borderBottom:"1px solid "+BC,background:SB}}><div style={{fontSize:12,fontWeight:700,letterSpacing:"0.15em",color:A,textTransform:"uppercase"}}>Configure</div></div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px",overscrollBehavior:"contain"}}>
          <Sec title="Equipment Type"><div style={{display:"flex",flexDirection:"column",gap:6}}>{BOOTH_TYPES.map(function(t){return(<button key={t.value} onClick={function(){switchType(t.value);}} style={{padding:"12px 14px",border:"2px solid "+(config.boothType===t.value?A:BC),borderRadius:8,background:config.boothType===t.value?"rgba(40,88,165,0.1)":"transparent",color:config.boothType===t.value?A:TS,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>{t.label}</button>);})}</div></Sec>

          <Sec title="Dimensions">
            <ConfigSlider label="Internal Width" value={config.width} unit="m" onChange={function(v){update("width",v);}} min={limits.width.min} max={limits.width.max} step={limits.width.step}/>
            {isOF&&limits.depth&&<ConfigSlider label="Depth" value={config.depth} unit="m" onChange={function(v){update("depth",v);}} min={limits.depth.min} max={limits.depth.max} step={limits.depth.step}/>}
            <div style={{marginBottom:16}}><span style={{fontSize:13,color:TS,fontWeight:500,display:"block",marginBottom:8}}>Internal Height</span><Seg options={[{label:"2m",value:2},{label:"2.75m",value:2.75}]} value={config.height} onChange={function(v){update("height",v);}}/></div>
            <div style={{borderTop:"1px solid "+BC,marginTop:4,paddingTop:8}}><IR label="Overall Depth (incl. plenum)" value={totalD+"m"}/>{isDesk&&<IR label="Desk Height" value={DESK_LIFT+"m"}/>}{isDesk&&<IR label="Side Panel Depth" value={DESK_WALL_DEPTH+"m"}/>}</div>
          </Sec>

          {/* LIGHTING */}
          {hasLighting&&(
            <Sec title="LED Lighting">
              {isOF&&<div style={{marginBottom:12}}><Seg options={[{label:"Simple",value:"simple"},{label:"Advanced",value:"advanced"}]} value={config.lightMode} onChange={function(v){update("lightMode",v);}}/></div>}

              {/* Simple mode */}
              {config.lightMode==="simple"&&isOF&&(
                <div style={{marginBottom:8}}>
                  <Seg options={[{label:"None",value:"none"},{label:"Roof",value:"roof"},{label:"Sides",value:"sides"},{label:"Both",value:"both"}]} value={config.lightPosition} onChange={function(v){update("lightPosition",v);}}/>
                </div>
              )}

              {/* Advanced mode (open face only): show configure button */}
              {config.lightMode==="advanced"&&isOF&&(
                <button onClick={function(){setShowEditor(true);}} style={{width:"100%",padding:"14px 16px",background:A,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.2s",letterSpacing:"0.03em"}} onMouseEnter={function(e){e.target.style.background="#1e4580";}} onMouseLeave={function(e){e.target.style.background=A;}}>
                  <span>Configure Lighting Layout</span>
                  <span style={{fontSize:12,background:"rgba(255,255,255,0.2)",padding:"2px 10px",borderRadius:12}}>{totalRoof+totalWall} lights</span>
                </button>
              )}

              {/* Hobby booth: simple on/off */}
              {isDesk&&(
                <div style={{marginBottom:8}}>
                  <Seg options={[{label:"Off",value:"off"},{label:"On",value:"on"}]} value={totalRoof>0?"on":"off"} onChange={function(v){update("roofLightConfig",v==="on"?[1]:[0]);}}/>
                </div>
              )}

              <div style={{borderTop:"1px solid "+BC,marginTop:10,paddingTop:8}}>
                <IR label="Roof Lights" value={totalRoof}/>
                {isOF&&<IR label="Wall Lights" value={totalWall}/>}
                <IR label="Total" value={totalRoof+totalWall}/>
              </div>
              <div style={{fontSize:11,color:TS,opacity:0.7,marginTop:4}}>Each panel: 1200mm x 300mm LED 100W Lighting Panel</div>
            </Sec>
          )}

          <Sec title="Exhaust Filter Pads">
            {aPH.length>1?(<div style={{marginBottom:14}}><span style={{fontSize:12,color:TS,fontWeight:500,display:"block",marginBottom:8}}>Pad Height</span><Seg options={aPH.map(function(h){return{label:h+"m",value:h};})} value={config.filterPadHeight} onChange={function(v){update("filterPadHeight",v);}}/></div>):(<div style={{marginBottom:8}}><IR label="Pad Height (fixed)" value={aPH[0]+"m"}/></div>)}
            <div style={{borderTop:"1px solid "+BC,marginTop:8,paddingTop:8}}><IR label="Pad Size" value={"750 x "+(config.filterPadHeight*1000)+"mm"}/><IR label="Pads Across" value={fCols}/><IR label="Exhaust Plenum" value={activePD+"m deep"}/></div>
          </Sec>
        </div>
        <div style={{padding:"16px 18px",borderTop:"1px solid "+BC,background:SB}}><button onClick={function(){setShowQuote(true);if(isMobile)setShowPanel(false);}} style={{width:"100%",padding:"12px 16px",background:RED,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer"}} onMouseEnter={function(e){e.target.style.background="#c41820";}} onMouseLeave={function(e){e.target.style.background=RED;}}>Request Quote</button></div>
        </div>
      )}

      {showEditor&&isOF&&numPanels>0&&(
        <LightEditor width={config.width} depth={config.depth} roofLightConfig={config.roofLightConfig||[]} wallLightConfig={config.wallLightConfig||[]} maxRoof={mlp} numPanels={numPanels} isDesk={isDesk} isOF={isOF} onUpdateRoof={function(a){update("roofLightConfig",a);}} onUpdateWall={function(a){update("wallLightConfig",a);}} onClose={function(){setShowEditor(false);}}/>
      )}

      {showQuote&&(
        <QuoteModal config={config} onClose={function(){setShowQuote(false);}} boothLabel={boothLabel} totalRoof={totalRoof} totalWall={totalWall} fCols={fCols} activePD={activePD} totalD={totalD} numPanels={numPanels}/>
      )}

      <style>{"input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:"+A+";cursor:pointer;border:2px solid #fff;box-shadow:0 0 6px rgba(40,88,165,0.4);margin-top:-5px}input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:"+A+";cursor:pointer;border:2px solid #fff}input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px}div::-webkit-scrollbar{width:6px}div::-webkit-scrollbar-track{background:transparent}div::-webkit-scrollbar-thumb{background:"+BC+";border-radius:3px}@media(max-width:767px){input[type=range]::-webkit-slider-thumb{width:22px;height:22px;margin-top:-8px}input[type=range]{height:8px}}"}</style>
    </div>
    </ThemeCtx.Provider>
  );
}
