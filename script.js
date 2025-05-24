/*
  Forza Quattro - Gioco 2 Player
  Lato client: gestisce il gioco (canvas, logica, turno, controllo vittoria) e
  comunica con save.php tramite AJAX (fetch) per registrare i record nel file record.json.
  
  I record salvati contengono:
    - Data/Ora
    - Nome Giocatore 1
    - Nome Giocatore 2
    - Risultato (nome del vincitore oppure "Pareggio")
*/

// COSTANTI & VARIABILI DI GIOCO
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const numCols = 7; // Numero di colonne del tabellone
const numRows = 6; // Numero di righe
const cellSize = canvas.width / numCols; // Dimensione di ogni cella
const radius = cellSize / 2 - 5; // Raggio delle pedine

let board = [];              // Matrice 2D che rappresenta il tabellone
let currentPlayer = 1;       // 1 = Giocatore 1, 2 = Giocatore 2
let gameOver = false;        // Flag per indicare la fine della partita
let winner = null;           // Contiene il vincitore (1, 2 o 0 per pareggio)
let player1Name = "Giocatore 1";
let player2Name = "Giocatore 2";

// Inizializza il tabellone (cancella il gioco corrente)
function initBoard() {
  player1Name = document.getElementById("inputPlayer1").value.trim() || "Giocatore 1";
  player2Name = document.getElementById("inputPlayer2").value.trim() || "Giocatore 2";
  board = [];
  for (let row = 0; row < numRows; row++) {
    board[row] = [];
    for (let col = 0; col < numCols; col++) {
      board[row][col] = 0; // 0 indica cella vuota
    }
  }
  currentPlayer = 1;
  gameOver = false;
  winner = null;
  drawBoard();
}

// Disegna il tabellone: sfondo, celle (cerchi bianchi) e, se presenti, le pedine
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0077b6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      let x = col * cellSize + cellSize / 2;
      let y = row * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff"; // Celle vuote
      ctx.fill();
      ctx.closePath();
      
      if (board[row][col] === 1) {
        drawDisc(x, y, "red");
      } else if (board[row][col] === 2) {
        drawDisc(x, y, "yellow");
      }
    }
  }
}

// Funzione che disegna una pedina (cerchio colorato) nel canvas
function drawDisc(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

// Determina la colonna in cui l'utente ha cliccato, in base alla coordinata x
function getColumnFromX(x) {
  return Math.floor(x / cellSize);
}

// Gestisce il click sul canvas per effettuare una mossa
canvas.addEventListener("click", function(event) {
  if (gameOver) return; // Se la partita è finita, ignora il click
  
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const col = getColumnFromX(x);
  
  for (let row = numRows - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = currentPlayer;
      drawBoard();
      
      // Controlla se con questa mossa si è vinto
      if (checkWin(row, col, currentPlayer)) {
        gameOver = true;
        winner = currentPlayer;
        let winName = (currentPlayer === 1 ? player1Name : player2Name);
        sendRecord(winName); // Invio il record al server
        setTimeout(() => alert(`Ha vinto ${winName}!`), 100);
      }
      // Controlla se il tabellone è pieno → pareggio
      else if (isBoardFull()) {
        gameOver = true;
        winner = 0;
        sendRecord("Pareggio");
        setTimeout(() => alert("Partita finita in pareggio!"), 100);
      }
      else {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
      }
      break;
    }
  }
});

// Verifica condizioni vittoria: controlla in 4 direzioni se ci sono 4 pedine allineate
function checkWin(row, col, player) {
  const directions = [
    { dr: 0, dc: 1 },   // Orizzontale
    { dr: 1, dc: 0 },   // Verticale
    { dr: 1, dc: 1 },   // Diagonale principale (\)
    { dr: 1, dc: -1 }   // Diagonale secondaria (/)
  ];
  
  for (let { dr, dc } of directions) {
    let count = 1;
    count += countInDirection(row, col, dr, dc, player);
    count += countInDirection(row, col, -dr, -dc, player);
    if (count >= 4) return true;
  }
  return false;
}

