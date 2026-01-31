import re, os, time, threading, json, sys, winreg, requests
# Forçar UTF-8 no Windows para evitar erro de 'charmap' ao imprimir caracteres especiais
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass # Python < 3.7 não suporta reconfigure, mas improvável aqui

import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from tkinter import messagebox, Tk, Button, Toplevel, Label
import undetected_chromedriver as uc

# ==============================================================================
# CONFIGURAÇÃO GLOBAL
# ==============================================================================
def enviar_para_erp(case_number, status_text, raw_data_json=None):
    """
    Envia atualização de status para o Webhook do ERP.
    """
    url = "http://localhost:3000/api/webhook/bot-update"
    payload = {
        "case_number": case_number,
        "status_text": status_text,
        "raw_data_json": raw_data_json
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        print(f"   [WEBHOOK] Sucesso: {case_number} -> {status_text}")
    except Exception as e:
        print(f"   [WEBHOOK] Erro ao enviar para ERP ({case_number}): {e}")

COR_TEMA = "#2c3e50"
ROBO_PARADO = False

class FloatingStopWindow:
    def __init__(self, master, x=10, y=10, cor="#e74c3c"):
        self.master = master
        self.cor = cor
        self.x = x
        self.y = y
        self.window = Toplevel(master)
        self.window.title("STOP-CONSULTA")
        self.window.attributes("-topmost", True)
        self.window.geometry(f"150x60+{self.x}+{self.y}")
        self.window.overrideredirect(True)
        self.window.configure(bg=self.cor)

        lbl = Label(self.window, text="CONSULTA ATIVA", fg="white", bg=self.cor, font=("Arial", 8, "bold"))
        lbl.pack(pady=2)

        btn = Button(self.window, text="🛑 PARAR", bg="#c0392b", fg="white", font=("Arial", 10, "bold"),
                    command=self.parar, relief="raised", bd=2)
        btn.pack(expand=True, fill="both", padx=5, pady=2)

    def parar(self):
        global ROBO_PARADO
        if messagebox.askyesno("Confirmar", "Deseja parar a consulta?"):
            ROBO_PARADO = True

    def fechar(self):
        if self.window:
            self.window.destroy()

def obter_versao_chrome():
    """
    Detecta a versão principal do Chrome instalada no Windows via Registro.
    """
    try:
        reg_path = r"Software\Google\Chrome\BLBeacon"
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path)
        version, _ = winreg.QueryValueEx(key, "version")
        winreg.CloseKey(key)
        return int(version.split('.')[0])
    except Exception as e:
        print(f"⚠️ Erro ao detectar versão do Chrome: {e}")
        return None

def carregar_zoom(driver, scale=0.80):
    try:
        zoom_pct = int(scale * 100)
        driver.execute_script(f"document.body.style.zoom = '{zoom_pct}%';")
    except: pass

