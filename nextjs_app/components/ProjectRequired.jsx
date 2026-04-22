import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"


export default function ProjectRequired() {
    return (
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
            <Alert variant="default" className="max-w-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Project Required</AlertTitle>
                <AlertDescription>
                    This page requires an active project workspace. Please select an existing project or create a new one to continue.
                    <div className="mt-6">
                        <Link
                            href="/dashboard/projects"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-sm shadow-sm"
                        >
                            Go to Projects
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    )
}