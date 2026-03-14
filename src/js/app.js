const userDB = {
  "owner@opspulse.com":{password:"owner123",phone:"9876543210",role:"owner",name:"Arjun Mehta",business:"SwiftBasket",city:"Mumbai",size:"Medium",zones:"5",orderTarget:"200",hours:"6am-midnight",category:"Grocery",warehouses:"3",avatar:"AM"},
  "manager@opspulse.com":{password:"ops2024",phone:"9123456780",role:"manager",name:"Priya Sharma",business:"SwiftBasket",city:"Mumbai",size:"Medium",zones:"5",orderTarget:"200",hours:"6am-midnight",category:"Grocery",warehouses:"3",avatar:"PS"}
};
let currentScreen='login',currentUser=null,currentRole=null,signupRole='';
let selectedLoginRole='owner';
let liveData={stock:65,delivery:8,orders:120,cancel:8,revenue:62};
let delivHistory=[],orderPeak=0,alertLog=[],activeScenario='normal';
let delivChart=null,radarChart=null,stackedChart=null,liveInterval=null,crisisAlertShown=false;

// ── Sentiment feed data ────────────────────────────────────────────────────
const SENTIMENTS_POSITIVE=[
  'Delivery was super fast! 🔥','Order arrived in 8 mins, amazing!','Great packaging on my order 👍',
  'Love the app, keep it up!','My rider was so polite, 5 stars!','Fresh vegetables, very happy!',
  'Fastest delivery in Mumbai 🏆','Always reliable, thank you!','Perfect order, nothing missing!',
];
const SENTIMENTS_NEGATIVE=[
  'Where is my order? 😤','Delivery taking too long!','Wrong item delivered again',
  'Support not responding 😡','Package was damaged on arrival','Missing items in my bag!',
  'Rider not picking up calls','Cold food delivered, not okay','Very late delivery today 😞',
];
const SENTIMENTS_NEUTRAL=[
  'Order placed successfully','Rider assigned to your order','Package out for delivery',
  'Estimated 10 min delivery','Your feedback helps us improve','New offer: 20% off Dairy today',
];
let _sentimentInterval=null;

function getRandomSentiment(d){
  const pool = d.cancel>20||d.delivery>15
    ? SENTIMENTS_NEGATIVE
    : d.orders>160||d.revenue>80
      ? SENTIMENTS_POSITIVE
      : Math.random()>0.5?SENTIMENTS_POSITIVE:SENTIMENTS_NEUTRAL;
  return pool[Math.floor(Math.random()*pool.length)];
}

function startSentimentFeed(){
  if(_sentimentInterval)clearInterval(_sentimentInterval);
  _sentimentInterval=setInterval(()=>{
    const msg=getRandomSentiment(liveData);
    const isNeg=SENTIMENTS_NEGATIVE.includes(msg);
    const isPos=SENTIMENTS_POSITIVE.includes(msg);
    const badge=isNeg?'<span class="ti-badge crit">CUST</span>'
                :isPos?'<span class="ti-badge ok">CUST</span>'
                :'<span class="ti-badge warn">INFO</span>';
    injectTickerItem(badge+' '+msg);
  },4500);
}

function injectTickerItem(html){
  const feed=document.getElementById('tickerFeed');
  if(!feed)return;
  const div=document.createElement('div');
  div.className='ticker-item ticker-new';
  div.innerHTML=html;
  feed.insertBefore(div,feed.firstChild);
  setTimeout(()=>div.classList.remove('ticker-new'),600);
  while(feed.children.length>6)feed.removeChild(feed.lastChild);
}

// ── Screen / util helpers ─────────────────────────────────────────────────
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
  refreshMapTheme&&refreshMapTheme();
  initCharts();
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
  const ob=document.getElementById('roleOwnerBtn'),mb=document.getElementById('roleManagerBtn');
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
  }else{showError('loginError','Invalid credentials. Please check your email/phone and password.');}
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
  if(typeof supabaseSignOut==='function'&&_supabase){supabaseSignOut();return;}
  currentUser=null;currentRole=null;
  if(liveInterval)clearInterval(liveInterval);liveInterval=null;
  if(_sentimentInterval)clearInterval(_sentimentInterval);_sentimentInterval=null;
  _riderMapInited=false;_riderMap=null;_riderMarkers=[];
  delivChart=null;radarChart=null;stackedChart=null;
  liveData={stock:65,delivery:8,orders:120,cancel:8,revenue:62};
  delivHistory=[];alertLog=[];orderPeak=0;activeScenario='normal';
  document.getElementById('userDropdown').classList.remove('open');
  document.getElementById('loginInput').value='';
  document.getElementById('loginPassword').value='';
  hideError('loginError');showScreen('login');
}

