document.addEventListener('DOMContentLoaded', () => {
  const COUNTRIES = [
    { code: 'BY', name: 'Беларусь' },
    { code: 'RU', name: 'Россия' },
    { code: 'PL', name: 'Польша' },
    { code: 'DE', name: 'Германия' },
    { code: 'US', name: 'США' }
  ];

  const typeSel = document.getElementById('typeInline');
  const formatSel = document.getElementById('formatInline');
  const countryBlock = document.getElementById('countryBlockInline');
  const countrySel = document.getElementById('countryInline');
  const preferSel = document.getElementById('preferInline');
  const contactInput = document.getElementById('contact_value_inline');
  const form = document.getElementById('appFormInline');
  const submitBtn = document.getElementById('submitBtnInline');
  const inputTypeHidden = document.getElementById('input_type_inline');

  if (!typeSel) return;

  countrySel.innerHTML = COUNTRIES.map(c => `<option value="${c.code}">${c.name}</option>`).join('');

  function showFor(type) {
    document.querySelectorAll('.conditional').forEach(el => {
      el.style.display = el.dataset.for === type ? 'block' : 'none';
    });
    inputTypeHidden.value = type;
  }
  showFor(typeSel.value);

  typeSel.addEventListener('change', (e) => showFor(e.target.value));

  formatSel.addEventListener('change', (e) => {
    const online = e.target.value === 'online';
    countryBlock.style.display = online ? 'block' : 'none';
    if (!online) {
      const intl = document.getElementById('intl_phone_inline');
      if (intl) intl.value = '';
    }
  });

  preferSel.addEventListener('change', (e) => {
    const v = e.target.value;
    contactInput.placeholder = v === 'phone' ? 'Телефон для связи (только РБ)' : (v === 'telegram' ? 'Telegram username или номер' : 'E-mail');
  });

  function validateBY(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    return /^(375(29|33|25|44)\d{7})$/.test(digits) || /^(80(29|33|25|44)\d{7})$/.test(digits);
  }

  let isSubmitting = false;

  async function submitForm(e) {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    const data = new FormData(form);
    data.set('type', inputTypeHidden.value);

    const prefer = data.get('contact_prefer');
    const format = data.get('format');
    const contactValue = data.get('contact_value');

    if (!data.get('consent')) {
      alert('Требуется согласие на обработку персональных данных');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить';
      isSubmitting = false;
      return;
    }

    if (prefer === 'phone' || format === 'offline') {
      if (!validateBY(contactValue)) {
        alert('Телефон должен быть белорусским (формат +375 или 80)');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
        isSubmitting = false;
        return;
      }
    }

    try {
      // Важно: fetch отправляет FormData без ручной установки Content-Type
      const res = await fetch('/api/apply', { method: 'POST', body: data });
      const json = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (res.ok && json.success) {
        alert('Заявка принята. ID: ' + json.id);
        form.reset();
        showFor(typeSel.value);
        countryBlock.style.display = false;
      } else {
        alert('Ошибка: ' + (json.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Submit error', err);
      alert('Сетевая ошибка при отправке заявки');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить';
      isSubmitting = false;
    }
  }

  form.addEventListener('submit', submitForm);

  const scrollToApply = document.getElementById('scrollToApply');
  if (scrollToApply) {
    scrollToApply.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
    });
  }
  const heroApply = document.getElementById('heroApply');
  if (heroApply) {
    heroApply.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
    });
  }
});
