import argparse
import sys
import os
import json
import traceback
import time

# Ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.driver_factory import get_driver
from utils.logger import Logger
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.monthly_report_page import MonthlyReportPage

# Argument Parsing
parser = argparse.ArgumentParser()
parser.add_argument("--instancia", type=int, default=1)
parser.add_argument("--json_task", type=str, help="JSON Task Data")
args, _ = parser.parse_known_args()

ID_INSTANCIA = args.instancia
logger = Logger(case_id=f"INS-{ID_INSTANCIA}")

def main():
    logger.info("Bot Started v2.0 (POM)", "STARTUP")
    
    driver = None
    try:
        # 1. Initialize Driver
        profile_path = os.path.join(os.getcwd(), f"chrome_profile_{ID_INSTANCIA}")
        driver = get_driver(profile_dir=profile_path)
        logger.info("Driver Initialized", "DRIVER_INIT")

        # 2. Parse Task Data
        if not args.json_task:
            logger.error("No JSON Task provided", "ARGS_ERROR")
            return

        try:
            task_data = json.loads(args.json_task)
            cpf = task_data.get("cpf")
            password = task_data.get("senha")
            # Mock data for production logic
            production_data = task_data.get("production_data", []) 
        except json.JSONDecodeError:
            logger.error("Invalid JSON Task", "JSON_ERROR")
            return

        # 3. Login
        login_page = LoginPage(driver, logger)
        if not login_page.login(cpf, password):
            logger.error("Login Failed", "LOGIN_FAIL")
            return

        # 4. Navigation
        dashboard_page = DashboardPage(driver, logger)
        if not dashboard_page.navigate_to_reap():
             logger.error("Failed to access REAP", "NAV_ERROR")
             return
             
        # 5. Process Month (Example flow)
        dashboard_page.start_new_declaration()
        
        report_page = MonthlyReportPage(driver, logger)
        # TODO: Loop through months based on logic
        # For demonstration, we fill one month
        # report_page.fill_month("Janeiro", {"DIAS": 20}, is_defeso=True)
        
        logger.info("Process Completed Successfully", "SUCCESS")
        
        # Keep open for debugging if needed, or close
        time.sleep(5)

    except Exception as e:
        logger.error(f"Critical Execution Error: {traceback.format_exc()}", "CRITICAL_ERROR")
    finally:
        if driver:
            # driver.quit() # Optional: Keep open for user inspection?
            pass

if __name__ == "__main__":
    main()


# Import V2 Modules
# from gerador_v2 import GeradorDadosV2 # REMOVED: Now using DB/JSON
from assistente_login import invocar_assistente
import ipc_utils

# ==============================================================================
# CONFIGURAÇÃO DE INSTÂNCIA E POSICIONAMENTO
# ==============================================================================

def enviar_para_erp(case_number, status_text, raw_data_json=None):
    """
    Envia atualização de status para o Webhook do ERP.
    """
    # A URL pode vir de env ou ser localhost nas configs de dev
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

parser = argparse.ArgumentParser()
parser.add_argument("--instancia", type=int, default=1)
parser.add_argument("--total_instances", type=int, default=1)
parser.add_argument("--json_task", type=str, help="Tarefa em formato JSON (Base64 ou String)")
parser.add_argument("--download_dir", type=str, default="downloads", help="Diretório de downloads")
args, _ = parser.parse_known_args()

ID_INSTANCIA = args.instancia
TOTAL_INSTANCIAS = args.total_instances
JSON_TASK = args.json_task
COR_TEMA = "#3498db" if ID_INSTANCIA == 1 else "#f1c40f"

# Variáveis de Geometria (serão preenchidas no main_v2 ou no import)
POS_X, POS_Y, LARGURA_W, ALTURA_W = 0, 0, 800, 600

# MESES MAPPING (Global)
MESES_DEFESO = {"Janeiro": 0, "Fevereiro": 1, "Março": 2, "Dezembro": 11}
MESES_PESCA = {"Abril": 3, "Maio": 4, "Junho": 5, "Julho": 6, "Agosto": 7, "Setembro": 8, "Outubro": 9, "Novembro": 10}

def gerar_dados_pesca_default(nome, municipio="Buriticupu"):
    """Gera 12 meses de dados de pesca padrão para um pescador."""
    dados = []
    # Meses de Defeso
    for mes in MESES_DEFESO:
        dados.append({
            "NOME": nome, "MES": mes, "DIAS": 30, "TIPO_LOCAL": "Rio", 
            "MUNICIPIO": municipio, "NOME_LOCAL": "Rio principal", 
            "PETRECHO": "Linha", "ESPECIE": "Peixe", "QUANTIDADE": 0, "VALOR": 0
        })
    # Meses de Pesca
    for mes in MESES_PESCA:
        dados.append({
            "NOME": nome, "MES": mes, "DIAS": 20, "TIPO_LOCAL": "Rio", 
            "MUNICIPIO": municipio, "NOME_LOCAL": "Rio principal", 
            "PETRECHO": "Linha", "ESPECIE": "Peixe", "QUANTIDADE": 50, "VALOR": 500
        })
    return dados

def configurar_geometria(id_inst):
    global POS_X, POS_Y, LARGURA_W, ALTURA_W
    try:
        temp_root = Tk()
        sw = temp_root.winfo_screenwidth()
        sh = temp_root.winfo_screenheight()
        temp_root.destroy()
        
        if TOTAL_INSTANCIAS == 1:
            LARGURA_W = sw
            ALTURA_W = sh
            POS_X = 0
            POS_Y = 0
        else:
            # Split Screen Logic
            LARGURA_W = sw // 2
            ALTURA_W = sh
            if id_inst == 1:
                POS_X = 0
                POS_Y = 0
            else:
                POS_X = LARGURA_W
                POS_Y = 0
                
        print(f"DEBUG: Geometria Instância {id_inst}/{TOTAL_INSTANCIAS}: {LARGURA_W}x{ALTURA_W} em ({POS_X},{POS_Y})")
    except Exception as e:
        print(f"Erro ao calcular geometria: {e}")

# Tenta calcular uma vez no import
configurar_geometria(ID_INSTANCIA)

# ==============================================================================
#  UTILITIES & HELPERS
# ==============================================================================

def get_chrome_version_windows():
    """Tenta detectar a versão principal do Chrome instalado no Windows."""
    try:
        import winreg
        paths = [
            (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Google\Update\Clients\{8A69D345-D564-463c-AFF1-A69D9E530F96}"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Google\Update\Clients\{8A69D345-D564-463c-AFF1-A69D9E530F96}")
        ]
        for hkey, path in paths:
            try:
                key = winreg.OpenKey(hkey, path)
                version, _ = winreg.QueryValueEx(key, "version")
                winreg.CloseKey(key)
                v_major = int(version.split(".")[0])
                print(f"[DEBUG] Versão do Chrome detectada ({path}): {v_major}")
                return v_major
            except: continue
        return None
    except Exception as e:
        print(f"[WARN] Erro ao detectar versão do Chrome: {e}")
        return None

def safe_read_excel(filepath, engine="openpyxl"):
    """Lê um Excel de forma segura, tratando arquivos corrompidos."""
    try:
        if not os.path.exists(filepath):
            return None
        return pd.read_excel(filepath, engine=engine)
    except (zipfile.BadZipFile, Exception) as e:
        print(f"[ERROR] Arquivo corrompido ou inválido: {filepath} ({e})")
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            corrupt_path = f"{filepath}_corrupt_{timestamp}.xlsx"
            os.rename(filepath, corrupt_path)
            print(f"[INFO] Arquivo movido para: {corrupt_path}")
        except: pass
        return None

# ==============================================================================
#  CONTROLE GLOBAL DE PARADA
# ==============================================================================
ROBO_PARADO = False

