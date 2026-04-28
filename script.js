const GAS_URL = 'https://script.google.com/macros/s/AKfycbzdn1VTzmOA7A6oqx__PS8U0kbATE7OUg-NCdna6MDLy8uAHTrRLg9-8wFTm6FRedk_nw/exec';

const FEEDS = [
  { cat: 'kr',    label: '국내',    url: 'https://www.yonhapnewstv.co.kr/browse/feed/' },
  { cat: 'kr',    label: '국내',    url: 'https://rss.donga.com/total.xml' },
  { cat: 'world', label: '해외',    url: 'https://feeds.bbci.co.uk/korean/rss.xml' },
  { cat: 'it',    label: 'IT·테크', url: 'https://www.zdnet.co.kr/rss/news/latest/' },
  { cat: 'eco',   label: '경제',    url: 'https://rss.donga.com/economy.xml' },
];

let allNews = [];
let currentCat = 'all';

function setDate() {
  const d = new Date();
  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('dateBadge').textContent =
    `${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

async function fetchFeed(feed) {
  try {
    const url = GAS_URL + '?url=' + encodeURIComponent(feed.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch fail');
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const items = [...xml.querySelectorAll('item')].slice(0, 8);
    return items.map(item => ({
      cat:   feed.cat,
      label: feed.label,
      title: item.querySelector('title')?.textContent?.trim() || '',
      link:  item.querySelector('link')?.textContent?.trim() || '',
      desc:  item.querySelector('description')?.textContent?.replace(/<[^>]*>/g,'').trim() || '',
      pub:   item.querySelector('pubDate')?.textContent?.trim() || '',
    })).filter(n => n.title);
  } catch {
    return [];
  }
}

function formatTime(pubStr) {
  if (!pubStr) return '';
  const d = new Date(pubStr);
  if (isNaN(d)) return '';
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff/60)}시간 전`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

async function loadNews() {
  document.getElementById('skeletonList').style.display = 'flex';
  document.getElementById('newsList').innerHTML = '';
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('refreshBtn').classList.add('spinning');

  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    allNews = results.flat().sort((a,b) => new Date(b.pub) - new Date(a.pub));
    if (allNews.length === 0) throw new Error('no news');
    renderList();
  } catch {
    document.getElementById('skeletonList').style.display = 'none';
    document.getElementById('errorBox').style.display = 'block';
  } finally {
    document.getElementById('refreshBtn').classList.remove('spinning');
  }
}

function renderList() {
  document.getElementById('skeletonList').style.display = 'none';
  const list = document.getElementById('newsList');
  list.innerHTML = '';

  const filtered = currentCat === 'all'
    ? allNews
    : allNews.filter(n => n.cat === currentCat);

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">해당 카테고리 뉴스가 없어요</li>';
    return;
  }

  filtered.forEach((news, i) => {
    const li = document.createElement('li');
    li.className = 'news-card';
    li.style.animationDelay = `${i * 40}ms`;
    li.innerHTML = `
      <div class="card-meta">
        <span class="badge badge-${news.cat}">${news.label}</span>
        <span class="card-time">${formatTime(news.pub)}</span>
      </div>
      <p class="card-title">${news.title}</p>
      ${news.desc ? `<p class="card-desc">${news.desc.slice(0, 80)}...</p>` : ''}
    `;
    li.addEventListener('click', () => openArticle(news));
    list.appendChild(li);
  });
}

async function openArticle(news) {
  const overlay = document.getElementById('articleOverlay');
  document.getElementById('articleBadge').className = `badge badge-${news.cat}`;
  document.getElementById('articleBadge').textContent = news.label;
  document.getElementById('articleTitle').textContent = news.title;
  document.getElementById('articleLink').href = news.link;
  document.getElementById('articleBody').innerHTML = `
    <div class="ai-loading">
      <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
      <span class="ai-loading-text">기사 불러오는 중...</span>
    </div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const url = GAS_URL + '?mode=article&url=' + encodeURIComponent(news.link);
    const res = await fetch(url);
    const text = await res.text();
    const clean = text.replace(/\s+/g, ' ').trim();
    document.getElementById('articleBody').innerHTML =
      `<p class="article-text">${clean}</p>`;
  } catch {
    document.getElementById('articleBody').innerHTML =
      `<p class="article-text">본문을 불러오지 못했어요.<br>원문 링크를 확인해보세요.</p>`;
  }
}

function closeArticle() {
  document.getElementById('articleOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderList();
  });
});

document.getElementById('refreshBtn').addEventListener('click', loadNews);
document.getElementById('retryBtn').addEventListener('click', loadNews);
document.getElementById('articleClose').addEventListener('click', closeArticle);
document.getElementById('articleOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('articleOverlay')) closeArticle();
});

setDate();
loadNews();