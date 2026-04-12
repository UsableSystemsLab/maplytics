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
  GalleryVerticalEnd,
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
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddLayerModal from "./AddLayerModal";
import { Button } from "./ui/button";
import * as projectApi from "@/lib/projectApi";
import * as datasetApi from "@/lib/datasetApi";

const mainNavItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { id: "map-view", label: "Map view", icon: Map, href: "/dashboard/map" },
  { id: "comparison", label: "Comparison", icon: BarChart3, href: "/dashboard/comparison" },
];

const secondaryNavItems = [
  { id: "create-project", label: "Create Project", icon: Plus, href: "/dashboard/createProject" },
  { id: "public-datasets", label: "Public Datasets", icon: Globe, href: "/datasets" },
  { id: "chat", label: "AI Chat", icon: Bot, href: "/dashboard/chat" },
];

const accountItems = [
  { id: "account", label: "Account", icon: User, href: "/account" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
  const { user, loading: authLoading } = useAuth();
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

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const data = await projectApi.fetchProjects(user.uid);
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
    }
  };

  const handleProjectSelect = (project) => {
    setActiveProject(project);
    localStorage.setItem('current_project', JSON.stringify(project));
    localStorage.removeItem('current_project_id');
    window.dispatchEvent(new Event('projectChanged'));
    router.push('/dashboard');
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectApi.deleteProject(projectId, user?.uid);
        fetchProjects();
        if (activeProject?.id === projectId) {
          setActiveProject(null);
          localStorage.removeItem('current_project');
          window.dispatchEvent(new Event('projectChanged'));
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const fetchProjectDatasets = async (projectId) => {
    if (!projectId || !user) return;
    try {
      const data = await datasetApi.fetchProjectDatasets(projectId, user.uid);
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

  const handleDeleteLayer = async (layerId) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    if (!activeProject?.id || !user) return;

    try {
      await datasetApi.deleteProjectDataset(activeProject.id, layerId, user.uid);
      setLayers(prev => prev.filter(l => l.id !== layerId));
    } catch (error) {
      console.error("Error deleting dataset:", error);
    }
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
        <SidebarHeader className="border-b group-data-[collapsible=icon]:p-0">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem className="flex flex-row items-center gap-1 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground shrink-0 group-data-[collapsible=icon]:m-0" />
              <div className="group-data-[collapsible=icon]:hidden w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-white">
                        <Globe className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {activeProject?.name || "Select Project"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {projects.length} projects available
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    align="start"
                    side={isMobile ? "bottom" : "right"}
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Projects
                    </DropdownMenuLabel>
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleProjectSelect(project)}
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <Globe className="size-4 shrink-0" />
                        </div>
                        <span className="flex-1 truncate">{project.name}</span>
                        <button
                          onClick={(e) => handleDeleteProject(e, project.id)}
                          className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/createProject" className="gap-2 p-2">
                        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                          <Plus className="size-4" />
                        </div>
                        <div className="font-medium text-muted-foreground">New Project</div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Separate Minimized project icon/button if needed, or rely on trigger above */}
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-primary/10 text-primary hover:bg-primary/20">
                       <Globe className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 rounded-lg"
                    align="start"
                    side="right"
                    sideOffset={10}
                  >
                     <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Switch Project ({activeProject?.name || "None"})
                      </DropdownMenuLabel>
                      {projects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => handleProjectSelect(project)}
                          className="gap-2 p-2"
                        >
                          <Globe className="size-4 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                      onClick={() => handleDeleteLayer(layer.id)}
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
                {/* Mobile/Collapsed specific plus button if needed would go here */}
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
