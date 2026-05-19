"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import * as projectApi from "@/lib/projectApi";
import { FolderPlus, TextQuote, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { setActiveProject } from "@/lib/store/features/projectSlice";
import { useTranslations } from "next-intl";

export default function CreateProjectPage() {
    const t = useTranslations("createProject");
    const { user } = useAuth();
    const router = useRouter();
    const dispatch = useDispatch();
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!projectName.trim() || !user) return;

        setIsSubmitting(true);
        try {
            const newProject = await projectApi.createProject({
                name: projectName,
                description: description,
                email: user.email
            }, user.uid);

            dispatch(setActiveProject({ 
                id: newProject.id, 
                name: newProject.name 
            }));

            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating project:', error);
            alert(error.message || t('failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-50/50 p-6 md:p-12 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-full max-w-2xl space-y-6">
                <Link 
                    href="/dashboard/projects" 
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    {t('backToProjects')}
                </Link>

                <Card className="shadow-lg border-2 border-transparent hover:border-primary/5 transition-all">
                    <CardHeader className="space-y-1 pb-8 border-b bg-white rounded-t-xl">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <FolderPlus className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
                        <CardDescription>
                            {t('description')}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-8">
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    {t('nameLabel')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    {t('descriptionLabel')}
                                    <span className="text-xs font-normal text-muted-foreground">{t('optional')}</span>
                                </label>
                                <div className="relative">
                                    <TextQuote className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={t('descriptionPlaceholder')}
                                        rows={4}
                                        className="w-full ps-10 pe-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 resize-none"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isSubmitting || !projectName.trim()}
                                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t('creating')}
                                    </>
                                ) : (
                                    <>
                                        {t('submit')}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-8">
                    {t('terms')}
                </p>
            </div>
        </div>
    );
}