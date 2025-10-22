(async function(){
  const statusPill = document.getElementById('statusPill');
  const secretInput = document.getElementById('adminSecret');
  const refreshBtn = document.getElementById('refreshBtn');
  const enableBtn = document.getElementById('enableBtn');
  const disableBtn = document.getElementById('disableBtn');
  const msg = document.getElementById('msg');

  function setMsg(s, error=false){ msg.textContent = s; msg.style.color = error ? '#a11' : '#333'; }

  async function apiGet(secret){
    const headers = secret ? { 'x-admin-secret': secret } : {};
    const res = await fetch('/api/admin/debug', { method: 'GET', headers });
    if (!res.ok) {
      const j = await res.json().catch(()=>({error:'Ошибка'}));
      throw new Error(j.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  async function apiPatch(secret, debug){
    const res = await fetch('/api/admin/debug', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ debug })
    });
    if (!res.ok){
      const j = await res.json().catch(()=>({error:'Ошибка'}));
      throw new Error(j.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  function renderState(state){
    if (state === true){
      statusPill.textContent = 'Включено';
      statusPill.className = 'status-pill status-on';
    } else {
      statusPill.textContent = 'Отключено';
      statusPill.className = 'status-pill status-off';
    }
  }

  async function refresh(){
    setMsg('Загрузка...');
    try{
      const data = await apiGet(secretInput.value.trim());
      renderState(!!data.debug);
      setMsg('Статус обновлён');
    } catch(e){
      renderState(false);
      setMsg('Ошибка: ' + e.message, true);
    }
  }

  refreshBtn.addEventListener('click', refresh);

  enableBtn.addEventListener('click', async () => {
    const s = secretInput.value.trim();
    if (!s) return setMsg('Требуется ADMIN_SECRET для изменения', true);
    setMsg('Отправка запроса на включение...');
    try{
      const data = await apiPatch(s, true);
      renderState(!!data.debug);
      setMsg('Debug включён');
    } catch(e){
      setMsg('Ошибка: ' + e.message, true);
    }
  });

  disableBtn.addEventListener('click', async () => {
    const s = secretInput.value.trim();
    if (!s) return setMsg('Требуется ADMIN_SECRET для изменения', true);
    setMsg('Отправка запроса на отключение...');
    try{
      const data = await apiPatch(s, false);
      renderState(!!data.debug);
      setMsg('Debug отключён');
    } catch(e){
      setMsg('Ошибка: ' + e.message, true);
    }
  });

  try { const data = await apiGet(); renderState(!!data.debug); setMsg('Готово'); } catch(e){ setMsg('Не удалось получить статус: ' + e.message, true); }
})();
