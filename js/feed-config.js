// Configuração do leitor do bins-status (Mill-App). Só leitura.
// appKey: chave da app Dropbox de LEITURA (tipo Full Dropbox, só files.content.read + account_info.read).
// Vazio = início de sessão desligado (não usar a chave da app Mill-CD, que tem permissão de escrita).
(function (root) {
  const FEED = {
    appKey: 'sb1ldzr5quuacxw',                  // app key da app de leitura (pública, não é segredo)
    binsStatusPath: '/Apps/Mill-CD/bins-status.json',  // caminho completo (app Full Dropbox); confirmar com o titular
    siloTempsPath: '/Apps/Mill-CD/silo-temps.json'     // v0.8.0: sensores de temperatura (escrito pelo pipeline FMIP)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FEED;
  else root.FeedConfig = FEED;
})(typeof window !== 'undefined' ? window : this);
