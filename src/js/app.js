const userDB = {
  "owner@opspulse.com":{password:"owner123",phone:"9876543210",role:"owner",name:"Arjun Mehta",business:"SwiftBasket",city:"Mumbai",size:"Medium",zones:"5",orderTarget:"200",hours:"6am-midnight",category:"Grocery",warehouses:"3",avatar:"AM"},
  "manager@opspulse.com":{password:"ops2024",phone:"9123456780",role:"manager",name:"Priya Sharma",business:"SwiftBasket",city:"Mumbai",size:"Medium",zones:"5",orderTarget:"200",hours:"6am-midnight",category:"Grocery",warehouses:"3",avatar:"PS"}
};
let currentScreen='login',currentUser=null,currentRole=null,signupRole='';
let selectedLoginRole='owner';
let liveData={stock:65,delivery:8,orders:120,cancel:8,revenue:62};
let delivHistory=[],orderPeak=0,alertLog=[],activeScenario='normal';
let delivChart=null,radarChart=null,stackedChart=null,liveInterval=null,crisisAlertShown=false;

function showScreen(n){
  document.getElementById('loginScreen').style.display=n==='login'?'block':'none';
  document.getElementById('signupScreen').style.display=n==='signup'?'block':'none';
  document.getElementById('dashboardScreen').style.display=n==='dashboard'?'flex':'none';
  currentScreen=n;
  if(n==='signup')initSignupHours();
}
function toggleTheme(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  document.documentElement.setAttribute('data-theme',isDark?'light':'dark');
  document.getElementById('toggleThumb').style.transform=isDark?'translateX(0)':'translateX(20px)';
  document.getElementById('lightLabel').classList.toggle('active',isDark);
  document.getElementById('darkLabel').classList.toggle('active',!isDark);
  if(delivChart)delivChart.update('none');
  if(radarChart)radarChart.update('none');
  if(stackedChart)stackedChart.update('none');
}
function togglePw(id,btn){const el=document.getElementById(id);el.type=el.type==='password'?'text':'password';btn.textContent=el.type==='password'?'👁':'👁';}
function showError(id,msg){const el=document.getElementById(id);el.textContent=msg;el.style.display='block';}
function hideError(id){document.getElementById(id).style.display='none';}
function showFieldError(id,msg){const el=document.getElementById(id);el.textContent=msg;el.style.display='block';}
function clearFieldErrors(){document.querySelectorAll('.field-error').forEach(e=>e.style.display='none');document.querySelectorAll('.form-input.error').forEach(e=>e.classList.remove('error'));}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
function clamp(v){return Math.min(100,Math.max(0,Math.round(v)));}

