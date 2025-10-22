// Простая логика формы, чат и анимаций (без внешних библиотек)
document.addEventListener('DOMContentLoaded', () => {
  const leadForm = document.getElementById('leadForm');
  const formMsg = document.getElementById('formMsg');
  const formatSelect = document.getElementById('formatSelect');
  const timezone = document.getElementById('timezone');

  // Показать/скрыть timezone для оффлайн/онлайн
  function toggleTimezone(){
    if(formatSelect.value === 'online') timezone.style.display = 'block';
    else timezone.style.display = 'none';
  }
  toggleTimezone();
  formatSelect.addEventListener('change', toggleTimezone);

  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = 'Отправка...';
    const data = new FormData(leadForm);
    const body = {};
    data.forEach((v,k) => body[k] = v);
    body.city = formatSelect.value === 'offline' ? 'Барановичи' : (body.city || 'online');

    try{
      const res = await fetch('/api/lead', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if(res.ok){ formMsg.textContent = 'Заявка принята. Мы свяжемся с вами.'; leadForm.reset(); toggleTimezone(); }
      else formMsg.textContent = json?.error || 'Ошибка при отправке';
    }catch(err){
      formMsg.textContent = 'Ошибка сети';
    }
  });

  // Chat
  const chatArea = document.getElementById('chatArea');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');

  function appendChat(author, text){
    const el = document.createElement('div');
    el.className = 'chat-msg';
    el.style.marginBottom = '8px';
    el.innerHTML = `<strong>${author}:</strong> ${text}`;
    chatArea.appendChild(el);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  chatSend.addEventListener('click', async ()=> {
    const text = chatInput.value.trim();
    if(!text) return;
    appendChat('Вы', text);
    chatInput.value = '';
    try{
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({text})
      });
      const json = await res.json();
      appendChat('Логопед', json.reply || 'Спасибо, ответим в ближайшее время');
    }catch(e){
      appendChat('Система', 'Ошибка отправки сообщения');
    }
  });

  // CTA buttons scroll to form
  document.getElementById('bookBtn').addEventListener('click', ()=> document.getElementById('contacts').scrollIntoView({behavior:'smooth'}));
  document.getElementById('heroBook').addEventListener('click', ()=> document.getElementById('contacts').scrollIntoView({behavior:'smooth'}));
  document.getElementById('heroChat').addEventListener('click', ()=> chatInput.focus());

  // Simple reveal on scroll
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  }, {threshold: 0.12});
  document.querySelectorAll('.reveal, .fade-in').forEach(el => observer.observe(el));
});
