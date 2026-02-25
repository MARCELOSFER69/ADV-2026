
import React from 'react';
import { Client } from '../../types';

interface DeclaracaoProps {
  client: Client;
}

export const DeclaracaoResidenciaTemplate: React.FC<DeclaracaoProps> = ({ client }) => {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('pt-BR', { month: 'long' });
  const year = today.getFullYear();

  const Field = ({ label, value, width = "w-full" }: { label: string, value?: string, width?: string }) => (
    <div className={`flex items-end gap-2 mb-1 ${width}`}>
      <span className="font-bold whitespace-nowrap text-sm text-black">{label}</span>
      <div className="border-b border-black flex-1 px-2 text-sm font-medium uppercase truncate leading-none text-black">
        {value || ''}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-white text-black p-[20mm] font-serif leading-relaxed text-justify mx-auto">
      
      <div className="flex flex-col items-center mb-8 text-center">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg" 
          alt="Brasão da República" 
          className="w-20 h-20 mb-4 grayscale"
        />
        <h1 className="font-bold text-sm uppercase text-black">Ministério da Agricultura, Pecuária e Abastecimento</h1>
        <h2 className="font-bold text-sm uppercase text-black">Secretaria de Aquicultura e Pesca</h2>
        <h3 className="font-bold text-xl mt-6 uppercase decoration-2 underline underline-offset-4 text-black">Declaração de Residência</h3>
      </div>

      <div className="mb-6">
        <p className="mb-4 text-sm text-black">
          Na falta de documentos próprios, aptos a comprovarem a minha residência e domicílio, eu:
        </p>

        <div className="flex flex-col gap-1 mb-4">
            <Field label="Nome:" value={client.nome_completo} />
            
            <div className="flex w-full gap-4">
                <Field label="Nacionalidade:" value={client.nacionalidade || 'Brasileira'} width="w-1/2" />
                <Field label="Estado Civil:" value={client.estado_civil} width="w-1/2" />
            </div>

            <div className="flex w-full gap-4">
                <Field label="Profissão:" value={client.profissao} width="w-1/2" />
                <Field label="Telefone:" value={client.telefone} width="w-1/2" />
            </div>

            <div className="flex w-full gap-4">
                <Field label="RG nº:" value={client.rg} width="w-1/3" />
                <Field label="Órgão Emissor:" value={client.orgao_emissor} width="w-1/3" />
                <Field label="CPF nº:" value={client.cpf_cnpj} width="w-1/3" />
            </div>
             
             <Field label="E-mail:" value={client.email} />
        </div>

        <p className="mb-4 text-sm mt-6 text-black">
          <strong>Declaro ser residente e domiciliado(a) no endereço:</strong>
        </p>

        <div className="flex flex-col gap-1 mb-6">
            <div className="flex w-full gap-4">
                <Field label="Logradouro:" value={client.endereco} width="w-3/4" />
                <Field label="Número:" value={client.numero_casa} width="w-1/4" />
            </div>
            
            <div className="flex w-full gap-4">
                <Field label="Bairro:" value={client.bairro} width="w-1/3" />
                <Field label="Município:" value={client.cidade} width="w-1/3" />
                <Field label="UF:" value={client.uf} width="w-1/6" />
                <Field label="CEP:" value={client.cep} width="w-1/6" />
            </div>
        </div>

        <div className="text-xs text-justify mb-8 leading-tight border p-4 border-black/30 rounded mt-4">
          <p className="mb-2 text-black">
            Declaro sob responsabilidade civil e penal, que as informações declaradas acima são verdadeiras e que estou ciente que as informações não verídicas declaradas implicarão em penalidades previstas no <strong>Artigo 299 do Código Penal (Falsidade Ideológica)</strong>, além de sanções civis e administrativas cabíveis, conforme dispõe a Lei nº 7.115, de 29 de agosto de 1983.
          </p>
          <p className="italic text-gray-800">
            "Art. 299 - Omitir, em documento público ou particular, declaração que dele devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre fato juridicamente relevante. Pena - reclusão, de um a cinco anos, e multa."
          </p>
        </div>

        <p className="mb-8 text-sm text-black">
          Por ser verdade, assino esta declaração:
        </p>

        <div className="flex justify-end mb-12">
          <div className="text-right text-black">
            {client.cidade || 'Local'}, {day} de {month} de {year}.
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-16">
          <div className="w-2/3 border-t border-black mb-2"></div>
          <div className="font-bold uppercase text-sm text-black">{client.nome_completo}</div>
          <div className="text-xs text-black">Assinatura do Declarante</div>
        </div>

        <div className="border border-black p-4 mt-4 break-inside-avoid">
            <h4 className="text-center font-bold text-xs mb-6 uppercase bg-gray-100 text-black p-1">
                Assinatura a rogo em caso do interessado analfabeto e Testemunhas
            </h4>
            
            <div className="flex gap-8">
                <div className="w-24 h-32 border border-black flex items-center justify-center text-center text-[10px] text-gray-500 shrink-0">
                    POLEGAR<br/>DIREITO
                </div>

                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-end gap-2">
                            <span className="text-xs font-bold w-16 text-black">NOME:</span>
                            <div className="border-b border-black flex-1 h-4"></div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-end gap-2 w-1/2">
                                <span className="text-xs font-bold w-16 text-black">CPF:</span>
                                <div className="border-b border-black flex-1 h-4"></div>
                            </div>
                            <div className="flex items-end gap-2 w-1/2">
                                <span className="text-xs font-bold text-black">ASS:</span>
                                <div className="border-b border-black flex-1 h-4"></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-end gap-2">
                            <span className="text-xs font-bold w-16 text-black">NOME:</span>
                            <div className="border-b border-black flex-1 h-4"></div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-end gap-2 w-1/2">
                                <span className="text-xs font-bold w-16 text-black">CPF:</span>
                                <div className="border-b border-black flex-1 h-4"></div>
                            </div>
                            <div className="flex items-end gap-2 w-1/2">
                                <span className="text-xs font-bold text-black">ASS:</span>
                                <div className="border-b border-black flex-1 h-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