def extrair_dados_pescador(driver, cpf_limpo):
    """
    Extrai dados detalhados usando Estratégia Híbrida:
    1. Tenta XPaths específicos (Mapeamento baseado em prints do usuário - Jan/2026).
    2. Se falhar, usa Regex no texto completo (Fallback).
    """
    resultado = {
        "MUNICIPIO": "Não encontrado",
        "SITUACAO_RGP": "Não encontrado",
        "DATA_PRIMEIRO_RGP": "Não encontrado",
        "LOCAL_DE_EXERCICIO": "Não encontrado",
        "NUMERO_RGP": f"MAPA{cpf_limpo}" # Valor Default com 'MAPA'
    }

    page_text = ""
    try:
        # Espera container de resultado aparecer
        # ATUALIZADO: Inclui 'result-card' e 'td.municipio' e headers genéricos para evitar Timeout se o layout mudar
        print("🕐 Aguardando carregamento da tabela de resultados...")
        WebDriverWait(driver, 15).until(
            lambda d: d.find_elements(By.CLASS_NAME, "br-card") or 
                      d.find_elements(By.CLASS_NAME, "result-card") or 
                      d.find_elements(By.CSS_SELECTOR, "td.municipio") or
                      d.find_elements(By.XPATH, "//*[contains(text(), 'Resultado da consulta')]")
        )
        print("✅ Container de resultado detectado.")
        
        # --- TENTATIVA 1: Mapeamento Original (XPaths) ---
        try:
            # 1. Município (td.municipio > span)
            try:
                # O print mostra: <td class="text-center municipio ..."><span ...><span>Santa Inês</span></span></td>
                # Então pegamos o span mais interno ou o texto do td
                elems = driver.find_elements(By.CSS_SELECTOR, "td.municipio span")
                for e in elems:
                    txt = e.text.strip()
                    if txt: 
                        resultado["MUNICIPIO"] = txt
                        break
            except: pass

            # 2. Situação do RGP (Print 1: <p ...>Situação do RGP:</p> <span class="text-medium ...">Ativo</span>)
            try:
                # XPath: Procura o <p> que contem "Situação do RGP" e pega o irmão seguinte (span) ou filho se for aninhado
                # No print parece ser irmão: <p>Situação...</p> <span>Ativo</span> 
                # Mas as vezes pode estar dentro. Vamos tentar sibling primeiro.
                # Ajuste: No print user mostrou tooltip no span irmao.
                xpath_situacao = "//p[contains(text(), 'Situação do RGP:')]/following-sibling::span | //p[contains(., 'Situação do RGP:')]/span"
                elem = driver.find_element(By.XPATH, xpath_situacao)
                if elem and elem.text.strip(): resultado["SITUACAO_RGP"] = elem.text.strip()
            except: pass

            # 3. Data 1º RGP (Print: <p>Data do 1º RGP</p> <span>20/10/2020</span>)
            try:
                # Prioridade: XPath exato do print
                xpath_data_print = "//p[contains(text(), 'Data do 1º RGP')]/following-sibling::span"
                elem = driver.find_element(By.XPATH, xpath_data_print)
                if elem and elem.text.strip(): 
                    resultado["DATA_PRIMEIRO_RGP"] = elem.text.strip()
            except:
                # Fallback genérico
                try:
                    xpath_data = "//p[contains(., 'Data') and contains(., 'RGP')]/following-sibling::span"
                    elem = driver.find_element(By.XPATH, xpath_data)
                    if elem and elem.text.strip(): resultado["DATA_PRIMEIRO_RGP"] = elem.text.strip()
                except: pass

            # 4. Local de Exercício / Local de Pesca (Print: td.localPesca > span > span > Rio)
            try:
                # Prioridade: Deep selector para pegar "Rio", "Lago" etc
                elems = driver.find_elements(By.CSS_SELECTOR, "td.localPesca span span")
                for e in elems:
                    txt = e.text.strip()
                    if txt: 
                        resultado["LOCAL_DE_EXERCICIO"] = txt
                        break
                
                # Se falhar, tenta o span direto
                if resultado["LOCAL_DE_EXERCICIO"] == "Não encontrado":
                    elems = driver.find_elements(By.CSS_SELECTOR, "td.localPesca span")
                    for e in elems:
                        txt = e.text.strip()
                        if txt: 
                            resultado["LOCAL_DE_EXERCICIO"] = txt
                            break
            except: pass
            
        except Exception as e:
            print(f"⚠️ Tentativa via XPath falhou parcialmente: {e}")

        # --- TENTATIVA 2: Fallback via Regex (Se algum dado faltar) ---
        # Só ativa regex se faltar dados essenciais
        if "Não encontrado" in [resultado["MUNICIPIO"], resultado["SITUACAO_RGP"], resultado["LOCAL_DE_EXERCICIO"], resultado["DATA_PRIMEIRO_RGP"]]:
            print("🔄 Dados incompletos via XPath. Tentando extração via Texto/Regex...")
            try:
                page_text = driver.find_element(By.TAG_NAME, "body").text
                print(f"📝 Texto extraído da página (início): {page_text[:100]}...")
                
                def find_value(patterns, text):
                    for pattern in patterns:
                        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                        if match: return match.group(1).split('\n')[0].strip()
                    return None

                if resultado["SITUACAO_RGP"] == "Não encontrado":
                    val = find_value([r"Situação do RGP:?\s*(.*)", r"Situação:?\s*(.*)", r"Situação do RGP\s*\n\s*(.*)"], page_text)
                    if val: resultado["SITUACAO_RGP"] = val

                if resultado["MUNICIPIO"] == "Não encontrado":
                    val = find_value([r"Município do pescador\(?a?\):?\s*(.*)", r"Município:?\s*(.*)", r"Município\s*\n\s*(.*)"], page_text)
                    if val: resultado["MUNICIPIO"] = val

                if resultado["DATA_PRIMEIRO_RGP"] == "Não encontrado":
                     # Regex ULTRA flexivel: Procura por "Data" seguido de qualquer coisa e uma data DD/MM/AAAA
                    val = find_value([
                        r"Data.*?RGP.*?((\d{2}/\d{2}/\d{4}))",
                        r"Data.*?1.*?((\d{2}/\d{2}/\d{4}))",
                        r"Data.*?(\d{2}/\d{2}/\d{4})",   # Apenas Data... seguido de valor
                        r"(\d{2}/\d{2}/\d{4})"           # Desespero: Primeira data encontrada
                    ], page_text)
                    
                    if val: 
                        # Limpa o resultado para pegar só a data se vier sujo
                        match_data = re.search(r"(\d{2}/\d{2}/\d{4})", val)
                        if match_data: 
                            resultado["DATA_PRIMEIRO_RGP"] = match_data.group(1)
                            print(f"🔎 Data encontrada via REGEX AGRESSIVO: {resultado['DATA_PRIMEIRO_RGP']}")
                
                if resultado["LOCAL_DE_EXERCICIO"] == "Não encontrado":
                    # Tenta achar algo na tabela ou proximo de 'Local de pesca' -> aceita quebras de linha
                    # Tenta tbm 'Local de atuação', 'Município' (se municipio falhou antes), etc
                    val = find_value([
                        r"Local de pesca:?\s*(.*)", 
                        r"Local de exercício:?\s*(.*)", 
                        r"Local de pesca\s*\n\s*(.*)",
                        r"Local de atuação\s*\n\s*(.*)",
                        r"Município.*?\n(.*)" # Tenta pegar linha abaixo de Municipio se for tabela celular
                    ], page_text)
                    if val: 
                         # Limpa lixo
                         cleaned = val.strip().replace(":", "").replace("_", "")
                         if len(cleaned) > 2 and len(cleaned) < 50 and "Nº" not in cleaned and "Data" not in cleaned:
                             resultado["LOCAL_DE_EXERCICIO"] = cleaned
                             print(f"🔎 Local encontrado via REGEX AGRESSIVO: {resultado['LOCAL_DE_EXERCICIO']}")

            except Exception as ex:
                print(f"⚠️ Erro no fallback Regex: {ex}")

        # --- FALLBACK FINAL: Se Local de Exercício falhou, usa Município ---
        if resultado["LOCAL_DE_EXERCICIO"] == "Não encontrado" and resultado["MUNICIPIO"] != "Não encontrado":
            print(f"🔄 Usando Município ({resultado['MUNICIPIO']}) como Local de Exercício (Fallback)")
            resultado["LOCAL_DE_EXERCICIO"] = resultado["MUNICIPIO"]

        # 5. Número RGP (Do Título) - Mantendo MAPA
        try:
            # Procura em qualquer header ou div relevante
            titulo_elems = driver.find_elements(By.XPATH, "//*[contains(text(), 'Resultado da consulta')]")
            for elem in titulo_elems:
                txt = elem.text
                if "Nº do RGP" in txt:
                    match = re.search(r'Nº do RGP\s+(.+)', txt)
                    if match:
                        raw_rgp = match.group(1).replace("'", "").replace('"', "").strip()
                        # Garante que começa com MAPA
                        if not raw_rgp.upper().startswith("MAPA"):
                            final_rgp = f"MAPA{raw_rgp}"
                        else:
                            final_rgp = raw_rgp.upper()
                        
                        # Validação: Se tiver asteriscos (mascarado) ou for invalido, ignorar e usar o do CPF
                        if "*" in final_rgp or "MAPA___" in final_rgp:
                             print(f"⚠️ RGP Extraído está mascarado ({final_rgp}). Usando padrão MAPA+CPF.")
                             resultado["NUMERO_RGP"] = f"MAPA{cpf_limpo}"
                        else:
                             resultado["NUMERO_RGP"] = final_rgp
                        
                        break # Achou, para
        except: 
            pass # Mantém o default que já é MAPA+CPF

    except Exception as e:
        import traceback
        print(f"⚠️ Erro parcial na extração: {e}")
        traceback.print_exc()
    
    # Debug: Salva HTML se falhar na extração de dados críticos
    if resultado["MUNICIPIO"] == "Não encontrado":
        try:
            timestamp = int(time.time())
            print(f"📸 Salvando HTML de debug em debug_extraction_fail_{timestamp}.html")
            with open(f"debug_extraction_fail_{timestamp}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
        except: pass

    return resultado

def consultar_unico_cpf(cpf_limpo, headless=True):
    """
    Versão simplificada para ser chamada via CLI/Bot, retornando JSON.
    """
    options = uc.ChromeOptions()
    if headless:
        options.add_argument("--headless=new") 
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    
    driver = None
    try:
        versao_chrome = obter_versao_chrome()
        if versao_chrome:
            driver = uc.Chrome(options=options, version_main=versao_chrome)
        else:
            driver = uc.Chrome(options=options)
        
        driver.get("https://pesqbrasil-pescadorprofissional.mpa.gov.br/consulta")
        
        # Preenche CPF
        print(f"⌨️ Preenchendo CPF: {cpf_limpo}")
        campo_cpf = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.NAME, "cpf")))
        campo_cpf.click()
        campo_cpf.send_keys(cpf_limpo)
        time.sleep(0.5)
        
        # Clica em Consultar
        print("🖱️ Clicando em Consultar...")
        btn_consultar = driver.find_element(By.XPATH, "//button[contains(., 'Consultar')]")
        driver.execute_script("arguments[0].click();", btn_consultar)
        
        # Espera INTELIGENTE pelo resultado ou erro
        # Monitora o aparecimento de um card de resultado OU mensagem de erro
        # Espera INTELIGENTE pelo resultado ou erro
        # Monitora: Mensagem de erro, Título de resultado, OU a tabela com dados (td.municipio)
        try:
            WebDriverWait(driver, 60).until(
                lambda d: d.find_elements(By.XPATH, "//div[contains(@class, 'br-message') and contains(@class, 'danger')]") or 
                          d.find_elements(By.XPATH, "//h2[contains(text(), 'Resultado da consulta')]") or
                          d.find_elements(By.CSS_SELECTOR, "td.municipio") or
                          d.find_elements(By.CLASS_NAME, "br-card")
            )
        except:
            timestamp = int(time.time())
            driver.save_screenshot(f"erro_timeout_{timestamp}.png")
            return {"success": False, "error": f"Tempo limite excedido (60s). Screenshot salvo em erro_timeout_{timestamp}.png"}
        
        # Checa erro primeiro
        erros = driver.find_elements(By.XPATH, "//div[contains(@class, 'br-message') and contains(@class, 'danger')]")
        if erros:
            print(f"❌ Erro na tela: {erros[0].text}")
            return {"success": False, "error": erros[0].text.strip()}
        
        # Se não tem erro, extrai dados
        dados = extrair_dados_pescador(driver, cpf_limpo)
        return {"success": True, "data": dados}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if driver:
            try: 
                driver.quit()
            except OSError: 
                pass # Ignora erro de processo zumbi no Windows
            except Exception:
                pass

