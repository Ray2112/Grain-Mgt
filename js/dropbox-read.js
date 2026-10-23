// Leitura do bins-status.json no Dropbox (só leitura; a Mill-App nunca escreve no ficheiro).
// Só monta o pedido; a rede fica em quem chama.
(function (root) {
  function buildDownloadRequest(opts) {
    const o = opts || {};
    if (!o.accessToken) throw new Error('accessToken em falta');
    if (typeof o.path !== 'string' || o.path.charAt(0) !== '/') throw new Error('caminho inválido (deve começar por /)');
    return {
      url: 'https://content.dropboxapi.com/2/files/download',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + o.accessToken, 'Dropbox-API-Arg': JSON.stringify({ path: o.path }) },
      body: ''
    };
  }
  const api = { buildDownloadRequest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DropboxRead = api;
})(typeof window !== 'undefined' ? window : this);
