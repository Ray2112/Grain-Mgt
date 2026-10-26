// Construção do pedido de envio do bins-status.json para o Dropbox. Só monta o pedido; não envia nada.
// ATENÇÃO: a forma do pedido (URL, cabeçalho Dropbox-API-Arg, modo "overwrite") é do conhecimento da
// documentação do Dropbox API, NÃO verificada nesta sessão. Verificar antes de ligar ao código de produção.
(function (root) {
  function buildUploadRequest(opts) {
    const o = opts || {};
    if (!o.accessToken) throw new Error('accessToken em falta');
    if (typeof o.path !== 'string' || o.path.charAt(0) !== '/') throw new Error('caminho inválido (deve começar por /)');
    if (typeof o.content !== 'string') throw new Error('conteúdo tem de ser texto');
    const arg = { path: o.path, mode: 'overwrite', mute: true, strict_conflict: false };
    return {
      url: 'https://content.dropboxapi.com/2/files/upload',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + o.accessToken,
        'Dropbox-API-Arg': JSON.stringify(arg),
        'Content-Type': 'application/octet-stream'
      },
      body: o.content
    };
  }
  const api = { buildUploadRequest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DropboxUpload = api;
})(typeof window !== 'undefined' ? window : this);