// ── Scenarios ─────────────────────────────────────────────────────────────
const SCENARIOS={
  normal:      {stock:65, delivery:8,  orders:120, cancel:8,  revenue:62,  label:'Normal Operations'},
  opportunity: {stock:85, delivery:7,  orders:185, cancel:5,  revenue:88,  label:'Peak Opportunity'},
  anomaly:     {stock:28, delivery:13, orders:95,  cancel:22, revenue:47,  label:'Anomaly Detected'},
  delivery:    {stock:70, delivery:32, orders:130, cancel:28, revenue:60,  label:'Delivery Meltdown'},
  rushhour:    {stock:55, delivery:12, orders:198, cancel:12, revenue:91,  label:'Rush Hour Surge'},
};
function buildScenarioMenu(){
  const m=document.getElementById('scenarioMenu');if(!m)return;m.innerHTML='';
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
function toggleScenarioMenu(){const m=document.getElementById('scenarioMenu');if(m)m.classList.toggle('open');buildScenarioMenu();}
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

// ── Dashboard init ────────────────────────────────────────────────────────
function initDashboard(){
  document.getElementById('navAvatar').textContent=currentUser.avatar;
  document.getElementById('udAvatar').textContent=currentUser.avatar;
  document.getElementById('udName').textContent=currentUser.name;
  const roleBadge=currentRole==='owner'?'<span class="badge-owner">Owner</span>':'<span class="badge-manager">Manager</span>';
  document.getElementById('udMeta').innerHTML=roleBadge+' · '+currentUser.business+' · '+currentUser.city;
  document.getElementById('ownerView').style.display=currentRole==='owner'?'block':'none';
  document.getElementById('managerView').style.display=currentRole==='manager'?'block':'none';

 
  }



  delivHistory=Array.from({length:14},()=>7+Math.random()*6);
  alertLog=[];activeScenario='normal';
  renderDashboard();initCharts();startClock();startSentimentFeed();
  if(liveInterval)clearInterval(liveInterval);
  try{initSupabase();}catch(e){console.warn('Supabase skipped',e);}
  liveInterval=setInterval(liveUpdate,3000);
  if(currentRole==='manager')setTimeout(()=>initRiderMap(),400);
}

// ── Render dashboard ──────────────────────────────────────────────────────
function renderDashboard(){
  const d=liveData,score=calcStressScore(d);

  // WhatsApp threshold check
  if(typeof checkWhatsAppTrigger==='function')checkWhatsAppTrigger(score.total);

  if(currentRole==='owner'){
    document.getElementById('pageTitle').textContent='Business Health Dashboard';
    document.getElementById('pageSubtitle').textContent=currentUser.business+' - '+currentUser.city+' · '+currentUser.category+' · '+currentUser.size;
  }else{
    document.getElementById('pageTitle').textContent='Operations Dashboard';
    document.getElementById('pageSubtitle').textContent='Ops & Delivery - '+currentUser.city+' · '+currentUser.zones+' zones active';
  }
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
    // Update rider map
    updateRiderMap();
  }
  updateAlertBanner(d,score);
  renderAlerts();
  updateTicker(d,score);
  if(score.total<40&&!document.getElementById('warRoom').classList.contains('open'))setTimeout(()=>openWarRoom('Score Critical: '+score.total),600);
  if(score.total>=45&&document.getElementById('warRoom').classList.contains('open'))closeWarRoom();
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
  document.getElementById(id).innerHTML=svg+'<div class="speedo-stats">'+stats.map(s=>'<div class="speedo-stat"><div class="speedo-stat-val">'+s.v+'</div><div class="speedo-stat-label">'+s.l+'</div></div>').join('')+'</div>';
}

function liveUpdate(){
  function nudge(v,s){return Math.max(0,v+(Math.random()-0.5)*v*s);}
  liveData.stock   =Math.round(Math.min(100,nudge(liveData.stock,0.05)));
  liveData.delivery=Math.round(Math.max(4,nudge(liveData.delivery,0.08)));
  liveData.orders  =Math.round(Math.max(0,nudge(liveData.orders,0.06)));
  liveData.cancel  =Math.round(Math.min(100,nudge(liveData.cancel,0.1)));
  liveData.revenue =Math.round(Math.min(100,nudge(liveData.revenue,0.04)));
  delivHistory.push(liveData.delivery);
  if(delivHistory.length>14)delivHistory.shift();
  if(liveData.orders>orderPeak)orderPeak=liveData.orders;
  renderDashboard();
}

