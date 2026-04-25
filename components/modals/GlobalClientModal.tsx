import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { Client, Case } from '../../types';
import ClientDetailsModal from './ClientDetailsModal';
import CaseDetailsModal from './CaseDetailsModal';
import { AnimatePresence } from 'framer-motion';

const GlobalClientModal: React.FC = () => {
    const { clientToView, setClientToView, clientDetailTab } = useApp();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    useEffect(() => {
        if (clientToView) {
            const fetchClient = async () => {
                const { data, error } = await supabase.from('clients').select('*, cases(*)').eq('id', clientToView).single();
                if (data) {
                    setSelectedClient(data as Client);
                }
            };
            fetchClient();
        } else {
            setSelectedClient(null);
        }
    }, [clientToView]);

    const handleCloseClient = () => {
        setClientToView(null);
        setSelectedClient(null);
    };

    return (
        <>
            <AnimatePresence>
                {selectedClient && (
                    <ClientDetailsModal
                        client={selectedClient}
                        onClose={handleCloseClient}
                        onSelectCase={(c) => setSelectedCase(c)}
                        initialTab={(clientDetailTab as any) || 'info'}
                    />
                )}
            </AnimatePresence>
            
            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
                />
            )}
        </>
    );
};

export default GlobalClientModal;
