// ===== WHATSAPP ALERTS (CallMeBot) =====
// Setup: Save +34 644 60 49 79 on WhatsApp, send "I allow callmebot to send me messages"
// You'll receive your API key. Enter it in the Alert Settings card on the dashboard.

let waConfig = {
  phone:     localStorage.getItem('wa_phone')  || '',
  apiKey:    localStorage.getItem('wa_apikey') || '',
  threshold: Number(localStorage.getItem('wa_threshold')) || 45,
  enabled:   localStorage.getItem('wa_enabled') === 'true',
};
let _lastAlertScore = 100;
let _waCooldown     = false;

function saveWaConfig() {
  localStorage.setItem('wa_phone',     waConfig.phone);
  localStorage.setItem('wa_apikey',    waConfig.apiKey);
  localStorage.setItem('wa_threshold', waConfig.threshold);
  localStorage.setItem('wa_enabled',   waConfig.enabled);
}

async function sendWhatsAppAlert(score, reason) {
  if (_waCooldown) return;
  const msg = encodeURIComponent(
    '🔴 OpsPulse Alert\n' +
    'Business: ' + (currentUser?.business || 'OpsPulse') + '\n' +
    'Stress Score dropped to: ' + score + '\n' +
    'Reason: ' + (reason || 'Score below threshold') + '\n' +
    'Time: ' + new Date().toLocaleTimeString() + '\n' +
    'Action required immediately!'
  );
  const url = `https://api.callmebot.com/whatsapp.php?phone=${waConfig.phone}&text=${msg}&apikey=${waConfig.apiKey}`;
  try {
    await fetch(url, { mode: 'no-cors' });
    showToast('📱 WhatsApp alert sent to +' + waConfig.phone);
  } catch (e) {
    showToast('⚠️ WhatsApp send failed — check your config');
  }
  _waCooldown = true;
  setTimeout(() => { _waCooldown = false; }, 60000);
}

function checkWhatsAppTrigger(score) {
  if (!waConfig.enabled || !waConfig.phone || !waConfig.apiKey) return;
  if (score < waConfig.threshold && _lastAlertScore >= waConfig.threshold) {
    if (demoActive) {
      showToast('📱 [DEMO] WhatsApp alert would fire → +' + (waConfig.phone || 'your number'));
      showDemoWaToast(score);
    } else {
      const score_obj = calcStressScore(liveData);
      let reason = '';
      if (liveData.delivery > 15) reason = 'Delivery SLA breach (' + liveData.delivery + 'm)';
      else if (liveData.stock < 20) reason = 'Critical stock level (' + liveData.stock + '%)';
      else if (liveData.cancel > 25) reason = 'High cancellation rate (' + liveData.cancel + '%)';
      else reason = 'Multiple metrics degraded';
      sendWhatsAppAlert(score, reason);
    }
  }
  _lastAlertScore = score;
}

function showDemoWaToast(score) {
  const el = document.getElementById('demoWaToast');
  if (!el) return;
  el.querySelector('.dwt-score').textContent = score;
  el.querySelector('.dwt-phone').textContent = '+' + (waConfig.phone || 'your number');
  el.querySelector('.dwt-msg').textContent =
    '🔴 OpsPulse Alert — Score dropped to ' + score + ' — Action required!';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function renderWaSettingsCard() {
  return `
  <div class="card wa-settings-card" style="margin-bottom:16px">
    <div class="card-header">
      <div><div class="card-title">📱 WhatsApp Alert Settings</div><div class="card-subtitle">Get notified when stress score drops</div></div>
      <label class="wa-toggle-wrap">
        <input type="checkbox" id="waEnabled" ${waConfig.enabled ? 'checked' : ''} onchange="waConfig.enabled=this.checked;saveWaConfig();showToast(this.checked?'WhatsApp alerts ON':'WhatsApp alerts OFF')"/>
        <span class="wa-toggle-slider"></span>
      </label>
    </div>
    <div class="wa-settings-body">
      <div class="wa-fields">
        <div class="form-group" style="margin:0">
          <label class="form-label">Phone (with country code)</label>
          <input class="form-input" id="waPhone" placeholder="919876543210" value="${waConfig.phone}"
            oninput="waConfig.phone=this.value"/>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">CallMeBot API Key</label>
          <input class="form-input" id="waApiKey" placeholder="Your API key" value="${waConfig.apiKey}"
            oninput="waConfig.apiKey=this.value"/>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Alert Threshold (score below this)</label>
          <div style="display:flex;align-items:center;gap:12px">
            <input type="range" id="waThreshold" min="20" max="70" value="${waConfig.threshold}"
              oninput="waConfig.threshold=Number(this.value);document.getElementById('waThresholdVal').textContent=this.value"
              style="flex:1;accent-color:var(--orange)"/>
            <span id="waThresholdVal" style="font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--orange);min-width:24px">${waConfig.threshold}</span>
          </div>
        </div>
      </div>
      <div class="wa-actions">
        <button class="btn-ghost" onclick="saveWaConfig();showToast('✓ Settings saved')">Save</button>
        <button class="btn-ghost" onclick="sendWhatsAppAlert(42,'Test alert from OpsPulse')">Test Send</button>
      </div>
      <div class="wa-setup-hint">
        <strong>Setup:</strong> Add <code>+34 644 60 49 79</code> on WhatsApp → send <code>I allow callmebot to send me messages</code> → you'll receive your API key.
      </div>
    </div>
  </div>`;
}
