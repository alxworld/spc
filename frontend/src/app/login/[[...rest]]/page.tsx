"use client";

import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-spc-navy flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6">
            <Image src="/landing/spc-logo.svg" alt="Saturday Prayer Cell" width={180} height={45} className="h-11 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to your account</p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white/8 border border-white/15 shadow-xl rounded-2xl w-full",
              headerTitle: "text-white",
              headerSubtitle: "text-white/50",
              socialButtonsBlockButton: "border-white/20 text-white hover:bg-white/10",
              formFieldLabel: "text-white/70",
              formFieldInput: "bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-spc-blue",
              formButtonPrimary: "bg-spc-purple hover:bg-spc-purple/90",
              footerActionLink: "text-spc-blue hover:text-spc-blue/80",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-spc-blue",
            },
          }}
        />

        <p className="text-center text-white/20 text-xs mt-6 italic">
          &quot;Where two or three gather in my name, I am with them.&quot; — Matthew 18:20
        </p>
      </div>
    </div>
  );
}
