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

/* ================= Dark Mode ================= */
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';

if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
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
  face: 'images/fadora-logo.jpeg',
  body: 'images/fadora-logo.jpeg',
  moisturizing: 'images/fadora-logo.jpeg',
  hair: 'images/fadora-logo.jpeg',
  married: 'images/fadora-logo.jpeg',
  weight: 'images/fadora-logo.jpeg',
  plasma: 'images/fadora-logo.jpeg',
  pregnancy: 'images/fadora-logo.jpeg',
  men: 'images/fadora-logo.jpeg'
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
  { id: 'f1', name: 'نوفيج كريم نهاري', description: 'كريم نضارة نهاري مضاد للتجاعيد 50 مل', price: '', category: 'face', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد نوفيج كريم نهاري 50 مل' },
  { id: 'f2', name: 'نوفيج كريم ليلي', description: 'كريم نضارة ليلي مغذي 50 مل', price: '', category: 'face', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد نوفيج كريم ليلي 50 مل' },
  { id: 'f3', name: 'نوفيج سيروم', description: 'سيروم مضاد للتجاعيد 30 مل', price: '', category: 'face', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد نوفيج سيروم 30 مل' },
  { id: 'h1', name: 'شامبو ترو كلر', description: 'شامبو للشعر المصبوغ 250 مل', price: '', category: 'hair', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد شامبو ترو كلر 250 مل' },
  { id: 'h5', name: 'زيت الأرغان للشعر', description: 'زيت أرغان مغذي للشعر 50 مل', price: '', category: 'hair', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد زيت الأرغان للشعر' },
  { id: 'p1', name: 'عطر إكلات', description: 'عطر نسائي فرنسي 50 مل - Eclat', price: '', category: 'perfume', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد عطر إكلات 50 مل' },
  { id: 'p3', name: 'عطر لاكي ليدي', description: 'عطر نسائي جذاب 50 مل - Lucky Lady', price: '', category: 'perfume', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد عطر لاكي ليدي 50 مل' },
  { id: 'b1', name: 'لوشن الجسم', description: 'لوشن مرطب للجسم بالألوفيرا 200 مل', price: '', category: 'body', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد لوشن الجسم 200 مل' },
  { id: 'b3', name: 'كريم اليدين', description: 'كريم مغذي لليدين 75 مل', price: '', category: 'body', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد كريم اليدين 75 مل' },
  { id: 'b4', name: 'جل استحمام', description: 'جل استحمام مغذي 250 مل', price: '', category: 'body', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد جل استحمام حليب وعسل 250 مل' },
  { id: 'm1', name: 'شامبو رجالي أوريفليم', description: 'شامبو منعش للرجال 250 مل', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد شامبو رجالي أوريفليم' },
  { id: 'm2', name: 'جل حلاقة أوريفليم', description: 'جل حلاقة مهدئ للبشرة 150 مل', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد جل حلاقة أوريفليم' },
  { id: 'm3', name: 'عطر رجالي جيورداني جولد', description: 'عطر رجالي فاخر 75 مل - Giordani Gold', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد عطر جيورداني جولد رجالي' },
  { id: 'm4', name: 'كريم ما بعد الحلاقة', description: 'كريم مهدئ ومنعش بعد الحلاقة 75 مل', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد كريم ما بعد الحلاقة' },
  { id: 'm5', name: 'سبراي عطر رجالي', description: 'سبراي عطر رجالي منعش 100 مل', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد سبراي عطر رجالي' },
  { id: 'm6', name: 'مزيل عرق رجالي أوريفليم', description: 'مزيل عرق رول أون للرجال 50 مل', price: '', category: 'men', image: 'images/fadora-logo.jpeg', whatsapp: 'أريد مزيل عرق رجالي أوريفليم' }
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
    const img = p.image || PRODUCT_ICONS[p.category] || 'images/product-cream.svg';
    return `
      <div class="product-card">
        <div class="product-img" style="background: linear-gradient(135deg, var(--primary-light), var(--secondary-light));">
          <img src="${img}" alt="${p.name}" class="product-svg">
        </div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="product-bottom">
            ${p.price ? `<span class="product-price">${p.price}</span>` : ''}
            <a href="https://wa.me/249924643848?text=${msg}" target="_blank" class="btn btn-sm">اطلب الآن</a>
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
          <a href="https://wa.me/249924643848?text=${encodeURIComponent(`أريد عرض ${o.title}`)}" target="_blank" class="btn btn-primary">احجز العرض</a>
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
    if (el && pay.bankName && pay.accountName && pay.accountNumber) {
      el.textContent = `${pay.bankName} - ${pay.accountName} - ${pay.accountNumber}`;
    }
  } catch {}
}

/* ================= Init ================= */
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
