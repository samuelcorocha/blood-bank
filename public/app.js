const state = {
  token: localStorage.getItem('blood-bank-token') || '',
  user: null,
};

const elements = {
  loginForm: document.getElementById('login-form'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  urgentList: document.getElementById('urgentList'),
  publicStatus: document.getElementById('publicStatus'),
  bloodTypesCount: document.getElementById('bloodTypesCount'),
  criticalCount: document.getElementById('criticalCount'),
  donorsCount: document.getElementById('donorsCount'),
  dashboard: document.getElementById('dashboard'),
  dashboardTitle: document.getElementById('dashboardTitle'),
  dashboardContent: document.getElementById('dashboardContent'),
  message: document.getElementById('message'),
  logoutBtn: document.getElementById('logoutBtn'),
  demoChips: document.querySelectorAll('[data-fill]'),
};

function setMessage(text, tone = 'warning') {
  elements.message.textContent = text || '';
  elements.message.style.color = tone === 'success' ? '#9cf3eb' : tone === 'danger' ? '#ff8d86' : '#ffb84d';
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

function formatDate(value) {
  if (!value) {
    return 'Não disponível';
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`));
}

function renderUrgent(items) {
  if (!items.length) {
    elements.urgentList.innerHTML = '<div class="empty-state">Nenhum tipo sanguíneo em nível crítico no momento.</div>';
    return;
  }

  elements.urgentList.innerHTML = items
    .map(
      (item) => `
        <article class="urgent-item">
          <h3>${item.bloodType}</h3>
          <p>${item.unitsAvailable} unidades disponíveis</p>
          <div class="urgent-meta">
            <span>Limite crítico</span>
            <span class="threshold">${item.criticalThreshold} un.</span>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderAdminDashboard(data) {
  elements.dashboardTitle.textContent = 'Painel Administrativo';

  const stockCards = data.stock
    .map(
      (item) => `
        <article class="stock-card">
          <h3>${item.bloodType}</h3>
          <p>${item.unitsAvailable} unidades em estoque</p>
          <p><span class="${item.unitsAvailable <= item.criticalThreshold ? 'critical' : 'safe'}">
            ${item.unitsAvailable <= item.criticalThreshold ? 'Nível crítico' : 'Nível controlado'}
          </span></p>
          <label class="field">
            <span>Atualizar unidades</span>
            <input type="number" min="0" value="${item.unitsAvailable}" data-stock-input="${item.bloodType}" />
          </label>
          <div class="inline-actions">
            <button class="secondary" data-save-stock="${item.bloodType}">Salvar</button>
          </div>
        </article>
      `,
    )
    .join('');

  const donorCards = data.donors
    .map(
      (donor) => `
        <article class="donor-card">
          <h3>${donor.name}</h3>
          <p>${donor.email}</p>
          <p>Tipo: ${donor.bloodType || 'Não informado'}</p>
          <p>Última doação: ${formatDate(donor.lastDonationDate)}</p>
          <p>Próxima aptidão: ${formatDate(donor.nextEligibleDonationDate)}</p>
        </article>
      `,
    )
    .join('');

  elements.dashboardContent.innerHTML = `
    <div class="stock-grid">
      <article class="profile-card">
        <h3>Indicadores</h3>
        <p>${data.totals.bloodTypesTracked} tipos monitorados</p>
        <p>${data.totals.criticalTypes} tipos em alerta</p>
        <p>${data.totals.donorsRegistered} doadores cadastrados</p>
      </article>
      ${stockCards}
    </div>
    <h3 style="margin-top: 1.2rem;">Doadores cadastrados</h3>
    <div class="donor-panel">${donorCards}</div>
  `;

  elements.dashboard.querySelectorAll('[data-save-stock]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bloodType = button.getAttribute('data-save-stock');
      const input = elements.dashboard.querySelector(`[data-stock-input="${bloodType}"]`);
      const response = await fetch(`/api/admin/stock/${bloodType}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ unitsAvailable: input.value }),
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage(error.message || 'Não foi possível atualizar o estoque.');
        return;
      }

      setMessage(`Estoque de ${bloodType} atualizado.`, 'success');
      await refreshAll();
    });
  });
}

function renderDonorDashboard(data) {
  elements.dashboardTitle.textContent = 'Painel do Doador';

  const profile = data.profile;

  elements.dashboardContent.innerHTML = `
    <div class="donor-panel">
      <article class="profile-card">
        <h3>${profile.name}</h3>
        <p>${profile.email}</p>
        <p>Tipo sanguíneo: ${profile.bloodType || 'Não informado'}</p>
      </article>
      <article class="profile-card">
        <h3>Próxima aptidão</h3>
        <p>${formatDate(profile.nextEligibleDonationDate)}</p>
        <p>Última doação registrada: ${formatDate(profile.lastDonationDate)}</p>
      </article>
    </div>
    <h3 style="margin-top: 1.2rem;">Status de urgência geral</h3>
    <div class="card-list">
      ${data.urgency
        .slice(0, 4)
        .map(
          (item) => `
            <article class="urgent-item">
              <h3>${item.bloodType}</h3>
              <p>${item.unitsAvailable} unidades disponíveis</p>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

async function loadPublicData() {
  const response = await fetch('/api/public/urgent');
  const data = await response.json();

  const urgentStocks = data.urgentStocks || [];
  renderUrgent(urgentStocks);
  elements.criticalCount.textContent = urgentStocks.length;
  elements.publicStatus.textContent = urgentStocks.length ? 'Atenção' : 'Estável';
}

async function loadSummaryForLoggedUser() {
  if (!state.token) {
    elements.dashboard.classList.add('hidden');
    return;
  }

  const meResponse = await fetch('/api/me', { headers: authHeaders() });
  if (!meResponse.ok) {
    state.token = '';
    state.user = null;
    localStorage.removeItem('blood-bank-token');
    elements.dashboard.classList.add('hidden');
    return;
  }

  const meData = await meResponse.json();
  state.user = meData.user;
  elements.dashboard.classList.remove('hidden');

  if (state.user.role === 'admin') {
    const response = await fetch('/api/admin/dashboard', { headers: authHeaders() });
    const data = await response.json();
    elements.bloodTypesCount.textContent = data.totals.bloodTypesTracked;
    elements.criticalCount.textContent = data.totals.criticalTypes;
    elements.donorsCount.textContent = data.totals.donorsRegistered;
    renderAdminDashboard(data);
    return;
  }

  const response = await fetch('/api/donor/dashboard', { headers: authHeaders() });
  const data = await response.json();
  elements.bloodTypesCount.textContent = data.urgency.length;
  elements.criticalCount.textContent = data.urgency.filter((item) => item.unitsAvailable <= item.criticalThreshold).length;
  elements.donorsCount.textContent = '1';
  renderDonorDashboard(data);
}

async function refreshAll() {
  await Promise.all([loadPublicData(), loadSummaryForLoggedUser()]);
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: elements.email.value,
      password: elements.password.value,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    setMessage(data.message || 'Falha no acesso.');
    return;
  }

  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('blood-bank-token', data.token);
  setMessage(`Bem-vindo, ${state.user.name}.`, 'success');
  await refreshAll();
});

elements.logoutBtn.addEventListener('click', async () => {
  if (!state.token) {
    return;
  }

  await fetch('/api/logout', { method: 'POST', headers: authHeaders() });
  state.token = '';
  state.user = null;
  localStorage.removeItem('blood-bank-token');
  elements.dashboard.classList.add('hidden');
  elements.dashboardContent.innerHTML = '';
  setMessage('Sessão encerrada.', 'success');
});

elements.demoChips.forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.getAttribute('data-fill');
    if (type === 'admin') {
      elements.email.value = 'admin@hemocentro.local';
      elements.password.value = 'admin123';
      return;
    }

    elements.email.value = 'ana@doadores.local';
    elements.password.value = 'donor123';
  });
});

refreshAll().catch((error) => {
  console.error(error);
  setMessage('Não foi possível carregar os dados iniciais.');
});