const enableDevApi = true;

const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const api = isLocalhost && enableDevApi ? 'http://localhost:3000' : 'https://apimdb.maxix.sk';
const cdn = `${api}/cdn`;

const createWarningDiv = (message) => {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center p-4';
  warningDiv.innerText = message;
  document.body.appendChild(warningDiv);
};

if (isLocalhost && enableDevApi) {
  fetch(api)
    .then(response => response.json())
    .then(response => {
      createWarningDiv(`You are using development API. Version: ${response.data}`);
    })
    .catch(() => {
      createWarningDiv('Development API is not running.');
    });
}