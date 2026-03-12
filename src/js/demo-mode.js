// ===== DEMO MODE =====
let demoInterval=null,demoStep=0,demoActive=false;
const demoSequence=[
  {key:'normal',     wait:4000,  msg:'Starting normal operations...'},
  {key:'opportunity',wait:5000,  msg:'Peak opportunity detected!'},
  {key:'rushhour',   wait:5000,  msg:'Rush hour surge incoming...'},
  {key:'anomaly',    wait:5000,  msg:'Anomaly detected - caution!'},
  {key:'delivery',   wait:8000,  msg:'Crisis! War Room triggered!'},
  {key:'normal',     wait:4000,  msg:'Recovery - back to normal.'},
];

function startDemo(){
  if(demoActive)return;
  demoActive=true;demoStep=0;
  const btn=document.getElementById('demoBtnLabel');
  if(btn)btn.textContent='Stop Demo';
  showToast('Demo Mode ON - sit back and watch!');
  runDemoStep();
}

function stopDemo(){
  demoActive=false;
  if(demoInterval)clearTimeout(demoInterval);demoInterval=null;
  const btn=document.getElementById('demoBtnLabel');
  if(btn)btn.textContent='Demo Mode';
  loadScenario('normal');
  showToast('Demo Mode OFF');
}

function toggleDemo(){
  if(demoActive)stopDemo();
  else startDemo();
}

function runDemoStep(){
  if(!demoActive)return;
  if(demoStep>=demoSequence.length){demoStep=0;}
  const step=demoSequence[demoStep];
  showToast(step.msg);
  loadScenario(step.key);
  demoStep++;
  demoInterval=setTimeout(runDemoStep,step.wait);
}
