const API = '';
let token = localStorage.getItem('adminToken');
let products = [];
let offers = [];
let media = [];

// ============ Toast ============
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#D45050' : '#2C1810';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ============ Auth ============
function checkAuth() {
  if (!token) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    return false;
  }
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  return true;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  try {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'اسم المستخدم أو كلمة المرور خطأ';
      return;
    }
    const data = await res.json();
    localStorage.setItem('adminToken', data.token);
    token = data.token;
    errorEl.style.display = 'none';
    checkAuth();
    loadAll();
  } catch {
    errorEl.style.display = 'block';
    errorEl.textContent = 'فشل الاتصال بالخادم';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  token = null;
  checkAuth();
});

// ============ API Helper ============
async function api(method, url, body, isFormData = false) {
  const opts = {
    method,
    headers: {}
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API}${url}`, opts);
  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    token = null;
    checkAuth();
    throw new Error('انتهت الجلسة');
  }
  return res.json();
}

// ============ Load All ============
async function loadCategories() {
  try {
    const cats = await api('GET', '/api/categories');
    const sel = document.getElementById('productCategory');
    sel.innerHTML = '<option value="">اختر القسم</option>';
    cats.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  } catch {}
}

async function loadAll() {
  if (!token) return;
  try {
    const [stats, prods, offs, med, ords] = await Promise.all([
      api('GET', '/api/stats'),
      api('GET', '/api/products'),
      api('GET', '/api/offers'),
      api('GET', '/api/media'),
      api('GET', '/api/orders')
    ]);
    products = prods;
    offers = offs;
    media = med;
    orders = ords;
    renderStats(stats);
    renderProducts();
    renderOffers();
    renderMedia();
    renderOrders();
  } catch { }
}

// ============ Stats ============
function renderStats(stats) {
  document.getElementById('statProducts').textContent = stats.products;
  document.getElementById('statOffers').textContent = stats.offers;
  document.getElementById('statImages').textContent = stats.images;
  document.getElementById('statVideos').textContent = stats.videos;
  document.getElementById('statOrders').textContent = stats.orders || 0;
}

// ============ Products ============
function renderProducts() {
  const cats = {
    face: 'تركيبات الوجه', body: 'تركيبات الجسم', moisturizing: 'ترطيب الجسم',
    hair: 'منتجات الشعر', married: 'منتجات المتزوجات', weight: 'التسمين',
    plasma: 'البلازما', pregnancy: 'آمنة للحوامل'
  };
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image}" alt="${p.name}" class="small-img"></td>
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td>${cats[p.category] || p.category}</td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-edit" onclick="editProduct('${p.id}')">تعديل</button>
          <button class="btn-sm btn-delete" onclick="deleteProduct('${p.id}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openProductModal(product = null) {
  document.getElementById('productModalTitle').textContent = product ? 'تعديل منتج' : 'إضافة منتج';
  document.getElementById('productId').value = product ? product.id : '';
  document.getElementById('productName').value = product ? product.name : '';
  document.getElementById('productPrice').value = product ? product.price : '';
  document.getElementById('productDesc').value = product ? product.description : '';
  document.getElementById('productCategory').value = product ? product.category : '';
  document.getElementById('productImage').value = '';
  document.getElementById('productModal').classList.add('show');
}

document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
document.getElementById('productModalClose').addEventListener('click', () => document.getElementById('productModal').classList.remove('show'));

async function deleteProduct(id) {
  if (!confirm('تأكيد حذف المنتج؟')) return;
  await api('DELETE', `/api/products/${id}`);
  showToast('تم حذف المنتج');
  loadAll();
}

async function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (p) openProductModal(p);
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const fd = new FormData();
  fd.append('name', document.getElementById('productName').value);
  fd.append('price', document.getElementById('productPrice').value);
  fd.append('description', document.getElementById('productDesc').value);
  fd.append('category', document.getElementById('productCategory').value);
  const imgFile = document.getElementById('productImage').files[0];
  if (imgFile) fd.append('image', imgFile);

  try {
    if (id) {
      await api('PUT', `/api/products/${id}`, fd, true);
      showToast('تم تعديل المنتج');
    } else {
      await api('POST', '/api/products', fd, true);
      showToast('تم إضافة المنتج');
    }
    document.getElementById('productModal').classList.remove('show');
    loadAll();
  } catch { }
});

// ============ Offers ============
function renderOffers() {
  const tbody = document.getElementById('offersTableBody');
  tbody.innerHTML = offers.map(o => `
    <tr>
      <td>${o.image ? `<img src="${o.image}" alt="${o.title}" class="small-img">` : '—'}</td>
      <td>${o.title}</td>
      <td>${o.description.slice(0, 40)}${o.description.length > 40 ? '...' : ''}</td>
      <td><span class="badge ${o.active ? 'badge-active' : 'badge-inactive'}">${o.active ? 'فعال' : 'غير فعال'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-edit" onclick="editOffer('${o.id}')">تعديل</button>
          <button class="btn-sm btn-delete" onclick="deleteOffer('${o.id}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openOfferModal(offer = null) {
  document.getElementById('offerModalTitle').textContent = offer ? 'تعديل عرض' : 'إضافة عرض';
  document.getElementById('offerId').value = offer ? offer.id : '';
  document.getElementById('offerTitle').value = offer ? offer.title : '';
  document.getElementById('offerDesc').value = offer ? offer.description : '';
  document.getElementById('offerActive').checked = offer ? offer.active : true;
  document.getElementById('offerImage').value = '';
  document.getElementById('offerModal').classList.add('show');
}

document.getElementById('addOfferBtn').addEventListener('click', () => openOfferModal());
document.getElementById('offerModalClose').addEventListener('click', () => document.getElementById('offerModal').classList.remove('show'));

async function deleteOffer(id) {
  if (!confirm('تأكيد حذف العرض؟')) return;
  await api('DELETE', `/api/offers/${id}`);
  showToast('تم حذف العرض');
  loadAll();
}

async function editOffer(id) {
  const o = offers.find(x => x.id === id);
  if (o) openOfferModal(o);
}

document.getElementById('offerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('offerId').value;
  const fd = new FormData();
  fd.append('title', document.getElementById('offerTitle').value);
  fd.append('description', document.getElementById('offerDesc').value);
  fd.append('active', document.getElementById('offerActive').checked);
  const imgFile = document.getElementById('offerImage').files[0];
  if (imgFile) fd.append('image', imgFile);

  try {
    if (id) {
      await api('PUT', `/api/offers/${id}`, fd, true);
      showToast('تم تعديل العرض');
    } else {
      await api('POST', '/api/offers', fd, true);
      showToast('تم إضافة العرض');
    }
    document.getElementById('offerModal').classList.remove('show');
    loadAll();
  } catch { }
});

