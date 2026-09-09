import type { Metadata } from "next"
import Link from "next/link"

import { FormularioLogin } from "./formulario-login"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Entrar",
}

export default function PaginaLogin() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse o caixa da sua empresa com e-mail e senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioLogin />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
