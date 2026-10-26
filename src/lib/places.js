// The Khata places client.
//
// The directory and the captured passbooks live in Cloudflare D1 behind the
// places Worker. Nothing about a village or a rupee figure ships in this
// bundle: the page asks the API for the State list, then districts, then
// villages, then the one passbook it is showing.

export const PLACES_API = String(
  import.meta.env?.VITE_PLACES_API || 'https://ths-places-api.shivang-uniyal27.workers.dev',
).replace(/\/+$/, '');

const getJson = async (path, signal) => {
  const response = await fetch(`${PLACES_API}${path}`, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) {
    let message = `The places service answered ${response.status}.`;
    try {
      const body = await response.json();
      if (body && body.error && body.error.message) message = body.error.message;
    } catch {
      // Keep the status message.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const fetchStates = (signal) => getJson('/v1/states', signal).then((d) => d.states || []);

export const fetchDistricts = (stateId, signal) =>
  getJson(`/v1/districts?state=${encodeURIComponent(stateId)}`, signal).then((d) => d.districts || []);

export const fetchVillages = (districtId, signal) =>
  getJson(`/v1/villages?district=${encodeURIComponent(districtId)}`, signal).then((d) => d.villages || []);

export const fetchPassbook = (gpCode, signal) =>
  getJson(`/v1/passbook?gp=${encodeURIComponent(gpCode)}`, signal);