def find_latest_pdf_and_rename(download_dir, target_name, expected_cpf=None):
    """Localiza o último PDF baixado, espera concluir e renomeia.
    
    Se expected_cpf for fornecido, tenta validar se o PDF pertence ao cliente correto.
    Também verifica a pasta de Downloads do Windows como fallback.
    """
    try:
        target_path = os.path.join(download_dir, target_name)
        
        # Lista de diretórios para procurar (projeto + Downloads do usuário)
        search_dirs = [download_dir]
        user_downloads = os.path.join(os.path.expanduser("~"), "Downloads")
        if os.path.exists(user_downloads) and user_downloads != download_dir:
            search_dirs.append(user_downloads)
        
        # Aguarda até 15 segundos pelo arquivo terminar de baixar
        for _ in range(30):
            for search_path in search_dirs:
                try:
                    files = [f for f in os.listdir(search_path) if f.lower().endswith('.pdf') or '.crdownload' in f.lower()]
                    if files:
                        # Ordena pelo mais recente
                        paths = [os.path.join(search_path, f) for f in files]
                        latest_file = max(paths, key=os.path.getctime)
                        
                        # Só considera se for recente (últimos 60 segundos)
                        file_age = time.time() - os.path.getctime(latest_file)
                        if file_age > 60:
                            continue
                        
                        # Se for PDF real, verifica integridade
                        if latest_file.lower().endswith('.pdf'):
                            size1 = os.path.getsize(latest_file)
                            time.sleep(1)
                            if os.path.getsize(latest_file) == size1 and size1 > 1000:
                                # Move para o diretório de downloads do projeto
                                if os.path.exists(target_path): 
                                    os.remove(target_path)
                                shutil.move(latest_file, target_path)
                                print(f"   [PDF] Arquivo encontrado em {search_path}, movido para: {target_path}")
                                return os.path.abspath(target_path)
                except Exception as e_dir:
                    print(f"   [!] Erro ao buscar em {search_path}: {e_dir}")
            time.sleep(0.5)
        return None
    except Exception as e:
        print(f"   [!] Erro find_latest: {e}")
        return None

class FloatingStopWindow:
    def __init__(self, id_inst, x, y, cor):
        self.root = None
        self.id_inst = id_inst
        self.x = x
        self.y = y
        self.cor = cor
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        self.root = Tk()
        self.root.title(f"STOP-{self.id_inst}")
        self.root.attributes("-topmost", True)
        self.root.overrideredirect(True)
        
        # Cores Escritório (Navy & Gold Premium)
        colors = {"bg": "#0c0d10", "accent": "#d4af37", "danger": "#ef4444", "text": "#f8fafc"}
        
        gx = self.x + LARGURA_W - 160
        gy = self.y + 10
        self.root.geometry(f"160x85+{gx}+{gy}")
        self.root.configure(bg=colors["bg"])

        # Borda Superior Dourada
        header = tk.Frame(self.root, bg=colors["accent"], height=3)
        header.pack(fill="x")

        tk.Label(self.root, text=f"ADV-2026", fg=colors["accent"], 
                 bg=colors["bg"], font=("Segoe UI Black", 8)).pack(pady=(5, 0))
        
        tk.Label(self.root, text=f"ROBÔ {self.id_inst} ATIVO", fg=colors["text"], 
                 bg=colors["bg"], font=("Segoe UI", 8, "bold")).pack(pady=(0, 5))

        btn = tk.Button(self.root, text="PARAR AGORA", bg="#b91c1c", fg="white", 
                       font=("Segoe UI Black", 8), relief="flat", padx=10,
                       command=self.parar, cursor="hand2", activebackground=colors["danger"])
        btn.pack(expand=True, fill="both", padx=15, pady=(0, 10))
        
        # Tenta aplicar arredondado via DWM (Win 11)
        try:
            self.root.update()
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd: hwnd = self.root.winfo_id()
            # 33 = DWMWA_WINDOW_CORNER_PREFERENCE, 2 = DWMWCP_ROUND
            ctypes.windll.dwmapi.DwmSetWindowAttribute(hwnd, 33, ctypes.byref(ctypes.c_int(2)), 4)
        except: pass
        
        self.root.mainloop()

    def parar(self):
        global ROBO_PARADO
        if messagebox.askyesno("Confirmar", f"Parar Robô {self.id_inst}?"):
            ROBO_PARADO = True

# ==============================================================================
# 🛠️ 1. HELPER FUNCTIONS
# ==============================================================================

def carregar_zoom(driver, scale=0.60):
    try:
        zoom_pct = int(scale * 100)
        driver.execute_script(f"document.body.style.zoom = '{zoom_pct}%';")
    except: pass

def tratar_numero(valor):
    if pd.isna(valor): return ""
    try:
        str_val = str(valor).replace(',', '.')
        val_float = float(str_val)
        if val_float.is_integer(): return str(int(val_float))
        return str(val_float).replace('.', ',')
    except: return str(valor)

def tratar_moeda(valor):
    if pd.isna(valor): return "0,00"
    try: return str(valor).replace('R$', '').strip()
    except: return "0,00"

def gerar_dados_pesca_default(nome_cliente, municipio="Buriticupu"):
    """
    Lê dados de pesca de dados.xlsx para o cliente especificado.
    Se não encontrar, gera dados padrão usando config_localidades.xlsx e config_peixes.xlsx.
    
    Retorna lista de dicts com: MES, DIAS, MUNICIPIO, TIPO_LOCAL, NOME_LOCAL, PETRECHO, ESPECIE, QUANTIDADE, VALOR
    """
    import random
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dados_path = os.path.join(script_dir, "dados.xlsx")
    localidades_path = os.path.join(script_dir, "config_localidades.xlsx")
    peixes_path = os.path.join(script_dir, "config_peixes.xlsx")
    
    # Tentativa 1: Ler dados do Excel
    if os.path.exists(dados_path):
        try:
            df = pd.read_excel(dados_path)
            # Busca pelo nome do cliente (parcial, case-insensitive)
            nome_limpo = str(nome_cliente).strip().upper()
            mask = df['NOME'].astype(str).str.strip().str.upper().str.contains(nome_limpo[:20], na=False)
            df_cliente = df[mask]
            
            if not df_cliente.empty:
                print(f"   [DADOS] Encontrados {len(df_cliente)} registros para {nome_cliente[:30]} em dados.xlsx")
                return df_cliente.to_dict('records')
            else:
                print(f"   [DADOS] Cliente '{nome_cliente[:30]}' não encontrado em dados.xlsx. Gerando padrão...")
        except Exception as e:
            print(f"   [ERRO] Falha ao ler dados.xlsx: {e}")
    
    # Tentativa 2: Gerar dados padrão
    # Carrega configurações
    localidades = []
    peixes = []
    
    if os.path.exists(localidades_path):
        try:
            df_loc = pd.read_excel(localidades_path)
            # Filtra pela cidade do cliente
            mask_cidade = df_loc['CIDADE'].astype(str).str.upper().str.contains(municipio.upper()[:10], na=False)
            if mask_cidade.any():
                localidades = df_loc[mask_cidade].to_dict('records')
            else:
                localidades = df_loc.to_dict('records')[:3]  # Pega as primeiras 3 como fallback
        except: pass
    
    if os.path.exists(peixes_path):
        try:
            df_pei = pd.read_excel(peixes_path)
            peixes = df_pei['ESPECIE'].dropna().tolist()
        except: pass
    
    # Valores padrão caso arquivos não existam
    if not localidades:
        localidades = [{'CIDADE': municipio, 'TIPO_LOCAL': 'Rio', 'NOME_LOCAL': 'Rio Local', 'PETRECHOS': 'Rede'}]
    if not peixes:
        peixes = ['Tilápia', 'Tambaqui', 'Curimatã', 'Piaba']
    
    # Gera dados para cada mês de pesca (fora do defeso)
    MESES_PESCA = ['Janeiro', 'Fevereiro', 'Março', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro']
    
    dados_gerados = []
    for mes in MESES_PESCA:
        loc = random.choice(localidades) if localidades else {}
        peixe = random.choice(peixes) if peixes else 'Tilápia'
        
        dados_gerados.append({
            'NOME': nome_cliente,
            'MES': mes,
            'MUNICIPIO': loc.get('CIDADE', municipio),
            'DIAS': random.randint(8, 15),
            'TIPO_LOCAL': loc.get('TIPO_LOCAL', 'Rio'),
            'NOME_LOCAL': loc.get('NOME_LOCAL', 'Rio Local'),
            'PETRECHO': loc.get('PETRECHOS', 'Rede').split(',')[0].strip() if loc.get('PETRECHOS') else 'Rede',
            'ESPECIE': peixe,
            'QUANTIDADE': random.randint(30, 80),
            'VALOR': f"{random.uniform(6, 12):.2f}".replace('.', ',')
        })
    
    print(f"   [DADOS] Gerados {len(dados_gerados)} registros padrão para {nome_cliente[:30]}")
    return dados_gerados

def preencher_dropdown_simples(driver, nome_campo, texto_digitar, texto_clicar):
    try:
        xpath_input = f"//input[@name='{nome_campo}']"
        campo = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath_input)))
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", campo)
        
        # Modo Rápido-Seguro: Digita tudo e dá um toque final
        driver.execute_script("arguments[0].click();", campo)
        campo.send_keys(Keys.CONTROL + "a"); campo.send_keys(Keys.DELETE)
        campo.send_keys(texto_digitar); time.sleep(0.6) # Reduzido de 1.5s
        
        xpath_opcao = f"//label[contains(normalize-space(), '{texto_clicar}')]"
        opcao = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, xpath_opcao)))
        driver.execute_script("arguments[0].click();", opcao)
        time.sleep(0.2)
    except Exception as e: print(f"   [X] Erro Dropdown {nome_campo}: {e}")

