const accessibilityButton = document.querySelector('#accessibility-trigger');
const accessibilityMenu = document.querySelector('#accessibility-menu');
const closeAccessibility = document.querySelector('#close-accessibility');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#journey-dialog');
let toastTimer; let activeApplicationId = null; let pollTimer = null;

function toggleAccessibility(open) { accessibilityMenu.hidden = !open; accessibilityButton.setAttribute('aria-expanded', String(open)); if (open) accessibilityMenu.querySelector('button').focus(); }
function showToast(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3200); }
async function api(url, options = {}) { const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data; }
const stateText = state => state.replaceAll('_', ' ');
function daysLeft(deadline) { if (!deadline) return null; return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)); }
function deadlinePassed(deadline) { return Boolean(deadline) && Date.now() > new Date(deadline).getTime(); }
function idemKey(applicationId) { return `idem-${applicationId}`; }

function renderAudit(audit) { document.querySelector('#audit-trail').innerHTML = audit.slice().reverse().map(item => `<li><strong>${stateText(item.to)}</strong><br>${item.reason}<time>${new Date(item.timestamp).toLocaleTimeString()}</time></li>`).join(''); }

async function loadSlots(state) { const { slots } = await api('/api/slots'); const kind = state === 'documents_verified' ? 'learner' : 'practical'; document.querySelector('#slot-list').innerHTML = slots.filter(slot => slot.kind === kind).map(slot => `<div class="slot-card"><p><strong>${slot.label}</strong><small>${slot.remaining} of ${slot.capacity} seats remaining</small></p><button class="secondary-button" data-slot-id="${slot.id}" ${slot.remaining === 0 ? 'disabled' : ''}>${slot.remaining === 0 ? 'Full' : 'Book this slot'}</button></div>`).join(''); }
function renderSlots(state) { const visible = ['documents_verified', 'learner_license_issued'].includes(state); document.querySelector('#slots-section').hidden = !visible; if (visible) loadSlots(state); }

function renderNextStep(status, details) {
  const el = document.querySelector('#next-step');
  const state = status.state;
  const verification = details.verification || {};
  if (['documents_pending', 'eligibility_checked'].includes(state) && verification.state === 'in_person_visit_scheduled' && !status.processing) { el.innerHTML = '<p><strong>Awaiting RTO officer verification</strong></p><p>This stub simulates an RTO officer confirming your documents in person — no real auth or admin panel.</p><button class="secondary-button" data-run-action="officer-verify">Simulate RTO officer verification (mock)</button>'; return; }
  if (['documents_pending', 'eligibility_checked'].includes(state) && !verification.method) { el.innerHTML = '<p><strong>Verify your documents</strong></p><p>Choose either path — both converge on the same verified state. Both are simulated for this demo.</p><div class="action-row"><button class="primary-button" data-run-action="start-digilocker">Fetch via DigiLocker (mock)</button><button class="secondary-button" data-run-action="schedule-in-person">Schedule in-person RTO visit (mock)</button></div>'; return; }
  if (state === 'documents_verified') { el.innerHTML = "<p><strong>Book your learner's test</strong></p><p>Select an available slot below.</p>"; return; }
  if (state === 'learner_test_scheduled') { el.innerHTML = '<p><strong>Simulate learner test result</strong></p><button class="primary-button" data-run-action="record-test-result">Simulate learner test result (mock)</button>'; return; }
  if (state === 'learner_license_issued') { el.innerHTML = '<p><strong>Book your practical test</strong></p><p>Select an available slot below.</p>'; return; }
  if (state === 'practical_test_scheduled') { el.innerHTML = '<p><strong>Simulate practical test result</strong></p><button class="primary-button" data-run-action="record-test-result">Simulate practical test result (mock)</button>'; return; }
  if (state === 'documents_reverified') { el.innerHTML = '<p><strong>Proceed to mock payment</strong></p><p>See the payment panel below. Your idempotency key is tied to this application, so a repeat click never double-charges.</p>'; return; }
  if (state === 'payment_pending') { el.innerHTML = '<p><strong>Payment pending — confirming with your bank</strong></p><p>A real gateway callback decides this, not the click on “Pay.” Simulate that callback below.</p><button class="primary-button" data-run-action="mock-gateway-callback">Simulate bank callback (mock)</button>'; return; }
  if (state === 'payment_failed') { el.innerHTML = '<p><strong>Payment failed — no amount deducted</strong></p><p>This is a distinct, honest state from “pending.” No retry path is modelled for this demo application.</p>'; return; }
  if (state === 'license_issued') { el.innerHTML = '<p><strong>Licence issued</strong></p><p>Digital and physical delivery are shown as two independent statuses below.</p>'; return; }
  if (state === 'license_renewed') { el.innerHTML = '<p><strong>Renewal complete</strong></p>'; return; }
  el.innerHTML = '<p><strong>Processing in background…</strong></p>';
}

