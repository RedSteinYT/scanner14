const palabrasReservadas = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if",
    "int", "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"
]);


const simbolosAgrupacion = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);
const operadoresSimples = new Set(["+", "-", "*", "/", "%", "=", "<", ">", "!", "&", "|", "^", "~", "?", ".", ":"]);

const entradaArchivo = document.getElementById("fileInput");
const botonArchivo = document.querySelector(".file-input-button");
const textoNombreArchivo = document.querySelector(".file-name");
const textoArchivoSpan = document.querySelector(".file-text");
const areaCodigo = document.getElementById("codeArea");

const botonX = document.getElementById("clearBtn");
const botonLimpiarTotal = document.getElementById("cleanCodeBtn");

function limpiarTodo() {
    entradaArchivo.value = "";
    areaCodigo.value = "";
    
    if(textoArchivoSpan) textoArchivoSpan.textContent = "Ningún archivo seleccionado";
    if(textoNombreArchivo) textoNombreArchivo.classList.remove("selected");
    
    if(botonX) botonX.classList.remove("visible");
    if(botonLimpiarTotal) botonLimpiarTotal.style.display = "none";
    
    document.getElementById("stats").innerHTML = "";
}

if(botonLimpiarTotal) {
    botonLimpiarTotal.addEventListener("click", limpiarTodo);
}
if(botonX) {
    botonX.addEventListener("click", limpiarTodo);
}
if(botonArchivo) {
    botonArchivo.addEventListener("click", () => entradaArchivo.click());
}
if(entradaArchivo) {
    entradaArchivo.addEventListener("change", function(e){
        const archivo = e.target.files[0];
        
        if(archivo){
            if (!archivo.name.toLowerCase().endsWith(".c")) {
                alert("Error: Solo se permiten archivos de código C (.c)");
                limpiarTodo();
                return; 
            }
            if(textoArchivoSpan) textoArchivoSpan.textContent = archivo.name;
            if(textoNombreArchivo) textoNombreArchivo.classList.add("selected");
            if(botonX) botonX.classList.add("visible");
            if(botonLimpiarTotal) botonLimpiarTotal.style.display = "block";
            const lector = new FileReader();
            lector.onload = function(ev){
                areaCodigo.value = ev.target.result;
            };
            lector.readAsText(archivo);
        } else {
            limpiarTodo();
        }
    });
}

if(areaCodigo) {
    areaCodigo.addEventListener("input", function() {
        if(this.value.length > 0) {
            if(botonLimpiarTotal) botonLimpiarTotal.style.display = "block";
        } else {
            if(!textoNombreArchivo.classList.contains("selected")) {
                 if(botonLimpiarTotal) botonLimpiarTotal.style.display = "none";
            }
        }
    });
}

document.getElementById("scanBtn").addEventListener("click", analizarCodigo);

// FUNCIONES AUXILIARES
function esDigito(caracter) { return caracter >= '0' && caracter <= '9'; }
function esDigitoHex(caracter) { return esDigito(caracter) || (caracter >= 'a' && caracter <= 'f') || (caracter >= 'A' && caracter <= 'F'); }
function esAlfa(caracter) { return (caracter >= 'a' && caracter <= 'z') || (caracter >= 'A' && caracter <= 'Z') || caracter === '_'; }
function esEspacio(caracter) { return caracter === ' ' || caracter === '\t' || caracter === '\r'; }

