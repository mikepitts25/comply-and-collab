// CAC/PIV (client-certificate) authentication via a trusted reverse proxy.
//
// In DoD deployments TLS client-cert auth is terminated at a reverse proxy
// (Apache/nginx) that validates the cert chain against the DoD PKI and passes
// the certificate subject DN to the app in a header. This module trusts that
// header ONLY when CLIENT_CERT_AUTH=true, and the proxy MUST strip any
// client-supplied copy of the header. Never enable this without such a proxy.

export function isCacEnabled(): boolean {
  return (process.env.CLIENT_CERT_AUTH ?? "").toLowerCase() === "true";
}

/** Header carrying the client-cert subject DN (configurable per proxy). */
export function cacHeaderName(): string {
  return (process.env.CLIENT_CERT_HEADER ?? "x-ssl-client-s-dn").toLowerCase();
}

/**
 * Extract the DoD EDIPI (10-digit identifier) from a certificate subject DN.
 * DoD CN format is "LAST.FIRST.MI.EDIPI", e.g.
 *   "CN=DOE.JANE.A.1234567890,OU=USA,O=U.S. Government,C=US"
 */
export function parseEdipi(subjectDn: string | null | undefined): string | null {
  if (!subjectDn) return null;
  const cnMatch = subjectDn.match(/CN=([^,/]+)/i);
  const cn = cnMatch ? cnMatch[1] : subjectDn;
  const edipi = cn.match(/(\d{10})\b/);
  return edipi ? edipi[1] : null;
}
