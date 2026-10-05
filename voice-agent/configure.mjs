#!/usr/bin/env node
// Fill your settings into the n8n workflow and the Vapi assistant.
//
//   node voice-agent/configure.mjs                      writes voice-agent/dist/*.json
//   node voice-agent/configure.mjs --create-assistant   also creates the assistant on Vapi
//   node voice-agent/configure.mjs --update-assistant   pushes changes to VAPI_ASSISTANT_ID
//
// Settings come from voice-agent/.env (copy .env.example), then the environment.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');

export const DEFAULTS = {
  ASSISTANT_NAME: 'Jordan',
  TIMEZONE: 'America/New_York',
  DEFAULT_COUNTRY_CODE: '1',
  CALL_WINDOW_START: '9',
  CALL_WINDOW_END: '20',
  SHOWING_START_HOUR: '10',
  SHOWING_END_HOUR: '18',
  SHOWING_MINUTES: '30',
  HOT_LEAD_SCORE: '7',
  LLM_PROVIDER: 'anthropic',
  LLM_MODEL: 'claude-haiku-4-5-20251001',
  VOICE_PROVIDER: 'vapi',
  VOICE_ID: 'Elliot',
  VAPI_ASSISTANT_ID: '',
};

// Not needed until a later step, so a blank value is only a warning.
const LATER = new Set(['VAPI_ASSISTANT_ID', 'VAPI_PHONE_NUMBER_ID']);

export function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/(^|\s+)#.*$/, '').trim(); // inline comment
    out[m[1]] = v;
  }
  return out;
}

export function loadSettings(envFile = join(HERE, '.env')) {
  const fromFile = readEnvFile(envFile);
  const s = { ...DEFAULTS };
  for (const k of new Set([...Object.keys(DEFAULTS), ...Object.keys(fromFile)])) {
    if (fromFile[k] !== undefined && fromFile[k] !== '') s[k] = fromFile[k];
  }
  for (const k of Object.keys(process.env)) if (k in s || k in fromFile) s[k] = process.env[k] || s[k];
  // A Google account's main calendar id is its email address.
  if (!s.GOOGLE_CALENDAR_ID && s.AGENT_EMAIL) s.GOOGLE_CALENDAR_ID = s.AGENT_EMAIL;
  if (s.N8N_BASE_URL) s.N8N_BASE_URL = s.N8N_BASE_URL.replace(/\/+$/, '');
  return s;
}

const PLACEHOLDER = /__([A-Z][A-Z0-9_]*)__/g;

function fill(text, settings, missing, escape = (v) => v) {
  return text.replace(PLACEHOLDER, (whole, key) => {
    if (!(key in settings) || settings[key] === '') {
      missing.add(key);
      return whole;
    }
    return escape(String(settings[key]));
  });
}

// For values dropped inside '...' in Code-node JavaScript.
const jsString = (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');

function walk(node, fn) {
  if (Array.isArray(node)) return node.map((v) => walk(v, fn));
  if (node && typeof node === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = walk(v, fn);
    return o;
  }
  return typeof node === 'string' ? fn(node) : node;
}

export function buildWorkflow(settings, missing = new Set()) {
  const tpl = JSON.parse(readFileSync(join(HERE, 'workflow', 'workflow.template.json'), 'utf8'));
  return walk(tpl, (s) => {
    const m = s.match(/^@file:(.+)$/);
    if (m) return fill(readFileSync(join(HERE, 'workflow', m[1]), 'utf8'), settings, missing, jsString);
    return fill(s, settings, missing);
  });
}

export function buildAssistant(settings, missing = new Set()) {
  const tpl = JSON.parse(readFileSync(join(HERE, 'vapi', 'assistant.template.json'), 'utf8'));
  return walk(tpl, (s) => {
    const m = s.match(/^@file:(.+)$/);
    const text = m ? readFileSync(join(HERE, 'vapi', m[1]), 'utf8') : s;
    return fill(text, settings, missing);
  });
}

async function vapi(method, path, body, key) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi ${method} ${path} -> ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const settings = loadSettings();

  const assistantMissing = new Set();
  const assistant = buildAssistant(settings, assistantMissing);
  if (assistantMissing.size) {
    console.error(`Missing settings for the assistant: ${[...assistantMissing].join(', ')}`);
    console.error('Fill them in voice-agent/.env (see .env.example) and run again.');
    process.exit(1);
  }

  if (args.has('--create-assistant') || args.has('--update-assistant')) {
    if (!settings.VAPI_API_KEY) throw new Error('VAPI_API_KEY is not set.');
    if (args.has('--update-assistant')) {
      if (!settings.VAPI_ASSISTANT_ID) throw new Error('VAPI_ASSISTANT_ID is not set.');
      await vapi('PATCH', `/assistant/${settings.VAPI_ASSISTANT_ID}`, assistant, settings.VAPI_API_KEY);
      console.log(`Updated assistant ${settings.VAPI_ASSISTANT_ID}.`);
    } else {
      const created = await vapi('POST', '/assistant', assistant, settings.VAPI_API_KEY);
      settings.VAPI_ASSISTANT_ID = created.id;
      console.log(`Created assistant ${created.id}. Put VAPI_ASSISTANT_ID=${created.id} in voice-agent/.env.`);
    }
  }

  const wfMissing = new Set();
  const workflow = buildWorkflow(settings, wfMissing);
  const blocking = [...wfMissing].filter((k) => !LATER.has(k));
  if (blocking.length) {
    console.error(`Missing settings for the workflow: ${blocking.join(', ')}`);
    process.exit(1);
  }

  mkdirSync(DIST, { recursive: true });
  writeFileSync(join(DIST, 'vapi-assistant.json'), JSON.stringify(assistant, null, 2) + '\n');
  writeFileSync(join(DIST, 'n8n-workflow.json'), JSON.stringify(workflow, null, 2) + '\n');
  console.log('Wrote voice-agent/dist/vapi-assistant.json and voice-agent/dist/n8n-workflow.json');
  const later = [...wfMissing].filter((k) => LATER.has(k));
  if (later.length) {
    console.log(`Still blank: ${later.join(', ')}. Outbound calls need them; fill them in and run this again.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
