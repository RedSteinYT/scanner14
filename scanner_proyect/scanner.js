// 1. Lista de palabras reservadas en C
const reservedWords = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if",
    "int", "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
    "include", "define", "main", "printf"
]);

// 2. Definimos qué símbolos son de Agrupación para separarlos después
const agrupacionSimbolos = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);

document.getElementById("fileInput").addEventListener("change", function(e){
    const file = e.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.onload = function(ev){
            document.getElementById("codeArea").value = ev.target.result;
        };
        reader.readAsText(file);
    }
});

document.getElementById("scanBtn").addEventListener("click", scanCode);

function scanCode(){
    const code = document.getElementById("codeArea").value;

    const stats = {
        variables: [],
        reservadas: [],
        enteros: [],
        reales: [],
        operadores: [],
        agrupaciones: [],
        cadenas: []
    };

    // --- LA REGEX MAESTRA ---

    const mainRegex = /(\/\*[\s\S]*?\*\/|\/\/.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(0x[0-9a-fA-F]+)|((?:\d*\.\d+|\d+\.\d*|\d+)(?:[eE][+-]?\d+)?)|([a-zA-Z_]\w*)|(->|==|!=|<=|>=|\+\+|--|&&|\|\||<<|>>|\+=|-=|\*=|\/=|::|[+\-*\/%<>=!&|^~?#.(){}\[\],;])/g;

    let match;

    while ((match = mainRegex.exec(code)) !== null) {
        const token = match[0];

        // GRUPO 1: Comentarios (Se ignora todo el comentario)
        if (match[1]) continue;

        // GRUPO 2: Cadenas
        else if (match[2]) {
            stats.cadenas.push(token);
        }

        // GRUPO 3: Hexadecimales
        else if (match[3]) {
            stats.enteros.push(token);
        }

        // GRUPO 4: Números (Reales y Enteros Decimales)
        else if (match[4]) {
            if (token.includes('.') || token.toLowerCase().includes('e')) {
                stats.reales.push(token);
            } else {
                stats.enteros.push(token);
            }
        }

        // GRUPO 5: Identificadores o Reservadas
        else if (match[5]) {
            if (reservedWords.has(token)) {
                stats.reservadas.push(token);
            } else {
                stats.variables.push(token);
            }
        }

        // GRUPO 6: Operadores y Agrupaciones
        else if (match[6]) {
            if (agrupacionSimbolos.has(token)) {
                stats.agrupaciones.push(token);
            } else {
                stats.operadores.push(token);
            }
        }
    }

    mostrarEstadisticas(stats);
}

function mostrarEstadisticas(stats){
    let html = "<h2>📊 Estadísticas del Scanner</h2>";
    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr style='background:#f0f0f0; text-align:left;'><th>Tipo</th><th>Cantidad</th><th>Tokens Encontrados</th></tr>";

    for(const tipo in stats){
        // Si el array está vacío, entonces no se mostrará esa fila
        if (stats[tipo].length === 0) continue;

        const elementos = stats[tipo].join(", ");
        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>${tipo}</td>
              <td>${stats[tipo].length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${elementos}</td>
             </tr>`;
    }

    // Reservadas Únicas
    if (stats.reservadas.length > 0) {
        const uniqueReservadas = [...new Set(stats.reservadas)];
        const elementosUnicos = uniqueReservadas.join(", ");
        html += `<tr>
              <td style='text-transform: capitalize; font-weight:bold;'>reservadas únicas</td>
              <td>${uniqueReservadas.length}</td>
              <td style='font-family: monospace; word-break: break-all;'>${elementosUnicos}</td>
             </tr>`;
    }

    html += "</table>";
    document.getElementById("stats").innerHTML = html;
}