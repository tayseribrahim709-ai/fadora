/* ================= Language Switcher ================= */
const langToggle = document.getElementById('langToggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const cur = localStorage.getItem('lang') || 'ar';
    const next = cur === 'ar' ? 'en' : 'ar';
    window.setLang(next);
    langToggle.textContent = window.t('language');
  });
}

/* ================= Theme System ================= */
const themeToggle = document.getElementById('themeToggle');
let currentTheme = localStorage.getItem('fadoraTheme') || 'default';

async function loadSiteTheme() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const s = await res.json();
      if (s.theme) {
        currentTheme = s.theme;
        localStorage.setItem('fadoraTheme', currentTheme);
      }
    }
  } catch {}
  applyTheme(currentTheme);
  updateToggleIcon();
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fadoraTheme', theme);
}

function getNextTheme(theme) {
  const themes = ['default', 'dark', 'sudani', 'advertising', 'mens', 'kids', 'fashion', 'gold', 'rose', 'natural', 'ocean', 'classic'];
  const idx = themes.indexOf(theme);
  return idx >= 0 ? themes[(idx + 1) % themes.length] : 'default';
}

function updateToggleIcon() {
  if (!themeToggle) return;
  const icons = {
    default: '🌅', dark: '🌙', sudani: '🇸🇩', advertising: '📢',
    mens: '👔', kids: '🧸', fashion: '💎', gold: '👑',
    rose: '🌹', natural: '🌿', ocean: '🌊', classic: '🏛️'
  };
  themeToggle.innerHTML = icons[currentTheme] || '🌅';
}

themeToggle.addEventListener('click', () => {
  const next = getNextTheme(currentTheme);
  applyTheme(next);
  updateToggleIcon();
});

/* ================= Mobile Menu ================= */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ================= Header Scroll Effect ================= */
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.style.boxShadow = '0 2px 20px rgba(44, 24, 16, 0.1)';
  } else {
    header.style.boxShadow = 'none';
  }
});

/* ================= Product Tabs ================= */
const PRODUCT_ICONS = {
  face: 'images/product-face.svg',
  body: 'images/product-body.svg',
  moisturizing: 'images/product-face.svg',
  hair: 'images/product-hair.svg',
  married: 'images/product-face.svg',
  weight: 'images/product-body.svg',
  plasma: 'images/product-face.svg',
  pregnancy: 'images/product-face.svg',
  men: 'images/product-men.svg',
  perfume: 'images/product-perfume.svg'
};

let categories = [];
let allProducts = [];

const FALLBACK_CATEGORIES = [
  { id: 'face', name: 'العناية بالبشرة', order: 1 },
  { id: 'hair', name: 'العناية بالشعر', order: 2 },
  { id: 'perfume', name: 'العطور', order: 3 },
  { id: 'body', name: 'العناية بالجسم', order: 4 },
  { id: 'men', name: 'قسم الرجال', order: 5 }
];

