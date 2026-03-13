const SUPABASE_URL      = 'https://jvvljfvjsqkdkoycjcrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dmxqZnZqc3FrZGtveWNqY3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODQwNjcsImV4cCI6MjA4ODc2MDA2N30.2WgUnO7k1YdJBl4Cd2rEwzgi3ZpHOuzeyfRPn2UDpB0
';

let _supabase      = null;
let _realtimeChannel = null;

async function initSupabase() {
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._supabase = _supabase;
  await loadLatestMetrics();
  startRealtimeListener();
}

async function loadLatestMetrics() {
  try {
    const { data: profile } = await _supabase
      .from('user_profiles')
      .select('business_id, order_target')
      .eq('user_id', (await _supabase.auth.getUser()).data.user.id)
      .single();

    if (!profile) return;

    if (currentUser) currentUser.orderTarget = profile.order_target || 200;

    const { data, error } = await _supabase
      .from('latest_business_metrics')
      .select('stock, orders, revenue, delivery, cancel')
      .eq('business_id', profile.business_id)
      .single();

    if (error || !data) return;

    applyMetrics(data);

  } catch (err) {
    console.error('[OpsPulse] loadLatestMetrics error:', err.message);
  }
}

function startRealtimeListener() {
  if (_realtimeChannel) {
    _supabase.removeChannel(_realtimeChannel);
  }

  _realtimeChannel = _supabase
    .channel('opspulse-live-metrics')
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'business_metrics',
      },
      (payload) => {
        const row = payload.new;
        handleRealtimePacket({
          stock:    row.stock_level,
          orders:   row.orders_per_hour,
          revenue:  row.revenue_progress,
          delivery: row.delivery_time_min,
          cancel:   row.cancel_rate_pct,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        showToast('🟢 Live data connected');
      }
      if (status === 'CHANNEL_ERROR') {
        showToast('⚠️ Live connection lost — retrying...');
      }
    });
}

function handleRealtimePacket(metrics) {
  applyMetrics(metrics);

  const score = calcStressScore(liveData);

  if (score.total < 40 && !document.getElementById('warRoom').classList.contains('open')) {
    openWarRoom('Realtime Crisis — Score: ' + score.total);
  }

  delivHistory.push(liveData.delivery);
  if (delivHistory.length > 14) delivHistory.shift();

  if (liveData.orders > orderPeak) orderPeak = liveData.orders;

  renderDashboard();
}

function applyMetrics(m) {
  liveData.stock    = Number(m.stock)    || liveData.stock;
  liveData.orders   = Number(m.orders)   || liveData.orders;
  liveData.revenue  = Number(m.revenue)  || liveData.revenue;
  liveData.delivery = Number(m.delivery) || liveData.delivery;
  liveData.cancel   = Number(m.cancel)   || liveData.cancel;
}

async function supabaseLogin() {
  const input    = document.getElementById('loginInput').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!input || !password) {
    showError('loginError', 'Please enter your credentials.');
    return;
  }

  const btn = document.querySelector('#loginScreen .btn-primary');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const { data, error } = await _supabase.auth.signInWithPassword({
      email:    input,
      password: password,
    });

    if (error) throw error;

    const { data: profile, error: profileError } = await _supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !profile) throw new Error('Profile not found. Contact support.');

    if (profile.role !== selectedLoginRole) {
      throw new Error(
        'These credentials belong to a ' + profile.role +
        '. Please select the correct role toggle.'
      );
    }

    currentUser = {
      email:       data.user.email,
      role:        profile.role,
      name:        profile.name         || 'User',
      business:    profile.business     || 'OpsPulse',
      city:        profile.city         || '',
      orderTarget: profile.order_target || 200,
      warehouses:  profile.warehouses   || 2,
      zones:       profile.zones        || 3,
      avatar:      profile.avatar       || profile.name?.slice(0,2).toUpperCase() || 'OP',
      business_id: profile.business_id,
    };
    currentRole = profile.role;

    showScreen('dashboard');
    initDashboard();
    initSupabase();

  } catch (err) {
    showError('loginError', err.message);
  } finally {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
  }
}

async function supabaseSignup() {
  clearFieldErrors();

  const name     = document.getElementById('suName').value.trim();
  const email    = document.getElementById('suEmail').value.trim();
  const password = document.getElementById('suPassword').value;
  const biz      = document.getElementById('suBusiness').value.trim();
  const city     = document.getElementById('suCity').value.trim();
  const size     = document.getElementById('suSize').value;
  const cat      = document.getElementById('suCategory').value;

  if (!biz)        { showFieldError('err-suBusiness', 'Required'); return; }
  if (!city)       { showFieldError('err-suCity', 'Required'); return; }
  if (!size||!cat) { return; }
  if (!signupRole) { showFieldError('err-suRole', 'Please select your role'); return; }

  const btn = document.querySelector('#signupStep2 .btn-primary');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: signupRole, name }
      }
    });

    if (error) throw error;

    const initials   = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    const businessId = crypto.randomUUID();

    const { error: profileError } = await _supabase
      .from('user_profiles')
      .insert({
        user_id:      data.user.id,
        business_id:  businessId,
        role:         signupRole,
        name,
        avatar:       initials,
        business:     biz,
        city,
        order_target: Number(document.getElementById('suOrderTarget').value) || 200,
        warehouses:   Number(document.getElementById('suWarehouses').value)  || 2,
        zones:        Number(document.getElementById('suZones').value)        || 3,
      });

    if (profileError) throw profileError;

    await _supabase.from('business_metrics').insert({
      business_id:       businessId,
      stock_level:       65,
      warehouse_id:      'WH-01',
      orders_per_hour:   120,
      revenue_progress:  62,
      delivery_time_min: 8.0,
      cancel_rate_pct:   8.0,
    });

    currentUser = {
      email, role: signupRole, name, business: biz, city,
      orderTarget: 200, avatar: initials, business_id: businessId,
    };
    currentRole = signupRole;

    showScreen('dashboard');
    initDashboard();
    initSupabase();
    showToast('✓ Account created — Welcome, ' + name.split(' ')[0]);

  } catch (err) {
    showError('loginError', err.message);
  } finally {
    btn.textContent = 'Launch Dashboard →';
    btn.disabled = false;
  }
}

async function supabaseSignOut() {
  if (_realtimeChannel) {
    await _supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }

  await _supabase.auth.signOut();

  currentUser  = null;
  currentRole  = null;
  if (liveInterval) clearInterval(liveInterval);
  liveInterval = null;
  delivChart = radarChart = stackedChart = null;
  liveData     = { stock:65, delivery:8, orders:120, cancel:8, revenue:62 };
  delivHistory = []; alertLog = []; orderPeak = 0;

  document.getElementById('userDropdown').classList.remove('open');
  document.getElementById('loginInput').value    = '';
  document.getElementById('loginPassword').value = '';
  hideError('loginError');
  showScreen('login');
}

async function restoreSession() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return;

  const { data: profile } = await _supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!profile) return;

  currentUser = {
    email:       session.user.email,
    role:        profile.role,
    name:        profile.name         || 'User',
    business:    profile.business     || 'OpsPulse',
    city:        profile.city         || '',
    orderTarget: profile.order_target || 200,
    warehouses:  profile.warehouses   || 2,
    zones:       profile.zones        || 3,
    avatar:      profile.avatar       || 'OP',
    business_id: profile.business_id,
  };
  currentRole = profile.role;

  showScreen('dashboard');
  initDashboard();
  initSupabase();
}

restoreSession();
