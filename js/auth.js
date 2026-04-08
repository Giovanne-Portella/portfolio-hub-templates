// Auth guard — protege o painel admin
// Redireciona para login se não houver sessão ativa
(async function () {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Usa caminho relativo para funcionar tanto em localhost quanto em produção
    window.location.href = 'login.html';
  }
})();
