const express = require('express');
const serverless = require('serverless-http');

const legacyFirmsHandler = require('./_handlers/firms');
const legacyServicesHandler = require('./_handlers/services');
const legacyAppointmentsHandler = require('./_handlers/appointments');

const v1FirmsListHandler = require('./_handlers/v1/firms-list');
const v1FirmDetailHandler = require('./_handlers/v1/firms-detail');
const v1ServicesListHandler = require('./_handlers/v1/services-list');
const v1ServiceDetailHandler = require('./_handlers/v1/services-detail');
const v1AppointmentsListHandler = require('./_handlers/v1/appointments-list');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function adapt(handler, { mapIdParam = false } = {}) {
  return async (request, response, next) => {
    try {
      if (mapIdParam && request.params && request.params.id && typeof request.query?.id === 'undefined') {
        request.query = { ...request.query, id: request.params.id };
      }

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
app.all(['/firms', '/api/firms'], adapt(legacyFirmsHandler));
app.all(['/firms/:id', '/api/firms/:id'], adapt(legacyFirmsHandler, { mapIdParam: true }));

app.all(['/services', '/api/services'], adapt(legacyServicesHandler));
app.all(['/services/:id', '/api/services/:id'], adapt(legacyServicesHandler, { mapIdParam: true }));

app.all(['/appointments', '/api/appointments'], adapt(legacyAppointmentsHandler));
app.all(['/appointments/:id', '/api/appointments/:id'], adapt(legacyAppointmentsHandler, { mapIdParam: true }));

// Public v1 endpoints
app.all(['/v1/firms', '/api/v1/firms'], adapt(v1FirmsListHandler));
app.all(['/v1/firms/:id', '/api/v1/firms/:id'], adapt(v1FirmDetailHandler, { mapIdParam: true }));

app.all(['/v1/services', '/api/v1/services'], adapt(v1ServicesListHandler));
app.all(['/v1/services/:id', '/api/v1/services/:id'], adapt(v1ServiceDetailHandler, { mapIdParam: true }));

app.all(['/v1/appointments', '/api/v1/appointments'], adapt(v1AppointmentsListHandler));

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