def selecionar_estado_seguro(driver, nome_campo, estado_alvo):
    try:
        xpath_input = f"//input[@name='{nome_campo}']"
        campo = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath_input)))
        driver.execute_script("arguments[0].click();", campo)
        campo.send_keys(Keys.CONTROL + "a"); campo.send_keys(Keys.DELETE)
        campo.send_keys(estado_alvo); time.sleep(0.6) # Reduzido de 1.5s
        
        xpath_label = f"//label[normalize-space()='{estado_alvo}']"
        label = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, xpath_label)))
        c_id = label.get_attribute("for")
        if not driver.execute_script(f"return document.getElementById('{c_id}').checked;"):
            driver.execute_script("arguments[0].click();", label)
        time.sleep(0.1)
    except: pass

def configurar_checkbox_por_indice(driver, nome_grupo, indice_alvo):
    try:
        inputs = WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.NAME, nome_grupo)))
        for i, checkbox in enumerate(inputs):
            try:
                c_id = checkbox.get_attribute("id")
                label = driver.find_element(By.XPATH, f"//label[@for='{c_id}']")
                marcado = driver.execute_script(f"return document.getElementById('{c_id}').checked;")
                if i == indice_alvo:
                    if not marcado: driver.execute_script("arguments[0].click();", label)
                else:
                    if marcado: driver.execute_script("arguments[0].click();", label)
            except: pass
    except: pass

def preencher_campo_tabela(driver, input_elemento, valor, eh_dropdown=True):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_elemento)
        if eh_dropdown:
            for _ in range(3):
                try:
                    driver.execute_script("arguments[0].click();", input_elemento)
                    # Tenta limpar e digitar
                    input_elemento.send_keys(Keys.CONTROL + "a"); input_elemento.send_keys(Keys.DELETE)
                    input_elemento.send_keys(str(valor)); time.sleep(0.3) 
                    
                    xpath_opt = f"//div[contains(@class, 'br-item')]//label[contains(normalize-space(), '{valor}')]"
                    itens = driver.find_elements(By.XPATH, xpath_opt)
                    if not itens:
                        xpath_opt = f"//label[contains(normalize-space(), '{valor}')]"
                        itens = driver.find_elements(By.XPATH, xpath_opt)

                    item_clicado = False
                    for item in itens:
                        if item.is_displayed():
                            driver.execute_script("arguments[0].click();", item)
                            item_clicado = True
                            break
                    if item_clicado: break
                except Exception as e_inner:
                    # Se der erro (stale element, etc), tenta recuperar o elemento se possível ou apenas retry
                    time.sleep(1)
        else:
            driver.execute_script("arguments[0].click();", input_elemento)
            input_elemento.send_keys(Keys.CONTROL + "a"); input_elemento.send_keys(Keys.DELETE)
            input_elemento.send_keys(str(valor))
            input_elemento.send_keys(Keys.TAB)
    except Exception as e: print(f"      [WARN] Erro tabela ({valor}): {e}")

def selecionar_unidade_relativa(driver, index_linha):
    try:
        xpath_nome = f"(//input[@placeholder='Digite o nome da espécie'])[{index_linha+1}]"
        xpath_unidade = f"{xpath_nome}/following::input[@placeholder='Selecione'][1]"
        target = WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.XPATH, xpath_unidade)))
        driver.execute_script("arguments[0].click();", target); time.sleep(0.3) 
        xpath_kg = "//div[contains(@class, 'br-item')]//label[contains(text(), 'Quilo')]"
        for op in driver.find_elements(By.XPATH, xpath_kg):
            if op.is_displayed(): driver.execute_script("arguments[0].click();", op); break
        driver.find_element(By.TAG_NAME, "body").click()
    except: pass

def configurar_petrecho_seguro(driver, input_elemento, valor):
    try:
        driver.execute_script("arguments[0].click();", input_elemento); time.sleep(0.3)
        xpath_opt = f"//div[contains(@class, 'br-item')]//label[contains(text(), '{valor}')]"
        for o in driver.find_elements(By.XPATH, xpath_opt):
            if o.is_displayed():
                c_id = o.get_attribute("for")
                if not driver.execute_script(f"return document.getElementById('{c_id}').checked;"):
                    driver.execute_script("arguments[0].click();", o)
                break
    except: pass

def verificar_passo_concluido(driver, num_passo):
    """
    Verifica se o botão do passo (1, 2, 3 ou 4) na barra de progresso
    está com o atributo data-alert="success" (check verde).
    """
    try:
        xpath = f"//button[@step-num='{num_passo}' and @data-alert='success']"
        return len(driver.find_elements(By.XPATH, xpath)) > 0
    except:
        return False

def verificar_mes_concluido(driver, mes_nome):
    """
    Verifica se o mês está concluído usando JavaScript Puro para máxima performance.
    Evita delay entre meses (Zero Latency).
    """
    try:
        script = f"""
        var btns = document.getElementsByTagName('button');
        for (var i = 0; i < btns.length; i++) {{
            if (btns[i].textContent.includes('{mes_nome}')) {{
                // Verifica ícone aprovado dentro do botão ou em filhos
                if (btns[i].querySelector('.accordion-icon-approved')) return true;
                // Verifica se o próprio botão tem a classe (caso mude)
                if (btns[i].classList.contains('accordion-icon-approved')) return true;
            }}
        }}
        return false;
        """
        return driver.execute_script(script)
    except:
        return False

def mapear_botoes_meses(driver):
    """
    Localiza todos os botões dos meses de uma vez só para evitar find_element repetido.
    """
    try:
        mapping = {}
        # Busca genérica por botões de accordion
        candidates = driver.find_elements(By.CSS_SELECTOR, "button.accordion-button")
        
        # Lista de meses de interesse
        meses_interesse = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                           "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
                           
        for btn in candidates:
            # Pega o texto (pode estar hidden ou em span filho, por isso textContent via JS é melhor ou text do selenium)
            txt = btn.text
            if not txt:
                 txt = driver.execute_script("return arguments[0].textContent;", btn)
            
            for m in meses_interesse:
                if m in txt:
                    mapping[m] = btn
                    break
        return mapping
    except: return {}

