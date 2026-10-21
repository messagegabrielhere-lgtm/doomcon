#!/usr/bin/env node
'use strict';
// Manually issue a key (comps, refunds, testers).
// Usage: node tools/issue-key.js [days=30] [product=flight-recorder] [plan=owner]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sign } = require('../recorder/src/license');

const [days = '30', product = 'flight-recorder', plan = 'owner'] = process.argv.slice(2);
const pem = fs.readFileSync(path.join(__dirname, 'keys', 'license-private.pem'));
const priv = crypto.createPrivateKey(pem);
const now = Date.now();
console.log(sign({
  lid: 'man_' + crypto.randomBytes(6).toString('hex'),
  product, plan, via: 'manual',
  iat: now, exp: now + Number(days) * 86400000,
}, priv));
