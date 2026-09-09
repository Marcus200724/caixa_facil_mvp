import { redirect } from "next/navigation"

/**
 * O proxy já encaminha "/" para a rota inicial do papel do usuário. Este
 * redirecionamento é só a rede de segurança para quem chega sem sessão.
 */
export default function PaginaRaiz() {
  redirect("/login")
}
