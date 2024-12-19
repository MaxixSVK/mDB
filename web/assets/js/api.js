const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

const api = isLocalhost ? 'http://localhost:3000' : 'https://apimdb.maxix.sk';
const cdn = isLocalhost ? 'http://localhost:3000/cdn' : 'https://apimdb.maxix.sk/cdn';