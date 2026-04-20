"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations } from "next-intl";

export default function Header({ variant = "light" }) {
  const isDark = variant === "dark";
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("header");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // lock scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "w-full px-5 py-4 z-50 transition-colors duration-300",
          isDark ? "bg-transparent text-white absolute" : "bg-white text-black shadow-sm"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            Maplytics
          </Link>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2 rounded-md active:scale-95 transition"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
            <LanguageSwitcher />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/datasets"
              className={cn(
                "text-sm font-medium transition-colors",
                isDark ? "hover:text-slate-300" : "hover:text-slate-500"
              )}
            >
              {t('publicDataset')}
            </Link>

            {!loading &&
              (user ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                >
                  {t('logout')}
                </Button>
              ) : (
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    {t('signIn')}
                  </Button>
                </Link>
              ))}
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 transition-opacity md:hidden",
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={() => setIsMenuOpen(false)}
      />
      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-3/4 max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">{t('menu')}</span>
            <button onClick={() => setIsMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <Link
            href="/datasets"
            onClick={() => setIsMenuOpen(false)}
            className="text-base text-center underline font-medium py-2"
          >
            {t('publicDataset')}
          </Link>

          {!loading &&
            (user ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                {t('logout')}
              </Button>
            ) : (
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="secondary" className="w-full">
                  {t('signIn')}
                </Button>
              </Link>
            ))}
        </div>
      </div>
    </>
  );
}