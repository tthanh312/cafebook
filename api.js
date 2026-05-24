/* ========== api.js — Fetch API + CRUD MockAPI ========== */

const API = {
  drinks:       'https://69fd352130ad0a6fd1c09382.mockapi.io/api/v1/drinks',
  tables:       'https://69fd352130ad0a6fd1c09382.mockapi.io/api/v1/tables',
  reservations: 'https://69fd35bc30ad0a6fd1c0972c.mockapi.io/api/v1/reservations'
};

// ---- Generic fetch wrapper ----
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ===== DRINKS =====
async function getDrinks() {
  return apiFetch(API.drinks);
}
async function getDrinkById(id) {
  return apiFetch(`${API.drinks}/${id}`);
}
async function createDrink(data) {
  return apiFetch(API.drinks, { method: 'POST', body: JSON.stringify(data) });
}
async function updateDrink(id, data) {
  return apiFetch(`${API.drinks}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
async function deleteDrink(id) {
  return apiFetch(`${API.drinks}/${id}`, { method: 'DELETE' });
}

// ===== TABLES =====
async function getTables() {
  return apiFetch(API.tables);
}
async function getTableById(id) {
  return apiFetch(`${API.tables}/${id}`);
}
async function createTable(data) {
  return apiFetch(API.tables, { method: 'POST', body: JSON.stringify(data) });
}
async function updateTable(id, data) {
  return apiFetch(`${API.tables}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
async function deleteTable(id) {
  return apiFetch(`${API.tables}/${id}`, { method: 'DELETE' });
}

// ===== RESERVATIONS =====
async function getReservations() {
  return apiFetch(API.reservations);
}
async function getReservationById(id) {
  return apiFetch(`${API.reservations}/${id}`);
}
async function createReservation(data) {
  return apiFetch(API.reservations, { method: 'POST', body: JSON.stringify(data) });
}
async function updateReservation(id, data) {
  return apiFetch(`${API.reservations}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
async function deleteReservation(id) {
  return apiFetch(`${API.reservations}/${id}`, { method: 'DELETE' });
}

// ===== jQuery AJAX =====
function jqGetReservations(onSuccess, onError) {
  $.ajax({
    url: API.reservations,
    method: 'GET',
    dataType: 'json',
    success: onSuccess,
    error: (xhr) => onError && onError(xhr.responseText)
  });
}
function jqUpdateReservationStatus(id, status, onSuccess, onError) {
  $.ajax({
    url: `${API.reservations}/${id}`,
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({ status }),
    success: onSuccess,
    error: (xhr) => onError && onError(xhr.responseText)
  });
}