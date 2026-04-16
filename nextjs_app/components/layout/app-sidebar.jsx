"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Map,
  BarChart3,
  User,
  Settings,
  Plus,
  Loader2,
  Trash2,
  Globe,
  Bot,
  MapPin,
  ChevronsUpDown,
  FolderKanban,
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
import { useConfirm } from "@/hooks/useConfirm";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddLayerModal from "@/components/datasets/AddLayerModal";
import { Button } from "@/components/ui/button";
import * as projectApi from "@/lib/api/projectApi";

const mainNavItems = [
  { id: "projects", label: "Projects", icon: FolderKanban, href: "/dashboard/projects" },
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { id: "map-view", label: "Map view", icon: Map, href: "/dashboard/map" },
  { id: "comparison", label: "Comparison", icon: BarChart3, href: "/dashboard/comparison" },
];

const secondaryNavItems = [
  { id: "public-datasets", label: "Public Datasets", icon: Globe, href: "/datasets" },
  { id: "chat", label: "AI Chat", icon: Bot, href: "/dashboard/chat" },
];

const accountItems = [
  { id: "account", label: "Account", icon: User, href: "/account" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
  const { user, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, state } = useSidebar();

  const [layers, setLayers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);


  const fetchProjects = async () => {
    if (!user) return;
    try {
      const data = await projectApi.getProjects();
      setProjects(data);

      const savedProjectStr = localStorage.getItem('current_project');
      if (savedProjectStr) {
        const savedProject = JSON.parse(savedProjectStr);
        const matched = data.find(p => p.id === savedProject.id);
        if (matched) {
          setActiveProject(matched);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setHasFetchedProjects(true);
    }
  };

  const handleProjectSelect = (project) => {
    setActiveProject(project);
    localStorage.setItem('current_project', JSON.stringify(project));
    localStorage.removeItem('current_project_id');
    window.dispatchEvent(new Event('projectChanged'));
    router.push('/dashboard');
  };

  const handleDeleteProject = async (e, project) => {
    e.stopPropagation();
    const ok = await confirm({
      variant: 'danger',
      title: 'Delete project?',
      description: 'This action cannot be undone. All datasets and layers in this project will be permanently removed.',
      itemName: project.name,
      confirmLabel: 'Delete project',
      onConfirm: () => projectApi.deleteProject(project.id),
    });
    if (!ok) return;
    await fetchProjects();
    if (activeProject?.id === project.id) {
      setActiveProject(null);
      localStorage.removeItem('current_project');
      window.dispatchEvent(new Event('projectChanged'));
      router.push('/dashboard');
    }
  };

  const fetchProjectDatasets = async (projectId) => {
    if (!projectId || !user) return;
    try {
      const data = await projectApi.getProjectDatasets(projectId);
      setLayers(data);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      setLayers([]);
    }
  };

  const handleSaveLayer = (layerData) => {
    const newLayer = {
      id: `temp-${Date.now()}`,
      name: layerData.name,
      type: layerData.layerType,
    };
    setLayers(prev => [...prev, newLayer]);

    if (activeProject?.id) {
      setTimeout(() => fetchProjectDatasets(activeProject.id), 1000);
    }
  };

  const handleDeleteLayer = async (layer) => {
    if (!activeProject?.id || !user) return;
    const ok = await confirm({
      variant: 'danger',
      title: 'Delete layer?',
      description: 'This dataset will be removed from the project. This action cannot be undone.',
      itemName: layer.name,
      confirmLabel: 'Delete layer',
      onConfirm: () => projectApi.deleteProjectDataset(activeProject.id, layer.id),
    });
    if (!ok) return;
    setLayers(prev => prev.filter(l => l.id !== layer.id));
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  useEffect(() => {
    const updateCurrentProject = () => {
      const savedProject = localStorage.getItem('current_project');
      if (savedProject) {
        try {
          const parsed = JSON.parse(savedProject);
          if (activeProject?.id !== parsed.id) {
            setActiveProject(parsed);
          }
          fetchProjectDatasets(parsed.id);
        } catch (e) {
          console.error("Error parsing current_project", e);
          setLayers([]);
        }
      } else {
        setActiveProject(null);
        setLayers([]);
      }
    };

    const handleStorageChange = () => {
      updateCurrentProject();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectChanged', handleStorageChange);
    };
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && hasFetchedProjects) {
      const isCreatePage = pathname.includes('/dashboard/createProject');
      const isProjectsPage = pathname.includes('/dashboard/projects');
      const isDashboardPage = pathname.includes('/dashboard');

      // Only enforce if we are inside the dashboard and not already on a project management page
      if (isDashboardPage && !isCreatePage && !isProjectsPage) {
        // Redirect to projects hub if no project is active
        if (projects.length === 0 || !activeProject) {
          const segments = pathname.split('/').filter(Boolean);
          const locale = segments[0] && segments[0].length === 2 ? `/${segments[0]}` : '';
          router.push(`${locale}/dashboard/projects`);
        }
      }
    }
  }, [user, authLoading, hasFetchedProjects, projects, activeProject, pathname, router]);

  const handleLayerClick = (layer) => {
    const isDeselecting = selectedLayerId === layer.id;
    setSelectedLayerId(isDeselecting ? null : layer.id);

    window.dispatchEvent(new CustomEvent('layerSelected', {
      detail: isDeselecting ? null : {
        projectId: activeProject?.id,
        datasetId: layer.id,
        datasetName: layer.name,
        pgDatasetId: layer.pgDatasetId || null,
      }
    }));
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b h-[60px] flex items-center px-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground mr-2" />
              <div className="flex-1 flex items-center justify-between group-data-[collapsible=icon]:hidden">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-primary">
                    {activeProject?.name || "No Project Selected"}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    Workspace Active
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Layers</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="hover:text-primary transition-colors group-data-[collapsible=icon]:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {layers.map((layer) => (
                  <SidebarMenuItem key={layer.id}>
                    <SidebarMenuButton
                      onClick={() => handleLayerClick(layer)}
                      isActive={selectedLayerId === layer.id}
                      tooltip={layer.name}
                    >
                      <MapPin className={selectedLayerId === layer.id ? "text-primary" : ""} />
                      <span className="truncate">{layer.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => handleDeleteLayer(layer)}
                      showOnHover
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
                {layers.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    {activeProject ? "No layers" : "Select a project"}
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
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
            </div>
          ) : (
            <div className="group-data-[collapsible=icon]:hidden">
              <Link href="/login">
                <Button size="sm" className="w-full">Login</Button>
              </Link>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <AddLayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLayer}
        projectId={activeProject?.id}
      />
    </>
  );
}
