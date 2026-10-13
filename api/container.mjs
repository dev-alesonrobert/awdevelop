import { existsSync } from 'node:fs';
import { getCACertificates } from 'node:tls';
import { app } from '../server/app.js';
console.info('AWDevelop TLS trust diagnostics', {
  node: process.version,
  systemCA: getCACertificates('system').length,
  extraCA: getCACertificates('extra').length,
  certificateSettings: Object.keys(process.env).filter(key => /^(SSL_CERT_|NODE_EXTRA_CA_CERTS|NODE_USE_SYSTEM_CA|REQUESTS_CA_BUNDLE|CURL_CA_BUNDLE)/.test(key)),
  certificateFiles: Object.fromEntries([
    '/etc/ssl/certs/ca-certificates.crt',
    '/etc/pki/ca-trust/source/anchors/vercel-proxy-ca.pem',
    '/usr/local/share/ca-certificates/vercel-proxy-ca.crt',
  ].map(path => [path, existsSync(path)])),
});
const port = Number(process.env.PORT || 80);
app.listen(port, '0.0.0.0');