// ============ Media ============
function renderMedia() {
  const grid = document.getElementById('mediaGrid');
  grid.innerHTML = media.map(m => `
    <div class="media-item">
      ${m.type === 'video'
        ? `<video src="${m.url}" muted></video>`
        : `<img src="${m.url}" alt="${m.title}">`
      }
      <div class="media-info">
        <span title="${m.title}">${m.title}</span>
        <button onclick="deleteMedia('${m.id}')" title="حذف">&times;</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addMediaBtn').addEventListener('click', () => document.getElementById('mediaModal').classList.add('show'));
document.getElementById('mediaModalClose').addEventListener('click', () => document.getElementById('mediaModal').classList.remove('show'));

async function deleteMedia(id) {
  if (!confirm('تأكيد حذف الملف؟')) return;
  await api('DELETE', `/api/media/${id}`);
  showToast('تم حذف الملف');
  loadAll();
}

document.getElementById('mediaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('title', document.getElementById('mediaTitle').value);
  fd.append('file', document.getElementById('mediaFile').files[0]);

  try {
    await api('POST', '/api/media', fd, true);
    showToast('تم رفع الملف');
    document.getElementById('mediaModal').classList.remove('show');
    document.getElementById('mediaForm').reset();
    loadAll();
  } catch { }
});

// ============ Orders ============
let orders = [];

function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  tbody.innerHTML = orders.map((o, i) => {
    const prodList = Array.isArray(o.products) ? o.products.map(p => p.name || p).join(', ') : o.products;
    const waMsg = encodeURIComponent(`🛒 طلب جديد من Fadora
👤 العميل: ${o.customer}
📞 الجوال: ${o.phone}
📦 المنتجات: ${prodList}
💰 الإجمالي: ${o.total || '—'}
📝 ملاحظات: ${o.note || '—'}
🆔 رقم الطلب: ${o.id}
⏰ ${o.createdAt || '—'}`);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${o.customer}</td>
        <td>${o.phone}</td>
        <td>${prodList}</td>
        <td>${o.total || '—'}</td>
        <td><span class="badge badge-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td>${o.note || '—'}</td>
        <td>${o.createdAt || '—'}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-sm-primary" onclick="sendOrderWA('${o.id}')">📱 واتساب</button>
          <button class="btn-sm" onclick="editOrder('${o.id}')">تعديل</button>
          <button class="btn-sm btn-sm-danger" onclick="deleteOrder('${o.id}')">حذف</button>
        </td>
      </tr>
    `;
  }).join('');
}

