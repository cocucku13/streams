import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Tabs } from "../shared/ui/Tabs";

const loginSchema = z.object({
  username: z.string({ required_error: "Введите логин" }).min(3, "Минимум 3 символа"),
  password: z.string({ required_error: "Введите пароль" }).min(6, "Минимум 6 символов"),
});

const registerSchema = loginSchema.extend({
  display_name: z.string({ required_error: "Введите публичное имя" }).min(2, "Введите публичное имя"),
});

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(location.search.includes("register") ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const { setToken, redirectAfterLogin, setRedirectAfterLogin } = useAuth();

  const schema = useMemo(() => (mode === "login" ? loginSchema : registerSchema), [mode]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", display_name: "DJ" },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof registerSchema>) => {
      if (mode === "login") {
        return authApi.login({ username: values.username, password: values.password });
      }
      return authApi.register(values);
    },
    onSuccess: (result) => {
      setToken(result.access_token);
      const target = redirectAfterLogin || "/dashboard/stream";
      setRedirectAfterLogin(null);
      navigate(target, { replace: true });
    },
  });

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <p className="hero-kicker">Welcome to DJ Streams</p>
        <h1>Подключайся к сцене</h1>
        <p className="muted">Премиальная live-платформа для диджеев, клубов и слушателей в реальном времени.</p>

        <Tabs
          value={mode}
          onChange={(value) => {
            setMode(value as "login" | "register");
            form.reset({ username: "", password: "", display_name: "DJ" });
          }}
          tabs={[
            { value: "login", label: "Вход" },
            { value: "register", label: "Регистрация" },
          ]}
        />

        <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label>
            Логин
            <Input {...form.register("username")} aria-invalid={Boolean(form.formState.errors.username)} />
            {form.formState.errors.username && <span className="error">{form.formState.errors.username.message}</span>}
          </label>

          {mode === "register" && (
            <label>
              Публичное имя
              <Input {...form.register("display_name")} aria-invalid={Boolean(form.formState.errors.display_name)} />
              {form.formState.errors.display_name && <span className="error">{form.formState.errors.display_name.message}</span>}
            </label>
          )}

          <label>
            Пароль
            <div className="password-row">
              <Input type={showPassword ? "text" : "password"} {...form.register("password")} />
              <Button type="button" variant="ghost" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            {form.formState.errors.password && <span className="error">{form.formState.errors.password.message}</span>}
          </label>

          <div className="row between">
            <Button type="button" variant="ghost" disabled>
              Забыли пароль
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </div>

          {mutation.isError && <p className="error">Проверьте логин или пароль</p>}
        </form>
      </Card>
    </main>
  );
}
