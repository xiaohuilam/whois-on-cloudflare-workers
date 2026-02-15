
import { TLDToRdapServer } from '../server_lists/rdap_servers';
import { queryRDAPASN } from '../tools/rdap';
import { parseRDAPASN } from '../utils/rdapParser';

export async function handleASN(resource: string): Promise<Response> {
    // Parse ASN: "asn12345" -> 12345 or "as12345" -> 12345
    let asnStr = resource.toLowerCase();
    if (asnStr.startsWith('asn')) {
        asnStr = asnStr.substring(3);
    } else if (asnStr.startsWith('as')) {
        asnStr = asnStr.substring(2);
    }
    
    const asnInt = parseInt(asnStr, 10);
    if (isNaN(asnInt)) {
        return new Response(JSON.stringify({ error: 'Invalid ASN format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Find the corresponding range in TLDToRdapServer
    let serverKey: string | null = null;
    
    for (const rangeStr of Object.keys(TLDToRdapServer)) {
        if (!rangeStr.includes('-')) continue;
        
        const parts = rangeStr.split('-');
        if (parts.length !== 2) continue;
        
        const lower = parseInt(parts[0], 10);
        const upper = parseInt(parts[1], 10);
        
        if (!isNaN(lower) && !isNaN(upper) && asnInt >= lower && asnInt <= upper) {
            serverKey = rangeStr;
            break;
        }
    }
    
    if (!serverKey) {
         // Fallback: some RDAP servers might not be in ranges but just handled by a default registry?
         // For now, if not found, we return error.
        return new Response(JSON.stringify({ error: `No RDAP server known for ASN: ${asnInt}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await queryRDAPASN(asnInt.toString(), serverKey);
        const parsed = parseRDAPASN(result);
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
