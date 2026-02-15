
import { handleIP } from './handlers/ip';
import { handleASN } from './handlers/asn';
import { handleDomain } from './handlers/domain';
import { isIP } from './utils/ip';

function isASN(resource: string): boolean {
    return /^asn?\d+$/i.test(resource);
}

function isDomain(resource: string): boolean {
    // Basic domain regex, similar to Go's but JS flavor
    return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(resource);
}

export default {
    async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        let resource = url.pathname.slice(1); // Remove leading slash
        
        if (!resource) {
            return new Response('Usage: /<domain|ip|asn>', { status: 400 });
        }

        // --- Cache Logic Start ---
        // Construct a cache key from the request URL
        const cacheUrl = new URL(request.url);
        // Ensure the cache key is consistent
        const cacheKey = new Request(cacheUrl.toString(), request);
        
        // @ts-ignore
        const cache = caches.default;
        let response = await cache.match(cacheKey);

        if (response) {
            console.log(`Cache hit for: ${resource}`);
            return response;
        }
        // --- Cache Logic End ---
        
        // Basic normalization
        resource = resource.toLowerCase();

        // Health check endpoints (Don't cache or short cache?)
        // Let's not cache health checks for now or maybe it doesn't matter much.
        if (resource === 'health' || resource === 'ready' || resource === 'info') {
             return new Response('OK', { status: 200 });
        }

        let resultResponse: Response;

        if (isIP(resource)) {
            resultResponse = await handleIP(resource);
        } else if (isASN(resource)) {
            resultResponse = await handleASN(resource);
        } else {
             // Treat as domain if it looks like one, or try anyway
             if (resource.includes('.') || isDomain(resource)) {
                 resultResponse = await handleDomain(resource);
             } else {
                 resultResponse = new Response('Invalid input. Please provide a valid domain, IP, or ASN.', { status: 400 });
             }
        }

        // --- Cache Save Logic ---
        // Only cache successful responses (200 OK)
        if (resultResponse.status === 200) {
            // Create a new response with Cache-Control header
            // We must recreate the response because the original might be immutable or we want to ensure headers
            const newHeaders = new Headers(resultResponse.headers);
            newHeaders.set('Cache-Control', 'public, max-age=300, s-maxage=300');
            
            response = new Response(resultResponse.body, {
                status: resultResponse.status,
                statusText: resultResponse.statusText,
                headers: newHeaders
            });

            // Put into cache
            // Note: waitUntil is useful to not block the response
            ctx.waitUntil(cache.put(cacheKey, response.clone()));
            
            return response;
        }

        return resultResponse;
    }
};