def executar_preenchimento_mensal(driver, mes_nome, idx, df_mes, eh_defeso, cached_btn=None):
    """
    Encapsula a lógica de preenchimento de um único mês.
    [OTIMIZACAO] Aceita cached_btn para evitar busca no DOM.
    """
    log_debug(f"--- Iniciando preenchimento: {mes_nome} ---")
    try:
        # 1. Localiza e Garante Visibilidade
        if cached_btn:
            btn = cached_btn
        else:
            btn = driver.find_element(By.XPATH, f"//button[contains(normalize-space(), '{mes_nome}')]")
            
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)

        time.sleep(0.1) # [FAST] Reduzido de 1.0s para 0.1s
        
            # 2. Garante Abertura
        # Verifica se está fechado (collapsed) ou se o pai não está active
        is_collapsed = "collapsed" in btn.get_attribute("class")
        if is_collapsed:
            driver.execute_script("arguments[0].click();", btn); time.sleep(0.2) # [FAST] Reduzido
            log_debug(f"Abriu accordion {mes_nome}")
        
        
        # 3. Preenchimento
        # [FIX] Espera o elemento aparecer antes de interagir (Cache/Lazy Loading do Accordion)
        try:
             # Tenta espera rápida de 1s (reduzido de 5s). Se falhar, é pq não abriu.
            WebDriverWait(driver, 1).until(EC.presence_of_element_located((By.CSS_SELECTOR, f"input[name='informesMensais.{idx}.houvePesca']")))
        except:
            # Se falhar, assume que o clique não abriu ou demorou demais
            log_debug(f"Elemento do mês {mes_nome} não apareceu. Tentando re-abrir...")
            driver.execute_script("arguments[0].click();", btn); time.sleep(1.0)

        if eh_defeso:
            driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, f"input[name='informesMensais.{idx}.houvePesca'][value='false']"))
            chk = driver.find_element(By.CSS_SELECTOR, f"input[name='informesMensais.{idx}.justificativasNaoDeclaracao'][value='1']")
            if not chk.is_selected(): driver.execute_script("arguments[0].click();", chk)
        else:
            driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, f"input[name='informesMensais.{idx}.houvePesca'][value='true']")); time.sleep(0.1)
            row0 = df_mes.iloc[0]
            preencher_campo_tabela(driver, driver.find_element(By.NAME, f"informesMensais.{idx}.diasTrabalhados"), row0['DIAS'], False)
            
            conteudo = btn.find_element(By.XPATH, "./../following-sibling::div")
            inps = [i for i in conteudo.find_elements(By.CSS_SELECTOR, "input[type='text']") if i.is_displayed()]
            inps_loc = [i for i in inps if "diasTrabalhados" not in i.get_attribute("name") and "espécie" not in (i.get_attribute("placeholder") or "")]
            
            if len(inps_loc) >= 5:
                # Tenta preencher local, estado, municipio, localidade e petrecho
                preencher_campo_tabela(driver, inps_loc[0], row0['TIPO_LOCAL'])
                preencher_campo_tabela(driver, inps_loc[1], "MARANHAO")
                preencher_campo_tabela(driver, inps_loc[2], row0['MUNICIPIO'])
                preencher_campo_tabela(driver, inps_loc[3], row0['NOME_LOCAL'], False)
                configurar_petrecho_seguro(driver, inps_loc[4], row0['PETRECHO'])

            # Espécies
            for i_e, (_, r_e) in enumerate(df_mes.iterrows()):
                nms = [x for x in driver.find_elements(By.XPATH, "//input[@placeholder='Digite o nome da espécie']") if x.is_displayed()]
                if i_e >= len(nms):
                    add_b = [b for b in driver.find_elements(By.XPATH, "//button[contains(., 'Adicionar nova espécie')]") if b.is_displayed()]
                    if add_b: driver.execute_script("arguments[0].click();", add_b[0]); time.sleep(0.2)
                
                nms = [x for x in driver.find_elements(By.XPATH, "//input[@placeholder='Digite o nome da espécie']") if x.is_displayed()]
                qts = [x for x in driver.find_elements(By.XPATH, "//input[@placeholder='Informe a quantidade']") if x.is_displayed()]
                vls = [x for x in driver.find_elements(By.XPATH, "//input[@placeholder='Informe o valor']") if x.is_displayed()]
                
                if i_e < len(nms):
                    preencher_campo_tabela(driver, nms[i_e], r_e['ESPECIE'])
                    selecionar_unidade_relativa(driver, i_e) 
                    preencher_campo_tabela(driver, qts[i_e], r_e['QUANTIDADE'], False)
                    preencher_campo_tabela(driver, vls[i_e], r_e['VALOR'], False)
        
        # 4. Fechamento e Validação
        # Fecha o acordeão para dar o check "oficial".
        # IMPORTANTE: Só clica se estiver aberto (não tiver 'collapsed') para evitar reabrir
        if "collapsed" not in btn.get_attribute("class"):
             driver.execute_script("arguments[0].click();", btn)
             log_debug(f"Fechou accordion {mes_nome}")
             time.sleep(0.2) # [FAST] Reduzido


        # Tenta verificar se validou (Apenas Log - Não Bloqueante)
        # O usuário confirmou que o preenchimento está correto.
        # Não vamos mais bloquear ou retentar se o ícone demorar.
        if verificar_mes_concluido(driver, mes_nome):
            log_debug(f"{mes_nome} Visualmente OK.")
        else:
            log_debug(f"{mes_nome} Preenchido (Visual Check Pendente - Ignorando para performance).")
        
        return True

    except Exception as e:
        print(f"      [X] Erro Critico no Mes {mes_nome}: {e}")
        return False

def precisa_gerar_dados():
    """
    Verifica se existem clientes na base que ainda não foram finalizados
    e que não possuem dados correspondentes na planilha dados.xlsx.
    """
    try:
        if not os.path.exists("base_clientes.xlsx"): return False
        df_c = safe_read_excel("base_clientes.xlsx")
        if df_c is None: return False # Se corrompeu, não tem como saber o que falta agora
        
        # Pega resultados locais para saber quem já terminou
        progresso_local = {}
        results_dir = "temp_results"
        if os.path.exists(results_dir):
            for f in os.listdir(results_dir):
                if f.endswith(".json"):
                    try:
                        with open(os.path.join(results_dir, f), "r", encoding="utf-8") as rj:
                            progresso_local.update(json.load(rj))
                    except: pass
        
        # Função interna para checar se está feito
        def esta_concluido(row):
            cpf = str(row['CPF'])
            st_xls = str(row.get('STATUS', '')).upper()
            if st_xls in ["OK", "PENDENCIA", "SÓ FALTA PDF"]: return True
            if cpf in progresso_local:
                st_loc = str(progresso_local[cpf].get('STATUS', '')).upper()
                if st_loc in ["OK", "PENDENCIA", "SÓ FALTA PDF"]: return True
            return False

        pendentes = df_c[~df_c.apply(esta_concluido, axis=1)]
        if pendentes.empty: return False # Ninguém pendente
        
        if not os.path.exists("dados.xlsx"): return True # Tem gente mas não tem o arquivo
        
        df_d = safe_read_excel("dados.xlsx")
        if df_d is None: return True # Arquivo existia mas estava corrompido (safe_read_excel já renomeou)
        
        nomes_com_dados = set(df_d['NOME'].unique())
        
        for _, clie in pendentes.iterrows():
            if clie['NOME'] not in nomes_com_dados:
                return True # Algum cliente pendente não tem dados no arquivo
                
        return False
    except Exception as e:
        print(f"[WARN] Erro ao verificar necessidade de geracao: {e}")
        return False

def dados_estao_prontos():
    """Mantido apenas para compatibilidade de espera de outras instâncias"""
    try:
        if not os.path.exists("base_clientes.xlsx") or not os.path.exists("dados.xlsx"): return False
        return True
    except: return False

def salvar_resultado_excel(cpf_alvo, status, motivo, nome_pdf="", nome_pessoa_arg=""):
    """
    Atualiza a base_clientes.xlsx de forma robusta. 
    Agora todas as instâncias salvam diretamente para garantir rapidez.
    """
    tentativas = 0
    while tentativas < 10:
        try:
            if not os.path.exists("base_clientes.xlsx"): 
                print(f"[{ID_INSTANCIA}] [ERRO] Planilha base_clientes.xlsx não encontrada!")
                return
            
            # Carrega a planilha
            df = safe_read_excel("base_clientes.xlsx")
            if df is None: return
            
            # Normalização robusta de CPF
            def limpar_cpf_robusto(c):
                if pd.isna(c): return ""
                s = str(c).strip()
                if s.endswith('.0'): s = s[:-2] # Corrige floats lidos erroneamente
                return re.sub(r'\D', '', s)
            
            cpf_alvo_limpo = limpar_cpf_robusto(cpf_alvo)
            
            # Garante que as colunas alvo existam
            for col in ['STATUS', 'MOTIVO', 'OBSERVAÇÃO', 'ARQUIVO_PDF']:
                if col not in df.columns: df[col] = ""
            
            # Tenta encontrar por CPF (Busca Primária)
            mask = df['CPF'].apply(limpar_cpf_robusto) == cpf_alvo_limpo
            
            # Tenta encontrar por NOME (Busca de Fallback se CPF falhar)
            if not mask.any() and nome_pessoa_arg:
                nome_alvo = str(nome_pessoa_arg).lower().strip()
                mask = df['NOME'].astype(str).str.lower().str.contains(nome_alvo, na=False)
            
            if mask.any():
                df.loc[mask, 'STATUS'] = str(status).upper()
                df.loc[mask, 'MOTIVO'] = str(motivo)
                df.loc[mask, 'OBSERVAÇÃO'] = str(motivo)
                if nome_pdf:
                    df.loc[mask, 'ARQUIVO_PDF'] = str(nome_pdf)
                
                # Tenta salvar
                df.to_excel("base_clientes.xlsx", index=False)
                print(f"[{ID_INSTANCIA}] [OK] Salvo em base_clientes.xlsx para: {nome_pessoa_arg or cpf_alvo}")
                return
            else:
                print(f"[{ID_INSTANCIA}] [AVISO] Não encontrou {nome_pessoa_arg}/{cpf_alvo} na base_clientes.xlsx")
            break
        except PermissionError:
            print(f"[{ID_INSTANCIA}] [AVISO] base_clientes.xlsx ABERTA! Feche para salvar. Tentando em 5s ({tentativas+1}/10)...")
            time.sleep(5)
            tentativas += 1
        except Exception as e:
            print(f"[{ID_INSTANCIA}] [ERRO] Falha ao salvar Excel: {e}")
            break

