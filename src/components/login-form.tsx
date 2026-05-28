import { useState } from "react";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div">;

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!email.trim()) {
      toast.error("Enter an email address first.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setCodeSent(true);
    setToken("");
    toast.success("Check your email for your 6-digit code.");
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("You are signed in.");
  }

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12 text-foreground",
        className,
      )}
      {...props}
    >
      <form onSubmit={codeSent ? verifyCode : requestCode}>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="mb-1 flex size-8 items-center justify-center text-foreground">
              <FileTextIcon className="size-6" strokeWidth={1.8} />
            </div>
            <h1 className="text-xl font-bold">Welcome to PDF Workspace</h1>
            <FieldDescription className="text-center">
              {codeSent
                ? "Enter the code we sent to your email."
                : "Sign in with your email to continue."}
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="m@example.com"
              value={email}
              disabled={isLoading || codeSent}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>

          {codeSent ? (
            <Field>
              <FieldLabel htmlFor="otp">Code</FieldLabel>
              <InputOTP
                id="otp"
                maxLength={6}
                value={token}
                onChange={setToken}
                containerClassName="justify-between"
                disabled={isLoading}
              >
                <InputOTPGroup className="w-full justify-between">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-11 text-base"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Field>
          ) : null}

          <Field>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading
                ? "Working..."
                : codeSent
                  ? "Verify code"
                  : "Send code"}
            </Button>
          </Field>

          {codeSent ? (
            <div className="flex items-center justify-center gap-4 text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCodeSent(false);
                  setToken("");
                }}
                disabled={isLoading}
              >
                Change email
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => requestCode()}
                disabled={isLoading}
              >
                Resend code
              </Button>
            </div>
          ) : null}
        </FieldGroup>
      </form>
    </div>
  );
}
