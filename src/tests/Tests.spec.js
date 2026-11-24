import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas para acompanhar o tempo e a taxa de sucesso das requisições
export const getDuration = new Trend('get_duration', true);
export const rateContentOK = new Rate('content_OK');

/**
 * Teste de performance (carga) contra a API pública REST Countries (GET).
 * Segue o padrão AAA (Arrange, Act, Assert) e implementa uma rampa de carga
 * com 3 stages, conforme a documentação oficial do Grafana K6.
 */
export const options = {
  // Thresholds (metas de performance exigidas pela prova)
  thresholds: {
    // 90% das respostas com tempo abaixo de 6800ms
    http_req_duration: ['p(90)<6800'],
    // Menos de 25% das requisições retornando erro
    http_req_failed: ['rate<0.25']
  },
  // Rampa de carga com 3 stages: inicia com 7 VUs, pico de 92 VUs, total de 3,5 minutos
  stages: [
    { duration: '1m', target: 7 }, // Stage 1: sobe para 7 VUs
    { duration: '1m30s', target: 92 }, // Stage 2: sobe até o pico de 92 VUs
    { duration: '1m', target: 0 } // Stage 3: desce de volta para 0 VUs
  ]
};

// Gera o relatório HTML e o resumo no terminal ao final do teste
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  // Arrange (preparação): define a URL base e os parâmetros da requisição
  const baseUrl = 'https://restcountries.com/v3.1/name/brazil';
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const OK = 200;

  // Act (ação): executa a requisição GET contra a API
  const res = http.get(`${baseUrl}`, params);

  // Alimenta as métricas personalizadas com o resultado da requisição
  getDuration.add(res.timings.duration);
  rateContentOK.add(res.status === OK);

  // Assert (verificação): valida que o status retornado foi 200
  check(res, {
    'GET - Status 200': () => res.status === OK
  });
}