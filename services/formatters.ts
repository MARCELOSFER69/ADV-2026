
export const normalizeOnlyNumbers = (value: string | undefined): string => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return String(value).replace(/\D/g, '');
  return value.replace(/\D/g, '');
};

export const formatCPFOrCNPJ = (value: string) => {
  const digits = normalizeOnlyNumbers(value);

  if (digits.length <= 11) {
    // CPF Mask: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    // CNPJ Mask: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

export const formatPhone = (value: string) => {
  const digits = normalizeOnlyNumbers(value);
  
  // (00) 00000-0000
  return digits
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .substring(0, 15); // Limit length
};

export const formatProcessNumber = (value: string) => {
  const digits = normalizeOnlyNumbers(value);
  
  // Standard CNJ: 0000000-00.0000.0.00.0000 (20 digits)
  // Masking progressively
  return digits
    .replace(/^(\d{7})(\d)/, '$1-$2')
    .replace(/-(\d{2})(\d)/, '-$1.$2')
    .replace(/\.(\d{4})(\d)/, '.$1.$2')
    .replace(/\.(\d{1})(\d)/, '.$1.$2') // The single digit usually tribunal branch
    .replace(/\.(\d{2})(\d)/, '.$1.$2') // The last 4 digits
    .substring(0, 25);
};

export const formatCurrencyInput = (value: string): string => {
  let digits = normalizeOnlyNumbers(value);
  if (!digits) return '';
  
  // Convert to cents and then to float
  const amount = parseFloat(digits) / 100;
  
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const parseCurrencyToNumber = (formattedValue: string): number => {
  const digits = normalizeOnlyNumbers(formattedValue);
  if (!digits) return 0;
  return parseFloat(digits) / 100;
};