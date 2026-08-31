import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'https://www.haydesour.com';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '60s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const endpoint = __ITER % 2 === 0 ? '/api/listings' : '/api/categories';
  const response = http.get(`${baseUrl}${endpoint}`, {
    tags: { endpoint },
  });

  check(response, {
    'response status is 200': (result) => result.status === 200,
    'response is JSON': (result) => result.headers['Content-Type']?.includes('application/json'),
  });

  // Keeps this public-production test beneath the API's per-IP rate limit.
  sleep(3);
}