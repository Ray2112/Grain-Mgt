// Configuração do leitor do bins-status (Mill-App). Só leitura.
// appKey: chave da app Dropbox de LEITURA (tipo Full Dropbox, só files.content.read + account_info.read).
// Vazio = início de sessão desligado (não usar a chave da app Mill-CD, que tem permissão de escrita).
(function (root) {
  const FEED = {
    appKey: null,                               // a preencher quando a app de leitura existir
    binsStatusPath: '/Apps/Mill-CD/bins-status.json'  // caminho completo (app Full Dropbox); confirmar com o titular
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FEED;
  else root.FeedConfig = FEED;
})(typeof window !== 'undefined' ? window : this);