if __name__ == "__main__":
    import sys
    
    # Se houver argumentos, entra no modo CLI (sem interface gráfica)
    if len(sys.argv) > 1:
        import argparse
        parser = argparse.ArgumentParser(description="Consulta RGP CLI")
        parser.add_argument("--cpf", type=str, help="CPF para consulta")
        parser.add_argument("--headless", action="store_true", help="Rodar sem abrir o navegador", default=False)
        args = parser.parse_args()
        
        if args.cpf:
            cpf_limpo = re.sub(r'\D', '', args.cpf)
            resultado = consultar_unico_cpf(cpf_limpo, headless=args.headless)
            
            # Webhook Integration
            status_text = "OK" if resultado.get("success") else f"ERRO: {resultado.get('error')}"
            enviar_para_erp(cpf_limpo, status_text, resultado)
            
            print(json.dumps(resultado))
            sys.exit(0)
    
    # Caso contrário, inicia a interface gráfica original
    import tkinter as tk
    from tkinter import filedialog
    
    root = tk.Tk()
    root.withdraw()
    
    # Seleciona o arquivo
    caminho = filedialog.askopenfilename(title="Selecione a planilha", filetypes=[("Excel files", "*.xlsx")])
    if caminho:
        threading.Thread(target=processar_consulta, args=(caminho, root), daemon=True).start()
        root.mainloop()