function selectLoginRole(role){
  selectedLoginRole=role;
  const ob=document.getElementById('roleOwnerBtn');
  const mb=document.getElementById('roleManagerBtn');
  ob.className='role-seg-btn'+(role==='owner'?' active-owner':'');
  mb.className='role-seg-btn'+(role==='manager'?' active-manager':'');
}
function handleLogin(){
  hideError('loginError');
  const input=document.getElementById('loginInput').value.trim();
  const password=document.getElementById('loginPassword').value;
  if(!input||!password){showError('loginError','Please enter your credentials.');return;}
  let matched=null;
  if(input.includes('@')){if(userDB[input]&&userDB[input].password===password)matched={...userDB[input],email:input};}
  else{for(const e in userDB){if(userDB[e].phone===input&&userDB[e].password===password){matched={...userDB[e],email:e};break;}}}
  if(matched){
    if(matched.role!==selectedLoginRole){showError('loginError','These credentials belong to a '+matched.role+'. Please select the correct role.');return;}
    currentUser=matched;currentRole=matched.role;showScreen('dashboard');initDashboard();
  }
  else{showError('loginError','Invalid credentials. Please check your email/phone and password.');}
}
document.getElementById('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')handleLogin();});
document.getElementById('loginInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('loginPassword').focus();});

function initSignupHours(){
  const hrs=['12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'];
  ['suHoursOpen','suHoursClose'].forEach(id=>{const s=document.getElementById(id);if(s.options.length>1)return;s.innerHTML='';hrs.forEach(h=>{const o=document.createElement('option');o.value=h;o.textContent=h;s.appendChild(o);});});
  document.getElementById('suHoursOpen').value='6am';document.getElementById('suHoursClose').value='12am';
}
function selectRole(el,role){document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');signupRole=role;}
function signupNext(){
  clearFieldErrors();let v=true;
  const nm=document.getElementById('suName').value.trim(),em=document.getElementById('suEmail').value.trim();
  const ph=document.getElementById('suPhone').value.trim().replace(/[\s+]/g,'').replace(/^91/,'');
  const pw=document.getElementById('suPassword').value,cf=document.getElementById('suConfirm').value;
  if(nm.length<2){showFieldError('err-suName','Name must be at least 2 characters');v=false;}
  if(!em.includes('@')||!em.includes('.')){showFieldError('err-suEmail','Enter a valid email');v=false;}
  if(userDB[em]){showFieldError('err-suEmail','Email already registered');v=false;}
  if(ph.length!==10||isNaN(ph)){showFieldError('err-suPhone','Enter a valid 10-digit number');v=false;}
  if(pw.length<8){showFieldError('err-suPassword','Min 8 characters');v=false;}
  if(pw!==cf){showFieldError('err-suConfirm','Passwords do not match');v=false;}
  if(!v)return;
  document.getElementById('signupStep1').style.display='none';
  document.getElementById('signupStep2').style.display='block';
  document.getElementById('progressFill').style.width='100%';
  document.getElementById('progressLabel').textContent='Step 2 of 2 - Business Details';
}
function signupBack(){
  document.getElementById('signupStep2').style.display='none';
  document.getElementById('signupStep1').style.display='block';
  document.getElementById('progressFill').style.width='50%';
  document.getElementById('progressLabel').textContent='Step 1 of 2 - Personal Information';
}
function handleSignup(){
  clearFieldErrors();let v=true;
  const biz=document.getElementById('suBusiness').value.trim(),city=document.getElementById('suCity').value.trim();
  const size=document.getElementById('suSize').value,cat=document.getElementById('suCategory').value;
  if(!biz){showFieldError('err-suBusiness','Required');v=false;}
  if(!city){showFieldError('err-suCity','Required');v=false;}
  if(!size||!cat)v=false;
  if(!signupRole){showFieldError('err-suRole','Please select your role');v=false;}
  if(!v)return;
  const email=document.getElementById('suEmail').value.trim(),name=document.getElementById('suName').value.trim();
  const phone=document.getElementById('suPhone').value.trim().replace(/[\s+]/g,'').replace(/^91/,'');
  const initials=name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const u={password:document.getElementById('suPassword').value,phone,role:signupRole,name,business:biz,city,size:size.split(' ')[0],zones:document.getElementById('suZones').value||'3',orderTarget:document.getElementById('suOrderTarget').value||'200',hours:document.getElementById('suHoursOpen').value+'-'+document.getElementById('suHoursClose').value,category:cat.split(' ')[0],warehouses:document.getElementById('suWarehouses').value||'2',avatar:initials};
  userDB[email]=u;currentUser={...u,email};currentRole=signupRole;
  showScreen('dashboard');initDashboard();
  showToast('Account created - Welcome, '+name.split(' ')[0]);
}
function quickLogin(role){
  selectLoginRole(role);
  const creds={owner:{email:'owner@opspulse.com',pw:'owner123'},manager:{email:'manager@opspulse.com',pw:'ops2024'}};
  document.getElementById('loginInput').value=creds[role].email;
  document.getElementById('loginPassword').value=creds[role].pw;
  handleLogin();
}
function signOut(){
  if(typeof supabaseSignOut === 'function' && _supabase){
    supabaseSignOut(); return;
  }
  currentUser=null;currentRole=null;
  if(liveInterval)clearInterval(liveInterval);liveInterval=null;
  delivChart=null;radarChart=null;stackedChart=null;
  liveData={stock:65,delivery:8,orders:120,cancel:8,revenue:62};
  delivHistory=[];alertLog=[];orderPeak=0;activeScenario='normal';
  document.getElementById('userDropdown').classList.remove('open');
  document.getElementById('loginInput').value='';
  document.getElementById('loginPassword').value='';
  hideError('loginError');showScreen('login');
}
const SCENARIOS={
  normal:{stock:65,delivery:8,orders:120,cancel:8,revenue:62,label:'Normal Operations'},
  opportunity:{stock:85,delivery:7,orders:185,cancel:5,revenue:88,label:'Peak Opportunity'},
  anomaly:{stock:28,delivery:13,orders:95,cancel:22,revenue:47,label:'Anomaly Detected'},
  delivery:{stock:70,delivery:32,orders:130,cancel:28,revenue:60,label:'Delivery Meltdown'},
  rushhour:{stock:55,delivery:12,orders:198,cancel:12,revenue:91,label:'Rush Hour Surge'},
};
function buildScenarioMenu(){
  const m=document.getElementById('scenarioMenu');m.innerHTML='';
  const groups=[['normal'],['opportunity','rushhour'],['anomaly','delivery']];
  groups.forEach((g,gi)=>{
    g.forEach(k=>{
      const d=document.createElement('div');d.className='scenario-menu-item'+(k===activeScenario?' active':'');
      d.innerHTML='<span class="check">'+(k===activeScenario?'✓':' ')+'</span>'+SCENARIOS[k].label;
      d.onclick=()=>loadScenario(k);m.appendChild(d);
    });
    if(gi<groups.length-1){const s=document.createElement('div');s.className='scenario-menu-sep';m.appendChild(s);}
  });
}
function toggleScenarioMenu(){const m=document.getElementById('scenarioMenu');m.classList.toggle('open');buildScenarioMenu();}
function loadScenario(key){
  liveData={...SCENARIOS[key]};delivHistory=[];activeScenario=key;
  const trigger=document.getElementById('scenarioTrigger');
  if(trigger)trigger.textContent=SCENARIOS[key].label+' v';
  const menu=document.getElementById('scenarioMenu');
  if(menu)menu.classList.remove('open');
  if(['delivery'].includes(key))setTimeout(()=>openWarRoom(SCENARIOS[key].label),600);
  renderDashboard();
}
function calcStressScore(d){
  const stockS=Math.min(100,d.stock),delivS=Math.max(0,100-((d.delivery-5)/35)*100);
  const orderS=Math.min(100,(d.orders/Number(currentUser.orderTarget||200))*100);
  const cancelS=Math.max(0,100-d.cancel*1.5);
  return{stockS:Math.round(stockS),delivS:Math.round(delivS),orderS:Math.round(orderS),cancelS:Math.round(cancelS),total:Math.round(stockS*0.35+delivS*0.30+orderS*0.25+cancelS*0.10)};
}
function updateCrisisScore(score){
  const badge=document.getElementById('crisisBadge'),val=document.getElementById('crisisVal'),msg=document.getElementById('crisisMsg');
  const cv=100-score.total;val.textContent=cv;
  if(cv>=60){badge.classList.add('show','pulse');msg.textContent='CRITICAL - Action required';
    if(!crisisAlertShown&&currentScreen==='dashboard'){crisisAlertShown=true;addAlert('crisis','Crisis score '+cv+' - systems in distress');}
  }else if(cv>=40){badge.classList.add('show');badge.classList.remove('pulse');msg.textContent='Elevated risk';crisisAlertShown=false;}
  else{badge.classList.remove('show','pulse');crisisAlertShown=false;}
}
function initDashboard(){
  document.getElementById('navAvatar').textContent=currentUser.avatar;
  document.getElementById('udAvatar').textContent=currentUser.avatar;
  document.getElementById('udName').textContent=currentUser.name;
  const roleBadge=currentRole==='owner'?'<span class="badge-owner">Owner</span>':'<span class="badge-manager">Manager</span>';
  document.getElementById('udMeta').innerHTML=roleBadge+' · '+currentUser.business+' · '+currentUser.city;
  document.getElementById('ownerView').style.display=currentRole==='owner'?'block':'none';
  document.getElementById('managerView').style.display=currentRole==='manager'?'block':'none';
  delivHistory=Array.from({length:14},()=>7+Math.random()*6);
  alertLog=[];activeScenario='normal';
  renderDashboard();initCharts();startClock();
  if(liveInterval)clearInterval(liveInterval);
  try{ initSupabase(); }catch(e){ console.warn('Supabase skipped',e); }
  liveInterval=setInterval(liveUpdate,3000);
}
function renderDashboard(){
  const d=liveData,score=calcStressScore(d);
  if(currentRole==='owner'){document.getElementById('pageTitle').textContent='Business Health Dashboard';
    document.getElementById('pageSubtitle').textContent=currentUser.business+' - '+currentUser.city+' · '+currentUser.category+' · '+currentUser.size;}
  else{document.getElementById('pageTitle').textContent='Operations Dashboard';
    document.getElementById('pageSubtitle').textContent='Ops & Delivery - '+currentUser.city+' · '+currentUser.zones+' zones active';}
  document.getElementById('pageUpdated').textContent='Last updated: '+new Date().toLocaleTimeString();
  document.getElementById('stressTime').textContent=new Date().toLocaleTimeString();
  document.getElementById('scoreNumber').textContent=score.total;
  const ss=document.getElementById('scoreStatus');
  if(score.total>=70){ss.textContent='Healthy';ss.className='stress-status healthy';}
  else if(score.total>=45){ss.textContent='Caution';ss.className='stress-status caution';}
  else{ss.textContent='Crisis';ss.className='stress-status crisis';}
  const bars=currentRole==='manager'
    ?[{l:'Stock (35%)',v:score.stockS,c:'#0073bb'},{l:'Speed (30%)',v:score.delivS,c:'#16a34a'},{l:'Volume (25%)',v:score.orderS,c:'#f97316'},{l:'Cancel (10%)',v:score.cancelS,c:'#dc2626'}]
    :[{l:'Stock',v:score.stockS,c:'#0073bb'},{l:'Delivery',v:score.delivS,c:'#16a34a'},{l:'Orders',v:score.orderS,c:'#f97316'},{l:'Cancel',v:score.cancelS,c:'#dc2626'}];
  document.getElementById('stressBars').innerHTML=bars.map(b=>'<div class="sb-row"><span class="sb-label">'+b.l+'</span><div class="sb-track"><div class="sb-fill" style="width:'+b.v+'%;background:'+b.c+'"></div></div><span class="sb-val">'+b.v+'</span></div>').join('');
  const rev=(d.revenue/100*100000);
  if(currentRole==='owner'){
    const kpis=[
      {l:'Revenue Today',v:'Rs '+(rev/1000).toFixed(1)+'k',ch:d.revenue>50,ct:d.revenue>50?'+'+Math.round(d.revenue*0.12)+'% vs yesterday':'-'+Math.round((100-d.revenue)*0.08)+'% behind'},
      {l:'Orders / Hour',v:d.orders,ch:d.orders>100,ct:d.orders>100?'Active demand':'Below target'},
      {l:'Avg Delivery',v:d.delivery+'m',ch:d.delivery<=10,ct:d.delivery<=10?'Within SLA':'SLA breach risk'},
      {l:'Cancel Rate',v:d.cancel+'%',ch:d.cancel<10,ct:d.cancel<10?'Healthy range':'Elevated'}
    ];
    document.getElementById('kpiRow').innerHTML=kpis.map(k=>'<div class="card kpi-card"><div class="kpi-label">'+k.l+'</div><div class="kpi-value">'+k.v+'</div><div class="kpi-change '+(k.ch?'up':'down')+'">'+k.ct+'</div></div>').join('');
  }else{
    const mkpis=[
      {l:'ORDERS / HOUR',v:String(d.orders),badge:null,ch:d.orders>100,ct:Math.max(1,Math.round(d.orders*0.02))+'% vs last hour'},
      {l:'AVG DELIVERY TIME',v:d.delivery+'m',badge:'SLA: 10M',ch:d.delivery<=10,ct:d.delivery<=10?d.delivery+'m within SLA':d.delivery+'m SLA breach'},
      {l:'REVENUE ACHIEVED',v:d.revenue+'%',suffix:'of Target',ch:d.revenue>50,ct:d.revenue>50?'On track':'Behind target'},
      {l:'CANCELLATION RATE',v:d.cancel+'%',badge:null,ch:d.cancel<10,ct:Math.max(1,Math.round(d.cancel*0.1))+'% vs last hour'}
    ];
    document.getElementById('kpiRow').innerHTML=mkpis.map(k=>'<div class="card kpi-card"><div style="display:flex;justify-content:space-between;align-items:center"><div class="kpi-label">'+k.l+'</div>'+(k.badge?'<span style="font-size:10px;font-family:\'IBM Plex Mono\',monospace;background:var(--border);color:var(--text-muted);padding:2px 6px;border-radius:3px">'+k.badge+'</span>':'')+'</div><div class="kpi-value" style="margin-top:12px">'+k.v+(k.suffix?'<span style="font-size:14px;color:var(--text-muted);font-family:\'Plus Jakarta Sans\',sans-serif"> '+k.suffix+'</span>':'')+'</div><div class="kpi-change '+(k.ch?'up':'down')+'">'+k.ct+'</div></div>').join('');
  }
  if(currentRole==='owner'){
    renderSpeedometer('speedoOrders',d.orders,Number(currentUser.orderTarget||200),'ORDERS/HR',[{l:'AVG',v:Math.round(d.orders*0.85)},{l:'CAPACITY',v:currentUser.orderTarget||200},{l:'PEAK',v:Math.max(orderPeak,d.orders)}]);
    renderSpeedometer('speedoRevenue',d.revenue,100,'Rs '+(rev/1000).toFixed(0)+'k',[{l:'ACHIEVED',v:d.revenue.toFixed(1)+'%'},{l:'REMAINING',v:'Rs '+((100000-rev)/1000).toFixed(1)+'k'}]);
  }
  if(currentRole==='manager'){
    const inv=[{n:'Dairy',p:clamp(d.stock+10)},{n:'Vegetables',p:clamp(d.stock-20)},{n:'Bakery',p:clamp(d.stock+5)},{n:'Personal Care',p:clamp(d.stock+25)},{n:'Beverages',p:clamp(d.stock-5)}];
    document.getElementById('inventoryList').innerHTML=inv.map(i=>{const c=i.p>=50?'var(--green)':i.p>=15?'var(--yellow)':'var(--red)';return'<div class="inv-item"><div class="inv-header"><span class="inv-name">'+i.n+'</span><span class="inv-pct" style="color:'+c+'">'+i.p+'%</span></div><div class="inv-track"><div class="inv-fill" style="width:'+i.p+'%;background:'+c+'"></div></div></div>';}).join('');
    const acts=genActions(d);
    document.getElementById('actionTable').innerHTML=acts.map(a=>{
      const dot=a.level==='HIGH'?'#f87171':a.level==='MED'?'#fbbf24':'#34d399';
      const lbl=a.level==='HIGH'?'HIGH':a.level==='MED'?'MED':'--';
      return'<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:12px"><span style="width:8px;height:8px;border-radius:50%;background:'+dot+';flex-shrink:0;display:inline-block"></span><span style="font-size:14px;color:var(--text-primary)">'+a.text+'</span></div><span style="font-size:11px;font-family:\'IBM Plex Mono\',monospace;color:var(--text-faint);background:var(--border);padding:2px 8px;border-radius:3px">'+lbl+'</span></div>';
    }).join('');
  }
  updateAlertBanner(d,score);
  renderAlerts();
  updateCrisisScore(score);
  updateTicker(d,score);
  if(score.total<40&&!document.getElementById('warRoom').classList.contains('open'))setTimeout(()=>openWarRoom('Score Critical: '+score.total),600);
  updateCharts();
}
function genActions(d){
  const a=[];
  if(d.stock<15)a.push({level:'HIGH',text:'Reorder stock - avg at '+d.stock+'%'});
  if(d.delivery>15)a.push({level:'HIGH',text:'Delivery at '+d.delivery+'m - SLA breach'});
  if(d.cancel>30)a.push({level:'HIGH',text:'Cancel rate '+d.cancel+'% - escalate support'});
  if(d.stock<30&&d.stock>=15)a.push({level:'MED',text:'Stock trending low at '+d.stock+'%'});
  if(d.delivery>10&&d.delivery<=15)a.push({level:'MED',text:'Delivery trending above SLA'});
  if(d.orders>160)a.push({level:'LOW',text:'Surge pricing opportunity - '+d.orders+'/hr'});
  if(!a.length)a.push({level:'OK',text:'All operations nominal'});
  return a;
}
function renderSpeedometer(id,value,max,label,stats){
  const pct=Math.min(1,Math.max(0,value/max)),cx=100,cy=100,r=75;
  function arc(s,e){const sr=(s-90)*Math.PI/180,er=(e-90)*Math.PI/180;return'M '+(cx+r*Math.cos(sr))+' '+(cy+r*Math.sin(sr))+' A '+r+' '+r+' 0 '+(e-s>180?1:0)+' 1 '+(cx+r*Math.cos(er))+' '+(cy+r*Math.sin(er));}
  const nRad=(-90+pct*180-90)*Math.PI/180,nx=cx+(r-12)*Math.cos(nRad),ny=cy+(r-12)*Math.sin(nRad);
  const nc=pct<.33?'#dc2626':pct<.66?'#d97706':'#16a34a';
  const svg='<svg viewBox="0 0 200 145" class="speedo-svg"><path d="'+arc(-90,-30)+'" fill="none" stroke="#dc2626" stroke-width="10" stroke-linecap="round" opacity="0.55"/><path d="'+arc(-30,30)+'" fill="none" stroke="#d97706" stroke-width="10" stroke-linecap="round" opacity="0.55"/><path d="'+arc(30,90)+'" fill="none" stroke="#16a34a" stroke-width="10" stroke-linecap="round" opacity="0.55"/><line x1="'+cx+'" y1="'+cy+'" x2="'+nx+'" y2="'+ny+'" stroke="'+nc+'" stroke-width="3" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+cy+'" r="5" fill="'+nc+'"/><circle cx="'+cx+'" cy="'+cy+'" r="3" fill="var(--card-bg)"/><text x="'+cx+'" y="'+(cy+22)+'" text-anchor="middle" fill="var(--text-primary)" font-family="IBM Plex Mono,monospace" font-size="22" font-weight="700">'+(typeof value==='number'?Math.round(value):value)+'</text><text x="'+cx+'" y="'+(cy+38)+'" text-anchor="middle" fill="var(--text-muted)" font-family="Plus Jakarta Sans,sans-serif" font-size="8" letter-spacing="1.5">'+label+'</text></svg>';
  document.getElementById(id).innerHTML=svg+'<div class="speedo-stats">'+stats.map(s=>'<div class="speedo-stat"><div class="speedo-stat-label">'+s.l+'</div><div class="speedo-stat-value">'+s.v+'</div></div>').join('')+'</div>';
}
function initCharts(){
  const isLight=document.documentElement.getAttribute('data-theme')!=='dark';Chart.defaults.color=isLight?'#374151':'#9da5b0';Chart.defaults.borderColor=isLight?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.07)';
  Chart.defaults.font.family="'Plus Jakarta Sans',sans-serif";Chart.defaults.font.size=11;
  if(delivChart){delivChart.destroy();delivChart=null;}
  if(radarChart){radarChart.destroy();radarChart=null;}
  if(stackedChart){stackedChart.destroy();stackedChart=null;}
  if(currentRole==='owner'){
    delivChart=new Chart(document.getElementById('chartDelivery').getContext('2d'),{type:'line',data:{labels:Array.from({length:14},(_,i)=>'T-'+(13-i)),datasets:[{label:'Avg Delivery (min)',data:[...delivHistory],borderColor:'#38bdf8',backgroundColor:'rgba(56,189,248,0.12)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#38bdf8',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5},{label:'SLA Target',data:Array(14).fill(10),borderColor:'#fb923c',borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false}]},options:{responsive:true,animation:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:14,color:'#9da5b0'}}},scales:{x:{grid:{display:false},ticks:{color:'#9da5b0'}},y:{min:0,max:45,grid:{color:'rgba(255,255,255,0.06)'},ticks:{callback:v=>v+'m',color:'#9da5b0'}}}}});
    radarChart=new Chart(document.getElementById('chartRadar').getContext('2d'),{type:'radar',data:{labels:['Out of Stock','Long Wait','Wrong Item','App Bug','Changed Mind'],datasets:[{label:'This Week',data:[40,30,15,20,35],borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.18)',pointBackgroundColor:'#f87171',pointBorderColor:'#fff',pointBorderWidth:1.5,pointRadius:5,borderWidth:2.5},{label:'Last Week',data:[55,45,20,10,30],borderColor:'#94a3b8',backgroundColor:'rgba(148,163,184,0.06)',borderDash:[4,3],pointRadius:3,borderWidth:1.5,pointBackgroundColor:'#94a3b8'}]},options:{responsive:true,scales:{r:{min:0,max:100,grid:{color:isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.08)'},angleLines:{color:isLight?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.08)'},pointLabels:{color:isLight?'#1e293b':'#cbd5e1',font:{size:11,weight:'500'}},ticks:{display:false}}},plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:14,color:'#9da5b0'}}}}});
  }
  if(currentRole==='manager'){
    stackedChart=new Chart(document.getElementById('chartStacked').getContext('2d'),{type:'bar',data:{labels:['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],datasets:[{label:'On-Time',data:[45,52,38,61,55,48,58,42],backgroundColor:'#38bdf8',borderRadius:4,stack:'d'},{label:'Delayed',data:[5,8,12,4,9,7,5,11],backgroundColor:'#f87171',borderRadius:4,stack:'d'}]},options:{responsive:true,animation:false,plugins:{legend:{position:'top',labels:{boxWidth:12,padding:14,color:'#9da5b0'}}},scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#9da5b0'}},y:{stacked:true,grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#9da5b0'}}}}});
  }
}
function updateCharts(){
  if(delivChart){delivChart.data.datasets[0].data=[...delivHistory];delivChart.update('none');}
  if(radarChart){const c=liveData.cancel;radarChart.data.datasets[0].data=[clamp(c*1.2+10),clamp(c*0.8+5),clamp(c*0.4),clamp(c*0.5+5),clamp(c*0.9)];radarChart.update('none');}
  if(stackedChart){const ot=Math.round(40+Math.random()*25),dl=Math.round(Math.max(2,liveData.delivery-5+Math.random()*5));stackedChart.data.datasets[0].data.shift();stackedChart.data.datasets[0].data.push(ot);stackedChart.data.datasets[1].data.shift();stackedChart.data.datasets[1].data.push(dl);stackedChart.update('none');}
}
function addAlert(type,msg){alertLog.unshift({type,msg,time:new Date().toLocaleTimeString()});if(alertLog.length>20)alertLog.pop();}
function updateAlertBanner(d,score){
  const b=document.getElementById('alertBanner');
  if(d.stock<15||d.delivery>15||d.cancel>30||score.total<40){b.className='alert-banner show crisis';b.innerHTML='🚨 '+(d.stock<15?'Stock critically low ('+d.stock+'%). ':'')+( d.delivery>15?'Delivery SLA breached ('+d.delivery+'m). ':'')+(d.cancel>30?'Cancel rate spiking ('+d.cancel+'%). ':'')+'<span class="ab-time">'+new Date().toLocaleTimeString()+'</span>';addAlert('crisis',b.textContent);}
  else if(d.orders>160||d.revenue>80){b.className='alert-banner show opportunity';b.innerHTML='🟢 '+(d.orders>160?'Order surge at '+d.orders+'/hr. ':'')+(d.revenue>80?'Revenue on track ('+d.revenue+'%). ':'')+'<span class="ab-time">'+new Date().toLocaleTimeString()+'</span>';addAlert('opportunity',b.textContent);}
  else if((d.delivery>10&&d.delivery<=15)||(d.cancel>15&&d.cancel<=30)||(d.stock>=15&&d.stock<30)){b.className='alert-banner show anomaly';b.innerHTML='⚠️ '+(d.stock<30?'Stock at '+d.stock+'%. ':'')+(d.delivery>10?'Delivery '+d.delivery+'m. ':'')+(d.cancel>15?'Cancel rate '+d.cancel+'%. ':'')+'<span class="ab-time">'+new Date().toLocaleTimeString()+'</span>';addAlert('anomaly',b.textContent);}
  else{b.className='alert-banner';b.classList.remove('show');}
}
function renderAlerts(){
  const t=document.getElementById('alertTable');
  const tm=document.getElementById('alertTableManager');
  const rows=alertLog.slice(0,8).map(a=>{
    const icon=a.type==='crisis'?'🔴':a.type==='opportunity'?'🟢':'⚠️';
    const badge=a.type==='crisis'?'badge-crisis':a.type==='opportunity'?'badge-opportunity':'badge-anomaly';
    const label=a.type==='crisis'?'Crisis':a.type==='opportunity'?'Opportunity':'Anomaly';
    return'<div class="atr"><span class="alert-icon">'+icon+'</span><span class="alert-msg">'+a.msg.substring(0,80)+'</span><span class="badge alert-type-badge '+badge+'">'+label+'</span><span class="alert-ts">'+a.time+'</span></div>';
  }).join('');
  if(!alertLog.length){
    t.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px">No alerts - all systems healthy</div>';
    if(tm)tm.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px;font-style:italic">Waiting for events...</div>';
    return;
  }
  t.innerHTML=rows;
  if(tm)tm.innerHTML=rows;
}
function openWarRoom(label){
  const d=liveData;
  document.getElementById('wrTitle').textContent='WAR ROOM';
  document.getElementById('wrDesc').textContent='Scenario: '+label+' - Multiple critical thresholds breached simultaneously.';
  document.getElementById('wrTime').textContent='Incident started at '+new Date().toLocaleTimeString();
  const acts=['Halt new orders in affected zones','Emergency restock protocol initiated','Alert customer success team','Reassign delivery partners to critical zones','Notify stakeholders via broadcast'];
  document.getElementById('wrActions').innerHTML=acts.map((a,i)=>'<div class="wr-action"><span class="wr-action-num">'+(i+1)+'.</span><span>'+a+'</span></div>').join('');
  const score=calcStressScore(d);
  document.getElementById('wrMetrics').innerHTML=[
    {l:'Stock Level',v:d.stock+'%',s:d.stock<15?'badge-crisis':d.stock<30?'badge-anomaly':'badge-healthy',t:d.stock<15?'CRITICAL':d.stock<30?'LOW':'OK'},
    {l:'Delivery Time',v:d.delivery+'min',s:d.delivery>15?'badge-crisis':d.delivery>10?'badge-anomaly':'badge-healthy',t:d.delivery>15?'BREACH':d.delivery>10?'RISK':'OK'},
    {l:'Cancel Rate',v:d.cancel+'%',s:d.cancel>30?'badge-crisis':d.cancel>15?'badge-anomaly':'badge-healthy',t:d.cancel>30?'HIGH':d.cancel>15?'ELEVATED':'OK'},
    {l:'Stress Score',v:score.total,s:score.total<40?'badge-crisis':score.total<70?'badge-anomaly':'badge-healthy',t:score.total<40?'CRISIS':score.total<70?'CAUTION':'OK'}
  ].map(m=>'<div class="wr-metric"><span class="wr-metric-label">'+m.l+'</span><span class="wr-metric-val mono">'+m.v+'</span><span class="badge '+m.s+'">'+m.t+'</span></div>').join('');
  document.getElementById('warRoom').classList.add('open');
}
function closeWarRoom(){document.getElementById('warRoom').classList.remove('open');}
function nudge(v,r,mn,mx){return Math.min(mx,Math.max(mn,v+(Math.random()-0.45)*r));}
function liveUpdate(){
  liveData.stock=Math.round(nudge(liveData.stock,4,0,100));
  liveData.delivery=parseFloat(nudge(liveData.delivery,2,5,40).toFixed(1));
  liveData.orders=Math.round(nudge(liveData.orders,15,5,200));
  liveData.cancel=Math.round(nudge(liveData.cancel,3,0,60));
  liveData.revenue=parseFloat(Math.min(100,liveData.revenue+Math.random()*1.2).toFixed(1));
  delivHistory.push(liveData.delivery);if(delivHistory.length>14)delivHistory.shift();
  if(liveData.orders>orderPeak)orderPeak=liveData.orders;
  if(delivChart){
    delivChart.data.datasets[0].data=[...delivHistory];
    delivChart.update();
  }
  if(radarChart){
    const c=liveData.cancel;
    radarChart.data.datasets[0].data=[clamp(c*1.2+10),clamp(c*0.8+5),clamp(c*0.4),clamp(c*0.6+8),clamp(c*1.1+3),clamp(c*0.9+7)];
    radarChart.update();
  }
  if(stackedChart){
    const ot=Math.round(40+Math.random()*25);
    const dl=Math.round(Math.max(2,liveData.delivery-5+Math.random()*5));
    stackedChart.data.datasets[0].data.shift();
    stackedChart.data.datasets[0].data.push(ot);
    stackedChart.data.datasets[1].data.shift();
    stackedChart.data.datasets[1].data.push(dl);
    stackedChart.update();
  }
  renderDashboard();
}
function startClock(){
  function t(){
    const now=new Date();
    const ts=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
    const el=document.getElementById('pageUpdated');if(el)el.textContent='Last updated: '+ts;
    const tc=document.getElementById('tickerClock');if(tc)tc.textContent=ts;
  }
  t();setInterval(t,1000);
}
function updateTicker(d,score){
  const feed=document.getElementById('tickerFeed');if(!feed)return;
  const items=[];
  if(d.stock<15)items.push('<div class="ticker-item"><span class="ti-badge risk">RISK</span> SUPPORT - Stock critically low at '+d.stock+'%</div>');
  if(d.delivery>15)items.push('<div class="ticker-item"><span class="ti-badge risk">RISK</span> DELIVERY - SLA breach at '+d.delivery+' min</div>');
  if(d.cancel>30)items.push('<div class="ticker-item"><span class="ti-badge risk">RISK</span> SUPPORT - Cancel rate spiking at '+d.cancel+'%</div>');
  if(d.orders>160)items.push('<div class="ticker-item"><span class="ti-badge ok">OPP</span> Orders surging - '+d.orders+'/hr</div>');
  if(!items.length)items.push('<div class="ticker-item"><span class="ti-badge ok">OK</span> All systems nominal - stress score '+score.total+'</div>');
  feed.innerHTML=items.join('<span style="color:rgba(255,255,255,0.2);margin:0 8px">·</span>');
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.user-menu-wrap'))document.getElementById('userDropdown').classList.remove('open');
});
function toggleUserMenu(){document.getElementById('userDropdown').classList.toggle('open');}
