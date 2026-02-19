// Utilitários de Data com Fuso Horário de Brasília

// Pega a data de hoje (YYYY-MM-DD) forçando o fuso de Brasília
export const getTodayBrasilia = (): string => {
  const now = new Date();
  // Cria uma data baseada no fuso de SP/Brasília
  const brasiliaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  const year = brasiliaDate.getFullYear();
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Prepara data para salvar no Banco (YYYY-MM-DD)
export const formatDateForDB = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;

  try {
    // Se já for string YYYY-MM-DD, retorna direto
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return null; // Retorna null se data for inválida

    // Adiciona 12h para garantir que caia no meio do dia
    d.setHours(12, 0, 0, 0);
    return d.toISOString().split('T')[0];
  } catch (e) {
    console.error("Erro ao formatar data DB:", e);
    return null;
  }
};

// Formata para exibição (DD/MM/AAAA) de forma SEGURA
export const formatDateDisplay = (dateValue: string | Date | undefined | null): string => {
  if (!dateValue) return '-';

  try {
    let dateStr = '';

    if (dateValue instanceof Date) {
      dateStr = dateValue.toISOString().split('T')[0];
    } else {
      // Garante que é string
      dateStr = String(dateValue).split('T')[0];
    }

    // Previne erro se a string estiver vazia ou inválida
    if (!dateStr || dateStr.length < 10) return '-';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    return dateStr;
  } catch (error) {
    // Em caso de qualquer erro, retorna um traço em vez de travar a tela
    return '-';
  }
};

// Remove informações redundantes de data do título (ex: "(Ref. 2026-02-25)")
export const cleanFinancialTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  // Remove "(Ref. YYYY-MM-DD)" ou variações com espaços
  // Remove "(Ref...)" ou variações
  return title.replace(/\s*\(\s*Ref.*?\)/gi, '').trim();
};