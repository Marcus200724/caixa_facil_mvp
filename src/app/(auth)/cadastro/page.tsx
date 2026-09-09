import type { Metadata } from "next"
import Link from "next/link"

import { FormularioCadastro } from "./formulario-cadastro"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Criar conta",
}

export default function PaginaCadastro() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Cadastre-se como dono do comércio. A configuração da empresa vem em
          seguida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioCadastro />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Entrar
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
