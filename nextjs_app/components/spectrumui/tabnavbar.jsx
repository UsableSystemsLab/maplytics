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

export default function Tabnavbar() {
  const { user, loading } = useAuth();

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
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul
                    className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="#">
                          <div className="mb-2 mt-4 text-lg font-medium">
                            Featured Product
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            Check out our latest and greatest offering
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <ListItem href="#" title="Product 1">
                      Description for Product 1
                    </ListItem>
                    <ListItem href="#" title="Product 2">
                      Description for Product 2
                    </ListItem>
                    <ListItem href="#" title="Product 3">
                      Description for Product 3
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
                  About
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
                  Contact
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center space-x-4 w-[400px]">
          <form className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search..." className="pl-8 w-32 focus:w-80 transition-all duration-300" />
          </form>
          {loading ? (
            <span className="text-gray-500 animate-pulse">Loading...</span>
          ) : user ? (
            <HoverSignOutButton user={user} />
          ) : (
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          )}
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

  const rawName = user.displayName
    ? user.displayName
    : user.email?.split("@")[0].split(".")[0] || "User";

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
          ? "hover:bg-[#0E3147] hover:text-white"
          : "text-[#0E3147]"
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
        Sign out?
      </span>
    </Button>
  );
}
