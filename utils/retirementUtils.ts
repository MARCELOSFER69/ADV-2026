
export interface RetirementProjection {
    ruralRemaining: number;
    urbanRemaining: number;
    isEligible: boolean;
    isRuralEligible: boolean;
    isUrbanEligible: boolean;
    yearsRemaining: number; // Best chance
    bestChance: 'Rural' | 'Urbana';
    age: { years: number; months: number };
}

export const calculateRetirementProjection = (
    birthDate: string | undefined,
    gender: 'Masculino' | 'Feminino' | string | undefined,
    preferredMode?: 'Rural' | 'Urbana' | 'Híbrida'
): RetirementProjection | null => {
    if (!birthDate || !gender) return null;

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }

    const isMale = gender === 'Masculino';

    const ruralTarget = isMale ? 60 : 55;
    const urbanTarget = isMale ? 65 : 62;

    const ruralRemaining = Math.max(0, ruralTarget - years - (months / 12));
    const urbanRemaining = Math.max(0, urbanTarget - years - (months / 12));

    const isRuralEligible = ruralRemaining <= 0;
    const isUrbanEligible = urbanRemaining <= 0;
    const isEligible = isRuralEligible || isUrbanEligible;

    const calcBestChance = ruralRemaining <= urbanRemaining ? 'Rural' : 'Urbana';
    // Se for Híbrida, usamos Urbana como base (comum em sistemas, ou ajustável conforme regra de negócio)
    // Se preferredMode for undefined, usa a melhor chance.
    const activeMode = (preferredMode === 'Híbrida' ? 'Urbana' : preferredMode) || calcBestChance;
    const yearsRemaining = activeMode === 'Rural' ? ruralRemaining : urbanRemaining;

    return {
        ruralRemaining,
        urbanRemaining,
        isEligible,
        isRuralEligible,
        isUrbanEligible,
        yearsRemaining,
        bestChance: calcBestChance,
        age: { years, months }
    };
};
