
import { BrasilApiCompany } from '../types';

export const fetchCnpjData = async (cnpj: string): Promise<BrasilApiCompany | null> => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  
  if (cleanCnpj.length !== 14) {
    return null;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    
    if (!response.ok) {
      throw new Error('CNPJ não encontrado');
    }

    const data = await response.json();
    return data as BrasilApiCompany;
  } catch (error) {
    console.error("Erro ao buscar CNPJ:", error);
    return null;
  }
};