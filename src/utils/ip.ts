
import { Address4, Address6 } from 'ip-address';

export function isIP(resource: string): boolean {
    try {
        return Address4.isValid(resource) || Address6.isValid(resource);
    } catch {
        return false;
    }
}

export function matchCIDR(ip: string, cidr: string): boolean {
    try {
        if (cidr.includes(':')) {
            // IPv6
            if (!Address6.isValid(ip)) return false;
            const addr = new Address6(ip);
            const range = new Address6(cidr);
            return addr.isInSubnet(range);
        } else {
            // IPv4
            if (!Address4.isValid(ip)) return false;
            const addr = new Address4(ip);
            const range = new Address4(cidr);
            return addr.isInSubnet(range);
        }
    } catch (e) {
        return false;
    }
}
