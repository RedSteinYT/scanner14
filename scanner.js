// 1. Lista de palabras reservadas
const reservedWords = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if",
    "int", "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
    // Eliminamos 'include' y 'define' porque el preprocesador los limpia
    "main", "printf"
]);

// 2. Símbolos conocidos
const agrupacionSimbolos = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);
const operadoresSimples = new Set(["+", "-", "*", "/", "%", "=", "<", ">", "!", "&", "|", "^", "~", "?", ".", ":"]);

// Manejador del botón de archivo
const fileInput = document.getElementById("fileInput");
const fileButton = document.querySelector(".file-input-button");
const fileNameSpan = document.querySelector(".file-name");
const fileTextSpan = document.querySelector(".file-text");
const clearBtn = document.getElementById("clearBtn");
const codeArea = document.getElementById("codeArea");

// Función para limpiar archivo y código
function clearFile() {
    fileInput.value = "";
    codeArea.value = "";
    if(fileTextSpan) {
        fileTextSpan.textContent = "Ningún archivo seleccionado";
    }
    if(fileNameSpan) {
        fileNameSpan.classList.remove("selected");
    }
    if(clearBtn) {
        clearBtn.classList.remove("visible");
    }
}

// Botón de limpiar
if(clearBtn) {
    clearBtn.addEventListener("click", clearFile);
}

// Evitar errores si los elementos del DOM no existen (por si acaso)
if(fileButton) {
    fileButton.addEventListener("click", function() {
        fileInput.click();
    });
}

if(fileInput) {
    fileInput.addEventListener("change", function(e){
        const file = e.target.files[0];
        if(file){
            if(fileTextSpan) {
                fileTextSpan.textContent = file.name;
            }
            if(fileNameSpan) {
                fileNameSpan.classList.add("selected");
            }
            if(clearBtn) {
                clearBtn.classList.add("visible");
            }
            const reader = new FileReader();
            reader.onload = function(ev){
                codeArea.value = ev.target.result;
            };
            reader.readAsText(file);
        } else {
            if(fileTextSpan) {
                fileTextSpan.textContent = "Ningún archivo seleccionado";
            }
            if(fileNameSpan) {
                fileNameSpan.classList.remove("selected");
            }
            if(clearBtn) {
                clearBtn.classList.remove("visible");
            }
        }
    });
}

// Detectar cuando el usuario escribe en el textarea
// Si hay un archivo cargado y el usuario edita, se mantiene el nombre pero se puede limpiar
if(codeArea) {
    codeArea.addEventListener("input", function() {
        // Si hay texto y no hay archivo cargado, no mostramos nada especial
        // Si hay archivo cargado y se edita, se mantiene el indicador
        if(this.value.length > 0 && clearBtn) {
            clearBtn.classList.add("visible");
        } else if(this.value.length === 0) {
            clearFile();
        }
    });
}

document.getElementById("scanBtn").addEventListener("click", scanCode);

