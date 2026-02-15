
import { TLDToRdapServer } from '../server_lists/rdap_servers';

export async function queryRDAP(domain: string, tld: string): Promise<any> {
  const rdapServer = TLDToRdapServer[tld];
  if (!rdapServer) {
    throw new Error(`No RDAP server known for TLD: ${tld}`);
  }
  
  // Ensure trailing slash
  const serverUrl = rdapServer.endsWith('/') ? rdapServer : rdapServer + '/';
  const url = `${serverUrl}domain/${domain}`;
  
  console.log(`Querying RDAP for domain: ${domain} with TLD: ${tld} on server: ${serverUrl}`);

  const response = await fetch(url, {
      headers: {
          'Accept': 'application/rdap+json'
      }
  });
  
  if (!response.ok) {
      if (response.status === 404) {
          throw new Error('Resource not found');
      }
      throw new Error(`RDAP query failed with status: ${response.status}`);
  }
  
  return await response.json();
}

export async function queryRDAPIP(ip: string, serverKey: string): Promise<any> {
    const rdapServer = TLDToRdapServer[serverKey];
    if (!rdapServer) {
        throw new Error(`No RDAP server known for IP: ${ip}`);
    }

    const serverUrl = rdapServer.endsWith('/') ? rdapServer : rdapServer + '/';
    const url = `${serverUrl}ip/${ip}`;
    
    console.log(`Querying RDAP for IP: ${ip} on server: ${serverUrl}`);

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/rdap+json'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Resource not found');
        }
        throw new Error(`RDAP query failed with status: ${response.status}`);
    }

    return await response.json();
}

export async function queryRDAPASN(asn: string, serverKey: string): Promise<any> {
    const rdapServer = TLDToRdapServer[serverKey];
    if (!rdapServer) {
        throw new Error(`No RDAP server known for ASN: ${asn}`);
    }

    const serverUrl = rdapServer.endsWith('/') ? rdapServer : rdapServer + '/';
    const url = `${serverUrl}autnum/${asn}`;

    console.log(`Querying RDAP for ASN: ${asn} on server: ${serverUrl}`);

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/rdap+json'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Resource not found');
        }
        throw new Error(`RDAP query failed with status: ${response.status}`);
    }

    return await response.json();
}
