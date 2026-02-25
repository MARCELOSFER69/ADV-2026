import React, { useState } from 'react';
import { MapPin, Search, Navigation, Copy, CheckCircle2, Loader2, Info, Building2 } from 'lucide-react';
import { fetchAddressByCep, fetchCepByAddress, fetchCitiesByUf, ViaCepResponse } from '../../services/cepService';
import { motion, AnimatePresence } from 'framer-motion';

const UF_LIST = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CepFacil: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cep_to_addr' | 'addr_to_cep'>('cep_to_addr');
    const [loading, setLoading] = useState(false);
    const [cep, setCep] = useState('');
    const [addressResult, setAddressResult] = useState<ViaCepResponse | null>(null);

    // Address to CEP state
    const [uf, setUf] = useState('');
    const [city, setCity] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [cities, setCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    const [street, setStreet] = useState('');
    const [streetSuggestions, setStreetSuggestions] = useState<ViaCepResponse[]>([]);
    const [isStreetDropdownOpen, setIsStreetDropdownOpen] = useState(false);
    const [isLoadingStreets, setIsLoadingStreets] = useState(false);

    const [results, setResults] = useState<ViaCepResponse[]>([]);
    const [showToast, setShowToast] = useState(false);

    // Filter cities based on search
    const filteredCities = cities.filter(c =>
        c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .includes(citySearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    ).slice(0, 50);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const handleUfChange = async (newUf: string) => {
        setUf(newUf);
        setCity('');
        setCitySearch('');
        setResults([]);
        setStreet('');
        setStreetSuggestions([]);
        if (newUf) {
            setLoadingCities(true);
            const cityList = await fetchCitiesByUf(newUf);
            setCities(cityList);
            setLoadingCities(false);
        } else {
            setCities([]);
        }
    };

    const handleStreetChange = async (val: string) => {
        setStreet(val);
        if (val.length >= 3 && city && uf) {
            setIsLoadingStreets(true);
            setIsStreetDropdownOpen(true);
            const suggestions = await fetchCepByAddress(uf, city, val);
            setStreetSuggestions(suggestions.slice(0, 10)); // Limit suggestions
            setIsLoadingStreets(false);
        } else {
            setStreetSuggestions([]);
            setIsStreetDropdownOpen(false);
        }
    };

    const searchByCep = async () => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        setLoading(true);
        const result = await fetchAddressByCep(cleanCep);
        setAddressResult(result);
        setLoading(false);
    };

    const searchByAddress = async () => {
        if (!uf || !city) return;

        setLoading(true);

        // Se a rua estiver vazia, tentamos buscar por "Centro" ou termos genéricos 
        // para cidades que tem CEP único.
        const effectiveStreet = street.length >= 3 ? street : "Centro";

        const results = await fetchCepByAddress(uf, city, effectiveStreet);

        // Se buscamos por "Centro" mas a cidade tem CEP único, 
        // o ViaCEP retorna o item com logradouro vazio ou o próprio centro.
        setResults(results);
        setLoading(false);
        setIsStreetDropdownOpen(false);
    };

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-[#09090b]">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <MapPin className="text-amber-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white font-serif">CEP Fácil</h1>
                            <p className="text-zinc-400 text-sm">Descubra CEPs e endereços em segundos</p>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-xl w-fit">
                    <button
                        onClick={() => { setActiveTab('cep_to_addr'); setResults([]); setAddressResult(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'cep_to_addr' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        CEP → Endereço
                    </button>
                    <button
                        onClick={() => { setActiveTab('addr_to_cep'); setResults([]); setAddressResult(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'addr_to_cep' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Endereço → CEP
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left side: Inputs */}
                    <div className="md:col-span-12 space-y-6">
                        <AnimatePresence mode="wait">
                            {activeTab === 'cep_to_addr' ? (
                                <motion.div
                                    key="cep_to_addr"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8"
                                >
                                    <div className="max-w-md mx-auto space-y-6">
                                        <div className="text-center space-y-2 mb-4">
                                            <h3 className="text-lg font-medium text-white">Consulte um CEP</h3>
                                            <p className="text-sm text-zinc-500">Insira os 8 dígitos para ver o endereço completo</p>
                                        </div>

                                        <div className="relative group">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">CEP</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors">
                                                    <Search size={20} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={cep}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').substring(0, 8);
                                                        // Format as 00000-000 for display
                                                        let display = val;
                                                        if (val.length > 5) {
                                                            display = val.substring(0, 5) + '-' + val.substring(5);
                                                        }
                                                        setCep(display);
                                                    }}
                                                    placeholder="00000-000"
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-2xl font-mono text-white focus:border-amber-500/50 outline-none transition-all focus:ring-4 focus:ring-amber-500/5"
                                                    onKeyDown={(e) => e.key === 'Enter' && searchByCep()}
                                                />
                                                {loading && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="text-amber-500 animate-spin" size={24} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={searchByCep}
                                            disabled={loading || cep.replace(/\D/g, '').length !== 8}
                                            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Consultando...' : 'Consultar CEP'}
                                        </button>

                                        {/* Result Display for Reverse Lookup */}
                                        <AnimatePresence>
                                            {addressResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="mt-8 border border-zinc-800 border-t-amber-500/50 rounded-2xl bg-zinc-950 overflow-hidden shadow-2xl"
                                                >
                                                    <div className="p-6 space-y-6">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">Rua / Logradouro</h4>
                                                                <p className="text-lg text-white font-medium">{addressResult.logradouro || '—'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleCopy(`${addressResult.logradouro}, ${addressResult.bairro}, ${addressResult.localidade} - ${addressResult.uf}`)}
                                                                className="p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-lg border border-white/5 transition-colors"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Bairro</h4>
                                                                <p className="text-sm text-zinc-200">{addressResult.bairro || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Cidade / UF</h4>
                                                                <p className="text-sm text-zinc-200">{addressResult.localidade} - {addressResult.uf}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-zinc-900 flex items-center gap-2 text-zinc-500 text-xs italic">
                                                            <Info size={14} />
                                                            <span>Resultado oficial ViaCEP</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="addr_to_cep"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8"
                                >
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        <div className="text-center space-y-2 mb-4">
                                            <h3 className="text-lg font-medium text-white">Localizar CEP pelo Endereço</h3>
                                            <p className="text-sm text-zinc-500">Selecione o estado e a cidade para começar</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">UF</label>
                                                <select
                                                    value={uf}
                                                    onChange={(e) => handleUfChange(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none transition-all appearance-none"
                                                >
                                                    <option value="">UF</option>
                                                    {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3 relative">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Cidade</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={city ? city : citySearch}
                                                        disabled={!uf}
                                                        onFocus={() => setIsCityDropdownOpen(true)}
                                                        onChange={(e) => {
                                                            setCitySearch(e.target.value);
                                                            setCity('');
                                                            setIsCityDropdownOpen(true);
                                                        }}
                                                        placeholder={loadingCities ? "Carregando cidades..." : "Digite para buscar cidade"}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none transition-all disabled:opacity-50"
                                                    />
                                                    {loadingCities && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Loader2 size={16} className="animate-spin text-amber-500" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* City Dropdown */}
                                                <AnimatePresence>
                                                    {isCityDropdownOpen && uf && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setIsCityDropdownOpen(false)} />
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -5 }}
                                                                className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar"
                                                            >
                                                                {filteredCities.length > 0 ? (
                                                                    filteredCities.map(c => (
                                                                        <button
                                                                            key={c}
                                                                            onClick={() => {
                                                                                setCity(c);
                                                                                setCitySearch(c);
                                                                                setIsCityDropdownOpen(false);
                                                                            }}
                                                                            className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white border-b border-white/5 last:border-0 transition-colors"
                                                                        >
                                                                            {c}
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="px-4 py-3 text-sm text-zinc-500">Nenhuma cidade encontrada</div>
                                                                )}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Rua / Logradouro (Opcional)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={street}
                                                    disabled={!city}
                                                    onChange={(e) => handleStreetChange(e.target.value)}
                                                    onFocus={() => street.length >= 3 && setIsStreetDropdownOpen(true)}
                                                    placeholder="Ex: Avenida Paulista (vazio para busca geral)"
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none transition-all disabled:opacity-50"
                                                />
                                                {isLoadingStreets && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <Loader2 size={16} className="animate-spin text-amber-500" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Street Suggestions Dropdown */}
                                            <AnimatePresence>
                                                {isStreetDropdownOpen && streetSuggestions.length > 0 && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setIsStreetDropdownOpen(false)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar"
                                                        >
                                                            {streetSuggestions.map((res, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setStreet(res.logradouro);
                                                                        setIsStreetDropdownOpen(false);
                                                                        setResults([res]);
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-zinc-800 transition-colors group"
                                                                >
                                                                    <p className="text-sm text-white font-medium">{res.logradouro}</p>
                                                                    <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400">{res.bairro} — CEP: {res.cep}</p>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <button
                                            onClick={searchByAddress}
                                            disabled={loading || !uf || !city}
                                            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                                            {loading ? 'Buscando...' : 'Localizar CEPs'}
                                        </button>

                                        {/* Results List */}
                                        <div className="mt-8 space-y-3">
                                            {results.length > 0 && <p className="text-xs text-zinc-500 font-bold uppercase">{results.length} resultados encontrados:</p>}
                                            {results.map((res, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30 hover:bg-amber-500/5 group p-4 rounded-xl flex items-center justify-between transition-all"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-zinc-200">{res.logradouro || '(CEP Geral da Cidade)'}</p>
                                                            <p className="text-[10px] text-zinc-500">{res.bairro || '(Cidade com CEP Único)'} — {res.localidade}/{res.uf}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-lg font-mono font-bold text-white tracking-tight">{res.cep}</span>
                                                        <button
                                                            onClick={() => handleCopy(res.cep)}
                                                            className="p-2 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Copiar CEP"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {!loading && results.length === 0 && uf && city && (
                                                <div className="text-center py-8 text-zinc-600 italic text-sm">Nenhum CEP encontrado. Tente mudar o nome da rua ou buscar em outra cidade.</div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Info Card */}
                <div className="mt-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex gap-4 items-start">
                    <div className="bg-amber-500 text-black rounded-full p-1 mt-0.5">
                        <CheckCircle2 size={16} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-amber-500">Dica de Produtividade</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Use esta ferramenta para validar endereços antes de cadastrar clientes.
                            Basta clicar no ícone de copiar para levar o dado diretamente para a área de transferência.
                            O banco de dados é atualizado em tempo real via ViaCEP.
                        </p>
                    </div>
                </div>
            </div>

            {/* Global Success Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-600 text-white rounded-full font-bold shadow-2xl flex items-center gap-2"
                    >
                        <CheckCircle2 size={20} />
                        Copiado!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CepFacil;