// --- FUNCIONES AUXILIARES ---
function isDigit(char) { return char >= '0' && char <= '9'; }
function isHexDigit(char) { return isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F'); }
function isAlpha(char) { return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'; }
function isSpace(char) { return char === ' ' || char === '\t' || char === '\r'; }

// --- LÓGICA PRINCIPAL (AFD ESTRICTO) ---
function scanCode(){
    const code = document.getElementById("codeArea").value;
    const length = code.length;
    let i = 0;
    let lineaActual = 1;

    const stats = {
        variables: [],
        reservadas: [],
        enteros: [],
        reales: [],
        operadores: [],
        agrupaciones: [],
        cadenas: [],
        errores: []
    };

    while (i < length) {
        const char = code[i];

        // 0. CONTROL DE LÍNEAS
        if (char === '\n') {
            lineaActual++;
            i++;
            continue;
        }

        // 1. IGNORAR ESPACIOS
        if (isSpace(char)) {
            i++;
            continue;
        }

        // 2. IGNORAR PREPROCESADOR (#include, #define)
        if (char === '#') {
            while (i < length && code[i] !== '\n') {
                i++;
            }
            continue;
        }

        // 3. DETECTAR COMENTARIOS Y DIVISIÓN
        if (char === '/') {
            const nextChar = code[i + 1];
            if (nextChar === '/') { // Comentario de línea
                i += 2;
                while (i < length && code[i] !== '\n') i++;
                continue;
            } else if (nextChar === '*') { // Comentario de bloque
                i += 2;
                while (i < length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
                    if (code[i] === '\n') lineaActual++;
                    i++;
                }
                i += 2; 
                continue;
            } else if (nextChar === '=') {
                stats.operadores.push("/=");
                i += 2;
                continue;
            } else {
                stats.operadores.push("/");
                i++;
                continue;
            }
        }

        // 4. DETECTAR CADENAS
        if (char === '"' || char === "'") {
            const quoteType = char;
            let str = char;
            i++;
            while (i < length) {
                if (code[i] === '\n') {
                   stats.errores.push(`String sin cerrar en línea ${lineaActual}`);
                   break; 
                }
                if (code[i] === '\\') {
                    str += code[i]; i++; str += code[i];
                } else {
                    if (code[i] === quoteType) {
                        str += code[i]; i++; break;
                    }
                    str += code[i];
                }
                i++;
            }
            stats.cadenas.push(str);
            continue;
        }

        // 5. DETECTAR NÚMEROS (Con corrección para L, U, F)
        if (isDigit(char)) {
            let num = "";
            
            // Caso Hexadecimal (0x...)
            if (char === '0' && (code[i+1] === 'x' || code[i+1] === 'X')) {
                num += "0x"; i += 2;
                while (i < length && isHexDigit(code[i])) { num += code[i]; i++; }
            } 
            else {
                // Caso Decimal / Real
                let isReal = false;
                while (i < length && isDigit(code[i])) { num += code[i]; i++; }
                
                if (i < length && code[i] === '.') {
                    isReal = true; num += '.'; i++;
                    while (i < length && isDigit(code[i])) { num += code[i]; i++; }
                }
                
                if (i < length && (code[i] === 'e' || code[i] === 'E')) {
                    let tempI = i + 1;
                    if (tempI < length && (code[tempI] === '+' || code[tempI] === '-')) tempI++;
                    if (tempI < length && isDigit(code[tempI])) {
                        isReal = true; num += code[i]; i++;
                        if (code[i] === '+' || code[i] === '-') { num += code[i]; i++; }
                        while (i < length && isDigit(code[i])) { num += code[i]; i++; }
                    }
                }

                // --- DETECCIÓN DE SUFIJOS (L, U, F) ---
                if (i < length) {
                    const suffix = code[i];
                    if (['l', 'L', 'u', 'U', 'f', 'F'].includes(suffix)) {
                        num += suffix; 
                        i++;
                        // A veces hay dos (ej: 10UL), miramos uno más
                        if (i < length && ['l', 'L', 'u', 'U'].includes(code[i])) {
                            num += code[i]; 
                            i++;
                        }
                    }
                }
                
                if (isReal) stats.reales.push(num); else stats.enteros.push(num);
                continue;
            }
            
            // Si fue Hexadecimal, también chequeamos sufijos (ej: 0xFFu)
            if (i < length) {
                const suffix = code[i];
                if (['l', 'L', 'u', 'U'].includes(suffix)) {
                    num += suffix; i++;
                     if (i < length && ['l', 'L', 'u', 'U'].includes(code[i])) {
                        num += code[i]; i++;
                    }
                }
            }
            stats.enteros.push(num);
            continue;
        }

        // 6. DETECTAR IDENTIFICADORES
        if (isAlpha(char)) {
            let word = "";
            while (i < length && (isAlpha(code[i]) || isDigit(code[i]))) {
                word += code[i]; i++;
            }
            if (reservedWords.has(word)) stats.reservadas.push(word);
            else stats.variables.push(word);
            continue;
        }

        // 7. DETECTAR OPERADORES Y ERRORES
        // Primero miramos si hay operadores de 3 caracteres (<<=, >>=)
        const threeChars = char + (code[i+1] || "") + (code[i+2] || "");
        if (["<<=", ">>="].includes(threeChars)) {
            stats.operadores.push(threeChars);
            i += 3;
            continue;
        }

        // Luego miramos si hay operadores de 2 caracteres
        const twoChars = char + (code[i+1] || ""); 
        const operadoresCompuestos = [
            "==", "!=", "<=", ">=", "&&", "||", "++", "--", 
            "->", "+=", "-=", "*=", "<<", ">>" 
        ];

        if (operadoresCompuestos.includes(twoChars)) {
            stats.operadores.push(twoChars);
            i += 2;
            continue;
        }

        // Finalmente operadores simples y agrupaciones
        if (agrupacionSimbolos.has(char)) {
            stats.agrupaciones.push(char);
        } else if (operadoresSimples.has(char)) {
            stats.operadores.push(char);
        } else {
            stats.errores.push(`Carácter inválido '${char}' en línea ${lineaActual}`);
        }
        i++;
    }

    mostrarEstadisticas(stats);
}

function mostrarEstadisticas(stats){
    let html = "<h2>📊 Estadísticas del Scanner</h2>";
    
    if (stats.errores.length > 0) {
        html += "<div style='background:#ffcccc; padding:10px; border:1px solid red; margin-bottom:10px;'>";
        html += "<h3 style='margin:0; color:red;'>⚠️ Errores Lexicográficos Encontrados:</h3>";
        html += "<ul>";
        stats.errores.forEach(err => html += `<li>${err}</li>`);
        html += "</ul></div>";
    }

    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr style='background:#f0f0f0; text-align:left;'><th>Tipo</th><th>Cantidad</th><th>Tokens Encontrados</th></tr>";

    for(const tipo in stats){
        if (tipo === 'errores') continue;
        if (stats[tipo].length === 0) continue;
        const elementos = stats[tipo].join(", ");
        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>${tipo}</td>
              <td>${stats[tipo].length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${elementos}</td>
             </tr>`;
    }
    
    if (stats.reservadas.length > 0) {
        const uniqueReservadas = [...new Set(stats.reservadas)];
        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>reservadas únicas</td>
              <td>${uniqueReservadas.length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${uniqueReservadas.join(", ")}</td>
             </tr>`;
    }

    html += "</table>";
    document.getElementById("stats").innerHTML = html;
}

