// Roteador minimo da SPA. O NGINX devolve o index.html para qualquer rota
// (try_files), e este arquivo assume a partir dai.
(function () {
  "use strict";

  function atualizarRota() {
    var alvo = document.getElementById("rota");
    if (!alvo) return;
    alvo.textContent =
      "caminho: " + window.location.pathname + "\n" +
      "query:   " + (window.location.search || "(vazia)") + "\n" +
      "servido pelo NGINX como /index.html, status 200";
  }

  window.addEventListener("popstate", atualizarRota);
  document.addEventListener("DOMContentLoaded", atualizarRota);

  // Intercepta os links internos para navegar sem recarregar a pagina.
  document.addEventListener("click", function (evento) {
    var link = evento.target.closest("a");
    if (!link) return;
    var url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    evento.preventDefault();
    window.history.pushState({}, "", url.pathname + url.search);
    atualizarRota();
  });
  // Tabela de exemplo - serve para o arquivo ter tamanho suficiente
  // para a compressao ser mensuravel neste exemplo.
  var MUNICIPIOS = [
    { codigo: 3500001, nome: "Municipio de Exemplo numero 1", uf: "SP", populacao: 10137, ativo: true },
    { codigo: 3500002, nome: "Municipio de Exemplo numero 2", uf: "SP", populacao: 10274, ativo: true },
    { codigo: 3500003, nome: "Municipio de Exemplo numero 3", uf: "SP", populacao: 10411, ativo: true },
    { codigo: 3500004, nome: "Municipio de Exemplo numero 4", uf: "SP", populacao: 10548, ativo: true },
    { codigo: 3500005, nome: "Municipio de Exemplo numero 5", uf: "SP", populacao: 10685, ativo: true },
    { codigo: 3500006, nome: "Municipio de Exemplo numero 6", uf: "SP", populacao: 10822, ativo: true },
    { codigo: 3500007, nome: "Municipio de Exemplo numero 7", uf: "SP", populacao: 10959, ativo: true },
    { codigo: 3500008, nome: "Municipio de Exemplo numero 8", uf: "SP", populacao: 11096, ativo: true },
    { codigo: 3500009, nome: "Municipio de Exemplo numero 9", uf: "SP", populacao: 11233, ativo: true },
    { codigo: 3500010, nome: "Municipio de Exemplo numero 10", uf: "SP", populacao: 11370, ativo: true },
    { codigo: 3500011, nome: "Municipio de Exemplo numero 11", uf: "SP", populacao: 11507, ativo: true },
    { codigo: 3500012, nome: "Municipio de Exemplo numero 12", uf: "SP", populacao: 11644, ativo: true },
    { codigo: 3500013, nome: "Municipio de Exemplo numero 13", uf: "SP", populacao: 11781, ativo: true },
    { codigo: 3500014, nome: "Municipio de Exemplo numero 14", uf: "SP", populacao: 11918, ativo: true },
    { codigo: 3500015, nome: "Municipio de Exemplo numero 15", uf: "SP", populacao: 12055, ativo: true },
    { codigo: 3500016, nome: "Municipio de Exemplo numero 16", uf: "SP", populacao: 12192, ativo: true },
    { codigo: 3500017, nome: "Municipio de Exemplo numero 17", uf: "SP", populacao: 12329, ativo: true },
    { codigo: 3500018, nome: "Municipio de Exemplo numero 18", uf: "SP", populacao: 12466, ativo: true },
    { codigo: 3500019, nome: "Municipio de Exemplo numero 19", uf: "SP", populacao: 12603, ativo: true },
    { codigo: 3500020, nome: "Municipio de Exemplo numero 20", uf: "SP", populacao: 12740, ativo: true },
    { codigo: 3500021, nome: "Municipio de Exemplo numero 21", uf: "SP", populacao: 12877, ativo: true },
    { codigo: 3500022, nome: "Municipio de Exemplo numero 22", uf: "SP", populacao: 13014, ativo: true },
    { codigo: 3500023, nome: "Municipio de Exemplo numero 23", uf: "SP", populacao: 13151, ativo: true },
    { codigo: 3500024, nome: "Municipio de Exemplo numero 24", uf: "SP", populacao: 13288, ativo: true },
    { codigo: 3500025, nome: "Municipio de Exemplo numero 25", uf: "SP", populacao: 13425, ativo: true },
    { codigo: 3500026, nome: "Municipio de Exemplo numero 26", uf: "SP", populacao: 13562, ativo: true },
    { codigo: 3500027, nome: "Municipio de Exemplo numero 27", uf: "SP", populacao: 13699, ativo: true },
    { codigo: 3500028, nome: "Municipio de Exemplo numero 28", uf: "SP", populacao: 13836, ativo: true },
    { codigo: 3500029, nome: "Municipio de Exemplo numero 29", uf: "SP", populacao: 13973, ativo: true },
    { codigo: 3500030, nome: "Municipio de Exemplo numero 30", uf: "SP", populacao: 14110, ativo: true },
    { codigo: 3500031, nome: "Municipio de Exemplo numero 31", uf: "SP", populacao: 14247, ativo: true },
    { codigo: 3500032, nome: "Municipio de Exemplo numero 32", uf: "SP", populacao: 14384, ativo: true },
    { codigo: 3500033, nome: "Municipio de Exemplo numero 33", uf: "SP", populacao: 14521, ativo: true },
    { codigo: 3500034, nome: "Municipio de Exemplo numero 34", uf: "SP", populacao: 14658, ativo: true },
    { codigo: 3500035, nome: "Municipio de Exemplo numero 35", uf: "SP", populacao: 14795, ativo: true },
    { codigo: 3500036, nome: "Municipio de Exemplo numero 36", uf: "SP", populacao: 14932, ativo: true },
    { codigo: 3500037, nome: "Municipio de Exemplo numero 37", uf: "SP", populacao: 15069, ativo: true },
    { codigo: 3500038, nome: "Municipio de Exemplo numero 38", uf: "SP", populacao: 15206, ativo: true },
    { codigo: 3500039, nome: "Municipio de Exemplo numero 39", uf: "SP", populacao: 15343, ativo: true },
    { codigo: 3500040, nome: "Municipio de Exemplo numero 40", uf: "SP", populacao: 15480, ativo: true },
    { codigo: 3500041, nome: "Municipio de Exemplo numero 41", uf: "SP", populacao: 15617, ativo: true },
    { codigo: 3500042, nome: "Municipio de Exemplo numero 42", uf: "SP", populacao: 15754, ativo: true },
    { codigo: 3500043, nome: "Municipio de Exemplo numero 43", uf: "SP", populacao: 15891, ativo: true },
    { codigo: 3500044, nome: "Municipio de Exemplo numero 44", uf: "SP", populacao: 16028, ativo: true },
    { codigo: 3500045, nome: "Municipio de Exemplo numero 45", uf: "SP", populacao: 16165, ativo: true },
    { codigo: 3500046, nome: "Municipio de Exemplo numero 46", uf: "SP", populacao: 16302, ativo: true },
    { codigo: 3500047, nome: "Municipio de Exemplo numero 47", uf: "SP", populacao: 16439, ativo: true },
    { codigo: 3500048, nome: "Municipio de Exemplo numero 48", uf: "SP", populacao: 16576, ativo: true },
    { codigo: 3500049, nome: "Municipio de Exemplo numero 49", uf: "SP", populacao: 16713, ativo: true },
    { codigo: 3500050, nome: "Municipio de Exemplo numero 50", uf: "SP", populacao: 16850, ativo: true },
    { codigo: 3500051, nome: "Municipio de Exemplo numero 51", uf: "SP", populacao: 16987, ativo: true },
    { codigo: 3500052, nome: "Municipio de Exemplo numero 52", uf: "SP", populacao: 17124, ativo: true },
    { codigo: 3500053, nome: "Municipio de Exemplo numero 53", uf: "SP", populacao: 17261, ativo: true },
    { codigo: 3500054, nome: "Municipio de Exemplo numero 54", uf: "SP", populacao: 17398, ativo: true },
    { codigo: 3500055, nome: "Municipio de Exemplo numero 55", uf: "SP", populacao: 17535, ativo: true },
    { codigo: 3500056, nome: "Municipio de Exemplo numero 56", uf: "SP", populacao: 17672, ativo: true },
    { codigo: 3500057, nome: "Municipio de Exemplo numero 57", uf: "SP", populacao: 17809, ativo: true },
    { codigo: 3500058, nome: "Municipio de Exemplo numero 58", uf: "SP", populacao: 17946, ativo: true },
    { codigo: 3500059, nome: "Municipio de Exemplo numero 59", uf: "SP", populacao: 18083, ativo: true },
    { codigo: 3500060, nome: "Municipio de Exemplo numero 60", uf: "SP", populacao: 18220, ativo: true },
    { codigo: 3500061, nome: "Municipio de Exemplo numero 61", uf: "SP", populacao: 18357, ativo: true },
    { codigo: 3500062, nome: "Municipio de Exemplo numero 62", uf: "SP", populacao: 18494, ativo: true },
    { codigo: 3500063, nome: "Municipio de Exemplo numero 63", uf: "SP", populacao: 18631, ativo: true },
    { codigo: 3500064, nome: "Municipio de Exemplo numero 64", uf: "SP", populacao: 18768, ativo: true },
    { codigo: 3500065, nome: "Municipio de Exemplo numero 65", uf: "SP", populacao: 18905, ativo: true },
    { codigo: 3500066, nome: "Municipio de Exemplo numero 66", uf: "SP", populacao: 19042, ativo: true },
    { codigo: 3500067, nome: "Municipio de Exemplo numero 67", uf: "SP", populacao: 19179, ativo: true },
    { codigo: 3500068, nome: "Municipio de Exemplo numero 68", uf: "SP", populacao: 19316, ativo: true },
    { codigo: 3500069, nome: "Municipio de Exemplo numero 69", uf: "SP", populacao: 19453, ativo: true },
    { codigo: 3500070, nome: "Municipio de Exemplo numero 70", uf: "SP", populacao: 19590, ativo: true },
    { codigo: 3500071, nome: "Municipio de Exemplo numero 71", uf: "SP", populacao: 19727, ativo: true },
    { codigo: 3500072, nome: "Municipio de Exemplo numero 72", uf: "SP", populacao: 19864, ativo: true },
    { codigo: 3500073, nome: "Municipio de Exemplo numero 73", uf: "SP", populacao: 20001, ativo: true },
    { codigo: 3500074, nome: "Municipio de Exemplo numero 74", uf: "SP", populacao: 20138, ativo: true },
    { codigo: 3500075, nome: "Municipio de Exemplo numero 75", uf: "SP", populacao: 20275, ativo: true },
    { codigo: 3500076, nome: "Municipio de Exemplo numero 76", uf: "SP", populacao: 20412, ativo: true },
    { codigo: 3500077, nome: "Municipio de Exemplo numero 77", uf: "SP", populacao: 20549, ativo: true },
    { codigo: 3500078, nome: "Municipio de Exemplo numero 78", uf: "SP", populacao: 20686, ativo: true },
    { codigo: 3500079, nome: "Municipio de Exemplo numero 79", uf: "SP", populacao: 20823, ativo: true },
    { codigo: 3500080, nome: "Municipio de Exemplo numero 80", uf: "SP", populacao: 20960, ativo: true },
    { codigo: 3500081, nome: "Municipio de Exemplo numero 81", uf: "SP", populacao: 21097, ativo: true },
    { codigo: 3500082, nome: "Municipio de Exemplo numero 82", uf: "SP", populacao: 21234, ativo: true },
    { codigo: 3500083, nome: "Municipio de Exemplo numero 83", uf: "SP", populacao: 21371, ativo: true },
    { codigo: 3500084, nome: "Municipio de Exemplo numero 84", uf: "SP", populacao: 21508, ativo: true },
    { codigo: 3500085, nome: "Municipio de Exemplo numero 85", uf: "SP", populacao: 21645, ativo: true },
    { codigo: 3500086, nome: "Municipio de Exemplo numero 86", uf: "SP", populacao: 21782, ativo: true },
    { codigo: 3500087, nome: "Municipio de Exemplo numero 87", uf: "SP", populacao: 21919, ativo: true },
    { codigo: 3500088, nome: "Municipio de Exemplo numero 88", uf: "SP", populacao: 22056, ativo: true },
    { codigo: 3500089, nome: "Municipio de Exemplo numero 89", uf: "SP", populacao: 22193, ativo: true },
    { codigo: 3500090, nome: "Municipio de Exemplo numero 90", uf: "SP", populacao: 22330, ativo: true },
    { codigo: 3500091, nome: "Municipio de Exemplo numero 91", uf: "SP", populacao: 22467, ativo: true },
    { codigo: 3500092, nome: "Municipio de Exemplo numero 92", uf: "SP", populacao: 22604, ativo: true },
    { codigo: 3500093, nome: "Municipio de Exemplo numero 93", uf: "SP", populacao: 22741, ativo: true },
    { codigo: 3500094, nome: "Municipio de Exemplo numero 94", uf: "SP", populacao: 22878, ativo: true },
    { codigo: 3500095, nome: "Municipio de Exemplo numero 95", uf: "SP", populacao: 23015, ativo: true },
    { codigo: 3500096, nome: "Municipio de Exemplo numero 96", uf: "SP", populacao: 23152, ativo: true },
    { codigo: 3500097, nome: "Municipio de Exemplo numero 97", uf: "SP", populacao: 23289, ativo: true },
    { codigo: 3500098, nome: "Municipio de Exemplo numero 98", uf: "SP", populacao: 23426, ativo: true },
    { codigo: 3500099, nome: "Municipio de Exemplo numero 99", uf: "SP", populacao: 23563, ativo: true },
    { codigo: 3500100, nome: "Municipio de Exemplo numero 100", uf: "SP", populacao: 23700, ativo: true },
    { codigo: 3500101, nome: "Municipio de Exemplo numero 101", uf: "SP", populacao: 23837, ativo: true },
    { codigo: 3500102, nome: "Municipio de Exemplo numero 102", uf: "SP", populacao: 23974, ativo: true },
    { codigo: 3500103, nome: "Municipio de Exemplo numero 103", uf: "SP", populacao: 24111, ativo: true },
    { codigo: 3500104, nome: "Municipio de Exemplo numero 104", uf: "SP", populacao: 24248, ativo: true },
    { codigo: 3500105, nome: "Municipio de Exemplo numero 105", uf: "SP", populacao: 24385, ativo: true },
    { codigo: 3500106, nome: "Municipio de Exemplo numero 106", uf: "SP", populacao: 24522, ativo: true },
    { codigo: 3500107, nome: "Municipio de Exemplo numero 107", uf: "SP", populacao: 24659, ativo: true },
    { codigo: 3500108, nome: "Municipio de Exemplo numero 108", uf: "SP", populacao: 24796, ativo: true },
    { codigo: 3500109, nome: "Municipio de Exemplo numero 109", uf: "SP", populacao: 24933, ativo: true },
    { codigo: 3500110, nome: "Municipio de Exemplo numero 110", uf: "SP", populacao: 25070, ativo: true },
    { codigo: 3500111, nome: "Municipio de Exemplo numero 111", uf: "SP", populacao: 25207, ativo: true },
    { codigo: 3500112, nome: "Municipio de Exemplo numero 112", uf: "SP", populacao: 25344, ativo: true },
    { codigo: 3500113, nome: "Municipio de Exemplo numero 113", uf: "SP", populacao: 25481, ativo: true },
    { codigo: 3500114, nome: "Municipio de Exemplo numero 114", uf: "SP", populacao: 25618, ativo: true },
    { codigo: 3500115, nome: "Municipio de Exemplo numero 115", uf: "SP", populacao: 25755, ativo: true },
    { codigo: 3500116, nome: "Municipio de Exemplo numero 116", uf: "SP", populacao: 25892, ativo: true },
    { codigo: 3500117, nome: "Municipio de Exemplo numero 117", uf: "SP", populacao: 26029, ativo: true },
    { codigo: 3500118, nome: "Municipio de Exemplo numero 118", uf: "SP", populacao: 26166, ativo: true },
    { codigo: 3500119, nome: "Municipio de Exemplo numero 119", uf: "SP", populacao: 26303, ativo: true },
    { codigo: 3500120, nome: "Municipio de Exemplo numero 120", uf: "SP", populacao: 26440, ativo: true },
  ];

  window.__MUNICIPIOS__ = MUNICIPIOS;
})();
