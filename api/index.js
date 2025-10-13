const express = require('express');
const serverless = require('serverless-http');

// Lazy load handlers to reduce cold start time
const handlers = {
  firms: () => require('./_handlers/firms'),
  services: () => require('./_handlers/services'),
  v1FirmsList: () => require('./_handlers/v1/firms-list'),
  v1FirmDetail: () => require('./_handlers/v1/firms-detail'),
  v1ServicesList: () => require('./_handlers/v1/services-list'),
  v1ServiceDetail: () => require('./_handlers/v1/services-detail'),
  v1Consultations: () => require('./_handlers/v1/consultations'),
  v1Auth: () => require('./_handlers/v1/auth'),
  v1UsersMe: () => require('./_handlers/v1/users-me'),
};

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function adapt(getHandler, { mapIdParam = false } = {}) {
  return async (request, response, next) => {
    try {
      if (mapIdParam && request.params && request.params.id && typeof request.query?.id === 'undefined') {
        request.query = { ...request.query, id: request.params.id };
      }

      const handler = typeof getHandler === 'function' && !getHandler.length ? getHandler() : getHandler;
      await handler(request, response);

      if (!response.headersSent) {
        response.end();
      }
    } catch (error) {
      next(error);
    }
  };
}

// Legacy admin-style endpoints
app.all(['/firms', '/api/firms'], adapt(() => handlers.firms()));
app.all(['/firms/:id', '/api/firms/:id'], adapt(() => handlers.firms(), { mapIdParam: true }));

app.all(['/services', '/api/services'], adapt(() => handlers.services()));
app.all(['/services/:id', '/api/services/:id'], adapt(() => handlers.services(), { mapIdParam: true }));

// Public v1 endpoints
app.all(['/v1/firms', '/api/v1/firms'], adapt(() => handlers.v1FirmsList()));
app.all(['/v1/firms/:id', '/api/v1/firms/:id'], adapt(() => handlers.v1FirmDetail(), { mapIdParam: true }));

app.all(['/v1/services', '/api/v1/services'], adapt(() => handlers.v1ServicesList()));
app.all(['/v1/services/:id', '/api/v1/services/:id'], adapt(() => handlers.v1ServiceDetail(), { mapIdParam: true }));

app.all(['/v1/consultations', '/api/v1/consultations'], adapt(() => handlers.v1Consultations()));
app.all(
  ['/v1/auth', '/api/v1/auth', '/v1/auth/:action', '/api/v1/auth/:action'],
  adapt(() => handlers.v1Auth())
);
app.all(['/v1/users/me', '/api/v1/users/me'], adapt(() => handlers.v1UsersMe()));

app.use((request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.use((error, request, response, _next) => {
  console.error('API router error:', error);
  if (response.headersSent) {
    return;
  }
  response.status(500).json({ error: 'Internal Server Error' });
});

module.exports = serverless(app);