function renderIssuance(status, details) {
  const section = document.querySelector('#issuance-section');
  if (!status.issuance) { section.hidden = true; return; }
  section.hidden = false;
  document.querySelector('#digital-status').textContent = stateText(status.issuance.digital.status);
  document.querySelector('#digital-detail').innerHTML = `Reference ${status.issuance.digital.reference} — available now via mock DigiLocker, independent of physical dispatch.<div class="action-row"><button class="secondary-button" data-run-action="view-digital" data-reference="${status.issuance.digital.reference}">View / download (mock)</button></div>`;
  const physical = status.issuance.physical;
  document.querySelector('#physical-status').textContent = stateText(physical);
  const physicalDetail = document.querySelector('#physical-detail');
  const addressActions = document.querySelector('#address-actions');
  if (physical === 'address_confirmation_pending') {
    if (deadlinePassed(status.issuance.deadline)) {
      physicalDetail.textContent = 'The 5-day address confirmation window has passed.';
      addressActions.innerHTML = '<p>Visit an RTO to set your delivery address (mock, same in-person mechanism used for document verification).</p><button class="secondary-button" data-run-action="officer-set-address">Simulate RTO officer setting address (mock)</button>';
    } else {
      physicalDetail.textContent = `Awaiting address confirmation — ${daysLeft(status.issuance.deadline)} day(s) left.`;
      addressActions.innerHTML = `<label>Delivery address<textarea id="address-input" rows="2">${details.address || ''}</textarea></label><button class="primary-button" data-run-action="confirm-address">Confirm delivery address (mock)</button>`;
    }
    return;
  }
  addressActions.innerHTML = '';
  physicalDetail.textContent = physical === 'dispatched' ? (status.issuance.eta || 'Dispatched.') : '';
}

function renderPayment(status) {
  const section = document.querySelector('#payment-options');
  if (status.state !== 'documents_reverified') { section.hidden = true; section.innerHTML = ''; return; }
  section.hidden = false;
  section.innerHTML = '<label><input id="payment-failure-toggle" type="checkbox" /> Simulate bank failure</label><small>A failed callback is shown separately as “no amount deducted.”</small><div class="action-row"><button class="primary-button" data-run-action="initiate-payment">Pay licence renewal fee (mock)</button></div>';
}

function renderEligibility(status, details) {
  const note = document.querySelector('#eligibility-note');
  if (status.type !== 'Driving licence renewal') { note.hidden = true; return; }
  note.hidden = false;
  note.textContent = `Mock eligibility check — expiry date: ${details.expiryDate}; pending violations: ${details.pendingViolations ? 'yes' : 'no'}.`;
}

