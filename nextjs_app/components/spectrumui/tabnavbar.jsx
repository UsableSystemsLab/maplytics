"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from "../LanguageSwitcher";

export default function Tabnavbar() {
  const { user, loading } = useAuth();
  const t = useTranslations('header');

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <nav className="border-b bg-white h-24 items-center">
      <div
        className="container mx-auto flex items-center justify-between h-24 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="MAPLYTICS logo" className="w-32 mr-24" />
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{t('products')}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul
                    className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="#">
                          <div className="mb-2 mt-4 text-lg font-medium">
                            {t('featuredProduct')}
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            {t('featuredProductDescription')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <ListItem href="#" title={t('product1')}>
                      {t('product1Description')}
                    </ListItem>
                    <ListItem href="#" title={t('product2')}>
                      {t('product2Description')}
                    </ListItem>
                    <ListItem href="#" title={t('product3')}>
                      {t('product3Description')}
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/public-dataset" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    {t('publicDataset')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
                  {t('about')}
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
                  {t('contact')}
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center space-x-4 w-[400px]">
          <form className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('searchPlaceholder')} className="pl-8 w-32 focus:w-80 transition-all duration-300" />
          </form>
          {loading ? (
            <span className="text-gray-500 animate-pulse">{t('loading')}</span>
          ) : user ? (
            <HoverSignOutButton user={user} />
          ) : (
            <Link href="/login">
              <Button>{t('signIn')}</Button>
            </Link>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}

const ListItem = React.forwardRef(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}>
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

function HoverSignOutButton({ user }) {
  const [hovered, setHovered] = React.useState(false);
  const t = useTranslations('header');

  const rawName = user.displayName
    ? user.displayName
    : user.email?.split("@")[0].split(".")[0] || t('user');

  const username =
    rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const handleSignOut = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("@/lib/firebase");
    await signOut(auth);
  };

  return (
    <Button
      onClick={hovered ? handleSignOut : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      variant="outline"
      className={cn(
        "transition-all duration-300 relative overflow-hidden text-sm font-medium",
        "w-[120px] sm:w-[140px] truncate",
        hovered
          ? "hover:bg-primary hover:text-white"
          : "text-primary"
      )}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-0" : "opacity-100"
          }`}
      >
        {username}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"
          }`}
      >
        {t('signOutConfirm')}
      </span>
    </Button>
  );
}