// FUNCIÓN PRINCIPAL DEL SCANNER
function analizarCodigo(){
    const codigo = document.getElementById("codeArea").value;
    const longitud = codigo.length;
    let i = 0;
    let lineaActual = 1;

    const estadisticas = {
        variables: [],
        reservadas: [],
        enteros: [],
        reales: [],
        operadores: [],
        agrupaciones: [],
        cadenas: [],
        errores: []
    };

    while (i < longitud) {
        const caracter = codigo[i];

        // CONTROL DE LINEAS
        if (caracter === '\n') {
            lineaActual++;
            i++;
            continue;
        }

        // 1. IGNORAR ESPACIOS
        if (esEspacio(caracter)) {
            i++;
            continue;
        }

        // 2. IGNORAR PREPROCESADOR
        if (caracter === '#') {
            while (i < longitud && codigo[i] !== '\n') {
                i++;
            }
            continue;
        }

        // 3. DETECTAR COMENTARIOS
        if (caracter === '/') {
            const siguiente = codigo[i + 1];
            if (siguiente === '/') { 
                i += 2;
                while (i < longitud && codigo[i] !== '\n') i++;
                continue;
            } else if (siguiente === '*') {
                i += 2;
                while (i < longitud - 1 && !(codigo[i] === '*' && codigo[i + 1] === '/')) {
                    if (codigo[i] === '\n') lineaActual++;
                    i++;
                }
                i += 2; 
                continue;
            } else if (siguiente === '=') {
                estadisticas.operadores.push("/=");
                i += 2;
                continue;
            } else {
                estadisticas.operadores.push("/");
                i++;
                continue;
            }
        }

        // 4. DETECTAR CADENAS
        if (caracter === '"' || caracter === "'") {
            const tipoComilla = caracter;
            let cadena = caracter;
            i++;
            while (i < longitud) {
                if (codigo[i] === '\n') {
                   estadisticas.errores.push(`String sin cerrar en línea ${lineaActual}`);
                   break; 
                }
                if (codigo[i] === '\\') {
                    cadena += codigo[i]; i++; cadena += codigo[i];
                } else {
                    if (codigo[i] === tipoComilla) {
                        cadena += codigo[i]; i++; break;
                    }
                    cadena += codigo[i];
                }
                i++;
            }
            estadisticas.cadenas.push(cadena);
            continue;
        }

        // 5. DETECTAR NÚMEROS (Hex, Real, Entero)
        if (esDigito(caracter)) {
            let num = "";
            
            if (caracter === '0' && (codigo[i+1] === 'x' || codigo[i+1] === 'X')) {
                num += "0x"; i += 2;
                while (i < longitud && esDigitoHex(codigo[i])) { num += codigo[i]; i++; }
            } 
            else {
                let esReal = false;
                while (i < longitud && esDigito(codigo[i])) { num += codigo[i]; i++; }
                
                if (i < longitud && codigo[i] === '.') {
                    esReal = true; num += '.'; i++;
                    while (i < longitud && esDigito(codigo[i])) { num += codigo[i]; i++; }
                }
                
                if (i < longitud && (codigo[i] === 'e' || codigo[i] === 'E')) {
                    let tempI = i + 1;
                    if (tempI < longitud && (codigo[tempI] === '+' || codigo[tempI] === '-')) tempI++;
                    if (tempI < longitud && esDigito(codigo[tempI])) {
                        esReal = true; num += codigo[i]; i++;
                        if (codigo[i] === '+' || codigo[i] === '-') { num += codigo[i]; i++; }
                        while (i < longitud && esDigito(codigo[i])) { num += codigo[i]; i++; }
                    }
                }

                while (i < longitud && ['l', 'L', 'u', 'U', 'f', 'F'].includes(codigo[i])) {
                    num += codigo[i];
                    i++;
                }
                                
                if (esReal) estadisticas.reales.push(num); else estadisticas.enteros.push(num);
                continue;
            }
            
            while (i < longitud && ['l', 'L', 'u', 'U'].includes(codigo[i])) {
                num += codigo[i];
                i++;
            }
            
            estadisticas.enteros.push(num);
            continue;
        }

        // 6. DETECTAR IDENTIFICADORES
        if (esAlfa(caracter)) {
            let palabra = "";
            while (i < longitud && (esAlfa(codigo[i]) || esDigito(codigo[i]))) {
                palabra += codigo[i]; i++;
            }
            if (palabrasReservadas.has(palabra)) estadisticas.reservadas.push(palabra);
            else estadisticas.variables.push(palabra);
            continue;
        }

        // 7. DETECTAR OPERADORES Y ERRORES
        const tresCaracteres = caracter + (codigo[i+1] || "") + (codigo[i+2] || "");
        if (["<<=", ">>="].includes(tresCaracteres)) {
            estadisticas.operadores.push(tresCaracteres);
            i += 3;
            continue;
        }

        const dosCaracteres = caracter + (codigo[i+1] || ""); 
        const operadoresCompuestos = [
            "==", "!=", "<=", ">=", "&&", "||", "++", "--", 
            "->", "+=", "-=", "*=", "<<", ">>" 
        ];

        if (operadoresCompuestos.includes(dosCaracteres)) {
            estadisticas.operadores.push(dosCaracteres);
            i += 2;
            continue;
        }

        if (simbolosAgrupacion.has(caracter)) {
            estadisticas.agrupaciones.push(caracter);
        } else if (operadoresSimples.has(caracter)) {
            estadisticas.operadores.push(caracter);
        } else {
            estadisticas.errores.push(`Carácter inválido '${caracter}' en línea ${lineaActual}`);
        }
        i++;
    }

    mostrarEstadisticas(estadisticas);
}

function mostrarEstadisticas(stats){
    let html = "<h2>📊 Estadísticas del Scanner</h2>";
    
    if (stats.errores.length > 0) {
        html += `<div class="error-container">
                    <div class="error-header">
                        <span class="error-icon">⚠️</span>
                        Errores Lexicográficos Encontrados:
                    </div>
                    <ul class="error-list">`;
        
        stats.errores.forEach(err => {
            html += `<li>${err}</li>`;
        });

        html += `   </ul>
                 </div>`;
    }

    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr style='background:#f0f0f0; text-align:left;'><th>Tipo</th><th>Cantidad</th><th>Tokens Encontrados</th></tr>";

    for(const tipo in stats){
        if (tipo === 'errores') continue;
        if (stats[tipo].length === 0) continue;
        const elementos = stats[tipo].join(", ");
        
        let tipoLegible = tipo;

        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>${tipoLegible}</td>
              <td>${stats[tipo].length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${elementos}</td>
             </tr>`;
    }
    
    if (stats.reservadas.length > 0) {
        const unicasReservadas = [...new Set(stats.reservadas)];
        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>reservadas únicas</td>
              <td>${unicasReservadas.length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${unicasReservadas.join(", ")}</td>
             </tr>`;
    }

    html += "</table>";
    document.getElementById("stats").innerHTML = html;
}