function renderApplication(status, details) {
  document.querySelector('#application-workspace').hidden = false;
  document.querySelector('#application-id').textContent = status.applicationId;
  document.querySelector('#application-state').textContent = stateText(status.state);
  document.querySelector('#processing-message').textContent = status.processing ? 'Processing: a simulated background job is moving this application forward. This page checks the compact status endpoint every 2 seconds.' : '';
  const queue = document.querySelector('#queue-message'); queue.hidden = !status.queue; if (status.queue) queue.textContent = `High-demand queue active: you are #${status.queue.position}; estimated wait ${status.queue.estimatedMinutes} minutes.`;
  renderEligibility(status, details);
  renderNextStep(status, details);
  renderSlots(status.state);
  renderIssuance(status, details);
  renderPayment(status);
  if (status.processing && !pollTimer) pollTimer = setInterval(refreshStatus, 2000);
  if (!status.processing && pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function refreshStatus() {
  if (!activeApplicationId) return;
  try {
    const [statusData, details] = await Promise.all([api(`/api/applications/${activeApplicationId}/status`), api(`/api/applications/${activeApplicationId}`)]);
    renderApplication(statusData, details);
    renderAudit(details.audit);
  } catch (error) { showToast(error.message); clearInterval(pollTimer); pollTimer = null; }
}

async function runAction(action, payload = {}) { try { const data = await api(`/api/applications/${activeApplicationId}/actions/${action}`, { method: 'POST', body: JSON.stringify(payload) }); showToast(data.message); await refreshStatus(); } catch (error) { showToast(error.message); } }

async function startJourney(type) {
  try {
    const identityMethod = document.querySelector('input[name="identity-method"]:checked').value;
    const highLoad = document.querySelector('#high-load-toggle').checked;
    const data = await api('/api/applications', { method: 'POST', body: JSON.stringify({ type, identityMethod, highLoad }) });
    activeApplicationId = data.application.applicationId;
    showToast(`${type === 'new' ? 'New application' : 'Renewal'} created: ${activeApplicationId}. ${data.mockNotice}`);
    await refreshStatus();
  } catch (error) { showToast(error.message); }
}

async function selectRole(role) { document.querySelectorAll('[data-role]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.role === role))); document.querySelectorAll('#journey-dialog [role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== `${role}-role`; }); if (role !== 'citizen') { const info = await api(`/api/roles/${role}`); document.querySelector(`#${role}-message`).textContent = info.message; } }

accessibilityButton.addEventListener('click', () => toggleAccessibility(accessibilityMenu.hidden));
closeAccessibility.addEventListener('click', () => { toggleAccessibility(false); accessibilityButton.focus(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !accessibilityMenu.hidden) toggleAccessibility(false); });
document.querySelectorAll('[data-text-size]').forEach(button => button.addEventListener('click', () => { document.documentElement.style.setProperty('--font-scale', button.dataset.textSize === 'small' ? '.9' : button.dataset.textSize === 'large' ? '1.15' : '1'); document.querySelectorAll('[data-text-size]').forEach(item => item.classList.toggle('selected', item === button)); }));
document.querySelector('#contrast-toggle').addEventListener('change', event => document.body.classList.toggle('high-contrast', event.target.checked));
document.querySelector('#reading-toggle').addEventListener('change', event => document.body.classList.toggle('easy-reading', event.target.checked));
document.querySelector('#language-select').addEventListener('change', event => showToast(`${event.target.value} selected. Full translations are planned for this prototype.`));
document.querySelectorAll('main [role="tab"]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('main [role="tab"]').forEach(item => item.setAttribute('aria-selected', String(item === tab))); document.querySelectorAll('main [role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); }); }));
document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => showToast(`${button.dataset.service} selected — service journey will open here.`)));
document.querySelector('.service-search').addEventListener('submit', event => { event.preventDefault(); const value = document.querySelector('#service-search-input').value.trim(); showToast(value ? `Showing mock results for “${value}”.` : 'Type a service to search.'); });
document.querySelector('[data-open-journey]').addEventListener('click', () => { dialog.hidden = false; });
document.querySelector('.dialog-close').addEventListener('click', () => { dialog.hidden = true; if (pollTimer) clearInterval(pollTimer); pollTimer = null; });
document.querySelectorAll('[data-role]').forEach(tab => tab.addEventListener('click', () => selectRole(tab.dataset.role)));
document.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', () => startJourney(button.dataset.start)));
document.querySelector('#refresh-status').addEventListener('click', refreshStatus);

dialog.addEventListener('click', event => {
  const button = event.target.closest('[data-run-action]');
  if (!button) return;
  const action = button.dataset.runAction;
  if (action === 'view-digital') { showToast(`Mock digital licence ${button.dataset.reference} — a simulated DigiLocker document, not a real credential.`); return; }
  if (action === 'initiate-payment') { const simulateFailure = document.querySelector('#payment-failure-toggle')?.checked || false; runAction('initiate-payment', { idempotencyKey: idemKey(activeApplicationId), simulateFailure }); return; }
  if (action === 'confirm-address') { const address = document.querySelector('#address-input')?.value.trim() || ''; runAction('confirm-address', { address }); return; }
  runAction(action);
});

document.querySelector('#slot-list').addEventListener('click', async event => { const slotId = event.target.dataset.slotId; if (!slotId) return; try { const data = await api(`/api/applications/${activeApplicationId}/reservations`, { method: 'POST', body: JSON.stringify({ slotId }) }); showToast(`Reserved. ${data.remaining} seat(s) remain.`); await refreshStatus(); } catch (error) { showToast(error.message); } });
