import tkinter as tk
from tkinter import ttk, messagebox
import ctypes

class AssistenteLogin:
    def __init__(self, root, nome, cpf, senha, x=None, y=None, cor="#d4af37"):
        self.root = root
        self.root.title(f"CONHEÇA SEU CLIENTE - {nome}")
        
        # Cores Premium (Escritório)
        self.colors = {
            "bg": "#0c0d10",      # Navy Profundo
            "card": "#1e293b",    # Slate Dark
            "accent": "#d4af37",  # Ouro (Gold)
            "text": "#f8fafc",    # Gelo
            "subtext": "#94a3b8", # Slate Light
            "success": "#10b981", # Emerald
            "warning": "#f59e0b", # Amber
            "danger": "#ef4444"   # Rose
        }
        
        # Configuração da Janela (Ainda mais compacta)
        self.root.configure(bg=self.colors["bg"])
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", 0.98)
        
        width, height = 280, 270
        if x is not None and y is not None:
            self.root.geometry(f"{width}x{height}+{x}+{y}")
        else:
            self.root.geometry(f"{width}x{height}")

        self.nome = nome
        self.cpf = cpf
        self.senha = senha
        self.cor_robo = cor 
        self.resultado = None

        # --- CONTAINER PRINCIPAL ---
        main_frame = tk.Frame(self.root, bg=self.colors["bg"], highlightbackground=self.colors["accent"], 
                             highlightthickness=1, borderwidth=0)
        main_frame.pack(fill="both", expand=True)

        # Header (Barra de Arraste)
        header = tk.Frame(main_frame, bg=self.colors["bg"], height=35)
        header.pack(fill="x")
        header.bind("<Button-1>", self.start_move)
        header.bind("<B1-Motion>", self.do_move)
        
        tk.Label(header, text="🔑 ACESSO AO PORTAL", 
                 font=("Segoe UI Black", 7), bg=self.colors["bg"], 
                 fg=self.colors["accent"]).pack(side="left", padx=15, pady=8)

        # Body
        body = tk.Frame(main_frame, bg=self.colors["bg"], padx=15, pady=5)
        body.pack(fill="both", expand=True)

        # Nome do Cliente
        tk.Label(body, text=nome.upper(), 
                 font=("Segoe UI", 9, "bold"), bg=self.colors["bg"], 
                 fg=self.colors["text"], wraplength=260).pack(pady=(0, 10))

        # Campos
        self.criar_campo(body, "CPF", cpf)
        self.criar_campo(body, "SENHA GOV.BR", senha)

        # Botões
        btn_frame = tk.Frame(body, bg=self.colors["bg"])
        btn_frame.pack(fill="x", pady=(10, 0))

        self.btn_done = tk.Button(btn_frame, text="LOGADO COM SUCESSO", 
                                 font=("Segoe UI Black", 8), bg=self.colors["accent"], 
                                 fg=self.colors["bg"], activebackground="#e5c158", 
                                 relief="flat", cursor="hand2", command=self.confirmar_sucesso,
                                 pady=6)
        self.btn_done.pack(fill="x", pady=2)

        self.btn_issue = tk.Button(btn_frame, text="INFORMAR PENDÊNCIA", 
                                  font=("Segoe UI", 8, "bold"), bg=self.colors["card"], 
                                  fg=self.colors["subtext"], activebackground="#334155", 
                                  relief="flat", cursor="hand2", command=self.abrir_menu_pendencia,
                                  pady=5)
        self.btn_issue.pack(fill="x")

        # Configuração para bordas arredondadas (Windows 11)
        try:
            self.root.update()
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd: hwnd = self.root.winfo_id()
            ctypes.windll.dwmapi.DwmSetWindowAttribute(hwnd, 33, ctypes.byref(ctypes.c_int(2)), 4)
        except: pass

    def criar_campo(self, parent, label, valor):
        wrapper = tk.Frame(parent, bg=self.colors["bg"])
        wrapper.pack(fill="x", pady=6)
        
        tk.Label(wrapper, text=label, font=("Segoe UI Black", 7), 
                 bg=self.colors["bg"], fg=self.colors["subtext"]).pack(anchor="w", padx=2)
        
        entry_frame = tk.Frame(wrapper, bg=self.colors["card"], padx=15, pady=8)
        entry_frame.pack(fill="x", pady=2)
        
        val_label = tk.Label(entry_frame, text=valor, font=("Consolas", 12), 
                            bg=self.colors["card"], fg=self.colors["text"])
        val_label.pack(side="left")
        
        copy_btn = tk.Button(entry_frame, text="COPIAR", font=("Segoe UI Black", 7), 
                            bg=self.colors["accent"], fg=self.colors["bg"], 
                            relief="flat", padx=12, cursor="hand2",
                            command=lambda: self.copiar(valor))
        copy_btn.pack(side="right")

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def do_move(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.root.winfo_x() + deltax
        y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{x}+{y}")

    def copiar(self, texto):
        self.root.clipboard_clear()
        self.root.clipboard_append(texto)
        print(f"[Copiado] {texto[:3]}...")

    def confirmar_sucesso(self):
        self.resultado = "OK"
        self.root.destroy()

    def abrir_menu_pendencia(self):
        menu = tk.Toplevel(self.root)
        menu.configure(bg=self.colors["bg"])
        menu.overrideredirect(True)
        menu.attributes("-topmost", True)
        
        w, h = 280, 320
        mx = self.root.winfo_x() + 20
        my = self.root.winfo_y() + 20
        menu.geometry(f"{w}x{h}+{mx}+{my}")
        
        # Borda de acento no menu
        m_frame = tk.Frame(menu, bg=self.colors["bg"], highlightbackground=self.colors["accent"], 
                          highlightthickness=1, borderwidth=0)
        m_frame.pack(fill="both", expand=True)

        tk.Label(m_frame, text="QUAL O PROBLEMA?", font=("Segoe UI Black", 9), 
                 bg=self.colors["bg"], fg=self.colors["accent"], pady=20).pack()
        
        options = [
            ("Senha Inválida", "PENDENTE_SENHA"),
            ("Conta Bronze (Gov.br)", "PENDENTE_NIVEL"),
            ("Autenticação 2FA", "PENDENTE_2FA"),
            ("Não Autorizado", "NÃO AUTORIZADO")
        ]
        
        for label, code in options:
            btn = tk.Button(m_frame, text=label, bg=self.colors["card"], fg="white",
                            relief="flat", font=("Segoe UI", 9), pady=12, cursor="hand2",
                            activebackground=self.colors["accent"], activeforeground=self.colors["bg"],
                            command=lambda c=code: self.set_pendencia(c))
            btn.pack(fill="x", padx=30, pady=4)

        tk.Button(m_frame, text="VOLTAR", font=("Segoe UI Black", 8), 
                  bg=self.colors["bg"], fg=self.colors["danger"], relief="flat",
                  pady=10, command=menu.destroy).pack(pady=10)

        # Arredondado no Menu
        try:
            menu.update()
            hwnd = ctypes.windll.user32.GetParent(menu.winfo_id())
            if not hwnd: hwnd = menu.winfo_id()
            ctypes.windll.dwmapi.DwmSetWindowAttribute(hwnd, 33, ctypes.byref(ctypes.c_int(2)), 4)
        except: pass

    def set_pendencia(self, codigo):
        self.resultado = codigo
        self.root.destroy()

def invocar_assistente(nome, cpf, senha, x=None, y=None, cor="#d4af37"):
    root = tk.Tk()
    app = AssistenteLogin(root, nome, cpf, senha, x, y, cor)
    root.mainloop()
    return app.resultado

if __name__ == "__main__":
    invocar_assistente("TESTE DE DESIGN", "123.456.789-00", "GoldSenha123")