function sendOrderWA(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const prodList = Array.isArray(o.products) ? o.products.map(p => p.name || p).join(', ') : o.products;
  const waMsg = `🛒 طلب جديد من Fadora
👤 العميل: ${o.customer}
📞 الجوال: ${o.phone}
📦 المنتجات: ${prodList}
💰 الإجمالي: ${o.total || '—'}
📝 ملاحظات: ${o.note || '—'}
🆔 رقم الطلب: ${o.id}
⏰ ${o.createdAt || '—'}`;
  // Get WhatsApp number from the customer's phone field, or use business number
  const num = o.phone ? o.phone.replace(/[^0-9]/g, '') : '249924643848';
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(waMsg)}`, '_blank');
}

function getStatusLabel(status) {
  const map = { pending: 'قيد الانتظار', confirmed: 'مؤكد', shipped: 'تم الشحن', completed: 'مكتمل', cancelled: 'ملغي' };
  return map[status] || status;
}

document.getElementById('addOrderBtn')?.addEventListener('click', () => {
  document.getElementById('orderModalTitle').textContent = 'إضافة طلب';
  document.getElementById('orderForm').reset();
  document.getElementById('orderId').value = '';
  document.getElementById('orderModal').classList.add('show');
});
document.getElementById('orderModalClose')?.addEventListener('click', () => document.getElementById('orderModal').classList.remove('show'));

function editOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  document.getElementById('orderModalTitle').textContent = 'تعديل طلب';
  document.getElementById('orderId').value = o.id;
  document.getElementById('orderCustomer').value = o.customer;
  document.getElementById('orderPhone').value = o.phone;
  document.getElementById('orderProducts').value = Array.isArray(o.products) ? o.products.join(', ') : o.products;
  document.getElementById('orderTotal').value = o.total || '';
  document.getElementById('orderNote').value = o.note || '';
  document.getElementById('orderStatus').value = o.status || 'pending';
  document.getElementById('orderModal').classList.add('show');
}

async function deleteOrder(id) {
  if (!confirm('تأكيد حذف الطلب؟')) return;
  await api('DELETE', `/api/orders/${id}`);
  showToast('تم حذف الطلب');
  loadAll();
}

document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('orderId').value;
  const body = {
    customer: document.getElementById('orderCustomer').value,
    phone: document.getElementById('orderPhone').value,
    products: document.getElementById('orderProducts').value.split(',').map(s => s.trim()).filter(Boolean),
    total: document.getElementById('orderTotal').value,
    note: document.getElementById('orderNote').value,
    status: document.getElementById('orderStatus').value
  };
  try {
    if (id) {
      await api('PUT', `/api/orders/${id}`, body);
      showToast('تم تعديل الطلب');
    } else {
      await api('POST', '/api/orders', body);
      showToast('تم إضافة الطلب');
    }
    document.getElementById('orderModal').classList.remove('show');
    loadAll();
  } catch { }
});

// ============ Reports ============
let viewsChart = null;

function loadReports() {
  const data = getAnalytics();
  document.getElementById('repPageViews').textContent = data.pageViews || 0;
  document.getElementById('repWhatsAppClicks').textContent = data.whatsappClicks || 0;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('repTodayViews').textContent = data.daily?.[today]?.pageViews || 0;
  const topProduct = Object.entries(data.productViews || {}).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('repTopProduct').textContent = topProduct ? `${topProduct[0]} (${topProduct[1]})` : '—';
  renderChart(data.daily || {});
}

function getAnalytics() {
  try {
    const stored = localStorage.getItem('drg_analytics');
    if (stored) return JSON.parse(stored);
    return { pageViews: 120, whatsappClicks: 45, productViews: { 'سيروم الكلف': 12, 'تقشير الوجه': 8, 'تسمين عام': 6 }, daily: sampleDaily() };
  } catch { return { pageViews: 120, whatsappClicks: 45, productViews: {}, daily: sampleDaily() }; }
}

function sampleDaily() {
  const data = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    data[key] = { pageViews: Math.floor(Math.random() * 20) + 5, whatsappClicks: Math.floor(Math.random() * 8) };
  }
  return data;
}

function renderChart(daily) {
  const days = Object.keys(daily).sort().slice(-14);
  const views = days.map(d => daily[d]?.pageViews || 0);
  const clicks = days.map(d => daily[d]?.whatsappClicks || 0);
  const ctx = document.getElementById('viewsChart')?.getContext('2d');
  if (!ctx) return;
  if (viewsChart) viewsChart.destroy();
  viewsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [
        { label: 'مشاهدات', data: views, borderColor: '#C4956A', backgroundColor: 'rgba(196,149,106,0.1)', fill: true, tension: 0.4 },
        { label: 'نقرات واتساب', data: clicks, borderColor: '#5A9A6A', backgroundColor: 'rgba(90,154,106,0.1)', fill: true, tension: 0.4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top', labels: { font: { family: 'Tajawal' } } } },
      scales: { x: { ticks: { font: { family: 'Tajawal' } } }, y: { beginAtZero: true } }
    }
  });
}

document.getElementById('resetAnalyticsBtn')?.addEventListener('click', () => {
  if (confirm('تأكيد مسح جميع الإحصائيات؟')) {
    localStorage.removeItem('drg_analytics');
    loadReports();
    showToast('تم مسح الإحصائيات');
  }
});

// ============ Settings ============
async function loadSettings() {
  try {
    const s = await api('GET', '/api/settings');
    document.getElementById('setInstagram').value = s.social?.instagram || '';
    document.getElementById('setTwitter').value = s.social?.twitter || '';
    document.getElementById('setSnapchat').value = s.social?.snapchat || '';
    document.getElementById('setFacebook').value = s.social?.facebook || '';
    document.getElementById('setTiktok').value = s.social?.tiktok || '';
    document.getElementById('setWhatsapp').value = s.social?.whatsapp || '';
    document.getElementById('setBankName').value = s.payment?.bankName || '';
    document.getElementById('setAccountName').value = s.payment?.accountName || '';
    document.getElementById('setAccountNumber').value = s.payment?.accountNumber || '';
    document.getElementById('setCashOnDelivery').checked = s.payment?.cashOnDelivery !== false;
  } catch {}
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  try {
    const existing = await api('GET', '/api/settings');
    const body = {
      ...existing,
      social: {
        ...existing.social,
        instagram: document.getElementById('setInstagram').value,
        twitter: document.getElementById('setTwitter').value,
        snapchat: document.getElementById('setSnapchat').value,
        facebook: document.getElementById('setFacebook').value,
        tiktok: document.getElementById('setTiktok')?.value || existing.social?.tiktok || '',
        whatsapp: document.getElementById('setWhatsapp')?.value || existing.social?.whatsapp || ''
      },
      payment: {
        ...existing.payment,
        bankName: document.getElementById('setBankName').value,
        accountName: document.getElementById('setAccountName').value,
        accountNumber: document.getElementById('setAccountNumber').value,
        cashOnDelivery: document.getElementById('setCashOnDelivery').checked
      }
    };
    await api('PUT', '/api/settings', body);
    showToast('تم حفظ الإعدادات');
  } catch {}
});

// ============ Notification ============
document.getElementById('sendNotifBtn')?.addEventListener('click', async () => {
  const title = document.getElementById('notifTitle').value;
  const body = document.getElementById('notifBody').value;
  if (!title || !body) { showToast('يرجى ملء الحقول', true); return; }
  try {
    await api('POST', '/api/notify-offer', { title, body });
    showToast('تم إرسال الإشعار');
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifBody').value = '';
  } catch {
    showToast('فشل إرسال الإشعار', true);
  }
});

// ============ Popup Ads ============
let popups = [];
let currentPopupId = null;

async function loadPopups() {
  try {
    popups = await api('GET', '/api/admin/popups');
    renderPopups();
  } catch { popups = []; renderPopups(); }
}

function renderPopups() {
  const tbody = document.getElementById('popupsTableBody');
  if (!tbody) return;
  if (!popups.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-lighter);padding:40px">لا توجد إعلانات بعد</td></tr>';
    return;
  }
  tbody.innerHTML = popups.map(p => `
    <tr>
      <td>${p.image ? `<img src="${p.image}" class="small-img" onerror="this.style.display='none'">` : '—'}</td>
      <td style="font-weight:600">${p.title}</td>
      <td style="color:var(--text-light);font-size:0.9rem">${p.description || '—'}</td>
      <td><span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'فعال' : 'معطل'}</span></td>
      <td class="actions-cell">
        <button class="btn-sm btn-edit" onclick="editPopup('${p.id}')">تعديل</button>
        <button class="btn-sm btn-delete" onclick="deletePopup('${p.id}')">حذف</button>
      </td>
    </tr>
  `).join('');
}

function editPopup(id) {
  const p = popups.find(x => x.id === id);
  if (!p) return;
  currentPopupId = id;
  document.getElementById('popupModalTitle').textContent = 'تعديل إعلان منبثق';
  document.getElementById('popupId').value = id;
  document.getElementById('popupTitle').value = p.title;
  document.getElementById('popupDesc').value = p.description || '';
  document.getElementById('popupLink').value = p.link || '';
  document.getElementById('popupActive').checked = p.active;
  document.getElementById('popupModal').classList.add('show');
}

function deletePopup(id) {
  if (!confirm('تأكيد حذف الإعلان؟')) return;
  api('DELETE', '/api/popups/' + id).then(() => { loadPopups(); showToast('تم الحذف'); }).catch(() => showToast('فشل الحذف', true));
}

document.getElementById('addPopupBtn')?.addEventListener('click', () => {
  currentPopupId = null;
  document.getElementById('popupModalTitle').textContent = 'إضافة إعلان منبثق';
  document.getElementById('popupForm').reset();
  document.getElementById('popupId').value = '';
  document.getElementById('popupActive').checked = true;
  document.getElementById('popupModal').classList.add('show');
});

document.getElementById('popupModalClose')?.addEventListener('click', () => {
  document.getElementById('popupModal').classList.remove('show');
});

document.getElementById('popupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('title', document.getElementById('popupTitle').value);
  fd.append('description', document.getElementById('popupDesc').value);
  fd.append('link', document.getElementById('popupLink').value);
  fd.append('active', document.getElementById('popupActive').checked);
  const fileInput = document.getElementById('popupImage');
  if (fileInput.files[0]) fd.append('image', fileInput.files[0]);
  try {
    if (currentPopupId) {
      await fetch('/api/popups/' + currentPopupId, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
    } else {
      await fetch('/api/popups', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
    }
    showToast('تم حفظ الإعلان');
    document.getElementById('popupModal').classList.remove('show');
    loadPopups();
  } catch { showToast('فشل الحفظ', true); }
});

// ============ Subscribe to Push ============
async function subscribePush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BDitqIMvkhQtLRSY-UsSQpo_4Q0fHRa1R80n7suB0VbWVcXmnVJdrifF2mvsDzfQtSlQuI2aLp2nsWl8Q3Q-HSM')
    });
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
  } catch {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// ============ Themes ============
const THEMES = [
  { id: 'default', name: 'افتراضي', desc: 'ألوان Fadora الأصلية', colors: ['#FF6F61', '#009688', '#FFE4E0', '#FFF5F3'] },
  { id: 'dark', name: 'ليلي', desc: 'وضع الليل المظلم', colors: ['#FF6F61', '#4DB6AC', '#3D1E1C', '#121212'] },
  { id: 'sudani', name: 'سوداني بحت', desc: 'أخضر العلم السوداني', colors: ['#00613C', '#C8A951', '#8B0000', '#F5F0E8'] },
  { id: 'advertising', name: 'إعلاني', desc: 'ألوان جريئة للترويج', colors: ['#FF3366', '#00BFFF', '#FFD700', '#FFFFFF'] },
  { id: 'mens', name: 'رجالي', desc: 'ألوان كلاسيكية رجالية', colors: ['#2C3E50', '#34495E', '#E67E22', '#F4F6F7'] },
  { id: 'kids', name: 'أطفالي', desc: 'ألوان مرح وأطفال', colors: ['#FF6B9D', '#45D6B5', '#FFD93D', '#FFF8F0'] },
  { id: 'fashion', name: 'موضة', desc: 'ألوان أنيقة وعصرية', colors: ['#7B2D8E', '#E8A0BF', '#FFD700', '#FCF7FA'] },
  { id: 'gold', name: 'ذهبي', desc: 'فخامة الذهب', colors: ['#B8860B', '#DAA520', '#F5E6B8', '#FEFCF3'] },
  { id: 'rose', name: 'وردي', desc: 'أنوثة وردية ناعمة', colors: ['#D4587A', '#E8A0BF', '#FCE4EC', '#FFF5F7'] },
  { id: 'natural', name: 'طبيعي', desc: 'ألوان الطبيعة', colors: ['#4A7C59', '#8B9D6E', '#A0522D', '#F7FAF5'] },
  { id: 'ocean', name: 'بحري', desc: 'ألوان المحيط', colors: ['#006994', '#00B4D8', '#0077B6', '#F0F8FF'] },
  { id: 'classic', name: 'كلاسيك', desc: 'ألوان كلاسيكية أنيقة', colors: ['#8B4513', '#2F4F4F', '#C4956A', '#FAF5EF'] }
];

let currentTheme = 'default';

function renderThemeCards() {
  const container = document.getElementById('themesContainer');
  if (!container) return;
  container.innerHTML = THEMES.map(t => `
    <div class="theme-card ${t.id === currentTheme ? 'active' : ''}" data-theme-id="${t.id}" onclick="selectTheme('${t.id}')">
      <div class="theme-check">✓</div>
      <div class="theme-swatch" style="background:${t.colors[3]}">
        ${t.colors.map(c => `<span style="background:${c}"></span>`).join('')}
      </div>
      <div class="theme-name">${t.name}</div>
      <div class="theme-desc">${t.desc}</div>
    </div>
  `).join('');
}

function selectTheme(id) {
  currentTheme = id;
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.theme-card[data-theme-id="${id}"]`)?.classList.add('active');
  // Apply preview
  const theme = THEMES.find(t => t.id === id);
  if (theme) updatePreview(theme);
}

