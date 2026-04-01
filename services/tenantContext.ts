// Global state for Tenant (Sistema Isolado) 
// This avoids having to pass tenant_id from React UI down to every service function.

let globalTenant = 'principal';

export const setGlobalTenant = (tenant: string) => {
    globalTenant = tenant;
};

export const getGlobalTenant = () => {
    return globalTenant;
};