function updateAlertBanner(d,score){
  const b=document.getElementById('alertBanner');if(!b)return;
  if(score.total<40){b.className='alert-banner crisis';b.innerHTML='🔴 <strong>CRISIS:</strong> Business stress score critical at '+score.total+'. War Room active.';b.style.display='block';}
  else if(score.total<45){b.className='alert-banner warn';b.innerHTML='🟡 <strong>CAUTION:</strong> Stress score at '+score.total+' — monitor closely.';b.style.display='block';}
  else{b.style.display='none';}
}

function renderAlerts(){
  const d=liveData,now=new Date().toLocaleTimeString();
  const items=[];
  if(d.stock<15)items.push({badge:'crit',label:'CRISIS',msg:'Stock at '+Math.round(d.stock)+'% — critical'});
  else if(d.stock<30)items.push({badge:'warn',label:'WARN',msg:'Stock trending low at '+Math.round(d.stock)+'%'});
  if(d.delivery>15)items.push({badge:'crit',label:'BREACH',msg:'Delivery SLA breach — '+Math.round(d.delivery)+'m avg'});
  else if(d.delivery>10)items.push({badge:'warn',label:'WARN',msg:'Delivery trending above SLA'});
  if(d.cancel>30)items.push({badge:'crit',label:'CRISIS',msg:'Cancel rate '+Math.round(d.cancel)+'% — escalate'});
  else if(d.cancel>15)items.push({badge:'warn',label:'WARN',msg:'Cancel rate elevated at '+Math.round(d.cancel)+'%'});
  if(d.orders>160)items.push({badge:'ok',label:'OPP',msg:'High demand — '+Math.round(d.orders)+' orders/hr'});
  if(!items.length)items.push({badge:'ok',label:'OK',msg:'All systems nominal'});
  alertLog=items.map(i=>({...i,time:now}));
  const html=alertLog.map(a=>'<div class="alert-row" style="display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--border)"><span class="ti-badge '+a.badge+'" style="flex-shrink:0;font-size:10px;padding:2px 8px;border-radius:3px;font-family:\'IBM Plex Mono\',monospace;font-weight:700">'+a.label+'</span><span style="flex:1;font-size:13px;color:var(--text-primary)">'+a.msg+'</span><span style="font-size:11px;color:var(--text-muted);font-family:\'IBM Plex Mono\',monospace;white-space:nowrap">'+a.time+'</span></div>').join('');
  ['alertTable','alertTableManager'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html||'<div style="padding:16px;color:var(--text-muted);font-size:13px">Waiting for events...</div>';});
}

function updateTicker(d,score){
  const feed=document.getElementById('tickerFeed');if(!feed)return;
  let badge,msg;
  if(score.total<40){badge='<span class="ti-badge crit">CRISIS</span>';msg='Score '+score.total+' — War Room active';}
  else if(d.delivery>15){badge='<span class="ti-badge warn">SLA</span>';msg='Delivery breach at '+Math.round(d.delivery)+'m';}
  else if(d.orders>160){badge='<span class="ti-badge ok">SURGE</span>';msg='Orders at '+Math.round(d.orders)+'/hr — peak demand';}
  else if(d.stock<20){badge='<span class="ti-badge crit">STOCK</span>';msg='Critical stock at '+Math.round(d.stock)+'%';}
  else{badge='<span class="ti-badge ok">OK</span>';msg='All systems nominal — monitoring active';}
  injectTickerItem(badge+' '+msg);
}

function startClock(){
  const el=document.getElementById('tickerClock');
  if(!el)return;
  setInterval(()=>{el.textContent=new Date().toLocaleTimeString();},1000);
}

