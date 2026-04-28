// ============================================================
//  설정
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwbnEV4c3fgXT91OCbQM8TlL-007go8D-YFy9EETj2DEnLs_4Qr68mPu3SmHKk59_FFag/exec';

const FEEDS = [
  { cat: 'kr',    label: '국내',    url: 'https://www.yonhapnewstv.co.kr/browse/feed/' },
  { cat: 'kr',    label: '국내',    url: 'https://rss.donga.com/total.xml' },
  { cat: 'world', label: '해외',    url: 'https://feeds.bbci.co.uk/korean/rss.xml' },
  { cat: 'it',    label: 'IT·테크', url: 'https://www.zdnet.co.kr/rss/news/latest/' },
  { cat: 'eco',   label: '경제',    url: 'https://rss.donga.com/economy.xml' },
];

// ============================================================
//  상태
// ============================================================
let allNews = [];
let currentCat = 'all';

// ============================================================
//  날짜 표시
// ============================================================
function setDate() {
  const d = new Date();
  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('dateBadge').textContent =
    `${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

// ============================================================
//  RSS fetch
// ============================================================
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

// ============================================================
//  뉴스 불러오기
// ============================================================
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

// ============================================================
//  목록 렌더링
// ============================================================
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
    li.addEventListener('click', () => {
      window.open(news.link, '_blank');
    });
    list.appendChild(li);
  });
}

// ============================================================
//  이벤트
// ============================================================
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

// ============================================================
//  시작
// ============================================================
setDate();
loadNews();
