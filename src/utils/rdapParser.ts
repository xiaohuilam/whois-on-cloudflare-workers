
export interface DomainInfo {
    "Domain Name": string;
    "Registrar": string;
    "Registrar IANA ID": string;
    "Domain Status": string[];
    "Creation Date": string;
    "Registry Expiry Date": string;
    "Updated Date": string;
    "Name Server": string[];
    "DNSSEC": string;
    "DNSSEC DS Data": string[] | null;
    "Last Update of Database": string;
}

export interface IPInfo {
    "IP": string;
    "Range": string;
    "Net Name": string;
    "CIDR": string;
    "Network Type": string;
    "Country": string;
    "IP Status": string[];
    "Creation Date": string;
    "Updated Date": string;
    "Remarks": Remark[];
}

export interface ASNInfo {
    "ASN": string;
    "ASN Name": string;
    "ASN Status": string[];
    "Creation Date": string;
    "Updated Date": string;
    "Remarks": Remark[];
}

export interface Remark {
    "Title": string;
    "Description": string[];
}

export function parseRDAPDomain(result: any): DomainInfo {
    const info: DomainInfo = {
        "Domain Name": "",
        "Registrar": "",
        "Registrar IANA ID": "",
        "Domain Status": [],
        "Creation Date": "",
        "Registry Expiry Date": "",
        "Updated Date": "",
        "Name Server": [],
        "DNSSEC": "unsigned",
        "DNSSEC DS Data": null,
        "Last Update of Database": ""
    };

    if (result.ldhName) info["Domain Name"] = result.ldhName;
    if (result.status) info["Domain Status"] = result.status;

    if (result.entities) {
        for (const entity of result.entities) {
            if (entity.roles && entity.roles.includes('registrar')) {
                if (entity.vcardArray && entity.vcardArray.length > 1) {
                    const vcard = entity.vcardArray[1];
                    for (const item of vcard) {
                        if (item[0] === 'fn' && item.length > 3) {
                            info["Registrar"] = item[3];
                        }
                    }
                }
                if (entity.publicIds && entity.publicIds.length > 0) {
                    info["Registrar IANA ID"] = entity.publicIds[0].identifier;
                }
            }
        }
    }

    if (result.events) {
        for (const event of result.events) {
            switch (event.eventAction) {
                case 'registration':
                    info["Creation Date"] = event.eventDate;
                    break;
                case 'expiration':
                    info["Registry Expiry Date"] = event.eventDate;
                    break;
                case 'last changed':
                    info["Updated Date"] = event.eventDate;
                    break;
                case 'last update of RDAP database':
                    info["Last Update of Database"] = event.eventDate;
                    break;
            }
        }
    }

    if (result.nameservers) {
        info["Name Server"] = result.nameservers.map((ns: any) => ns.ldhName);
    }

    if (result.secureDNS) {
        if (result.secureDNS.delegationSigned) {
            info["DNSSEC"] = "signedDelegation";
        }
        if (result.secureDNS.dsData) {
            info["DNSSEC DS Data"] = result.secureDNS.dsData.map((ds: any) => 
                `${ds.keyTag} ${ds.algorithm} ${ds.digestType} ${ds.digest}`
            );
        }
    }

    return info;
}

export function parseRDAPIP(result: any): IPInfo {
    const info: IPInfo = {
        "IP": "",
        "Range": "",
        "Net Name": "",
        "CIDR": "",
        "Network Type": "Unknown",
        "Country": "",
        "IP Status": [],
        "Creation Date": "",
        "Updated Date": "",
        "Remarks": []
    };

    if (result.handle) info["IP"] = result.handle;
    
    if (result.startAddress) info["Range"] = result.startAddress;
    if (result.endAddress) info["Range"] += " - " + result.endAddress;
    
    if (result.name) info["Net Name"] = result.name;
    
    if (result.cidr0_cidrs) {
        for (const cidr of result.cidr0_cidrs) {
            if (cidr.v4prefix) {
                info["CIDR"] = `${cidr.v4prefix}/${cidr.length}`;
            } else if (cidr.v6prefix) {
                info["CIDR"] = `${cidr.v6prefix}/${cidr.length}`;
            }
        }
    }
    
    if (result.type) info["Network Type"] = result.type;
    if (result.country) info["Country"] = result.country;
    if (result.status) info["IP Status"] = result.status;

    if (result.events) {
        for (const event of result.events) {
            switch (event.eventAction) {
                case 'registration':
                    info["Creation Date"] = event.eventDate;
                    break;
                case 'last changed':
                    info["Updated Date"] = event.eventDate;
                    break;
            }
        }
    }

    if (result.remarks) {
        for (const remark of result.remarks) {
            const newRemark: Remark = { "Title": "", "Description": [] };
            if (remark.title) newRemark["Title"] = remark.title;
            if (remark.description) newRemark["Description"] = remark.description;
            info["Remarks"].push(newRemark);
        }
    }

    return info;
}

export function parseRDAPASN(result: any): ASNInfo {
    const info: ASNInfo = {
        "ASN": "",
        "ASN Name": "",
        "ASN Status": [],
        "Creation Date": "",
        "Updated Date": "",
        "Remarks": []
    };

    if (result.handle) info["ASN"] = result.handle;
    if (result.name) info["ASN Name"] = result.name;
    if (result.status) info["ASN Status"] = result.status;

    if (result.events) {
        for (const event of result.events) {
            switch (event.eventAction) {
                case 'registration':
                    info["Creation Date"] = event.eventDate;
                    break;
                case 'last changed':
                    info["Updated Date"] = event.eventDate;
                    break;
            }
        }
    }

    if (result.remarks) {
        for (const remark of result.remarks) {
            const newRemark: Remark = { "Title": "", "Description": [] };
            if (remark.title) newRemark["Title"] = remark.title;
            if (remark.description) newRemark["Description"] = remark.description;
            info["Remarks"].push(newRemark);
        }
    }

    return info;
}