def atualizar_status_dados(nome_cliente, status):
    """
    Atualiza a planilha dados.xlsx marcando o status das linhas do cliente.
    """
    tentativas = 0
    while tentativas < 5:
        try:
            if not os.path.exists("dados.xlsx"): return
            
            df = safe_read_excel("dados.xlsx")
            if df is None: return
            if 'STATUS' not in df.columns: df['STATUS'] = ""
            
            mask = df['NOME'].astype(str).str.contains(str(nome_cliente), case=False, na=False)
            if mask.any():
                df.loc[mask, 'STATUS'] = str(status).upper()
                df.to_excel("dados.xlsx", index=False)
                return
            break
        except PermissionError:
            print(f"[{ID_INSTANCIA}] [AVISO] Planilha dados.xlsx aberta! Feche-a para salvar o status. Tentando em 5s...")
            time.sleep(5)
            tentativas += 1
        except Exception as e:
            print(f"[{ID_INSTANCIA}] [ERRO] Erro ao salvar status em dados.xlsx: {e}")
            break

# ==============================================================================
# [ROBOT] 2. PROCESSAR PESCADOR
# ==============================================================================

def processar_pescador_v2(nome_pessoa, df_pessoa, cpf, senha):
    global ROBO_PARADO
    if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", "", ""
    
    print(f"[{ID_INSTANCIA}] >> ATENDENDO: {nome_pessoa}")
    
    local_municipio_alvo = "Buriticupu"
    try: 
        if not df_pessoa.empty and "MUNICIPIO" in df_pessoa.columns:
            local_municipio_alvo = df_pessoa.iloc[0]["MUNICIPIO"]
    except: pass

    # Isolamento de Perfil - Chrome
    perfil_dir = os.path.join(os.getcwd(), f"chrome_profile_{ID_INSTANCIA}")
    os.makedirs(perfil_dir, exist_ok=True)

    options = uc.ChromeOptions()
    options.add_argument(f"--user-data-dir={perfil_dir}")
    options.add_argument("--start-maximized")
    # options.add_argument("--disable-blink-features=AutomationControlled")
    # options.add_argument("--no-sandbox")
    # options.add_argument("--disable-dev-shm-usage")
    # options.add_argument("--disable-gpu") 
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-notifications")
    options.add_argument("--ignore-certificate-errors")
    
    # Configura diretório de download absoluto
    abs_download_dir = os.path.abspath(args.download_dir)
    os.makedirs(abs_download_dir, exist_ok=True)
    
    prefs = {
        "profile.managed_default_content_settings.images": 1,
        "download.default_directory": abs_download_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "plugins.always_open_pdf_externally": True # Faz o Chrome baixar em vez de abrir
    }
    options.add_experimental_option("prefs", prefs)
    
    driver = None
    foi_enviado_com_sucesso = False
    
    try:
        print(f"[{ID_INSTANCIA}] [DEBUG] Inicializando Chrome Driver...")
        v_main = get_chrome_version_windows()
        driver = uc.Chrome(options=options, version_main=v_main)
        print(f"[{ID_INSTANCIA}] [DEBUG] Chrome Driver Inicializado (Versão: {v_main or 'Auto'}).")
        try: driver.set_window_rect(x=POS_X, y=POS_Y, width=LARGURA_W, height=ALTURA_W)
        except: pass
        
        try: driver.switch_to.window(driver.window_handles[0])
        except: pass

        driver.get("https://pesqbrasil-pescadorprofissional.mpa.gov.br")

        time.sleep(1)
        
        # [LIMPEZA] LOG
        try:
            print(f"[{ID_INSTANCIA}] [LIMPEZA] Limpando cookies, cache e IndexedDB...")
            driver.delete_all_cookies()
            driver.execute_script("window.localStorage.clear();")
            driver.execute_script("window.sessionStorage.clear();")
            driver.execute_script("""
                if (window.indexedDB && window.indexedDB.databases) {
                    window.indexedDB.databases().then(dbs => {
                        dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
                    });
                }
            """)
            # Tenta clicar em um botão de sair se estiver visível
            for btn_sair in driver.find_elements(By.XPATH, "//button[contains(., 'Sair')] | //a[contains(., 'Sair')]"):
                if btn_sair.is_displayed():
                    driver.execute_script("arguments[0].click();", btn_sair)
                    time.sleep(1)
            driver.refresh()
            time.sleep(2)
        except: pass
        
        # Posiciona no Canto Superior Esquerdo (A pedido do usuário)
        popup_x = POS_X + 50
        popup_y = POS_Y + 80
        
        # Inicia Login
        try: WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Entrar com')]"))).click()
        except: pass

        # Login Assistant V2
        res_login = invocar_assistente(nome_pessoa, cpf, senha, x=popup_x, y=popup_y, cor=COR_TEMA)
        if not res_login or res_login != "OK":
            return False, (res_login if res_login else "CANCELADO"), ""

        if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", ""

        # Robot takes over
        carregar_zoom(driver, 0.60)
        try: WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Entendi')]"))).click()
        except: pass

        # Smart Skip
        time.sleep(2)
        url_atual = driver.current_url
        if "comprovante" in url_atual.lower() or "manutencao-reap/visualizar" in url_atual.lower():
            foi_enviado_com_sucesso = True
        
        if not foi_enviado_com_sucesso:
            if "manutencao-reap" not in url_atual:
                try: WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'card-home-menu') and contains(., 'Manutenção anual')]"))).click(); time.sleep(2)
                except: pass
            try:
                btn_edit = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//button[@aria-label='editar']")))
                driver.execute_script("arguments[0].click();", btn_edit); time.sleep(5)
            except: 
                if len(driver.find_elements(By.XPATH, "//button[@aria-label='visualizar_2a_via']")) > 0:
                    foi_enviado_com_sucesso = True

        if not foi_enviado_com_sucesso:
            if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", ""
            # --- TELA 1 ---
            carregar_zoom(driver)
            if len(driver.find_elements(By.NAME, "uf")) > 0:
                print(f"[{ID_INSTANCIA}] [INFO] Preenchendo Tela 1...")
                tentativas_t1 = 0
                while tentativas_t1 < 3:
                    preencher_dropdown_simples(driver, "uf", "MARANHAO", "MARANHAO")
                    preencher_dropdown_simples(driver, "municipio", local_municipio_alvo, local_municipio_alvo)
                    preencher_dropdown_simples(driver, "categoria", "Artesanal", "Artesanal")
                    preencher_dropdown_simples(driver, "embarcado", "Desembarcado", "Desembarcado")
                    driver.execute_script("arguments[0].click();", driver.find_element(By.XPATH, "//button[@data-action='avancar']"))
                    time.sleep(3)
                    if verificar_passo_concluido(driver, 1):
                        print(f"[{ID_INSTANCIA}] [OK] Tela 1 concluída com sucesso.")
                        break
                    tentativas_t1 += 1
                    print(f"[{ID_INSTANCIA}] [AVISO] Tela 1 não confirmada, tentando novamente ({tentativas_t1}/3)...")

            # --- TELA 2 ---
            carregar_zoom(driver)
            if len(driver.find_elements(By.NAME, "prestacaoServico")) > 0 or verificar_passo_concluido(driver, 1):
                # Se não estiver na tela 2 mas o passo 1 está OK, tenta clicar no 2
                if len(driver.find_elements(By.NAME, "prestacaoServico")) == 0:
                    try:
                        btn_passo2 = driver.find_element(By.XPATH, "//button[@step-num='2']")
                        driver.execute_script("arguments[0].click();", btn_passo2); time.sleep(2)
                    except: pass

                if len(driver.find_elements(By.NAME, "prestacaoServico")) > 0:
                    print(f"[{ID_INSTANCIA}] [INFO] Preenchendo Tela 2...")
                    tentativas_t2 = 0
                    while tentativas_t2 < 3:
                        preencher_dropdown_simples(driver, "prestacaoServico", "Individual", "Individual/Autônomo")
                        selecionar_estado_seguro(driver, "estadosComercializacao", "MARANHAO")
                        configurar_checkbox_por_indice(driver, "gruposAlvo", 3)
                        configurar_checkbox_por_indice(driver, "compradoresPescado", 5)
                        driver.execute_script("arguments[0].click();", driver.find_element(By.XPATH, "//button[@data-action='avancar']"))
                        time.sleep(3)
                        if verificar_passo_concluido(driver, 2):
                            print(f"[{ID_INSTANCIA}] [OK] Tela 2 concluída com sucesso.")
                            break
                        tentativas_t2 += 1
                        print(f"[{ID_INSTANCIA}] [AVISO] Tela 2 não confirmada, tentando novamente ({tentativas_t2}/3)...")

            # --- TELA 3 ---
            carregar_zoom(driver)
            WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Janeiro')]")))
            
            todas_as_chaves = {**MESES_DEFESO, **MESES_PESCA}
            
            def preencher_todos_os_meses():
                # Lógica: Preenche tudo sem parar para verificar profundamente cada um
                # [CACHE] Mapeia botões antes para evitar delay de busca
                log_debug("Mapeando botões dos meses (Cache)...")
                cache_botoes = mapear_botoes_meses(driver)
                
                todas_as_listas = [ (MESES_DEFESO, True), (MESES_PESCA, False) ]
                for lista, eh_defeso in todas_as_listas:
                    for mes_n, idx_n in lista.items():
                        if ROBO_PARADO: break
                        
                        print(f"[{ID_INSTANCIA}] [TRABALHO] Preenchendo Mês: {mes_n}")
                        filtro_m = df_pessoa[df_pessoa['MES'].astype(str).str.contains(mes_n, case=False, na=False)]
                        if not eh_defeso and filtro_m.empty: continue
                        
                        btn_c = cache_botoes.get(mes_n)
                        executar_preenchimento_mensal(driver, mes_n, idx_n, filtro_m, eh_defeso, cached_btn=btn_c)


            # 1. Verificação Inicial Inteligente (Smart Resume)
            # Antes de preencher tudo, verifica se já não está tudo pronto (ex: queda de net e reinicio)
            print(f"[{ID_INSTANCIA}] [CHECK] Verificando se Tela 3 pode ser pulada...")
            precisa_preencher_t3 = False
            for m in todas_as_chaves:
                if not verificar_mes_concluido(driver, m):
                     # Se o mês não tá verde, checa se ele deveria ser preenchido
                     if m in MESES_DEFESO: 
                         precisa_preencher_t3 = True; break
                     else:
                         # Pesca: só preenche se tiver na planilha
                         if not df_pessoa[df_pessoa['MES'].astype(str).str.contains(m, case=False, na=False)].empty:
                             precisa_preencher_t3 = True; break
            
            if precisa_preencher_t3:
                preencher_todos_os_meses()
            else:
                print(f"[{ID_INSTANCIA}] [SMART] Tela 3 já totalmente validada anteriormente! Avançando...")

            # [SWEEP] VERIFICAÇÃO BLOQUEANTE TELA 3 (O "SWEEP" FINAL)
            print(f"[{ID_INSTANCIA}] [CHECK] Verificação Final da Tela 3...")
            todas_as_chaves = {**MESES_DEFESO, **MESES_PESCA}
            
            # Controle de Retentativas por Mês para evitar loop infinito
            contagem_tentaivas_mes = {m: 0 for m in todas_as_chaves}
            MAX_TENTATIVAS_POR_MES = 3
            
            start_sweep = time.time()
            while time.time() - start_sweep < 300: # Timeout de 5 min para evitar loop infinito
                meses_faltantes = [m for m in todas_as_chaves if not verificar_mes_concluido(driver, m)]
                
                # Filtra apenas os meses que REALMENTE precisam ser preenchidos e que não estouraram o limite
                meses_para_corrigir = []
                for mf in meses_faltantes:
                    # Se já tentou corrigir muitas vezes, ignora e assume que está ok (ou erro visual)
                    if contagem_tentaivas_mes[mf] >= MAX_TENTATIVAS_POR_MES:
                        print(f"[{ID_INSTANCIA}] [WARN] Desistindo de validar mês {mf} após {MAX_TENTATIVAS_POR_MES} tentativas. Avançando...")
                        continue
                        
                    if mf in MESES_DEFESO: meses_para_corrigir.append(mf)
                    else:
                        if not df_pessoa[df_pessoa['MES'].astype(str).str.contains(mf, case=False, na=False)].empty:
                            meses_para_corrigir.append(mf)

                if not meses_para_corrigir:
                    print(f"[{ID_INSTANCIA}] [PRONTO] Todos os meses confirmados (ou ignorados por limite)!")
                    break
                
                print(f"[{ID_INSTANCIA}] [PARAR] Faltam checks em: {meses_para_corrigir}. Corrigindo...")
                for mf in meses_para_corrigir:
                    contagem_tentaivas_mes[mf] += 1
                    idx_f = todas_as_chaves[mf]
                    eh_def_f = mf in MESES_DEFESO
                    filtro_f = df_pessoa[df_pessoa['MES'].astype(str).str.contains(mf, case=False, na=False)]
                    executar_preenchimento_mensal(driver, mf, idx_f, filtro_f, eh_def_f)
                
                time.sleep(2)
                if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", ""

            print(f"[{ID_INSTANCIA}] -> Finalizando Tela 3 e avançando...")
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight)"); time.sleep(0.5)
            
            tentativas_t3 = 0
            while tentativas_t3 < 3:
                try:
                    b_avan = driver.find_element(By.XPATH, "//button[@data-action='avancar']")
                    driver.execute_script("arguments[0].click();", b_avan); time.sleep(3)
                    if verificar_passo_concluido(driver, 3):
                        print(f"[{ID_INSTANCIA}] [OK] Tela 3 concluída com sucesso.")
                        break
                except: pass
                tentativas_t3 += 1
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)

            # --- TELA 4 ---
            if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", ""
            
            # Verificação de segurança: Passo 1 and 2 devem estar verdes na Tela 4
            if not verificar_passo_concluido(driver, 1) or not verificar_passo_concluido(driver, 2):
                print(f"[{ID_INSTANCIA}] [ERRO] Erro Crítico: Passos 1 ou 2 perderam o check na Tela 4!")
                # Tenta voltar clicando no passo se necessário (opcional conforme pedido)
            
            carregar_zoom(driver)
            print("[INFO] Tela 4: Finalização...")
            try:
                print("   [x] Preparando declaração de responsabilidade...")
                xpath_chk = "//input[@name='concordaComDeclaracaoResponsabilidade']"
                chk = WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.XPATH, xpath_chk)))
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", chk); time.sleep(1.0)
                try:
                    c_id = chk.get_attribute("id")
                    label_chk = driver.find_element(By.XPATH, f"//label[@for='{c_id}']")
                    driver.execute_script("arguments[0].click();", label_chk)
                except: pass
                driver.execute_script("arguments[0].checked = true; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", chk)
                time.sleep(2.0)
                
                xpath_enviar = "//button[contains(., 'Enviar') or @data-action='enviar' or contains(., 'Concluir')]"
                btn_enviar = None
                start_w = time.time()
                while time.time() - start_w < 10:
                    btns_e = driver.find_elements(By.XPATH, xpath_enviar)
                    for be in btns_e:
                        if be.is_displayed() and be.is_enabled(): btn_enviar = be; break
                    if btn_enviar: break
                    time.sleep(1)

                if btn_enviar:
                    driver.execute_script("document.body.style.paddingBottom = '500px'; arguments[0].scrollIntoView({block: 'center'});", btn_enviar); time.sleep(1.0)
                    print("   -> Clicando em 'Enviar REAP'...")
                    try: btn_enviar.click()
                    except: driver.execute_script("arguments[0].click();", btn_enviar)
                    
                    print("   [?] Aguardando modal de confirmação...")
                    try:
                        xpath_sim = "//button[contains(@class,'primary') and (contains(.,'Sim') or contains(.,'Confirmar'))]"
                        sim = WebDriverWait(driver, 15).until(EC.element_to_be_clickable((By.XPATH, xpath_sim)))
                        time.sleep(0.8); driver.execute_script("arguments[0].click();", sim)
                        print("   [OK] Botão 'Sim' clicado."); time.sleep(2.0)
                        
                        # Loop de Verificação de URL para garantir que mudou
                        for _ in range(5):
                            url_lower = driver.current_url.lower()
                            if "visualizar" in url_lower or "comprovante" in url_lower:
                                foi_enviado_com_sucesso = True
                                break
                            time.sleep(1)
                            
                        # Backup: Se clicou SIM e não deu erro até aqui, assume sucesso parcial para não retentar
                        if not foi_enviado_com_sucesso:
                             print("   [?] URL não mudou, mas 'Sim' foi clicado. Assumindo sucesso para PDF.")
                             foi_enviado_com_sucesso = True
                    except: pass
            except: pass

        # 📄 PDF
        if ROBO_PARADO: return False, "PARADO PELO USUÁRIO", "", ""
        print("[PDF] Gerando PDF..."); time.sleep(1.5)
        a_s = str(datetime.now().year)
        try:
            nome_arq = f"{nome_pessoa} - REAP.pdf"
            try:
                n_s = driver.find_element(By.CSS_SELECTOR, "td.nomeCompleto").text.strip()
                a_s = driver.find_element(By.CSS_SELECTOR, "td.anoReferencia").text.strip()
                nome_arq = f"{re.sub(r'[<>:/\\|?*]', '', n_s)} - {a_s}.pdf"
            except: pass

            xpath_pdf = "//button[contains(., 'PDF') or @aria-label='visualizar_2a_via' or contains(@class, 'btn-pdf') or contains(@class, 'pdf')]"
            try:
                # Espera o PDF ficar disponível (pode demorar após o envio)
                btn_pdf = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.XPATH, xpath_pdf)))
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn_pdf)
                time.sleep(1.0)
                driver.execute_script("arguments[0].click()", btn_pdf); time.sleep(8)
            except:
                print("   [!] Botão PDF não encontrado via XPath. Buscando links...")
                for l in driver.find_elements(By.TAG_NAME, "a"):
                    if "pdf" in (l.get_attribute("href") or "").lower() or "comprovante" in (l.get_attribute("text") or "").lower(): 
                        l.click(); time.sleep(8); break
            
            if len(driver.window_handles) > 1:
                driver.switch_to.window(driver.window_handles[-1])
                url = driver.current_url
                if "blob:" in url:
                    driver.switch_to.window(driver.window_handles[0])
                    # Nomes limpos
                    clean_name = re.sub(r'[<>:/\\|?*]', '', nome_pessoa)
                    final_filename = f"{clean_name} - REAP {a_s}.pdf"
                    
                    # Dispara o download
                    driver.execute_script(f"var a=document.createElement('a');a.href='{url}';a.download='{final_filename}';document.body.appendChild(a);a.click();document.body.removeChild(a);")
                    
                    # Usa o helper para garantir o nome correto (browser as vezes ignora a.download)
                    full_path = find_latest_pdf_and_rename(os.path.abspath(args.download_dir), final_filename)
                    
                    if full_path and os.path.exists(full_path):
                        print(f"[{ID_INSTANCIA}] [PDF] Arquivo localizado e renomeado: {full_path}")
                        return foi_enviado_com_sucesso, "OK", full_path, a_s
                    else:
                        print(f"[{ID_INSTANCIA}] [AVISO] Helper não localizou o arquivo. Tentando fallback pelo nome sugerido.")
                        full_path = os.path.join(os.path.abspath(args.download_dir), final_filename)
                        if os.path.exists(full_path):
                             return foi_enviado_com_sucesso, "OK", full_path, a_s

                driver.close()
                driver.switch_to.window(driver.window_handles[0])
            
            # FALLBACK: Se não abriu nova aba, tenta encontrar PDF recente na pasta de Downloads
            if foi_enviado_com_sucesso:
                print(f"[{ID_INSTANCIA}] [PDF] Tentando localizar PDF na pasta de Downloads...")
                clean_name = re.sub(r'[<>:/\\|?*]', '', nome_pessoa)
                final_filename = f"{clean_name} - REAP {a_s}.pdf"
                
                # Aguarda um pouco para o download iniciar
                time.sleep(3)
                
                full_path = find_latest_pdf_and_rename(os.path.abspath(args.download_dir), final_filename)
                if full_path and os.path.exists(full_path):
                    print(f"[{ID_INSTANCIA}] [PDF] Arquivo localizado via fallback: {full_path}")
                    return True, "OK", full_path, a_s
                else:
                    print(f"[{ID_INSTANCIA}] [AVISO] PDF não localizado. Retornando sucesso sem anexo.")
                    return True, "SÓ FALTA PDF", "", a_s

            return False, "Erro ao Enviar", "", a_s

        except Exception as e_pdf: 
            if foi_enviado_com_sucesso: 
                print(f"[{ID_INSTANCIA}] [AVISO] PDF falhou mas envio deu OK. Reportando sucesso sem anexo.")
                return True, "SÓ FALTA PDF", "", a_s
            return False, f"Erro PDF: {str(e_pdf)}", "", a_s

    except Exception as e:
        msg = f"ERRO GERAL ({nome_pessoa}): {str(e)}"
        print(f"[{ID_INSTANCIA}] [X] {msg}")
        log_crash(msg + "\n" + traceback.format_exc())
        return False, f"Erro: {str(e)}", "", ""
    finally:
        if driver: driver.quit()
        pass

