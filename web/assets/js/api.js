const enableDevApi = true;

const CACHE_KEY = 'mdb.apiConfig';
const CACHE_TTL_MS = 10 * 60 * 1000;

const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
let prodAPI = null;
let api = null;
let cdn = null;

const loadCachedApiConfig = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const isFresh = parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_TTL_MS;

    return isFresh ? parsed.data : null;
  } catch (err) {
    console.warn('Failed to read cached API config', err);
    return null;
  }
};

const cacheApiConfig = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    console.warn('Failed to cache API config', err);
  }
};

const apiReady = (async () => {
  const cached = loadCachedApiConfig();
  const data = cached || await fetch('/api-url').then(res => res.json());

  if (!cached) cacheApiConfig(data);

  prodAPI = data.url || null;
  api = isLocalhost && enableDevApi ? 'http://localhost:3000' : `https://${prodAPI}`;

  if (!api) throw new Error('API url is missing');

  cdn = api + '/cdn';

  window.api = api;
  window.cdn = cdn;

  return { api, cdn };
})();

const waitForApi = async () => {
  const { api: resolvedApi } = await apiReady;
  return resolvedApi;
};

const waitForCdn = async () => {
  const { cdn: resolvedCdn } = await apiReady;
  return resolvedCdn;
};

window.apiReady = apiReady;
window.waitForApi = waitForApi;
window.waitForCdn = waitForCdn;

const createWarningDiv = (message) => {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-4 z-10';
  warningDiv.innerText = message;

  document.body.insertBefore(warningDiv, document.body.firstChild);

  document.body.style.paddingTop = `${warningDiv.offsetHeight}px`;
};

if (isLocalhost && enableDevApi) {
  apiReady
    .then(({ api: resolvedApi }) => fetch(resolvedApi))
    .then(response => response.json())
    .then(data => {
      createWarningDiv(`You are using development API. Version: ${data.version}`);
    })
    .catch(() => {
      createWarningDiv('Development API is not running.');
    });
}