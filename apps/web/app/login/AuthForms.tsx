"use client";

import { useActionState } from "react";
import { AuthFormsView } from "@/components/auth/AuthFormsView";
import { loginAction, registerAction, type AuthState } from "@/lib/auth/actions.full";

/** Connexion et création de compte reliées à l'API (site hébergé). */
export function AuthForms({ next, initialMode }: { next: string; initialMode: "connexion" | "inscription" }) {
  const [loginState, login, loggingIn] = useActionState<AuthState, FormData>(loginAction, null);
  const [registerState, register, registering] = useActionState<AuthState, FormData>(registerAction, null);
  return <AuthFormsView next={next} initialMode={initialMode} login={login} register={register} loginState={loginState} registerState={registerState} loggingIn={loggingIn} registering={registering} />;
}
