
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export const fetchAddressByCep = async (cep: string): Promise<ViaCepResponse | null> => {
  // Remove caracteres não numéricos
  const cleanCep = cep.replace(/\D/g, '');

  // Validação básica de formato (8 dígitos)
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
};

/**
 * Fetch CEP by address details (State, City, Street)
 */
export const fetchCepByAddress = async (uf: string, city: string, street: string): Promise<ViaCepResponse[]> => {
  if (!uf || !city || street.length < 3) {
    return [];
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`);
    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    console.error("Erro ao buscar endereços pelo logradouro:", error);
    return [];
  }
};

/**
 * Fetch list of cities for a given state (UF) using IBGE API
 */
export const fetchCitiesByUf = async (uf: string): Promise<string[]> => {
  if (!uf) return [];
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((city: any) => city.nome).sort();
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar cidades do IBGE:", error);
    return [];
  }
};