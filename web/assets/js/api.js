const enableDevApi = true;

const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const api = (isLocalhost && enableDevApi) ? 'http://localhost:3000' : 'https://apimdb.maxix.sk';
const cdn = (isLocalhost && enableDevApi) ? 'http://localhost:3000/cdn' : 'https://apimdb.maxix.sk/cdn';

if (isLocalhost && enableDevApi) {
  fetch(api)
    .then(response => response.json())
    .then(response => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center p-4';
      warningDiv.innerText = `You are using development API. Version: ${response.data}`;
      document.body.appendChild(warningDiv);
    })
    .catch(() => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center p-4';
      warningDiv.innerText = 'Development API is not running.';
      document.body.appendChild(warningDiv);
    });
}