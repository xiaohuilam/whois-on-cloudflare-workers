
import { TLDToRdapServer } from '../server_lists/rdap_servers';
import { TLDToWhoisServer } from '../server_lists/whois_servers';
import { queryRDAP } from '../tools/rdap';
import { queryWhois } from '../tools/whois';
import { parseRDAPDomain } from '../utils/rdapParser';
import { whoisParsers } from '../utils/whoisParser';

// Note: In a worker environment, we can't easily use 'publicsuffix' package without bundling.
// But we can implement a basic TLD extraction or use a simpler approach.
// The Go code uses publicsuffix.
// For now, we'll just take the last part of the domain, or handle multipart TLDs if possible.
// A robust implementation would need the PSL.
// Given the constraints, I will implement a simple right-to-left TLD extractor, 
// but note that this is imperfect (e.g. co.uk).
// However, since we have the keys in our maps, we can try to match the longest suffix against our keys!

function getTLD(domain: string): string {
    const parts = domain.split('.');
    // Try to find the longest matching suffix in our maps
    for (let i = 0; i < parts.length; i++) {
        const suffix = parts.slice(i).join('.');
        if (TLDToRdapServer[suffix] || TLDToWhoisServer[suffix]) {
            return suffix;
        }
    }
    // Fallback to the last part
    return parts[parts.length - 1];
}

export async function handleDomain(domain: string): Promise<Response> {
    // Simple IDN to ASCII conversion using built-in URL or manually if needed.
    // Modern browsers/environments handle fetch with unicode domains, but WHOIS (TCP) needs ASCII (Punycode).
    // Cloudflare Workers runtime supports URL and text encoding, but not 'punycode' module directly.
    // However, we can use the `URL` API to handle some normalization, or use a library if installed.
    // For now, assume input is handled or use a library if needed.
    // Ideally we should use 'punycode' userland library.
    
    let asciiDomain = domain;
    try {
         // This is a hacky way to get punycode if not already
         const u = new URL(`http://${domain}`);
         asciiDomain = u.hostname;
    } catch (e) {
        // invalid domain
    }

    const tld = getTLD(asciiDomain);
    
    // Check RDAP first
    if (TLDToRdapServer[tld]) {
        try {
            const result = await queryRDAP(asciiDomain, tld);
            const parsed = parseRDAPDomain(result);
            return new Response(JSON.stringify(parsed, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error: any) {
            console.error(`RDAP failed for ${domain}: ${error.message}`);
            // Fallback to WHOIS if RDAP fails? 
            // The Go code: if RDAP server known, query RDAP. If error, return error (it doesn't fallback to WHOIS if RDAP server exists but fails).
            // It only checks WHOIS if RDAP server is NOT known.
             return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // Check WHOIS
    if (TLDToWhoisServer[tld]) {
        try {
            const result = await queryWhois(asciiDomain, tld);
            
            // Check if we have a parser for this TLD
            if (whoisParsers[tld]) {
                try {
                    const parsed = whoisParsers[tld](result, asciiDomain);
                    return new Response(JSON.stringify(parsed, null, 2), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (parseError: any) {
                    console.error(`WHOIS parsing failed for ${domain} (TLD: ${tld}): ${parseError.message}`);
                    // Fallback to raw text if parsing fails? Or return error?
                    // Go code returns error if parsing fails for known parser.
                    // But maybe user prefers raw text over error.
                    // Let's stick to Go behavior: if parser exists but fails, it's an error (or maybe just return raw as fallback if parser fails?)
                    // The Go code: if err != nil { HandleQueryError(w, err); return }
                    // So it returns error.
                    // However, for robustness, if parsing fails, maybe raw text is better than nothing?
                    // Let's return raw text if parsing fails, but logged.
                    // Or follow Go strictly. Go returns error.
                    // Let's return error to be safe/strict, or better yet, return raw text with content-type text/plain so user sees SOMETHING.
                    // But the requirement is "fix to be like original", so maybe strict JSON or error.
                    // Let's try to parse, if fail, return 500.
                     return new Response(JSON.stringify({ error: `Parsing error: ${parseError.message}` }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            return new Response(result, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        } catch (error: any) {
             return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response(JSON.stringify({ error: `No WHOIS or RDAP server known for TLD: ${tld}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}
