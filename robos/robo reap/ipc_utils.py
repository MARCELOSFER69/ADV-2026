import json
import time
import os
import shutil

BUFFER_FILE = "buffer_bot2.json"
LOCK_FILE = "buffer_bot2.lock"

def aquirir_lock(timeout=5):
    start = time.time()
    while time.time() - start < timeout:
        if not os.path.exists(LOCK_FILE):
            try:
                with open(LOCK_FILE, 'w') as f:
                    f.write("LOCKED")
                return True
            except:
                pass
        time.sleep(0.1)
    return False

def liberar_lock():
    if os.path.exists(LOCK_FILE):
        try:
            os.remove(LOCK_FILE)
        except:
            pass

def escrever_resultado_ipc(resultado):
    """
    Adiciona um resultado à lista no arquivo JSON (modo append safe).
    Usado pelo Bot Escravo.
    """
    if aquirir_lock():
        try:
            dados = []
            if os.path.exists(BUFFER_FILE):
                try:
                    with open(BUFFER_FILE, 'r', encoding='utf-8') as f:
                        dados = json.load(f)
                except:
                    dados = []
            
            dados.append(resultado)
            
            with open(BUFFER_FILE, 'w', encoding='utf-8') as f:
                json.dump(dados, f, indent=4, ensure_ascii=False)
        finally:
            liberar_lock()

def ler_e_limpar_ipc():
    """
    Lê todos os resultados pendentes e limpa o arquivo.
    Usado pelo Bot Mestre.
    """
    dados = []
    if not os.path.exists(BUFFER_FILE):
        return []

    if aquirir_lock():
        try:
            try:
                with open(BUFFER_FILE, 'r', encoding='utf-8') as f:
                    dados = json.load(f)
            except:
                return []
            
            # Limpa o arquivo (escreve lista vazia ou remove)
            # Vamos deixar vazio para manter estrutura
            with open(BUFFER_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
                
            return dados
        finally:
            liberar_lock()
    return []

def limpar_ambiente_ipc():
    """Remove arquivos de lock e buffer antigos na inicialização"""
    if os.path.exists(LOCK_FILE): os.remove(LOCK_FILE)
    if os.path.exists(BUFFER_FILE): os.remove(BUFFER_FILE)