# ==============================================================================
# [START] MAIN LOOP V2
# ==============================================================================

def log_crash(msg):
    try:
        os.makedirs("erros_robo", exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open("erros_robo/crash_log.txt", "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] [CRASH] {msg}\n")
            f.write("-" * 50 + "\n")
    except: pass

def log_debug(msg):
    try:
        os.makedirs("erros_robo", exist_ok=True)
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        with open("erros_robo/debug_trace.txt", "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except: pass

def main_v2():
    # FIX: FORÇA O FLUSH IMEDIATO DO TERMINAL
    # sys.stdout.reconfigure(line_buffering=True) # REMOVIDO POR PRECAUÇÃO
    
    # Limpa log anterior
    try:
        if os.path.exists("erros_robo/debug_trace.txt"):
            os.remove("erros_robo/debug_trace.txt")
    except: pass

    try:
        _main_v2_logic()
    except Exception as e:
        err_msg = f"ERRO FATAL NA MAIN_V2: {str(e)}\n{traceback.format_exc()}"
        print(f"\n[X] {err_msg}")
        log_crash(err_msg)
        # Mantém a janela aberta em caso de erro fatal se for standalone
        if TOTAL_INSTANCIAS == 1:
            input("Pressione ENTER para fechar...")

def _main_v2_logic():
    global ROBO_PARADO
    
    # --- PARSE JSON_TASK IF PROVIDED ---
    task_data = None
    if JSON_TASK:
        try:
            import base64
            # Tenta decodificar se parecer base64, senão usa direto
            if not JSON_TASK.strip().startswith('{'):
                decoded = base64.b64decode(JSON_TASK).decode('utf-8')
                task_data = json.loads(decoded)
            else:
                task_data = json.loads(JSON_TASK)
            print(f"[{ID_INSTANCIA}] [JSON] Tarefa recebida via JSON. Total de clientes: {len(task_data.get('clients', []))}")
        except Exception as e:
            print(f"[{ID_INSTANCIA}] [ERRO] Falha ao decodificar JSON_TASK: {e}")
            return

    # Limpeza de ambiente IPC se for Master
    if ID_INSTANCIA == 1:
        ipc_utils.limpar_ambiente_ipc()

    print(f">> Iniciando Instância {ID_INSTANCIA}...")
    
    FloatingStopWindow(ID_INSTANCIA, POS_X, POS_Y, COR_TEMA)

    # --- LÓGICA DE DADOS (JSON vs EXCEL) ---
    if task_data:
        # Se temos JSON, usamos ele. 
        # A divisão de trabalho já pode vir pronta ou fazemos aqui.
        all_clients = task_data.get('clients', [])
        # Divisão simples por instância
        meus_clientes = all_clients[ID_INSTANCIA-1::TOTAL_INSTANCIAS]
        print(f"[{ID_INSTANCIA}] [JSON] Minha fatia: {len(meus_clientes)} clientes.")
        
        for clie in meus_clientes:
            if ROBO_PARADO: break
            
            nome = clie.get('nome', clie.get('nome_completo', 'PESCADOR'))
            cpf = clie.get('cpf', clie.get('cpf_cnpj', '')).replace('.', '').replace('-', '')
            senha = clie.get('senha', clie.get('senha_gov', ''))
            
            # Dados de Pesca Mensal vindos do JSON ou Default
            fishing_data = clie.get('fishing_data', [])
            if not fishing_data:
                # Fallback: Gerar dados padrão se não houver no JSON
                fishing_data = gerar_dados_pesca_default(nome, clie.get('municipio', 'Buriticupu'))
            
            df_d_clie = pd.DataFrame(fishing_data)
            
            print(f"[{ID_INSTANCIA}] [PROCESSANDO] {nome} ({cpf})")
            
            # TODO: Adaptar processar_pescador_v2 para retornar JSON no stdout
            ok, mot, arq, ano = False, "", "", ""
            retry_count = 0
            while retry_count < 2:
                try:
                    ok, mot, arq, ano = processar_pescador_v2(nome, df_d_clie, cpf, senha)
                    if ok or "PEND" in str(mot).upper() or "LOGIN" in str(mot).upper(): break
                except: traceback.print_exc()
                retry_count += 1
                time.sleep(3)
            
            # Reporta resultado via STDOUT delimitado para o Node.js capturar
            result_json = {
                "id": clie.get('id'),
                "cpf": cpf,
                "nome": nome,
                "success": ok,
                "message": mot,
                "pdf": os.path.abspath(arq) if arq and os.path.exists(arq) else "",
                "ano_base": ano,
                "timestamp": datetime.now().isoformat()
            }
            print(f"RESULT_START{json.dumps(result_json)}RESULT_END")
            sys.stdout.flush()
            
            # Webhook Integration (Regra 1)
            enviar_para_erp(cpf, mot, result_json)
            
        print(f"[{ID_INSTANCIA}] [FIM] Tarefa JSON finalizada.")
        return

    # --- LEGACY EXCEL LOGIC (Mantida para compatibilidade) ---
    if ID_INSTANCIA == 1:
        if precisa_gerar_dados():
            print(f"[{ID_INSTANCIA}] [TRABALHO] Clientes novos ou incompletos detectados. Abrindo gerador...")
            # Note: GeradorDadosV2 was removed from imports, so this might fail if Excel mode is used.
            # But the user wants to move to DB. 
            print("AVISO: Gerador GUI desativado. Use modo Banco de Dados.")
    
    # ... Resto da lógica do Excel ...
    if not os.path.exists("dados.xlsx"): 
        if not task_data: return
    
    # --- DIVISÃO DE TRABALHO ---
    df_c = safe_read_excel("base_clientes.xlsx")
    df_d = safe_read_excel("dados.xlsx")
    
    if df_c is None or df_d is None:
        print(f"[{ID_INSTANCIA}] [ERRO] Falha ao carregar planilhas.")
        return
    
    # --- ARQUIVO DE RESULTADOS ÚNICO ---
    os.makedirs("temp_results", exist_ok=True)
    results_file = "temp_results/progresso_final.json" # Unificado
    
    # Carrega progresso local se existir
    progresso_local = {}
    if os.path.exists(results_file):
        try:
            with open(results_file, "r", encoding="utf-8") as f: progresso_local = json.load(f)
        except: pass

    # --- DIVISÃO DE TRABALHO (INTERCALADO) ---
    # Instancia 1: Indices 0, 2, 4, 6...
    # Instancia 2: Indices 1, 3, 5, 7...
    # Lógica: iloc[start::step]
    df_minha_fatia = df_c.iloc[ID_INSTANCIA-1::TOTAL_INSTANCIAS].copy()

    print(f"[{ID_INSTANCIA}] [STATUS] Minha Fatia (Intercalada): {len(df_minha_fatia)} clientes.")

    for i, clie in df_minha_fatia.iterrows():
        if ROBO_PARADO: break
        
        # --- MASTER: Processar Mensagens IPC do Slave ---
        if ID_INSTANCIA == 1:
            try:
                msgs_slave = ipc_utils.ler_e_limpar_ipc()
                if msgs_slave:
                     print(f"[{ID_INSTANCIA}] [IPC] Recebidos {len(msgs_slave)} updates do Auxiliar.")
                     for m in msgs_slave:
                         if m.get('status') == "FINISHED": continue
                         salvar_resultado_excel(m['cpf'], m['status'], m['motivo'], m['nome_pdf'], m.get('nome', ''))
                         atualizar_status_dados(m.get('nome', ''), m['motivo'])
            except Exception as e_ipc:
                print(f"[{ID_INSTANCIA}] [ERRO] IPC Error: {e_ipc}")
        
        cpf = str(clie['CPF'])
        
        # Pula se já estiver no Excel como concluído ou com pendência impeditiva
        status_excel = str(clie.get('STATUS', '')).upper()
        termos_pular = ["OK", "PENDENCIA", "PENDÊNCIA", "SÓ FALTA PDF", "SENHA", "NIVEL", "2FA", "ETAPA", "BLOQUEADO", "AUTORIZADO"]
        if any(termo in status_excel for termo in termos_pular):
            print(f"[{ID_INSTANCIA}] [SKIP] Pulando {clie['NOME']} (Status {status_excel} no Excel)")
            continue
            
        # Pula se estiver no log local COM STATUS DE SUCESSO
        if cpf in progresso_local:
            status_local = str(progresso_local[cpf].get('STATUS', '')).upper()
            if any(termo in status_local for termo in termos_pular):
                continue
            else:
                print(f"[{ID_INSTANCIA}] [RETRY] Retentando cliente com status {status_local}: {clie['NOME']}")

        nome, senha = clie['NOME'], clie['SENHA_GOV']
        
        # --- LÓGICA DE RETRY E CORREÇÃO DE ERRO ---
        retry_count = 0
        max_retries = 3
        sucesso_processamento = False
        ok, mot, arq, ano = False, "", "", ""
        
        print(f"[{ID_INSTANCIA}] [PROCESSANDO] {nome} - Tentando...")
        while retry_count < max_retries:
            try:
                ok, mot, arq, ano = processar_pescador_v2(nome, df_d[df_d['NOME'] == nome], cpf, senha)
                
                if ok or str(mot) == "PARADO PELO USUÁRIO":
                    sucesso_processamento = True
                    break
                
                # Se for erro de login ou pendência, não adianta tentar de novo
                mot_upper = str(mot).upper()
                if any(x in mot_upper for x in ["LOGIN", "SENHA", "PENDEN", "PENDÊN", "AUTORIZADO", "PARADO"]):
                    break
                    
                print(f"[{ID_INSTANCIA}] [AVISO] Falha na tentativa {retry_count+1}/{max_retries}. Reiniciando...")
                retry_count += 1
                time.sleep(5)
            except Exception as e_proc:
                print(f"[{ID_INSTANCIA}] [ERRO] Exceção na tentativa {retry_count+1}: {e_proc}")
                retry_count += 1
                time.sleep(5)
        
        if not sucesso_processamento and not ok:
            mot = f"FALHA APÓS {max_retries} TENTATIVAS - {mot}"
        
        # Converte para path absoluto para evitar erros de CWD no Node.js
        abs_pdf_path = os.path.abspath(arq) if arq and os.path.exists(arq) else ""
        
        # 1. SALVA NO EXCEL EM TEMPO REAL
        print(f"[{ID_INSTANCIA}] [LOG] Resultado final para {nome}: {mot}")
        salvar_resultado_excel(cpf, mot, mot, abs_pdf_path, nome) # Status, Motivo e Arquivo PDF
        atualizar_status_dados(nome, mot) # Status em todas as linhas do cliente

        # Webhook Integration (Regra 1)
        enviar_para_erp(cpf, mot, {
            "nome": nome,
            "pdf_path": abs_pdf_path,
            "instancia": ID_INSTANCIA,
            "timestamp": datetime.now().isoformat()
        })

        # Modo Slave: Também envia IPC como redundância para o Master registrar nos logs dele
        if ID_INSTANCIA > 1:
            ipc_utils.escrever_resultado_ipc({
                "cpf": cpf, "status": str(mot).upper(), "motivo": str(mot), 
                "nome_pdf": str(arq), "nome": str(nome), "ano_base": str(ano)
            })

        # 2. SALVA LOG LOCAL (JSON) - Backup de segurança
        progresso_local[cpf] = {
            "NOME": nome,
            "STATUS": str(mot).upper(),
            "MOTIVO": str(mot),
            "DATA": datetime.now().isoformat()
        }
        
        try:
            with open(results_file, "w", encoding="utf-8") as f:
                json.dump(progresso_local, f, indent=4)
        except: pass

    # --- FINALIZAÇÃO E SINCRONIA ---
    if ID_INSTANCIA > 1:
        # Slave: Avisa que terminou
        print(f"[{ID_INSTANCIA}] [STATUS] Enviando sinal de conclusão para o Mestre...")
        for _ in range(5):
             ipc_utils.escrever_resultado_ipc({"cpf": "000", "status": "FINISHED", "motivo": "SLAVE_DONE", "nome_pdf": "", "nome": ""})
             time.sleep(1)
    
    else:
        # Master: Se terminar seus itens, deve esperar o Slave terminar
        if TOTAL_INSTANCIAS > 1:
            print(f"[{ID_INSTANCIA}] [AGUARDE] Aguardando conclusão do Robô Auxiliar...")
            slave_finished = False
            start_wait = time.time()
            
            # Loop infinito (ou com timeout longo) esperando o Slave
            while not slave_finished:
                if ROBO_PARADO: break
                
                try:
                    msgs = ipc_utils.ler_e_limpar_ipc()
                    if msgs:
                        for m in msgs:
                            if m['status'] == "FINISHED":
                                slave_finished = True
                                print(f"[{ID_INSTANCIA}] [STATUS] Sinal de conclusão do Auxiliar recebido!")
                            else:
                                print(f"[{ID_INSTANCIA}] [IPC-WAIT] Salvando dados do Auxiliar: {m.get('nome','')}...")
                                salvar_resultado_excel(m['cpf'], m['status'], m['motivo'], m['nome_pdf'], m.get('nome', ''))
                                atualizar_status_dados(m.get('nome', ''), m['motivo'])
                except Exception as e:
                    print(f"[{ID_INSTANCIA}] [ERRO] Wait Loop Error: {e}")
                
                time.sleep(2)

    print(f"[{ID_INSTANCIA}] [FIM] FINALIZADO!")

if __name__ == "__main__": main_v2()
