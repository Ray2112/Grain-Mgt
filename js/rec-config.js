// Envio dos registos da Grain-Mgt para o Dropbox (0.7.0). App Dropbox de ESCRITA "Mill-App-Sync" (App Folder):
// os ficheiros ficam em /Apps/Mill-App-Sync/records/. A app key é um identificador público (não é segredo).
// Separada da app de LEITURA do bins-status (feed-config.js), que nunca escreve.
(function (root) {
  const REC = {
    appKey: 'y51t060yro251f4',
    recordsDir: '/records',          // registos reais
    recordsTestDir: '/records-test', // registos em modo de teste
    debounceMs: 5000
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = REC;
  else root.RecConfig = REC;
})(typeof window !== 'undefined' ? window : this);
