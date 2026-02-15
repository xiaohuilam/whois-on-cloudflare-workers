
import { TLDToRdapServer } from '../server_lists/rdap_servers';
import { matchCIDR } from '../utils/ip';
import { queryRDAPIP } from '../tools/rdap';
import { parseRDAPIP } from '../utils/rdapParser';

export async function handleIP(ip: string): Promise<Response> {
    // Find the corresponding TLD (server key) from the TLDToRdapServer map
    let serverKey: string | null = null;
    
    // Iterate over keys to find the CIDR containing the IP
    // This can be slow if there are many keys. In a real Worker, 
    // we might want to optimize this lookup (e.g., using a trie or optimized library),
    // but for now linear scan is acceptable given the constraints and typical number of RDAP servers.
    for (const cidr of Object.keys(TLDToRdapServer)) {
        // Skip keys that are not CIDRs (though the map should mostly be CIDRs for IPs)
        if (!cidr.includes('.') && !cidr.includes(':')) continue;
        
        if (matchCIDR(ip, cidr)) {
            serverKey = cidr;
            break;
        }
    }
    
    if (!serverKey) {
        return new Response(JSON.stringify({ error: `No RDAP server known for IP: ${ip}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await queryRDAPIP(ip, serverKey);
        const parsed = parseRDAPIP(result);
        return new Response(JSON.stringify(parsed, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
