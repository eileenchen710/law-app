#!/usr/bin/env node
"use strict";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";

function logStep(message) {
  console.log(`\n=== ${message} ===`);
}

async function request(method, path, body) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      Accept: "application/json",
    },
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Ignore JSON parse errors to surface original status/text.
  }

  if (!response.ok) {
    const error = new Error(`Request ${method} ${path} failed with status ${response.status}`);
    error.details = payload ?? (await response.text().catch(() => null));
    throw error;
  }

  return payload;
}

async function testServices() {
  logStep("Testing /api/services");

  await request("GET", "/api/services");

  const uniqueSuffix = Date.now();
  const createPayload = {
    title: `Test Service ${uniqueSuffix}`,
    description: "Automated test payload for service creation.",
    category: "automation",
    lawyerInfo: {
      contact: "auto@law-app.test",
    },
    status: "active",
  };

  const created = await request("POST", "/api/services", createPayload);

  await request("GET", `/api/services/${created.id}`);

  const updatePayload = {
    ...createPayload,
    title: `${createPayload.title} Updated`,
  };

  await request("PUT", `/api/services/${created.id}`, updatePayload);
  await request("DELETE", `/api/services/${created.id}`);
}

async function testAppointments() {
  logStep("Testing /api/appointments");

  await request("GET", "/api/appointments");

  const uniqueSuffix = Date.now();
  const createPayload = {
    name: `Test Appointment ${uniqueSuffix}`,
    contact: "15500001111",
    description: "Automated test payload for appointment creation.",
  };

  const created = await request("POST", "/api/appointments", createPayload);

  await request("GET", `/api/appointments/${created.id}`);

  const updatePayload = {
    name: `${createPayload.name} Updated`,
    contact: "16600002222",
    description: "Automated test payload updated.",
  };

  await request("PUT", `/api/appointments/${created.id}`, updatePayload);
  await request("DELETE", `/api/appointments/${created.id}`);
}

async function testFirms() {
  logStep("Testing /api/firms");

  const firms = await request("GET", "/api/firms");

  if (!Array.isArray(firms) || firms.length === 0) {
    throw new Error("No firms returned from /api/firms");
  }

  const firstFirm = firms[0];
  await request("GET", `/api/firms/${firstFirm.slug}`);

  const uniqueSuffix = Date.now();
  const createPayload = {
    name: `Test Firm ${uniqueSuffix}`,
    slug: `test-firm-${uniqueSuffix}`,
    city: "Test City",
    address: "100 Test Address",
    description: "Automated test payload for firm creation.",
    phone: "010-00000000",
    email: "firm@test.local",
    website: "https://example.com",
    practiceAreas: ["Test Practice"],
    tags: ["automation"],
    lawyers: [
      {
        name: "Test Lawyer",
        title: "Partner",
        phone: "13900000000",
        email: "lawyer@test.local",
        specialties: ["Test Specialty"],
      },
    ],
  };

  const created = await request("POST", "/api/firms", createPayload);

  await request("GET", `/api/firms/${created.id}`);

  const updatePayload = {
    ...createPayload,
    name: `${createPayload.name} Updated`,
    tags: [...createPayload.tags, "updated"],
  };

  await request("PUT", `/api/firms/${created.id}`, updatePayload);
  await request("DELETE", `/api/firms/${created.id}`);
}

(async function main() {
  try {
    await testServices();
    await testAppointments();
    await testFirms();
    console.log("\nAll API tests passed ?");
  } catch (error) {
    console.error("\nAPI tests failed ?", error);
    if (error.details) {
      console.error("Details:", error.details);
    }
    process.exitCode = 1;
  }
})();
