// Battery module: queueing analysis. The M/M/c queue, solved exactly at
// steady state: utilisation, chance of waiting, queue length and waiting
// times. Used on OPD queues, grievance backlogs and lab sample queues. The
// stability condition is enforced, because an unstable queue has no steady
// state to report and pretending otherwise is how backlogs get normalised.

import { escapeHtml } from './decisionTree.js';

function factorial(n) {
  let f = 1;
  for (let i = 2; i <= n; i += 1) f *= i;
  return f;
}

// Exact M/M/c steady state. a = offered load (erlangs), rho = utilisation.
export function mmc(arrivalRate, serviceRate, servers) {
  const a = arrivalRate / serviceRate;
  const rho = a / servers;
  if (rho >= 1) {
    return { stable: false, a, rho };
  }
  let sum = 0;
  for (let n = 0; n < servers; n += 1) {
    sum += Math.pow(a, n) / factorial(n);
  }
  const tail = Math.pow(a, servers) / (factorial(servers) * (1 - rho));
  const pi0 = 1 / (sum + tail);
  const pWait = tail * pi0; // Erlang C
  const lq = (pWait * rho) / (1 - rho);
  const wq = lq / arrivalRate;
  const w = wq + 1 / serviceRate;
  const l = arrivalRate * w;
  return { stable: true, a, rho, pi0, pWait, lq, l, wq, w };
}

export const queueing = {
  id: 'queueing',
  label: 'Queue and waiting-time analysis',
  question: 'How long will the people in this queue wait, and how many servers end the wait?',

  bindNote:
    'Parameters live in the structure: arrival rate, service rate per server and the number of servers, all in the same time unit. The module reports the steady state only; if arrivals are bursty in practice, treat the waiting time as the floor of the real wait, not the ceiling.',

  validate(input) {
    const errors = [];
    const warnings = [];
    if (!Number.isFinite(input && input.arrivalRate) || input.arrivalRate <= 0) errors.push('arrivalRate must be positive (people per time unit).');
    if (!Number.isFinite(input && input.serviceRate) || input.serviceRate <= 0) errors.push('serviceRate must be positive (people per server per time unit).');
    const c = input && input.servers;
    if (!Number.isInteger(c) || c < 1) errors.push('servers must be a whole number of at least 1.');
    if (Number.isFinite(input && input.arrivalRate) && Number.isFinite(input && input.serviceRate) && Number.isInteger(c) && c >= 1) {
      if (input.arrivalRate / (c * input.serviceRate) >= 1) {
        errors.push(`The queue is unstable: arrivals (${input.arrivalRate}) meet or exceed total service capacity (${c * input.serviceRate}). There is no steady state; add servers or shape demand.`);
      }
    }
    if (!input || !input.timeUnit || !String(input.timeUnit).trim()) {
      warnings.push('No timeUnit named. Say whether rates are per hour, per day or per week; a waiting time without a unit is a number without a meaning.');
    }
    if (!input || !input.pit || !input.pit.group) {
      warnings.push('No distributional column. The public interest check asks: who stands in this queue, and who can pay to skip it?');
    }
    return { errors, warnings };
  },

  run(input) {
    const r = mmc(input.arrivalRate, input.serviceRate, input.servers);
    return {
      arrivalRate: input.arrivalRate,
      serviceRate: input.serviceRate,
      servers: input.servers,
      timeUnit: input.timeUnit || 'time units',
      ...r,
      pit: input.pit || null,
    };
  },

  headline(r) {
    if (!r.stable) return 'The queue is unstable: arrivals meet or exceed capacity, so the wait grows without bound.';
    return `Utilisation ${(r.rho * 100).toFixed(1)}%. Average wait ${r.wq.toFixed(2)} ${r.timeUnit}, with ${(r.pWait * 100).toFixed(1)}% of arrivals finding anyone ahead of them.`;
  },

  renderResults(r) {
    const num = (v, d = 3) => Number(v).toFixed(d);
    if (!r.stable) {
      return `<p class="report-warning">Arrivals (${r.arrivalRate}) meet or exceed the capacity of ${r.servers} server(s) at ${r.serviceRate} each. A queue that never clears has no steady-state waiting time to report.</p>`;
    }
    return `
      <p class="report-headline">Steady-state M/M/c with ${r.servers} server(s): these are the averages a person in the queue actually experiences over a long run.</p>
      <h3>Steady state</h3>
      <table class="result-table"><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody>
        <tr><th scope="row">Utilisation per server</th><td class="data-num">${(r.rho * 100).toFixed(1)}%</td></tr>
        <tr><th scope="row">Chance an arrival must wait</th><td class="data-num">${(r.pWait * 100).toFixed(1)}%</td></tr>
        <tr><th scope="row">Average queue length</th><td class="data-num">${num(r.lq)}</td></tr>
        <tr><th scope="row">Average people in the system</th><td class="data-num">${num(r.l)}</td></tr>
        <tr><th scope="row">Average wait before service</th><td class="data-num">${num(r.wq)} ${escapeHtml(r.timeUnit)}</td></tr>
        <tr><th scope="row">Average total time</th><td class="data-num">${num(r.w)} ${escapeHtml(r.timeUnit)}</td></tr>
      </tbody></table>
      <p class="fine-print">Rates assumed steady: ${r.arrivalRate} arrivals and ${r.serviceRate} services per server, per ${escapeHtml(r.timeUnit)}. Bursty arrivals and no-shows push real waits above these figures.</p>
      ${r.pit && r.pit.group ? `<p class="fine-print">Distributional column: ${escapeHtml(r.pit.group)}: ${escapeHtml(r.pit.effect || '')}. ${escapeHtml(r.pit.note || '')}</p>` : '<p class="report-warning">No distributional column. Who stands in this queue, and who can pay to skip it?</p>'}`;
  },
};

export const queueingSample = {
  title: 'Illustrative: district hospital OPD registration counter',
  arrivalRate: 42,
  serviceRate: 50,
  servers: 1,
  timeUnit: 'hour',
  pit: {
    group: 'Daily-wage patients waiting at the counter',
    effect: 'restricted',
    note: 'Every minute of queue time is unpaid leave for a wage worker; patients with money use private labs and never enter this queue.',
  },
};