function openWarRoom(label){
  const wr=document.getElementById('warRoom');wr.classList.add('open');
  document.getElementById('wrTitle').textContent='⚠ WAR ROOM ⚠';
  document.getElementById('wrDesc').textContent='Triggered by: '+label;
  document.getElementById('wrTime').textContent='Opened: '+new Date().toLocaleTimeString();
  const score=calcStressScore(liveData);
  document.getElementById('wrMetrics').innerHTML=[
    {l:'Stress Score',v:score.total,ok:score.total>=45},
    {l:'Delivery',v:Math.round(liveData.delivery)+'m',ok:liveData.delivery<=10},
    {l:'Stock',v:Math.round(liveData.stock)+'%',ok:liveData.stock>=30},
    {l:'Cancel Rate',v:Math.round(liveData.cancel)+'%',ok:liveData.cancel<20},
  ].map(m=>'<div class="wr-metric"><div class="wr-metric-val">'+m.v+'</div><div class="wr-metric-label">'+m.l+'</div><div class="wr-metric-badge '+(m.ok?'ok':'breach')+'">'+(m.ok?'OK':'BREACH')+'</div></div>').join('');
  document.getElementById('wrActions').innerHTML='<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;font-weight:600">RESPONSE CHECKLIST</div>'+[
    'Notify operations manager','Check warehouse stock levels','Review active delivery partners',
    'Escalate to Tier-2 support','Activate backup routing','Send customer comms'
  ].map((t,i)=>'<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer"><input type="checkbox" style="accent-color:var(--orange)"/> <span style="font-size:13px">'+t+'</span></label>').join('');
}
function closeWarRoom(){document.getElementById('warRoom').classList.remove('open');}

