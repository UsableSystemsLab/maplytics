"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LanguagesIcon } from "lucide-react";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLocale = pathname.split("/")[1];

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";

    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <Button onClick={switchLocale} variant="outline" className="m-4" disabled={!mounted}>
      <LanguagesIcon />
      {currentLocale === "en" ? "العربية" : "English"}
    </Button>
  );
}