const FALLBACK_PRODUCTS = [
  { id: 'f1', name: 'نوفيج كريم نهاري', description: 'كريم نضارة نهاري مضاد للتجاعيد 50 مل', price: '', category: 'face', image: 'images/product-face.svg', whatsapp: 'أريد نوفيج كريم نهاري 50 مل' },
  { id: 'f2', name: 'نوفيج كريم ليلي', description: 'كريم نضارة ليلي مغذي 50 مل', price: '', category: 'face', image: 'images/product-face.svg', whatsapp: 'أريد نوفيج كريم ليلي 50 مل' },
  { id: 'f3', name: 'نوفيج سيروم', description: 'سيروم مضاد للتجاعيد 30 مل', price: '', category: 'face', image: 'images/product-face.svg', whatsapp: 'أريد نوفيج سيروم 30 مل' },
  { id: 'h1', name: 'شامبو ترو كلر', description: 'شامبو للشعر المصبوغ 250 مل', price: '', category: 'hair', image: 'images/product-hair.svg', whatsapp: 'أريد شامبو ترو كلر 250 مل' },
  { id: 'h5', name: 'زيت الأرغان للشعر', description: 'زيت أرغان مغذي للشعر 50 مل', price: '', category: 'hair', image: 'images/product-hair.svg', whatsapp: 'أريد زيت الأرغان للشعر' },
  { id: 'p1', name: 'عطر إكلات', description: 'عطر نسائي فرنسي 50 مل - Eclat', price: '', category: 'perfume', image: 'images/product-perfume.svg', whatsapp: 'أريد عطر إكلات 50 مل' },
  { id: 'p3', name: 'عطر لاكي ليدي', description: 'عطر نسائي جذاب 50 مل - Lucky Lady', price: '', category: 'perfume', image: 'images/product-perfume.svg', whatsapp: 'أريد عطر لاكي ليدي 50 مل' },
  { id: 'b1', name: 'لوشن الجسم', description: 'لوشن مرطب للجسم بالألوفيرا 200 مل', price: '', category: 'body', image: 'images/product-body.svg', whatsapp: 'أريد لوشن الجسم 200 مل' },
  { id: 'b3', name: 'كريم اليدين', description: 'كريم مغذي لليدين 75 مل', price: '', category: 'body', image: 'images/product-body.svg', whatsapp: 'أريد كريم اليدين 75 مل' },
  { id: 'b4', name: 'جل استحمام', description: 'جل استحمام مغذي 250 مل', price: '', category: 'body', image: 'images/product-body.svg', whatsapp: 'أريد جل استحمام حليب وعسل 250 مل' },
  { id: 'm1', name: 'شامبو رجالي أوريفليم', description: 'شامبو منعش للرجال 250 مل', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد شامبو رجالي أوريفليم' },
  { id: 'm2', name: 'جل حلاقة أوريفليم', description: 'جل حلاقة مهدئ للبشرة 150 مل', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد جل حلاقة أوريفليم' },
  { id: 'm3', name: 'عطر رجالي جيورداني جولد', description: 'عطر رجالي فاخر 75 مل - Giordani Gold', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد عطر جيورداني جولد رجالي' },
  { id: 'm4', name: 'كريم ما بعد الحلاقة', description: 'كريم مهدئ ومنعش بعد الحلاقة 75 مل', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد كريم ما بعد الحلاقة' },
  { id: 'm5', name: 'سبراي عطر رجالي', description: 'سبراي عطر رجالي منعش 100 مل', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد سبراي عطر رجالي' },
  { id: 'm6', name: 'مزيل عرق رجالي أوريفليم', description: 'مزيل عرق رول أون للرجال 50 مل', price: '', category: 'men', image: 'images/product-men.svg', whatsapp: 'أريد مزيل عرق رجالي أوريفليم' }
];

async function loadCategoriesAndProducts() {
  if (window.location.protocol === 'file:') {
    categories = FALLBACK_CATEGORIES;
    allProducts = FALLBACK_PRODUCTS;
    renderProductTabs();
    document.getElementById('serverNote').style.display = 'block';
    return;
  }
  try {
    const [cats, prods] = await Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/products').then(r => r.json())
    ]);
    categories = cats;
    allProducts = prods;
    renderProductTabs();
  } catch {
    categories = FALLBACK_CATEGORIES;
    allProducts = FALLBACK_PRODUCTS;
    renderProductTabs();
  }
}

function renderProductTabs() {
  const tabsContainer = document.getElementById('productTabs');
  const containers = document.getElementById('productContainers');
  if (!tabsContainer || !categories.length) return;

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  tabsContainer.innerHTML = sorted.map((c, i) =>
    `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${c.id}">${c.name}</button>`
  ).join('');

  containers.innerHTML = sorted.map((c, i) =>
    `<div class="product-grid ${i === 0 ? 'active' : ''}" id="tab-${c.id}"></div>`
  ).join('');

  sorted.forEach(c => {
    const grid = document.getElementById(`tab-${c.id}`);
    const prods = allProducts.filter(p => p.category === c.id);
    if (grid) grid.innerHTML = renderProductCards(prods);
  });

  tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      containers.querySelectorAll('.product-grid').forEach(g => g.classList.remove('active'));
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  observeNewCards();
}

function renderProductCards(products) {
  return products.map(p => {
    const msg = encodeURIComponent(p.whatsapp || `أريد ${p.name}`);
    const img = p.image || '';
    const icons = {
      face: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><ellipse cx="50" cy="55" rx="35" ry="38" fill="rgba(255,111,97,0.2)" stroke="var(--primary)"/><rect x="38" y="28" width="24" height="14" rx="7" fill="rgba(255,111,97,0.3)" stroke="var(--primary)"/><circle cx="42" cy="55" r="4" fill="var(--primary)"/><circle cx="58" cy="55" r="4" fill="var(--primary)"/><path d="M40 67 Q50 75 60 67" stroke="var(--primary)"/></svg>`,
      hair: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><path d="M30 85 Q35 30 50 20 Q65 30 70 85" fill="rgba(0,150,136,0.2)" stroke="var(--secondary)"/><path d="M35 80 Q40 40 50 30 Q60 40 65 80" fill="rgba(0,150,136,0.15)" stroke="var(--secondary)" stroke-width="3"/><path d="M45 25 Q48 15 50 12 Q52 15 55 25" stroke="var(--secondary)" stroke-width="3"/></svg>`,
      perfume: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="35" y="20" width="30" height="55" rx="10" fill="rgba(156,39,176,0.2)" stroke="#9C27B0"/><rect x="40" y="10" width="20" height="15" rx="3" fill="rgba(156,39,176,0.3)" stroke="#9C27B0"/><circle cx="50" cy="48" r="6" fill="rgba(156,39,176,0.3)" stroke="#9C27B0"/><path d="M38 60 Q50 68 62 60" stroke="#9C27B0"/><rect x="42" y="70" width="16" height="6" rx="2" fill="rgba(156,39,176,0.3)" stroke="#9C27B0"/></svg>`,
      body: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="30" y="22" width="40" height="45" rx="18" fill="rgba(255,152,0,0.2)" stroke="#FF9800"/><circle cx="50" cy="40" r="10" fill="rgba(255,152,0,0.3)" stroke="#FF9800"/><path d="M35 52 Q50 60 65 52" stroke="#FF9800"/><rect x="38" y="62" width="24" height="18" rx="4" fill="rgba(255,152,0,0.2)" stroke="#FF9800"/></svg>`,
      men: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><circle cx="50" cy="30" r="18" fill="rgba(33,150,243,0.2)" stroke="#2196F3"/><path d="M32 58 Q50 65 68 58" stroke="#2196F3"/><path d="M35 60 L30 95" stroke="#2196F3"/><path d="M65 60 L70 95" stroke="#2196F3"/><path d="M30 72 L70 72" stroke="#2196F3" stroke-width="3"/><rect x="42" y="30" width="8" height="3" rx="1" fill="#2196F3"/><rect x="52" y="30" width="8" height="3" rx="1" fill="#2196F3"/></svg>`
    };
    const defIcon = icons[p.category] || icons.face;
    return `
        <div class="product-card">
          <div class="product-img">
            <div class="default-icon">${defIcon}</div>
            <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'" onload="this.style.display='block'">
          </div>
          <div class="product-info">
            <h2>${p.name}</h2>
            <p>${p.description}</p>
            <div class="product-bottom">
              <a href="https://wa.me/249924643848?text=${msg}" target="_blank" class="btn btn-primary">${window.t ? window.t('orderNow') : 'اطلب الآن'}</a>
            </div>
          </div>
        </div>
    `;
  }).join('');
}

function observeNewCards() {
  document.querySelectorAll('.product-card').forEach(el => {
    if (!el.dataset.observed) {
      el.dataset.observed = 'true';
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    }
  });
}

/* ================= Testimonials Slider ================= */
const slides = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.dot');
let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  slides[index].classList.add('active');
  dots[index].classList.add('active');
  currentSlide = index;
}

function nextSlide() {
  const next = (currentSlide + 1) % slides.length;
  goToSlide(next);
}

dots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    clearInterval(slideInterval);
    goToSlide(index);
    slideInterval = setInterval(nextSlide, 5000);
  });
});

slideInterval = setInterval(nextSlide, 5000);

/* ================= Scroll to Top ================= */
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ================= Contact Form ================= */
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = contactForm.querySelector('input[type="text"]').value;
  const email = contactForm.querySelector('input[type="email"]').value;
  const phone = contactForm.querySelector('input[type="tel"]').value;
  const message = contactForm.querySelector('textarea').value;

  const btn = contactForm.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'جاري الإرسال...';
  btn.disabled = true;

  const whatsappMsg = `*رسالة جديدة من الموقع*
*الاسم:* ${name}
*البريد:* ${email}
*الجوال:* ${phone}
*الرسالة:* ${message}`;

  const mailtoLink = `mailto:faddo87@gmail.com?subject=رسالة من ${name}&body=${encodeURIComponent(`الاسم: ${name}%0Aالبريد: ${email}%0Aالجوال: ${phone}%0Aالرسالة: ${message}`)}`;

  setTimeout(() => {
    window.open(`https://wa.me/249924643848?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
    window.open(mailtoLink, '_blank');
    btn.textContent = 'تم الإرسال ✓';
    btn.style.background = '#5A7A6A';

    setTimeout(() => {
      contactForm.reset();
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2500);
  }, 800);
});

/* ================= Intersection Observer for Animations ================= */
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.about-card, .product-card, .service-card, .testimonial-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

/* ================= PWA: Register Service Worker ================= */
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('js/sw.js')
      .then(() => console.log('✓ PWA: Service Worker registered'))
      .catch(() => console.log('PWA: Service Worker registration failed'));
  });
}

/* ================= Load Offers from API ================= */
const FALLBACK_OFFERS = [
  { title: '🎯 بكج الكلف المثالي', description: 'سيروم الكلف + تركيبة علاجية للكلف بسعر 30,000 فقط (وفر 5,000)', active: true },
  { title: '💪 بكج التسمين الشامل', description: 'تسمين عام + تسمين موضعي معاً بسعر 45,000 (وفر 5,000)', active: true },
  { title: '🌿 عناية كاملة للشعر', description: 'زيت الأعشاب + ترطيب الشعر + بخاخ روز ماري بسعر 55,000', active: true }
];

async function loadOffers() {
  if (window.location.protocol === 'file:') {
    renderOffers(FALLBACK_OFFERS);
    return;
  }
  try {
    const res = await fetch('/api/offers');
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderOffers(data.filter(o => o.active));
  } catch {
    renderOffers(FALLBACK_OFFERS);
  }
}

function renderOffers(active) {
  const container = document.getElementById('offersContainer');
  const section = document.getElementById('offers');
  if (!container || !active.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = 'block';
  container.innerHTML = active.map(o => {
    const bg = o.image
      ? `url('${o.image}') center/cover`
      : 'linear-gradient(135deg, var(--primary-light), var(--primary))';
    return `
      <div class="offer-card" style="background: ${bg};">
        <div class="offer-content">
          <h3>${o.title}</h3>
          <p>${o.description}</p>
          <a href="https://wa.me/249924643848?text=${encodeURIComponent(`أريد عرض ${o.title}`)}" target="_blank" class="btn btn-primary">${window.t ? window.t('bookOffer') : 'احجز العرض'}</a>
        </div>
      </div>
    `;
  }).join('');
  observerOffers();
}

function observerOffers() {
  document.querySelectorAll('.offer-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

/* ================= Load Social Links from API ================= */
async function loadSocialLinks() {
  if (window.location.protocol === 'file:') return;
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error();
    const s = await res.json();
    const social = s.social || {};
    if (social.instagram) document.getElementById('socialInstagram')?.setAttribute('href', social.instagram);
    if (social.twitter) document.getElementById('socialTwitter')?.setAttribute('href', social.twitter);
    if (social.snapchat) document.getElementById('socialSnapchat')?.setAttribute('href', social.snapchat);
    if (social.tiktok) document.getElementById('socialTiktok')?.setAttribute('href', social.tiktok);
    if (social.whatsapp) {
      const wa = social.whatsapp.replace(/[^0-9]/g, '');
      document.getElementById('socialWhatsapp')?.setAttribute('href', `https://wa.me/${wa}`);
      document.getElementById('whatsappFloat')?.setAttribute('href', `https://wa.me/${wa}`);
    }
  } catch {}
}

/* ================= Load Payment Details from API ================= */
async function loadPaymentDetails() {
  if (window.location.protocol === 'file:') return;
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error();
    const s = await res.json();
    const pay = s.payment || {};
    const el = document.getElementById('paymentBankDetails');
    if (el && pay.bankName && pay.accountNumber) {
      el.textContent = `${pay.bankName} - ${pay.accountName || ''} - ${pay.accountNumber}`;
    }
  } catch {}
}

/* ================= Service Worker & Push ================= */
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('js/sw.js').then(reg => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') subscribePush(reg);
      });
    }
    if (Notification.permission === 'granted') subscribePush(reg);
  }).catch(() => {});
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function subscribePush(reg) {
  try {
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

/* ================= Init ================= */
loadSiteTheme();
loadCategoriesAndProducts();
loadOffers();
loadSocialLinks();
loadPaymentDetails();

/* ================= Smooth scroll for nav links (fallback) ================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