// ── Charts ────────────────────────────────────────────────────────────────
function getChartDefaults(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  return{gridColor:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.07)',labelColor:isDark?'#8b949e':'#6b7280'};
}
function initCharts(){
  if(currentRole!=='owner'&&currentRole!=='manager')return;
  if(delivChart){delivChart.destroy();delivChart=null;}
  if(radarChart){radarChart.destroy();radarChart=null;}
  if(stackedChart){stackedChart.destroy();stackedChart=null;}
  const {gridColor,labelColor}=getChartDefaults();
  if(currentRole==='owner'){
    const dc=document.getElementById('chartDelivery');
    if(dc){delivChart=new Chart(dc,{type:'line',data:{labels:Array.from({length:14},(_,i)=>i+1+''),datasets:[{label:'Avg Delivery (min)',data:[...delivHistory],borderColor:'#38bdf8',backgroundColor:'rgba(56,189,248,0.08)',tension:0.4,pointRadius:3,pointBackgroundColor:'#38bdf8'},{label:'SLA (10m)',data:Array(14).fill(10),borderColor:'#f97316',borderDash:[5,4],pointRadius:0,tension:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:labelColor,font:{size:11}}}},scales:{x:{grid:{color:gridColor},ticks:{color:labelColor}},y:{grid:{color:gridColor},ticks:{color:labelColor},min:0,max:40}}}});}
    const rc=document.getElementById('chartRadar');
    if(rc){radarChart=new Chart(rc,{type:'radar',data:{labels:['Grocery','Dairy','Beverages','Personal Care','Bakery'],datasets:[{label:'This Week',data:[liveData.cancel,liveData.cancel+3,liveData.cancel-2,liveData.cancel+1,liveData.cancel-1],borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.15)',pointBackgroundColor:'#f87171'},{label:'Last Week',data:[8,10,7,9,6],borderColor:'#94a3b8',backgroundColor:'rgba(148,163,184,0.1)',pointBackgroundColor:'#94a3b8'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:labelColor,font:{size:11}}}},scales:{r:{grid:{color:gridColor},ticks:{color:labelColor,backdropColor:'transparent'},pointLabels:{color:labelColor}}}}});}
  }
  if(currentRole==='manager'){
    const sc=document.getElementById('chartStacked');
    if(sc){const hours=['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];stackedChart=new Chart(sc,{type:'bar',data:{labels:hours,datasets:[{label:'On-Time',data:[18,22,25,30,28,35,32,20],backgroundColor:'#38bdf8'},{label:'Delayed',data:[2,3,4,5,8,6,9,5],backgroundColor:'#f87171'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:labelColor,font:{size:11}}}},scales:{x:{stacked:true,grid:{color:gridColor},ticks:{color:labelColor}},y:{stacked:true,grid:{color:gridColor},ticks:{color:labelColor}}}}});}
  }
}
function updateCharts(){
  if(delivChart&&delivHistory.length){delivChart.data.datasets[0].data=[...delivHistory];delivChart.update('none');}
  if(radarChart){const v=liveData.cancel;radarChart.data.datasets[0].data=[v,v+3,v-2,v+1,v-1];radarChart.update('none');}
}
function openAlertModal(){
  const body=document.getElementById('alertModalBody');
  const history=[...alertLog,...alertLog,...alertLog];
  body.innerHTML=history.length
    ?history.map(a=>'<div style="display:flex;align-items:center;gap:10px;padding:12px 24px;border-bottom:1px solid var(--border)"><span class="ti-badge '+a.badge+'" style="flex-shrink:0">'+a.label+'</span><span style="flex:1;font-size:13px;color:var(--text-primary)">'+a.msg+'</span><span style="font-size:11px;color:var(--text-muted);font-family:\'IBM Plex Mono\',monospace">'+a.time+'</span></div>').join('')
    :'<div style="padding:24px;color:var(--text-muted);text-align:center">No alerts yet</div>';
  document.getElementById('alertModal').style.display='block';
}
function closeAlertModal(){
  document.getElementById('alertModal').style.display='none';
}
//review
async function loadReviews(){
  if(currentRole!=='owner')return;
  const sb=window._supabase||_supabase;
  if(!sb){renderReviews(getMockReviews());return;}
  const {data,error}=await sb
    .from('customer_reviews')
    .select('*')
    .order('created_at',{ascending:false})
    .limit(10);
  if(error||!data||!data.length){renderReviews(getMockReviews());return;}
  renderReviews(data.map(formatReview));
  sb.channel('reviews-live')
    .on('postgres_changes',
      {event:'INSERT',schema:'public',table:'customer_reviews'},
      ()=>{
        sb.from('customer_reviews').select('*')
          .order('created_at',{ascending:false}).limit(10)
          .then(({data})=>{if(data&&data.length)renderReviews(data.map(formatReview));});
        showToast('New WhatsApp review received!');
      }
    ).subscribe();
}
function formatReview(r){
  return{
    name:r.name||r.phone||'Anonymous',
    rating:r.rating||5,
    msg:r.message||'',
    time:r.created_at?new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''
  };
}
function getMockReviews(){
  return[
    {name:'Rahul M.',rating:5,msg:'Super fast delivery! Got my groceries in 8 minutes.',time:'10:42 AM'},
    {name:'Sneha K.',rating:4,msg:'Good service, packaging could be better.',time:'10:15 AM'},
    {name:'Amit T.',rating:5,msg:'Best quick commerce in Mumbai. Always on time!',time:'09:58 AM'},
    {name:'Priya D.',rating:3,msg:'Delivery was slightly late today but quality was good.',time:'09:30 AM'},
    {name:'Karan S.',rating:5,msg:'Amazing experience, will definitely order again.',time:'09:10 AM'},
  ];
}
function renderReviews(reviews){
  const container=document.getElementById('reviewsList');
  if(!container)return;
  const avg=(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1);
  const stars=r=>'★'.repeat(r)+'☆'.repeat(5-r);
  container.innerHTML=
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;cursor:pointer"
      onclick="document.getElementById('reviewsModal').style.display='block'">
      <div style="display:flex;align-items:center;gap:16px">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:32px;font-weight:700;color:var(--text-primary)">${avg}</span>
        <div>
          <div style="color:#f59e0b;font-size:18px;letter-spacing:2px">${stars(Math.round(avg))}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${reviews.length} reviews</div>
        </div>
      </div>
      <span style="font-size:13px;color:var(--blue);font-weight:600;font-family:'Plus Jakarta Sans',sans-serif">View all reviews →</span>
    </div>

    <div id="reviewsModal" style="display:none;position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)" onclick="if(event.target===this)this.style.display='none'">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(600px,90vw);max-height:80vh;overflow-y:auto;background:var(--card-bg);border-radius:8px;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,0.4)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card-bg)">
          <div>
            <div style="font-weight:700;font-size:16px;font-family:'Playfair Display',serif">⭐ Customer Reviews</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${reviews.length} reviews via WhatsApp</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px">
            <div>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:700;color:var(--text-primary)">${avg}</span>
              <span style="color:#f59e0b;font-size:16px;margin-left:8px">${stars(Math.round(avg))}</span>
            </div>
            <button class="btn-ghost" onclick="document.getElementById('reviewsModal').style.display='none'">✕ Close</button>
          </div>
        </div>
        <div style="padding:8px 0">
          ${reviews.map(r=>
            `<div style="padding:16px 24px;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:30px;height:30px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${r.name[0]}</div>
                  <span style="font-weight:600;font-size:13px;color:var(--text-primary)">${r.name}</span>
                </div>
                <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-faint)">${r.time}</span>
              </div>
              <div style="color:#f59e0b;font-size:13px;letter-spacing:1px;margin-bottom:4px">${stars(r.rating)}</div>
              <div style="font-size:13px;color:var(--text-muted);line-height:1.5">${r.msg}</div>
            </div>`
          ).join('')}
        </div>
      </div>
    </div>`;
}