// Conta le pedine consecutive in una data direzione
function countInDirection(row, col, dr, dc, player) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < numRows && c >= 0 && c < numCols && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

// Ritorna true se il tabellone è pieno (nessuna cella vuota nella riga superiore)
function isBoardFull() {
  for (let col = 0; col < numCols; col++) {
    if (board[0][col] === 0) return false;
  }
  return true;
}

/* GESTIONE DEI RECORD (Comunicazione con il server tramite PHP) */

// Quando una partita termina, crea un record e lo invia al server
function sendRecord(result) {
  const date = new Date().toLocaleString("it-IT", { hour12: false });
  const newRecord = {
    date: date,
    player1: player1Name,
    player2: player2Name,
    result: result
  };
  
  // POST del nuovo record allo script PHP (save.php)
  fetch("save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newRecord)
  })
  .then(response => response.json())
  .then(data => {
    console.log("Record salvato:", data);
  })
  .catch(err => console.error("Errore nel salvataggio del record:", err));
}

/* VISUALIZZAZIONE DELLO STORICO */

// Recupera lo storico dei record dal server (via GET) e lo mostra in una tabella nella modale
function showHistory() {
  fetch("save.php")
  .then(response => response.json())
  .then(records => {
    const historyContent = document.getElementById("historyContent");
    historyContent.innerHTML = "";
    if (records.length === 0) {
      historyContent.innerHTML = "<p>Nessun record salvato.</p>";
      return;
    }
    const table = document.createElement("table");
    table.id = "historyTable";
    const header = document.createElement("tr");
    ["Data/Ora", "Giocatore 1", "Giocatore 2", "Risultato"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      header.appendChild(th);
    });
    table.appendChild(header);
    records.forEach(record => {
      const row = document.createElement("tr");
      const tdDate = document.createElement("td");
      tdDate.textContent = record.date;
      const tdPlayer1 = document.createElement("td");
      tdPlayer1.textContent = record.player1;
      const tdPlayer2 = document.createElement("td");
      tdPlayer2.textContent = record.player2;
      const tdResult = document.createElement("td");
      tdResult.textContent = record.result;
      row.appendChild(tdDate);
      row.appendChild(tdPlayer1);
      row.appendChild(tdPlayer2);
      row.appendChild(tdResult);
      table.appendChild(row);
    });
    historyContent.appendChild(table);
  })
  .catch(err => console.error("Errore nel recupero dello storico:", err));
}

/* GESTIONE DEI BOTTONI & MODALI */

// Avvia la partita: mostra il canvas, i controlli e inizializza il tabellone
document.getElementById("btnSetNames").addEventListener("click", function() {
  canvas.style.display = "block";
  document.getElementById("controls").style.display = "block";
  initBoard();
});

// Bottone "Nuova Partita": re-inizializza il tabellone (non tocca lo storico)
document.getElementById("btnReset").addEventListener("click", function() {
  initBoard();
});

// Bottone "Help": mostra la modale con le istruzioni di gioco
document.getElementById("btnHelp").addEventListener("click", function() {
  document.getElementById("helpModal").style.display = "block";
});

// Bottone "Mostra Storico": recupera e visualizza lo storico in una tabella nella modale
document.getElementById("btnHistory").addEventListener("click", function() {
  showHistory();
  document.getElementById("historyModal").style.display = "block";
});

// Gestione chiusura modali (clic sulla "X" o fuori dal contenuto)
document.getElementById("closeHelp").addEventListener("click", function() {
  document.getElementById("helpModal").style.display = "none";
});
document.getElementById("closeHistory").addEventListener("click", function() {
  document.getElementById("historyModal").style.display = "none";
});
window.addEventListener("click", function(event) {
  const helpModal = document.getElementById("helpModal");
  const historyModal = document.getElementById("historyModal");
  if (event.target === helpModal) helpModal.style.display = "none";
  if (event.target === historyModal) historyModal.style.display = "none";
});
