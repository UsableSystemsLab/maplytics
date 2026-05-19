"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Map,
  BarChart3,
  User,
  Settings,
  Bot,
  FolderKanban,
  Home,
  Database,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import * as projectApi from "@/lib/projectApi";
import { setActiveProject, clearActiveProject, selectActiveProject } from "@/lib/store/features/projectSlice";
import {
  toggleLayer,
  removeLayer,
  selectSelectedLayers,
  clearLayers
} from "@/lib/store/features/layersSlice";


const mainNavItems = [
  { id: "projects", labelKey: "nav.projects", icon: FolderKanban, href: "/dashboard/projects" },
  { id: "map", labelKey: "nav.mapView", icon: Map, href: "/dashboard/map" },
  { id: "comparison", labelKey: "nav.comparison", icon: BarChart3, href: "/dashboard/comparison" },
];

const secondaryNavItems = [
  { id: "datasets", labelKey: "nav.datasets", icon: Database, href: "/dashboard/datasets" },
  { id: "chat", labelKey: "nav.aiChat", icon: Bot, href: "/dashboard/chat" },
];

const accountItems = [
  { id: "home", labelKey: "nav.home", icon: Home, href: "/" },
];

export function AppSidebar() {
  const t = useTranslations("sidebar");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname() || "";
  const normalizedPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  const router = useRouter();
  const { isMobile, state } = useSidebar();

  const dispatch = useDispatch();
  const activeProject = useSelector(selectActiveProject);

  const [projects, setProjects] = useState([]);
  const selectedLayers = useSelector(selectSelectedLayers);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);


  const fetchProjects = async () => {
    if (!user) return;
    try {
      const data = await projectApi.getProjects();
      setProjects(data);

      // If we have an active project, verify it still exists
      if (activeProject) {
        const matched = data.find(p => p.id === activeProject.id);
        if (!matched) {
          dispatch(clearActiveProject());
          dispatch(clearLayers());
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setHasFetchedProjects(true);
    }
  };

  const handleProjectSelect = (project) => {
    dispatch(setActiveProject(project));
    dispatch(clearLayers());
    router.push('/dashboard/map');
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (confirm(t('deleteProjectConfirm'))) {
      try {
        await projectApi.deleteProject(projectId);
        if (activeProject?.id === projectId) {
          dispatch(clearActiveProject());
          dispatch(clearLayers());
        }
        await fetchProjects();
        router.push('/dashboard/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);


  return (
    <>
      <Sidebar collapsible="icon" side={isRtl ? "right" : "left"}>
        <SidebarHeader className="border-b h-[60px] flex items-center px-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground me-2" />
              <div className="flex-1 flex items-center justify-between group-data-[collapsible=icon]:hidden">
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold text-primary">
                    {activeProject?.name || t('noProjectSelected')}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {t('workspaceActive')}
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('mainNavigation')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={normalizedPath === item.href}
                      tooltip={{ children: t(item.labelKey), side: isRtl ? "left" : "right" }}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t('workspace')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={normalizedPath === item.href}
                      tooltip={{ children: t(item.labelKey), side: isRtl ? "left" : "right" }}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>



          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>{t('general')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={normalizedPath === item.href}
                      tooltip={{ children: t(item.labelKey), side: isRtl ? "left" : "right" }}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          {!authLoading && user ? (
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-earthy-green flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-gray-500 truncate leading-tight">
                  {user?.email}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="text-muted-foreground hover:text-red-600 transition-colors shrink-0 group-data-[collapsible=icon]:hidden"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="group-data-[collapsible=icon]:hidden">
              <Link href="/login">
                <Button size="sm" className="w-full">{t('login')}</Button>
              </Link>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

    </>
  );
}
