const isLocalhost = window.location.hostname === 'localhost';

const api = isLocalhost ? 'http://localhost:3000' : 'https://apimdb.maxix.sk';
const cdn = isLocalhost ? 'http://localhost:3000/cdn' : 'https://apimdb.maxix.sk/cdn';
