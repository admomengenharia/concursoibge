var BANK = [];
var TEMAS = [];
var activeTab = "painel";

var LS_CURRENT = "ibge_jorn_current_sim";
var LS_HISTORY = "ibge_jorn_history";
var SIM_SIZE = 60;
var CLOUD_URL = "https://script.google.com/macros/s/AKfycbwlWiol4GPVIrI5hukW7XVtderKG_2ubOlTZR7jfdhZJdCVrs1aRB0s4s-1GKNU7EVJGQ/exec";

function esc(s){
  var d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function shuffle(arr){
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function loadHistory(){
  try{
    var raw = localStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveHistory(list){
  try{ localStorage.setItem(LS_HISTORY, JSON.stringify(list)); }catch(e){}
}
function loadCurrentSim(){
  try{
    var raw = localStorage.getItem(LS_CURRENT);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveCurrentSim(sim){
  try{ localStorage.setItem(LS_CURRENT, JSON.stringify(sim)); }catch(e){}
}
function clearCurrentSim(){
  try{ localStorage.removeItem(LS_CURRENT); }catch(e){}
}

/* ---------------- cloud sync (Google Sheets via Apps Script) ---------------- */

function fetchCloudHistory(){
  if (!CLOUD_URL) return Promise.resolve(null);
  return fetch(CLOUD_URL)
    .then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function(data){
      return Array.isArray(data) ? data : null;
    })
    .catch(function(err){
      console.error("Falha ao buscar historico na nuvem:", err);
      return null;
    });
}

function pushCloudHistory(entry){
  if (!CLOUD_URL) return Promise.resolve();
  return fetch(CLOUD_URL, {
    method: "POST",
    body: JSON.stringify(entry)
  }).catch(function(err){
    console.error("Falha ao enviar resultado para a nuvem:", err);
  });
}

function loadBank(){
  fetch("data/questoes.xlsx")
    .then(function(res){
      if (!res.ok) { throw new Error("HTTP " + res.status); }
      return res.arrayBuffer();
    })
    .then(function(buf){
      var wb = XLSX.read(buf, { type: "array" });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      BANK = rows.map(function(r){
        return {
          id: r.id,
          bloco: r.bloco,
          tema: r.tema,
          subtema: r.subtema_edital,
          pergunta: r.pergunta,
          options: [r.opcao_a, r.opcao_b, r.opcao_c, r.opcao_d, r.opcao_e],
          correctIndex: "ABCDE".indexOf(String(r.correta).trim().toUpperCase()),
          explicacao: r.explicacao
        };
      }).filter(function(q){ return q.pergunta; });

      var seen = {};
      TEMAS = [];
      BANK.forEach(function(q){
        if (!seen[q.tema]){
          seen[q.tema] = true;
          TEMAS.push({ tema: q.tema, bloco: q.bloco, subtema: q.subtema });
        }
      });

      renderHeaderStats();
      renderTab(activeTab);
    })
    .catch(function(err){
      document.getElementById("view-root").innerHTML =
        '<div class="panel"><h2>Não foi possível carregar o banco de questões</h2>' +
        '<div class="desc">Verifique se o arquivo <code>data/questoes.xlsx</code> está no mesmo repositório, ' +
        'na pasta <code>data/</code>, e se o site está sendo aberto via um servidor (http/https), ' +
        'não diretamente como arquivo local (file://). Erro técnico: ' + esc(err.message) + '</div></div>';
    });
}

function renderHeaderStats(){
  var censo = BANK.filter(function(q){ return q.bloco === "Censo"; }).length;
  var jorn = BANK.filter(function(q){ return q.bloco === "Jornalismo"; }).length;
  var el2 = document.getElementById("header-stats");
  el2.innerHTML =
    statBlock(BANK.length, "questões no banco") +
    statBlock(censo, "censo agro") +
    statBlock(jorn, "jornalismo");
}
function statBlock(num, label){
  return '<div class="stat"><div class="num">' + num + '</div><div class="lbl">' + esc(label) + '</div></div>';
}

function renderTab(tab){
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(function(btn){
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  if (tab === "painel") return renderPainel();
  if (tab === "simulado") return renderSimulado();
  if (tab === "biblioteca") return renderBiblioteca();
  if (tab === "desempenho") return renderDesempenho();
}

function renderPainel(){
  var root = document.getElementById("view-root");
  var byTema = {};
  BANK.forEach(function(q){
    byTema[q.tema] = byTema[q.tema] || { count: 0, bloco: q.bloco, subtema: q.subtema };
    byTema[q.tema].count++;
  });
  var rowsHtml = Object.keys(byTema).map(function(t){
    var info = byTema[t];
    return "<tr><td>" + esc(info.bloco) + "</td><td>" + esc(t) + "</td><td>" + esc(info.subtema) +
      '</td><td class="count">' + info.count + "</td></tr>";
  }).join("");

  root.innerHTML =
    '<div class="panel">' +
      "<h2>Gerar novo simulado</h2>" +
      '<div class="desc">Sorteia ' + SIM_SIZE + ' questões do banco (Censo Agropecuário + Conhecimentos Específicos de Jornalismo), no formato objetivo A a E, igual ao modelo de prova.</div>' +
      '<div class="grid-cards">' +
        metricCard("total de questões", BANK.length, "amber") +
        metricCard("temas cobertos", TEMAS.length, "blue") +
        metricCard("tamanho do simulado", SIM_SIZE, "rust") +
      "</div>" +
      '<div class="btn-row">' +
        '<button class="btn primary" id="btn-gerar-simulado">Gerar simulado de ' + SIM_SIZE + " questões</button>" +
      "</div>" +
    "</div>" +
    '<div class="panel">' +
      "<h2>Cobertura por tema</h2>" +
      '<div class="desc">Cada linha corresponde a um tema do edital, com o número de questões disponíveis no banco.</div>' +
      '<table class="tema-table"><thead><tr><th>Bloco</th><th>Tema</th><th>Referência no edital</th><th>Qtd.</th></tr></thead>' +
      "<tbody>" + rowsHtml + "</tbody></table>" +
    "</div>";

  document.getElementById("btn-gerar-simulado").addEventListener("click", function(){
    startNewSimulado();
    renderTab("simulado");
  });
}
function metricCard(label, value, tone){
  return '<div class="metric-card"><div class="mlabel">' + esc(label) + '</div>' +
    '<div class="mvalue ' + tone + '">' + value + "</div></div>";
}

function startNewSimulado(){
  var pool = shuffle(BANK);
  var chosen = pool.slice(0, Math.min(SIM_SIZE, pool.length));
  var sim = {
    startedAt: new Date().toISOString(),
    finished: false,
    questions: chosen.map(function(q){
      return {
        id: q.id, bloco: q.bloco, tema: q.tema, subtema: q.subtema,
        pergunta: q.pergunta, options: q.options, correctIndex: q.correctIndex,
        explicacao: q.explicacao, chosen: -1
      };
    })
  };
  saveCurrentSim(sim);
}

function renderSimulado(){
  var root = document.getElementById("view-root");
  var sim = loadCurrentSim();

  if (!sim){
    root.innerHTML =
      '<div class="panel empty-state">' +
        "<h2>Nenhum simulado em andamento</h2>" +
        '<div class="desc">Gere um novo simulado de ' + SIM_SIZE + " questões para começar.</div>" +
        '<div class="btn-row" style="justify-content:center;">' +
          '<button class="btn primary" id="btn-start-empty">Gerar simulado de ' + SIM_SIZE + " questões</button>" +
        "</div>" +
      "</div>";
    document.getElementById("btn-start-empty").addEventListener("click", function(){
      startNewSimulado();
      renderSimulado();
    });
    return;
  }

  if (sim.finished){ return renderSimuladoResult(sim); }

  var answered = sim.questions.filter(function(q){ return q.chosen >= 0; }).length;
  var pct = Math.round((answered / sim.questions.length) * 100);

  var qHtml = sim.questions.map(function(q, qi){
    var optsHtml = q.options.map(function(opt, oi){
      var checked = q.chosen === oi ? "checked" : "";
      return '<label class="option-row" data-qi="' + qi + '" data-oi="' + oi + '">' +
        '<input type="radio" name="q' + qi + '" value="' + oi + '" ' + checked + "> " +
        "<span>" + String.fromCharCode(65 + oi) + ") " + esc(opt) + "</span></label>";
    }).join("");
    return '<div class="question-card">' +
      '<div class="qmeta">' + esc(q.bloco) + " · " + esc(q.tema) + " · " + esc(q.subtema) + "</div>" +
      '<div class="qtext">' + (qi + 1) + ") " + esc(q.pergunta) + "</div>" +
      optsHtml +
      "</div>";
  }).join("");

  root.innerHTML =
    '<div class="panel">' +
      '<div class="sim-progress"><span>' + answered + " / " + sim.questions.length + " respondidas</span>" +
      '<div class="sim-bar"><div style="width:' + pct + '%"></div></div><span>' + pct + "%</span></div>" +
      '<div class="btn-row">' +
        '<button class="btn primary" id="btn-finalizar">Finalizar simulado e corrigir</button>' +
        '<button class="btn ghost" id="btn-descartar">Descartar e começar outro</button>' +
      "</div>" +
    "</div>" +
    '<div class="panel">' + qHtml + "</div>" +
    '<div class="panel"><div class="btn-row">' +
      '<button class="btn primary" id="btn-finalizar-2">Finalizar simulado e corrigir</button>' +
    "</div></div>";

  root.querySelectorAll(".option-row").forEach(function(row){
    row.querySelector("input").addEventListener("change", function(){
      var qi = parseInt(row.dataset.qi, 10);
      var oi = parseInt(row.dataset.oi, 10);
      sim.questions[qi].chosen = oi;
      saveCurrentSim(sim);
      var answeredNow = sim.questions.filter(function(q){ return q.chosen >= 0; }).length;
      var pctNow = Math.round((answeredNow / sim.questions.length) * 100);
      root.querySelector(".sim-progress span").textContent = answeredNow + " / " + sim.questions.length + " respondidas";
      root.querySelector(".sim-bar > div").style.width = pctNow + "%";
      root.querySelectorAll(".sim-progress span")[1].textContent = pctNow + "%";
    });
  });

  ["btn-finalizar", "btn-finalizar-2"].forEach(function(id){
    document.getElementById(id).addEventListener("click", function(){ finalizarSimulado(sim); });
  });
  document.getElementById("btn-descartar").addEventListener("click", function(){
    if (confirm("Descartar o simulado atual e comecar um novo?")){
      clearCurrentSim();
      startNewSimulado();
      renderSimulado();
    }
  });
}

function finalizarSimulado(sim){
  var score = 0;
  var perTema = {};
  sim.questions.forEach(function(q){
    perTema[q.tema] = perTema[q.tema] || { correct: 0, total: 0 };
    perTema[q.tema].total++;
    if (q.chosen === q.correctIndex){ score++; perTema[q.tema].correct++; }
  });
  sim.finished = true;
  sim.finishedAt = new Date().toISOString();
  sim.score = score;
  sim.perTema = perTema;
  saveCurrentSim(sim);

  var entry = { date: sim.finishedAt, score: score, total: sim.questions.length, perTema: perTema };

  var history = loadHistory();
  history.unshift(entry);
  saveHistory(history.slice(0, 50));

  pushCloudHistory(entry);

  renderSimuladoResult(sim);
}

function renderSimuladoResult(sim){
  var root = document.getElementById("view-root");
  var pct = Math.round((sim.score / sim.questions.length) * 100);
  var tone = pct >= 70 ? "var(--ok)" : (pct >= 50 ? "var(--warn)" : "var(--danger)");

  var temaKeys = Object.keys(sim.perTema).sort(function(a, b){
    var ra = sim.perTema[a].correct / sim.perTema[a].total;
    var rb = sim.perTema[b].correct / sim.perTema[b].total;
    return ra - rb;
  });
  var bdHtml = temaKeys.map(function(t){
    var info = sim.perTema[t];
    var r = info.correct / info.total;
    var color = r >= 0.7 ? "var(--ok)" : (r >= 0.4 ? "var(--warn)" : "var(--danger)");
    return '<div class="bd-row"><div class="bd-label">' + esc(t) + '</div>' +
      '<div class="bd-bar"><div style="width:' + Math.round(r * 100) + "%;background:" + color + ';"></div></div>' +
      '<div class="bd-val">' + info.correct + "/" + info.total + "</div></div>";
  }).join("");

  var qHtml = sim.questions.map(function(q, qi){
    var optsHtml = q.options.map(function(opt, oi){
      var cls = "";
      if (oi === q.correctIndex) cls = "ok";
      else if (oi === q.chosen) cls = "bad";
      return '<div class="option-row ' + cls + '">' +
        "<span>" + String.fromCharCode(65 + oi) + ") " + esc(opt) + "</span></div>";
    }).join("");
    return '<div class="question-card">' +
      '<div class="qmeta">' + esc(q.bloco) + " · " + esc(q.tema) + " · " + esc(q.subtema) + "</div>" +
      '<div class="qtext">' + (qi + 1) + ") " + esc(q.pergunta) + "</div>" +
      optsHtml +
      '<div class="explic show">' + esc(q.explicacao) + "</div>" +
      "</div>";
  }).join("");

  root.innerHTML =
    '<div class="panel">' +
      '<div class="result-hero">' +
        '<div class="result-score" style="color:' + tone + '">' + sim.score +
          '<span class="of">/ ' + sim.questions.length + " (" + pct + "%)</span></div>" +
        '<div class="result-breakdown">' + bdHtml + "</div>" +
      "</div>" +
      '<div class="btn-row">' +
        '<button class="btn primary" id="btn-novo-simulado">Gerar novo simulado</button>' +
      "</div>" +
    "</div>" +
    '<div class="panel"><h2>Revisão questão a questão</h2>' +
      '<div class="desc">Em verde, a alternativa correta. Em vermelho, a alternativa marcada quando estiver errada.</div>' +
      qHtml +
    "</div>";

  document.getElementById("btn-novo-simulado").addEventListener("click", function(){
    startNewSimulado();
    renderSimulado();
  });
}

var biblioFilter = "todos";

function renderBiblioteca(){
  var root = document.getElementById("view-root");
  var groups = {};
  BANK.forEach(function(q){
    if (biblioFilter !== "todos" && q.bloco.toLowerCase() !== biblioFilter) return;
    groups[q.tema] = groups[q.tema] || { bloco: q.bloco, subtema: q.subtema, explicacoes: [] };
    if (groups[q.tema].explicacoes.indexOf(q.explicacao) === -1){
      groups[q.tema].explicacoes.push(q.explicacao);
    }
  });

  var blocksHtml = Object.keys(groups).map(function(t){
    var g = groups[t];
    var texto = g.explicacoes.join(" ");
    return '<div class="tema-block"><h3>' + esc(t) + "</h3>" +
      '<div class="edital-code">' + esc(g.bloco) + " · " + esc(g.subtema) + "</div>" +
      "<p>" + esc(texto) + "</p></div>";
  }).join("");

  root.innerHTML =
    '<div class="panel">' +
      "<h2>Biblioteca de estudo</h2>" +
      '<div class="desc">Resumos organizados por tema, extraídos da apostila do Censo e dos pontos do edital de Jornalismo.</div>' +
      '<div class="bloco-select">' +
        pillBtn("todos", "Todos") + pillBtn("censo", "Censo") + pillBtn("jornalismo", "Jornalismo") +
      "</div>" +
      blocksHtml +
    "</div>";

  root.querySelectorAll(".pill").forEach(function(p){
    p.addEventListener("click", function(){
      biblioFilter = p.dataset.filter;
      renderBiblioteca();
    });
  });
}
function pillBtn(filter, label){
  var active = biblioFilter === filter ? " active" : "";
  return '<button class="pill' + active + '" data-filter="' + filter + '">' + esc(label) + "</button>";
}

function renderDesempenho(){
  var root = document.getElementById("view-root");
  root.innerHTML = '<div class="loading">Carregando histórico da nuvem…</div>';

  fetchCloudHistory().then(function(cloudHistory){
    var history;
    var fromCloud;
    if (cloudHistory !== null){
      history = cloudHistory;
      fromCloud = true;
      saveHistory(history.slice(0, 50));
    } else {
      history = loadHistory();
      fromCloud = false;
    }
    renderDesempenhoContent(history, fromCloud);
  });
}

function renderDesempenhoContent(history, fromCloud){
  var root = document.getElementById("view-root");

  if (history.length === 0){
    root.innerHTML = '<div class="panel empty-state"><h2>Ainda sem simulados finalizados</h2>' +
      '<div class="desc">Finalize um simulado na aba Simulado para ver seu histórico de desempenho aqui.</div></div>';
    return;
  }

  var agg = {};
  history.forEach(function(h){
    Object.keys(h.perTema).forEach(function(t){
      agg[t] = agg[t] || { correct: 0, total: 0 };
      agg[t].correct += h.perTema[t].correct;
      agg[t].total += h.perTema[t].total;
    });
  });
  var aggKeys = Object.keys(agg).sort(function(a, b){
    return (agg[a].correct / agg[a].total) - (agg[b].correct / agg[b].total);
  });
  var aggHtml = aggKeys.map(function(t){
    var info = agg[t];
    var r = info.correct / info.total;
    var color = r >= 0.7 ? "var(--ok)" : (r >= 0.4 ? "var(--warn)" : "var(--danger)");
    return '<div class="bd-row"><div class="bd-label">' + esc(t) + '</div>' +
      '<div class="bd-bar"><div style="width:' + Math.round(r * 100) + "%;background:" + color + ';"></div></div>' +
      '<div class="bd-val">' + info.correct + "/" + info.total + "</div></div>";
  }).join("");

  var histHtml = history.map(function(h){
    var pct = Math.round((h.score / h.total) * 100);
    var cls = pct >= 70 ? "ok" : (pct >= 50 ? "warn" : "bad");
    var d = new Date(h.date);
    var dateStr = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return '<div class="hist-row"><span class="hdate">' + esc(dateStr) + '</span>' +
      '<span class="hscore ' + cls + '">' + h.score + "/" + h.total + " (" + pct + "%)</span></div>";
  }).join("");

  var syncTag = fromCloud
    ? '<span style="font-family:var(--font-mono);font-size:10.5px;color:var(--ok);">sincronizado com a nuvem ✓</span>'
    : '<span style="font-family:var(--font-mono);font-size:10.5px;color:var(--warn);">exibindo histórico salvo neste navegador (não foi possível conectar à nuvem agora)</span>';

  root.innerHTML =
    '<div class="panel">' +
      "<h2>Temas para reforçar</h2>" +
      '<div class="desc">Acerto acumulado por tema, considerando todos os simulados já finalizados (do pior para o melhor).</div>' +
      aggHtml +
    "</div>" +
    '<div class="panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        "<h2>Histórico de simulados</h2>" + syncTag +
      "</div>" +
      histHtml +
    "</div>";
}

document.querySelectorAll(".tab-btn").forEach(function(btn){
  btn.addEventListener("click", function(){ renderTab(btn.dataset.tab); });
});

loadBank();