function updatePreview(theme) {
  const preview = document.getElementById('themePreview');
  if (!preview) return;
  preview.style.display = 'block';
  const header = document.getElementById('previewHeader');
  const body = document.getElementById('previewBody');
  const product = document.getElementById('previewProduct');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;
    header.style.color = '#fff';
  }
  if (body) body.style.background = theme.colors[3];
  if (product) {
    const img = product.querySelector('.preview-img');
    const title = product.querySelector('.preview-title');
    const desc = product.querySelector('.preview-desc');
    const btn = product.querySelector('.preview-btn');
    if (img) img.style.background = `linear-gradient(135deg, ${theme.colors[2]}, ${theme.colors[0]}30)`;
    if (title) title.style.background = theme.colors[0];
    if (desc) desc.style.background = theme.colors[1] + '50';
    if (btn) btn.style.background = `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]})`;
  }
}

async function loadTheme() {
  try {
    const s = await api('GET', '/api/settings');
    currentTheme = s.theme || 'default';
    renderThemeCards();
    const theme = THEMES.find(t => t.id === currentTheme);
    if (theme) updatePreview(theme);
  } catch {
    renderThemeCards();
  }
}

document.getElementById('saveThemeBtn')?.addEventListener('click', async () => {
  try {
    const s = await api('GET', '/api/settings');
    s.theme = currentTheme;
    await api('PUT', '/api/settings', s);
    showToast('✓ تم حفظ الثيم');
  } catch {
    showToast('فشل حفظ الثيم', true);
  }
});

// ============ Tabs ============
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ============ Init ============
checkAuth();
if (token) { loadAll(); loadCategories(); loadSettings(); loadReports(); loadTheme(); loadPopups(); subscribePush(); }
