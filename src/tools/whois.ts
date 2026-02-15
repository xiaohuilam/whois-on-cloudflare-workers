
import { connect } from 'cloudflare:sockets';
import { TLDToWhoisServer } from '../server_lists/whois_servers';

const WHOIS_PORT = 43;
const WHOIS_TIMEOUT = 10000; // 10 seconds

export async function queryWhois(domain: string, tld: string): Promise<string> {
  let whoisServer = TLDToWhoisServer[tld];
  if (!whoisServer) {
    throw new Error(`No WHOIS server known for TLD: ${tld}`);
  }

  // Handle server addresses with ports if any
  let port = WHOIS_PORT;
  if (whoisServer.includes(':')) {
    const parts = whoisServer.split(':');
    whoisServer = parts[0];
    const parsedPort = parseInt(parts[1], 10);
    if (!isNaN(parsedPort)) {
        port = parsedPort;
    }
  }
  
  console.log(`Querying WHOIS for domain: ${domain} with TLD: ${tld} on server: ${whoisServer}:${port}`);

  try {
    const socket = connect({
      hostname: whoisServer,
      port: port,
    });

    const writer = socket.writable.getWriter();
    const encoder = new TextEncoder();
    
    // Write the domain followed by CRLF
    await writer.write(encoder.encode(domain + '\r\n'));
    // We don't close the writer immediately because some servers might expect it open, 
    // but generally we can release the lock.
    writer.releaseLock();
    
    // Read the response
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    let response = '';
    
    // Basic timeout implementation
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('WHOIS query timed out')), WHOIS_TIMEOUT);
    });

    const readLoop = async () => {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            response += decoder.decode(value, { stream: true });
        }
        // Flush remaining characters
        response += decoder.decode();
    };

    await Promise.race([readLoop(), timeoutPromise]);
    
    // Clean up
    socket.close();
    
    return response;

  } catch (error) {
     console.error("WHOIS query failed:", error);
     throw error;
  }
}
