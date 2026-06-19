import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3004/api',
});

console.log('Resolving /auth/login:');
try {
  const url = api.getUri({ url: '/auth/login' });
  console.log('Result:', url);
} catch (e) {
  console.error(e);
}
