const ANALYTICS_KEY = 'drg_analytics';

function getAnalytics() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || { pageViews: 0, whatsappClicks: 0, productViews: {}, daily: {} };
  } catch { return { pageViews: 0, whatsappClicks: 0, productViews: {}, daily: {} }; }
}

function saveAnalytics(data) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
}

function trackPageView() {
  const data = getAnalytics();
  data.pageViews++;
  const today = new Date().toISOString().split('T')[0];
  if (!data.daily[today]) data.daily[today] = { pageViews: 0, whatsappClicks: 0 };
  data.daily[today].pageViews = (data.daily[today].pageViews || 0) + 1;
  saveAnalytics(data);
}

function trackWhatsAppClick(productName) {
  const data = getAnalytics();
  data.whatsappClicks++;
  const today = new Date().toISOString().split('T')[0];
  if (!data.daily[today]) data.daily[today] = { pageViews: 0, whatsappClicks: 0 };
  data.daily[today].whatsappClicks = (data.daily[today].whatsappClicks || 0) + 1;
  data.productViews[productName] = (data.productViews[productName] || 0) + 1;
  saveAnalytics(data);
}

// Track WhatsApp clicks
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href*="wa.me"]');
  if (link) {
    const productCard = link.closest('.product-card');
    const name = productCard?.querySelector('h3')?.textContent || 'عرض';
    trackWhatsAppClick(name);
  }
});

// Track page view on load
trackPageView();
